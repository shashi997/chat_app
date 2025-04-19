require('dotenv').config()
const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const mongoose = require('mongoose');

// --- Import Models ---
const User = require('./models/User');
const Message = require('./models/Message');

// --- Environment Variables ---
const PORT = process.env.PORT || 8080
const MONGODB_URI = process.env.MONGODB_URI;
const CLIENT_URL = process.env.CLIENT_URL || "https://chat-app-client-psi-five.vercel.app";
// const CLIENT_URL = "http://localhost:5173"

if (!MONGODB_URI) {
    console.error("Error: MONGODB_URI is not defined in the .env file.");
    process.exit(1); // Exit if DB connection string is missing
}

const app = express()

// middleware
app.use(cors({
    origin: [CLIENT_URL],
}));

const httpServer = http.createServer(app)
const io = new Server(httpServer, {
    cors: {
        origin: [CLIENT_URL],
        methods: ["GET", "POST"],
    }
})

// --- State Management ---
// Keep track of users in rooms (in-memory, replace with DB for persistence)
// const users = {}; // users: { socketId: { username, currentRoom } }
// rooms: { roomName: Set<socketId> } - Using Set for efficient add/delete
// const rooms = {
//     "Everyone": new Set() // Start with a default "Everyone" room
// };


// --- Helper Functions (Database Aware) ---
async function getActiveRooms() {
    try {
        // Find distinct non-null/non-empty currentRoom values from the User collection
        const activeRooms = await User.distinct('currentRoom', { currentRoom: { $ne: null, $ne: '' } });
        // Ensure "Everyone" is always included
        if (!activeRooms.includes("Everyone")) {
            activeRooms.unshift("Everyone"); // Add to the beginning if not present
        }
        return activeRooms;
    } catch (error) {
        console.error("Error fetching active rooms:", error);
        return ["Everyone"]; // Fallback to default
    }
}

// Broadcasts the current list of active rooms to all connected clients
async function broadcastRoomList() {
    try {
        const rooms = await getActiveRooms();
        io.emit('update_room_list', rooms);
        console.log('Broadcasting updated room list:', rooms);
    } catch (error) {
        console.error("Error broadcasting room list:", error);
    }
}



app.get('/', (req, res) => {
    res.sendFile(__dirname + "/index.html")
})


