const mongoose = require('mongoose');

// Message Model: Stores chat messages
const messageSchema = new mongoose.Schema({
    username: { type: String, required: true },
    message: { type: String, required: true },
    room: { type: String, required: true, index: true }, // Index room for faster retrieval
    timestamp: { type: Date, default: Date.now } // Use MongoDB default timestamp
}, { timestamps: true }); // Adds createdAt and updatedAt

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
