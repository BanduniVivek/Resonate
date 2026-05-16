const ACTIONS = require('./actions');

let ioInstance = null;
let socketUserMapRef = null;

function setIo(io) {
    ioInstance = io;
}

function registerSocketUserMap(map) {
    socketUserMapRef = map;
}

function syncUserSpeakerStatus(userId, isSpeaker, { muted } = {}) {
    if (!socketUserMapRef || userId == null) return;
    for (const socketId of Object.keys(socketUserMapRef)) {
        const entry = socketUserMapRef[socketId];
        if (entry && String(entry.id) === String(userId)) {
            const patch = { ...entry, isSpeaker };
            if (muted !== undefined) patch.muted = muted;
            socketUserMapRef[socketId] = patch;
        }
    }
}

function getParticipantCount(roomId) {
    if (!ioInstance || roomId == null) return 0;
    const room = ioInstance.sockets.adapter.rooms.get(String(roomId));
    return room ? room.size : 0;
}

function broadcastToRoom(roomId, event, payload) {
    if (!ioInstance || roomId == null) return;
    ioInstance.to(String(roomId)).emit(event, payload);
}

function broadcastMuteToRoom(roomId, userId) {
    broadcastToRoom(roomId, ACTIONS.MUTE, { userId });
}

module.exports = {
    setIo,
    registerSocketUserMap,
    syncUserSpeakerStatus,
    getParticipantCount,
    broadcastToRoom,
    broadcastMuteToRoom,
};
