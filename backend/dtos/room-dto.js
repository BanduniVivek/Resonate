const { getParticipantCount } = require('../socket-io');

class RoomDto {
    id;
    topic;
    roomType;
    status;
    speakers;
    ownerId;
    createdAt;
    endedAt;
    participantCount;

    constructor(room) {
        this.id = room._id;
        this.topic = room.topic;
        this.roomType = room.roomType;
        this.status = room.status || 'active';
        this.ownerId = room.ownerId;
        this.speakers = room.speakers;
        this.createdAt = room.createdAt;
        this.endedAt = room.endedAt;
        this.participantCount =
            this.status === 'closed'
                ? 0
                : getParticipantCount(room._id);
    }
}

module.exports = RoomDto;
