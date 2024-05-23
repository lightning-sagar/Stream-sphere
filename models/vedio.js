const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const videoSchema = new Schema(
    {
        videoFile: {
            type: String,
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
        categories: {
            type: [{
                type: String,
                required: true,
                lowercase: true  
            }],
            validate: {
                validator: function (value) {
                    return value.every(category => typeof category === 'string' && category === category.toLowerCase());
                },
                message: props => `${props.value} must be lowercase strings`
            }
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
