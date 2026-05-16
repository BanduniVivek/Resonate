require('dotenv').config();
const express = require('express');
const app = express();
const router = require('./routes');
const DbConnect = require('./database');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST'],
    },
});
const ACTIONS = require('./actions');
const roomService = require('./services/room-service');
const { setIo, registerSocketUserMap } = require('./socket-io');

setIo(io);


app.use(cookieParser());
const corsOption = {
    origin: ['http://localhost:5173'],
    credentials: true
};
app.use(cors(corsOption));
app.use('/storage', express.static('storage'));


const PORT = process.env.PORT || 5500;
DbConnect();

app.use(express.json({ limit: '8mb' }));
app.use(router);

app.get('/', (req, res) => {
    res.send('Hello from express Js');
});



// Sockets
const socketUserMap = {};
const socketRoomMeta = {};
registerSocketUserMap(socketUserMap);

function idsEqual(a, b) {
    if (a == null || b == null) return false;
    return String(a) === String(b);
}

io.on('connection', (socket) => {
    console.log('New connection', socket.id);
    socket.on(ACTIONS.JOIN, async ({ roomId, user, ownerId }) => {
        if (!roomId || !user?.id) return;

        const room = await roomService.getRoom(roomId);
        if (!room || room.status === 'closed') return;

        const ownerIdStr =
            ownerId !== undefined && ownerId !== null
                ? String(ownerId)
                : '';

        await roomService.ensureSpeakerOnJoin(
            roomId,
            user.id,
            room.speakMode || 'moderated'
        );

        const freshRoom = await roomService.getRoom(roomId);
        const isSpeaker = roomService.isUserSpeaker(freshRoom, user.id);
        const peerUser = { ...user, isSpeaker, muted: true };

        socketUserMap[socket.id] = peerUser;
        socketRoomMeta[socket.id] = {
            voiceRoomId: roomId,
            roomOwnerId: ownerIdStr,
        };

        const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);

        clients.forEach((clientId) => {
            const existing = socketUserMap[clientId];
            if (existing) {
                socketUserMap[clientId] = {
                    ...existing,
                    isSpeaker: roomService.isUserSpeaker(
                        freshRoom,
                        existing.id
                    ),
                };
            }

            io.to(clientId).emit(ACTIONS.ADD_PEER, {
                peerId: socket.id,
                createOffer: false,
                user: peerUser,
            });

            socket.emit(ACTIONS.ADD_PEER, {
                peerId: clientId,
                createOffer: true,
                user: socketUserMap[clientId],
            });
        });

        socket.join(roomId);
    });

    // Handle Relay Ice event
    socket.on(ACTIONS.RELAY_ICE, ({ peerId, icecandidate }) => {
        io.to(peerId).emit(ACTIONS.ICE_CANDIDATE, {
            peerId: socket.id,
            icecandidate,
        });
    });

    // Handle Relay SDP
    socket.on(ACTIONS.RELAY_SDP, ({ peerId, sessionDescription }) => {
        io.to(peerId).emit(ACTIONS.SESSION_DESCRIPTION, {
            peerId: socket.id,
            sessionDescription,
        });
    });

    const leaveRoom = () => {
        const meta = socketRoomMeta[socket.id];
        const leaverUser = socketUserMap[socket.id];
        // OWNER LEFT -> END ROOM

        if (
            meta?.voiceRoomId &&
            meta?.roomOwnerId &&
            leaverUser &&
            idsEqual(leaverUser.id, meta.roomOwnerId)
        ) {
            io.to(meta.voiceRoomId).emit(ACTIONS.ROOM_ENDED, {
                message: 'The room has ended',
            });
            const clients = Array.from(
                io.sockets.adapter.rooms.get(
                    meta.voiceRoomId
                ) || []
            );
            
            clients.forEach((clientId) => {
            
                const clientSocket =
                    io.sockets.sockets.get(clientId);
            
                if (clientSocket) {
                    clientSocket.leave(meta.voiceRoomId);
                }
            
                delete socketRoomMeta[clientId];
                delete socketUserMap[clientId];
            });
            roomService
                .closeRoom(meta.voiceRoomId)
                .catch((err) => console.log(err));
            return
        }

        const { rooms } = socket;
        console.log('leaving', rooms);
        Array.from(rooms).forEach((roomId) => {
            if (roomId === socket.id) return;

            const clients = Array.from(
                io.sockets.adapter.rooms.get(roomId) || []
            );
            clients.forEach((clientId) => {
                io.to(clientId).emit(ACTIONS.REMOVE_PEER, {
                    peerId: socket.id,
                    userId: socketUserMap[socket.id]?.id,
                });

                socket.emit(ACTIONS.REMOVE_PEER, {
                    peerId: clientId,
                    userId: socketUserMap[clientId]?.id,
                });
            });
            socket.leave(roomId);
        });

        delete socketRoomMeta[socket.id];
        delete socketUserMap[socket.id];

        console.log('map', socketUserMap);
    };

    socket.on(ACTIONS.MUTE, ({ roomId, userId }) => {
        console.log('mute on server', userId);
        const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
        clients.forEach((clientId) => {
            io.to(clientId).emit(ACTIONS.MUTE, {
                peerId: socket.id,
                userId,
            });
        });
    });

    socket.on(ACTIONS.UNMUTE, ({ roomId, userId }) => {
        console.log('unmute on server', userId);
        const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
        clients.forEach((clientId) => {
            io.to(clientId).emit(ACTIONS.UNMUTE, {
                peerId: socket.id,
                userId,
            });
        });
    });

    
    socket.on(ACTIONS.LEAVE, leaveRoom);

    socket.on('disconnecting', leaveRoom);
})

server.listen(PORT, () => console.log(`Listening on port ${PORT}`));