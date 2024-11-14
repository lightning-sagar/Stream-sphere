const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const membershipSchema = new Schema({
    community: {
        type: Schema.Types.ObjectId,
        ref: 'Community'
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
});

const Membership = mongoose.model('Membership', membershipSchema);

const tweetSchema = new Schema({
    content: {
        type: String,
        required: true
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    parent: {
        type: Schema.Types.ObjectId,
        ref: 'Tweet',
        default: null 
    },
}, { timestamps: true });

const Tweet = mongoose.model("Tweet", tweetSchema);

module.exports = { Membership,Tweet };