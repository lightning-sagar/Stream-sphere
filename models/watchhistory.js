const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const watchHistorySchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  video: {
    type: Schema.Types.ObjectId,
    ref: 'Video',
    required: true
  },
  watchedAt: {
    type: Date,
    default: Date.now
  }
});

const WatchHistory = mongoose.model('WatchHistory', watchHistorySchema);

module.exports = WatchHistory;
