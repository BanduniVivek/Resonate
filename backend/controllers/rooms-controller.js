const RoomDto = require('../dtos/room-dto.js');
const roomService = require('../services/room-service.js');

class RoomsController {
    async create(req, res) {
        // room
        const { topic, roomType } = req.body;

        if (!topic || !roomType) {
            return res
                .status(400)
                .json({ message: 'All fields are required!' });
        }

        const allowedTypes = ['open', 'subscriber', 'private'];
        if (!allowedTypes.includes(roomType)) {
            return res.status(400).json({ message: 'Invalid room type' });
        }

        const room = await roomService.create({
            topic,
            roomType,
            ownerId: req.user._id,
        });

        return res.json(new RoomDto(room));
    }

    async index(req, res) {
        const rooms = await roomService.getRoomsVisibleToUser(req.user._id);
        const allRooms = rooms.map((room) => new RoomDto(room));
        return res.json(allRooms);
    }

    async checkAccess(req, res) {
        return res.status(200).json({ allowed: true });
    }

    async show(req, res) {
        const room = req.room || (await roomService.getRoom(req.params.roomId));
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }
        return res.json(new RoomDto(room));
    }

    async closed(req, res) {
        try {
            const rooms = await roomService.getRecentlyClosedRooms(req.user._id);
            return res.json(rooms.map((room) => new RoomDto(room)));
        } catch (err) {
            console.log(err);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    async joinByCode(req, res) {
        try {
            const { code } = req.body;
            if (!code || typeof code !== 'string') {
                return res.status(400).json({ message: 'Invite code is required' });
            }

            const result = await roomService.grantJoinByInviteCode(
                req.user._id,
                code
            );

            if (result.error) {
                const status =
                    result.error === 'not_found' ? 404 : 400;
                return res.status(status).json({ message: result.message });
            }

            return res.json(new RoomDto(result.room));
        } catch (err) {
            console.log(err);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    async inviteCode(req, res) {
        try {
            const result = await roomService.getInviteCodeForOwner(
                req.params.roomId,
                req.user._id
            );

            if (result.error) {
                const status =
                    result.error === 'forbidden'
                        ? 403
                        : result.error === 'not_found'
                          ? 404
                          : 400;
                return res.status(status).json({ message: result.message });
            }

            return res.json({ inviteCode: result.inviteCode });
        } catch (err) {
            console.log(err);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    async search(req, res) {

        try {
    
            const query = req.query.query;
    
            if (!query) {
                return res.json([]);
            }
    
            const rooms = await roomService.searchRooms(
                query,
                req.user._id
            );
    
            const allRooms = rooms.map(
                (room) => new RoomDto(room)
            );
    
            return res.status(200).json(allRooms);
    
        } catch (err) {
    
            console.log(err);
    
            return res.status(500).json({
                message: 'Internal server error',
            });
        }
    }
}

module.exports = new RoomsController();
