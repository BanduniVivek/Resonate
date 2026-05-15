const RoomModel = require('../models/room-model');
const UserModel = require('../models/user-model');

function escapeRegex(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

class RoomService {
    async create(payload) {
        const { topic, roomType, ownerId } = payload;
        const room = await RoomModel.create({
            topic,
            roomType,
            ownerId,
            speakers: [ownerId],
        });
        return room;
    }

    async getAllRooms(types) {
        const rooms = await RoomModel.find({ roomType: { $in: types } })
            .populate('speakers')
            .populate('ownerId')
            .exec();
        return rooms;
    }

    async getRoom(roomId) {
        const room = await RoomModel.findById(roomId)
            .populate('ownerId', 'name avatar')
            .exec();
        return room;
    }

    async deleteRoom(roomId) {
        if (!roomId) return;
        await RoomModel.deleteOne({ _id: roomId });
    }

    async searchRooms(query) {
        const q = (query || '').trim();
        if (!q) {
            return [];
        }

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
            roomType: { $in: ['open'] },
            $or: orConditions,
        })
            .populate('speakers', 'name avatar')
            .populate('ownerId', 'name avatar')
            .exec();

        return rooms;
    }
}
module.exports = new RoomService();
