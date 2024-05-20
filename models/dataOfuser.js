// user.js

const mongoose = require("mongoose");

const usernameSchema = new mongoose.Schema({
  task: String,
  done: {
    type: Boolean,
    default: false,
  },
});

const User = mongoose.model("tudo", usernameSchema);

module.exports = User;
