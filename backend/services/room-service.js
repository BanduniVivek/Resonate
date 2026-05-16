const crypto = require('crypto');
const RoomModel = require('../models/room-model');
const UserModel = require('../models/user-model');

const INVITE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CLOSED_ROOM_WINDOW_MS = 6 * 60 * 60 * 1000;

function escapeRegex(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function idsEqual(a, b) {
    if (a == null || b == null) return false;
    return String(a) === String(b);
}

function normalizeInviteCode(raw) {
    if (typeof raw !== 'string') return '';
    return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function generateInviteCode(length = 8) {
    let code = '';
    for (let i = 0; i < length; i++) {
        code += INVITE_CHARS[crypto.randomInt(INVITE_CHARS.length)];
    }
    return code;
}

class RoomService {
    async createUniqueInviteCode() {
        for (let attempt = 0; attempt < 8; attempt++) {
            const inviteCode = generateInviteCode();
            const exists = await RoomModel.exists({ inviteCode });
            if (!exists) return inviteCode;
        }
        throw new Error('Could not generate invite code');
    }

    isUserSpeaker(room, userId) {
        if (!room || userId == null) return false;
        const ownerId = room.ownerId?._id ?? room.ownerId;
        if (idsEqual(ownerId, userId)) return true;
        return (room.speakers || []).some((s) =>
            idsEqual(s?._id ?? s, userId)
        );
    }

    async create(payload) {
        const { topic, roomType, ownerId, speakMode = 'moderated' } = payload;
        const allowedSpeakModes = ['moderated', 'open'];
        const mode = allowedSpeakModes.includes(speakMode)
            ? speakMode
            : 'moderated';
        const doc = {
            topic,
            roomType,
            speakMode: mode,
            ownerId,
            speakers: [ownerId],
        };

        if (roomType === 'private') {
            doc.inviteCode = await this.createUniqueInviteCode();
        }

        const room = await RoomModel.create(doc);
        return room;
    }

    async getRoomsVisibleToUser(userId) {
        const user = await UserModel.findById(userId).select('following').lean();
        const followingIds = user?.following ?? [];

        const visibilityFilter = {
            $or: [
                { roomType: 'open' },
                {
                    roomType: 'subscriber',
                    $or: [
                        { ownerId: { $in: followingIds } },
                        { ownerId: userId },
                    ],
                },
            ],
        };

        const activeOnly = {
            $or: [
                { status: 'active' },
                { status: { $exists: false } },
            ],
        };

        const rooms = await RoomModel.find({
            $and: [visibilityFilter, activeOnly],
        })
            .populate('speakers', 'name avatar')
            .populate('ownerId', 'name avatar')
            .sort({ createdAt: -1 })
            .exec();

        return rooms;
    }

    buildClosedRoomsVisibilityFilter(userId, followingIds) {
        return {
            $or: [
                { roomType: 'open' },
                {
                    roomType: 'subscriber',
                    $or: [
                        { ownerId: { $in: followingIds } },
                        { ownerId: userId },
                    ],
                },
                {
                    roomType: 'private',
                    $or: [
                        { ownerId: userId },
                        { allowedJoiners: userId },
                    ],
                },
            ],
        };
    }

    async getRecentlyClosedRooms(userId) {
        const user = await UserModel.findById(userId).select('following').lean();
        const followingIds = user?.following ?? [];
        const since = new Date(Date.now() - CLOSED_ROOM_WINDOW_MS);

        const rooms = await RoomModel.find({
            $and: [
                this.buildClosedRoomsVisibilityFilter(userId, followingIds),
                { status: 'closed' },
                { endedAt: { $gte: since } },
            ],
        })
            .populate('speakers', 'name avatar')
            .populate('ownerId', 'name avatar')
            .sort({ endedAt: -1 })
            .exec();

        return rooms;
    }

    async grantJoinByInviteCode(userId, rawCode) {
        const code = normalizeInviteCode(rawCode);
        if (!code) {
            return { error: 'invalid', message: 'Enter a valid invite code' };
        }

        const room = await RoomModel.findOne({ inviteCode: code });
        if (!room) {
            return { error: 'not_found', message: 'Invalid invite code' };
        }

        if (room.status === 'closed') {
            return { error: 'ended', message: 'This room has ended' };
        }

        const ownerId = room.ownerId;
        if (idsEqual(ownerId, userId)) {
            return { room: await this.getRoom(room._id) };
        }

        if (room.roomType !== 'private') {
            return {
                error: 'not_private',
                message: 'This code is only for private rooms',
            };
        }

        const alreadyAllowed = (room.allowedJoiners || []).some((id) =>
            idsEqual(id, userId)
        );

        if (!alreadyAllowed) {
            await RoomModel.updateOne(
                { _id: room._id },
                { $addToSet: { allowedJoiners: userId } }
            );
        }

        return { room: await this.getRoom(room._id) };
    }

    async getInviteCodeForOwner(roomId, userId) {
        const room = await RoomModel.findById(roomId);
        if (!room) {
            return { error: 'not_found', message: 'Room not found' };
        }

        if (room.roomType !== 'private') {
            return {
                error: 'not_private',
                message: 'Invite codes are only for private rooms',
            };
        }

        if (!idsEqual(room.ownerId, userId)) {
            return { error: 'forbidden', message: 'Only the host can view the invite code' };
        }

        if (room.status === 'closed') {
            return { error: 'ended', message: 'This room has ended' };
        }

        if (!room.inviteCode) {
            const inviteCode = await this.createUniqueInviteCode();
            await RoomModel.updateOne({ _id: room._id }, { inviteCode });
            room.inviteCode = inviteCode;
        }

        return { inviteCode: room.inviteCode };
    }

    async getRoom(roomId) {
        const room = await RoomModel.findById(roomId)
            .populate('ownerId', 'name avatar')
            .populate('speakers', 'name avatar')
            .exec();
        return room;
    }

    async ensureSpeakerOnJoin(roomId, userId, speakMode) {
        if (speakMode !== 'open' || !roomId || userId == null) return;
        await RoomModel.updateOne(
            { _id: roomId },
            { $addToSet: { speakers: userId } }
        );
    }

    async addSpeaker(roomId, targetUserId, ownerUserId) {
        const room = await RoomModel.findById(roomId);
        if (!room) {
            return { error: 'not_found', message: 'Room not found' };
        }
        if (room.status === 'closed') {
            return { error: 'ended', message: 'This room has ended' };
        }
        if (!idsEqual(room.ownerId, ownerUserId)) {
            return { error: 'forbidden', message: 'Only the host can promote speakers' };
        }
        if (idsEqual(room.ownerId, targetUserId)) {
            return { error: 'invalid', message: 'Host is already a speaker' };
        }
        await RoomModel.updateOne(
            { _id: roomId },
            { $addToSet: { speakers: targetUserId } }
        );
        return { room: await this.getRoom(roomId) };
    }

    async removeSpeaker(roomId, targetUserId, ownerUserId) {
        const room = await RoomModel.findById(roomId);
        if (!room) {
            return { error: 'not_found', message: 'Room not found' };
        }
        if (room.status === 'closed') {
            return { error: 'ended', message: 'This room has ended' };
        }
        if (!idsEqual(room.ownerId, ownerUserId)) {
            return { error: 'forbidden', message: 'Only the host can remove speakers' };
        }
        if (idsEqual(room.ownerId, targetUserId)) {
            return { error: 'invalid', message: 'Cannot remove the host as speaker' };
        }
        await RoomModel.updateOne(
            { _id: roomId },
            { $pull: { speakers: targetUserId } }
        );
        return { room: await this.getRoom(roomId) };
    }

    async closeRoom(roomId) {
        if (!roomId) return;
        await RoomModel.updateOne(
            { _id: roomId },
            { status: 'closed', endedAt: new Date() }
        );
    }

    async searchRooms(query, userId) {
        const q = (query || '').trim();
        if (!q) {
            return [];
        }

        const user = await UserModel.findById(userId).select('following').lean();
        const followingIds = user?.following ?? [];

        const visibilityFilter = {
            $or: [
                { roomType: 'open' },
                {
                    roomType: 'subscriber',
                    $or: [
                        { ownerId: { $in: followingIds } },
                        { ownerId: userId },
                    ],
                },
                {
                    roomType: 'private',
                    $or: [
                        { ownerId: userId },
                        { allowedJoiners: userId },
                    ],
                },
            ],
        };

        const activeOnly = {
            $or: [
                { status: 'active' },
                { status: { $exists: false } },
            ],
        };

        const safePattern = escapeRegex(q);

        const usersByName = await UserModel.find({
            name: { $regex: safePattern, $options: 'i' },
        })
            .select('_id')
            .lean();

        const nameMatchIds = usersByName.map((u) => u._id);

        const orConditions = [
            { topic: { $regex: safePattern, $options: 'i' } },
        ];

        if (nameMatchIds.length > 0) {
            orConditions.push({ speakers: { $in: nameMatchIds } });
            orConditions.push({ ownerId: { $in: nameMatchIds } });
        }

        const rooms = await RoomModel.find({
            $and: [visibilityFilter, activeOnly, { $or: orConditions }],
        })
            .populate('speakers', 'name avatar')
            .populate('ownerId', 'name avatar')
            .exec();

        return rooms;
    }
}
module.exports = new RoomService();
