const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const chatSchema = new Schema({
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        required: true
    },
    seen: {
        type: Boolean,
        default: false
    }
},{timestamps: true});

module.exports = mongoose.model('Chat', chatSchema)