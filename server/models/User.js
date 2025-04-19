const mongoose = require('mongoose');

// User Model: Tracks socket ID, username, and current room
const userSchema = new mongoose.Schema({
    socketId: { type: String, required: true, unique: true }, // Socket ID is unique per connection
    username: { type: String, required: true },
    currentRoom: { type: String, default: null, index: true }, // Room the user is currently in (indexed)
}, { timestamps: true }); // Add timestamps for creation/update

// Optional: Index username if you plan to enforce uniqueness later or query by it often
// userSchema.index({ username: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
