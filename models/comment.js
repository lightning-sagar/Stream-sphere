const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');


const commentSchema = new Schema(
    {
        content: {
            type: String,
            required: true
        },
        video: {
            type: Schema.Types.ObjectId,
            ref: "Video"
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },
        likes: [{
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: []
        }]
    },
    {
        timestamps: true
    }
)


module.exports = mongoose.model("Comment", commentSchema)