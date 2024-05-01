const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const videoSchema = new Schema(
    {
        videoFile: {
            type: String, // Cloudinary URL
        },
        thumbnail: {
            type: String,
            required: true
        },
        title: {
            type: String, 
        },
        description: {
            type: String, 
        },
        duration: {
            type: Number, 
        },
        views: {
            type: Number,
            default: 0
        },
        isPublished: {
            type: Boolean,
            default: true
        },
        category: {
            type: String
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    }, 
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Video', videoSchema);
