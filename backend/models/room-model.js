const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const roomSchema = new Schema(
    {
        topic: { type: String, required: true },
        roomType: { type: String, required: true },
        speakMode: {
            type: String,
            enum: ['moderated', 'open'],
            default: 'moderated',
        },
        status: {
            type: String,
            enum: ['active', 'closed'],
            default: 'active',
        },
        endedAt: { type: Date, required: false },
        ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
        speakers: {
            type: [
                {
                    type: Schema.Types.ObjectId,
                    ref: 'User',
                },
            ],
            required: false,
        },
        inviteCode: {
            type: String,
            unique: true,
            sparse: true,
        },
        allowedJoiners: {
            type: [
                {
                    type: Schema.Types.ObjectId,
                    ref: 'User',
                },
            ],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Room', roomSchema, 'rooms');
 