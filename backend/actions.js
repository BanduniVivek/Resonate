const ACTIONS = {
    JOIN: 'join',
    LEAVE: 'leave',
    ADD_PEER: 'add-peer',
    REMOVE_PEER: 'remove-peer',
    RELAY_ICE: 'relay-ice',
    RELAY_SDP: 'relay-sdp',
    SESSION_DESCRIPTION: 'session-description',
    ICE_CANDIDATE: 'ice-candidate',
    MUTE: 'mute',
    UNMUTE: 'unmute',
    ROOM_ENDED: 'room-ended',
    SPEAKER_PROMOTED: 'speaker-promoted',
    SPEAKER_DEMOTED: 'speaker-demoted',
};

module.exports = ACTIONS
