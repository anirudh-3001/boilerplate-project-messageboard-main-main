// db-connection.js
const mongoose = require('mongoose');
const db = process.env.DB;

mongoose.connect(db, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.connection.on('error', err => {
  console.error('MongoDB connection error: ' + err);
  process.exit(1);
});

mongoose.connection.once('open', () => {
  console.log('MongoDB connected successfully');
});

module.exports = mongoose;
