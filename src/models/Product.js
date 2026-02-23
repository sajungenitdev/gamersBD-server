const mongoose = require('mongoose')

module.exports = mongoose.model('Product', new mongoose.Schema({
  title: String,
  price: Number,
  category: String,
  image: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}))
