let ioInstance = null;

function setIo(io) {
    ioInstance = io;
}

function getParticipantCount(roomId) {
    if (!ioInstance || roomId == null) return 0;
    const room = ioInstance.sockets.adapter.rooms.get(String(roomId));
    return room ? room.size : 0;
}

module.exports = {
    setIo,
    getParticipantCount,
};