// --- Socket.IO Logic ---
io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`)

    // Send initial room list to the newly connected client
    getActiveRooms()
        .then(rooms => socket.emit('update_room_list', rooms))
        .catch(err => console.error("Error sending initial room list:", err));


    // Handle joining a room
    socket.on('join_room', async (data) => {
        const { username, room } = data;

        // --- Validation ---
        if (!username || !username.trim()) {
            socket.emit('join_error', { message: 'Username is required.' });
            console.error("Join attempt failed: Username required.", data);
            return;
        }
        if (!room || !room.trim()) {
            socket.emit('join_error', { message: 'Room name is required.' });
            console.error("Join attempt failed: Room required.", data);
            return;
        }

        try {
            // --- Leave previous room if any ---
            const existingUser = await User.findOne({ socketId: socket.id });
            let broadcastNeeded = false; // Flag to check if room list needs update

            if (existingUser && existingUser.currentRoom && existingUser.currentRoom !== room) {
                const oldRoom = existingUser.currentRoom;
                console.log(`User ${username} (${socket.id}) leaving previous room: ${oldRoom}`);
                socket.leave(oldRoom); // Leave the Socket.IO room

                // Notify users in the old room
                socket.to(oldRoom).emit('user_left', {
                    username: username, // Use the username from the event data or DB
                    message: `${username} has left the chat.`
                });

                // Check if old room might become empty (check *after* potential update)
                // We check count *before* the user's record is updated
                const usersLeftInOldRoom = await User.countDocuments({ currentRoom: oldRoom, socketId: { $ne: socket.id } });
                if (usersLeftInOldRoom === 0 && oldRoom !== "Everyone") {
                    broadcastNeeded = true; // Mark that broadcast is needed after joining new room
                }
            }

            // --- Join new room ---
            socket.join(room);
           
            // --- Update Database ---
            // Use findOneAndUpdate with upsert to create or update the user record
            const updatedUser = await User.findOneAndUpdate(
                { socketId: socket.id }, // Find user by socket ID
                { username: username, currentRoom: room, socketId: socket.id }, // Update data
                { upsert: true, new: true, setDefaultsOnInsert: true } // Options: create if not found, return new doc
            );

            console.log(`User ${username} (${socket.id}) joined room: ${room}`);

            // Check if this join made a new custom room active
            const usersInNewRoom = await User.countDocuments({ currentRoom: room });
            console.log(`Users now in ${room}: ${usersInNewRoom}`);
            if (usersInNewRoom === 1 && room !== "Everyone") {
                broadcastNeeded = true; // New room became active
            }

            // Broadcast room list if needed (due to leaving old empty room or joining new one)
            if (broadcastNeeded) {
                await broadcastRoomList();
            }

            // --- Emit Events ---
            // Notify others in the *new* room
            socket.to(room).emit('user_joined', {
                username: updatedUser.username, // Use username from the updated record
                message: `${updatedUser.username} has joined the chat.`
            });

            // Send confirmation back to the user who joined
            socket.emit('joined_room', { username: updatedUser.username, room: updatedUser.currentRoom });

            // --- Send Message History ---
            try {
                const history = await Message.find({ room: room })
                                            .sort({ timestamp: -1 }) // Get latest first
                                            .limit(50) // Limit history size
                                            .sort({ timestamp: 1 }); // Reverse back to chronological order

                socket.emit('message_history', history.map(msg => ({ // Map to desired client format
                    username: msg.username,
                    message: msg.message,
                    room: msg.room,
                    timestamp: msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) // Format timestamp
                })));
            } catch (historyError) {
                console.error(`Error fetching message history for room ${room}:`, historyError);
                socket.emit('history_error', { message: 'Could not load message history.' });
            }

        } 
        catch (error) {
            console.error(`Error joining room for socket ${socket.id}:`, error);
            socket.emit('join_error', { message: 'Server error occurred while joining room.' });
        }
    });


    // Handle sending messages
    socket.on('send_message', async (data) => {
        const { room, message } = data;

        // Basic validation
        if (!room || !message || !message.trim()) {
            socket.emit('send_error', { message: 'Cannot send empty message or message without a room.' });
            return;
        }

        try {
            // Find the user in the database by socket ID
            const user = await User.findOne({ socketId: socket.id });

            // Ensure user exists, has a username, and is in the specified room
            if (user && user.username && user.currentRoom === room) {
                const messageData = {
                    username: user.username,
                    message: message,
                    room: room,
                    // timestamp is handled by Mongoose default in the schema
                };

                // Save message to database
                const newMessage = new Message(messageData);
                await newMessage.save();

                // Prepare data to send to clients (including formatted timestamp)
                const messageToSend = {
                    _id: newMessage._id, // Include message ID if needed by client
                    username: newMessage.username,
                    message: newMessage.message,
                    room: newMessage.room,
                    timestamp: newMessage.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };

                console.log(`Message from ${user.username} in room ${room}: ${message}`);
                io.to(room).emit('receive_message', messageToSend);
            } else {
                console.warn(`User ${socket.id} (Username: ${user?.username}) tried to send message to room ${room} but isn't joined correctly (Current Room: ${user?.currentRoom}).`);
                socket.emit('send_error', { message: 'Cannot send message. Ensure you are correctly joined to the room.' });
            }
        } 
        catch (error) {
            console.error(`Error sending message for socket ${socket.id}:`, error);
            socket.emit('send_error', { message: 'Server error occurred while sending message.' });
        }
    });



    // Handle disconnection
    socket.on('disconnect', async (reason) => {
        console.log(`User Disconnected: ${socket.id}. Reason: ${reason}`);
        try {
            // Find and remove the user record associated with the disconnected socket
            // findOneAndDelete returns the deleted document (if found)
            const user = await User.findOneAndDelete({ socketId: socket.id });

            if (user && user.currentRoom) {
                const { username, currentRoom } = user;
                console.log(`User ${username} (${socket.id}) removed from DB, was in room: ${currentRoom}`);

                // Notify others in the room that the user left
                // Use io.to() because the socket itself is disconnected
                io.to(currentRoom).emit('user_left', {
                    username: username,
                    message: `${username} has left the chat.`
                });

                // Check if the room they left is now empty
                const usersLeftInRoom = await User.countDocuments({ currentRoom: currentRoom });
                console.log(`Users left in ${currentRoom}: ${usersLeftInRoom}`);
                if (usersLeftInRoom === 0 && currentRoom !== "Everyone") {
                    // If the room is empty and not the default, broadcast the updated list
                    await broadcastRoomList();
                }
            } else if (user) {
                 console.log(`User record deleted for ${socket.id} (was not in a room).`);
            } else {
                 console.log(`No user record found for disconnected socket ${socket.id}. Nothing to clean up.`);
            }
        } catch (error) {
            // Avoid crashing the server on disconnect errors
            console.error(`Error handling disconnect for socket ${socket.id}:`, error);
        }
    });

})



mongoose.connect(process.env.MONGODB_URI)
.then(() => {
    console.log('Connected to MongoDB');
    httpServer.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`)
    })
})
.catch((err) => {
    console.error('MongoDB connection error:', err);
})    


// --- Graceful Shutdown ---
process.on('SIGINT', async () => {
    console.log('\nSIGINT signal received: Closing server and database connection...');
    io.close(() => { // Close Socket.IO connections gracefully
        console.log('Socket.IO server closed.');
    });
    httpServer.close(async () => {
        console.log('HTTP server closed.');
        try {
            await mongoose.connection.close(false); // Close Mongoose connection
            console.log('MongoDB connection closed.');
            process.exit(0); // Exit process cleanly
        } catch (err) {
            console.error('Error closing MongoDB connection:', err);
            process.exit(1); // Exit with error code
        }
    });

    // Force close after a timeout if graceful shutdown fails
    setTimeout(() => {
        console.error('Could not close connections gracefully, forcing shutdown.');
        process.exit(1);
    }, 10000); // 10 seconds timeout
});