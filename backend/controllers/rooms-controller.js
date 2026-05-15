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

        const room = await roomService.create({
            topic,
            roomType,
            ownerId: req.user._id,
        });

        return res.json(new RoomDto(room));
    }

    async index(req, res) {
        const rooms = await roomService.getAllRooms(['open']);
        const allRooms = rooms.map((room) => new RoomDto(room));
        return res.json(allRooms);
    }

    async show(req, res) {
        const room = await roomService.getRoom(req.params.roomId);
        return res.json(room);
    }

    async search(req, res) {

        try {
    
            const query = req.query.query;
    
            if (!query) {
                return res.json([]);
            }
    
            const rooms =
                await roomService.searchRooms(query);
    
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
