const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const likeSchema = new Schema({
    video: {
        type: Schema.Types.ObjectId,
        ref: "Video"
    },
    Tweet: {
        type: Schema.Types.ObjectId,
        ref: "Tweet"
    },
    likedBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    
}, {timestamps: true})

module.exports = mongoose.model("Like", likeSchema)