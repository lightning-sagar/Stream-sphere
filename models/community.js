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

const communitySchema = new Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true  
    },
    category: {
        type: String,
        required: true
    }
});

const Community = mongoose.model("Community", communitySchema);

const tweetSchema = new Schema({
    content: {
        type: String,
        required: true
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    community: {
        type: Schema.Types.ObjectId,
        ref: "Community"
    }
}, { timestamps: true });

const Tweet = mongoose.model("Tweet", tweetSchema);


module.exports = { Community, Membership,Tweet };