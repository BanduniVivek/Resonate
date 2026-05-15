const roomService = require('../services/room-service');
const userService = require('../services/user-service');

function idsEqual(a, b) {
    if (a == null || b == null) return false;
    return String(a) === String(b);
}

module.exports = async function roomAccessMiddleware(req, res, next) {
    try {
        const { roomId } = req.params;
        const room = await roomService.getRoom(roomId);

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        req.room = room;

        if (room.status === 'closed') {
            return res.status(403).json({
                message: 'This room has ended',
            });
        }

        if (room.roomType === 'open') {
            return next();
        }

        if (room.roomType === 'subscriber') {
            const userId = req.user._id;
            const ownerId = room.ownerId?._id ?? room.ownerId;

            if (idsEqual(ownerId, userId)) {
                return next();
            }

            const owner = await userService.findUser({ _id: ownerId });
            if (!owner) {
                return res.status(404).json({ message: 'Room owner not found' });
            }

            const isFollower = (owner.followers || []).some((followerId) =>
                idsEqual(followerId?._id ?? followerId, userId)
            );

            if (isFollower) {
                return next();
            }

            return res.status(403).json({
                message: 'You must follow this creator to join',
            });
        }

        if (room.roomType === 'private') {
            const userId = req.user._id;
            const ownerId = room.ownerId?._id ?? room.ownerId;

            if (idsEqual(ownerId, userId)) {
                return next();
            }

            const isInvited = (room.allowedJoiners || []).some((joinerId) =>
                idsEqual(joinerId?._id ?? joinerId, userId)
            );

            if (isInvited) {
                return next();
            }

            return res.status(403).json({
                message: 'This is a private room. Join with an invite code.',
            });
        }

        return res.status(403).json({
            message: 'You do not have access to this room',
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
