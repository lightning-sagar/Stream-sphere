  const mongoose = require('mongoose');
  const Schema = mongoose.Schema;

  const commentSchema = new Schema({
    content: { type: String, required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    video: { type: Schema.Types.ObjectId, ref: 'Video', required: true },
    parent: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
    createdAt: { type: Date, default: Date.now }
  });

  module.exports = mongoose.model('Comment', commentSchema);