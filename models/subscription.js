const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const subscriptionSchema = new mongoose.Schema({
  subscriber: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  channel: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Subscription', subscriptionSchema);