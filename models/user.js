const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  openedChats: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  categories: [{
    type: String,
    default: "coding" 
  }],
  avatar: {
    type: String, 
    default: "https://w7.pngwing.com/pngs/177/551/png-transparent-user-interface-design-computer-icons-default-stephen-salazar-graphy-user-interface-design-computer-wallpaper-sphere-thumbnail.png" 
  },
  coverImage: {
    type: String,
  },
  is_online: {
    type: Boolean,
    default: false
  },
  watchHistory: [
    {
      type: Schema.Types.ObjectId,
      ref: "WatchHistory"
    }
  ],
  googleId: String,
  username: String,
  friends: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  waiting: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  sendreq: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  blocked: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }]
});

userSchema.plugin(passportLocalMongoose);

userSchema.statics.findByGoogleId = function (googleId) {
  return this.findOne({ googleId }).exec();
}; 

const User = mongoose.model('User', userSchema);

module.exports = User;