const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')

const app = express()
const PORT = 8080

// middleware
app.use(cors({
    origin: ["https://chat-app-client-psi-five.vercel.app"],
}));

const httpServer = http.createServer(app)
const io = new Server(httpServer, {
    cors: {
        origin: ["https://chat-app-client-psi-five.vercel.app"],
        methods: ["GET", "POST"],
    }
})

// --- State Management ---
// Keep track of users in rooms (in-memory, replace with DB for persistence)
const users = {}; // users: { socketId: { username, currentRoom } }
// rooms: { roomName: Set<socketId> } - Using Set for efficient add/delete
const rooms = {
    "Everyone": new Set() // Start with a default "Everyone" room
};


// --- Helper Functions ---
function getActiveRooms() {
    // Return room names that have users or the default "Everyone" room
    // You might refine this logic based on whether you want to show empty custom rooms
    return Object.keys(rooms).filter(room => rooms[room].size > 0 || room === "Everyone");
}

function broadcastRoomList() {
    io.emit('update_room_list', getActiveRooms());
    console.log('Broadcasting updated room list:', getActiveRooms());
}

function handleLeaveRoom(socket) {
    const user = users[socket.id];
    if (!user || !user.currentRoom) return; // Not in a room

    const { username, currentRoom } = user;
    console.log(`User ${username} (${socket.id}) leaving room: ${currentRoom}`);

    // Leave Socket.IO room
    socket.leave(currentRoom);

    // Remove from our tracking Set
    if (rooms[currentRoom]) {
        rooms[currentRoom].delete(socket.id);
        console.log(`Users left in ${currentRoom}: ${rooms[currentRoom].size}`);

        // Notify others in the room
        socket.to(currentRoom).emit('user_left', {
            username: username,
            message: `${username} has left the chat.`
        });

        // Clean up room if empty (and not the default "Everyone" room)
        if (rooms[currentRoom].size === 0 && currentRoom !== "Everyone") {
            console.log(`Deleting empty room: ${currentRoom}`);
            delete rooms[currentRoom];
            broadcastRoomList(); // Update list as room was removed
        }
    }

    // Clear user's current room
    user.currentRoom = null;
}



app.get('/', (req, res) => {
    res.sendFile(__dirname + "/index.html")
})


// --- Socket.IO Logic ---
io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`)

    // Send initial room list to the newly connected client
    socket.emit('update_room_list', getActiveRooms());

    // Handle setting username (might happen before joining a room)
    // Or combine this with join_room if username is always set then
    // For simplicity, let's assume username is sent with join_room

    // Handle joining a room
    socket.on('join_room', (data) => {
        const { username, room } = data;

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

        // --- Leave previous room if any ---
        handleLeaveRoom(socket);

        // --- Join new room ---
        socket.join(room);
        users[socket.id] = { ...(users[socket.id] || {}), username, currentRoom: room }; // Store/update user info

        // Add user to our room tracking Set
        if (!rooms[room]) {
            rooms[room] = new Set();
            console.log(`Created new room: ${room}`);
            // Broadcast updated list ONLY if a new room was actually created
            broadcastRoomList();
        }
        rooms[room].add(socket.id);

        console.log(`User ${username} (${socket.id}) joined room: ${room}`);
        console.log(`Users now in ${room}: ${rooms[room].size}`);

        // Notify others in the room
        socket.to(room).emit('user_joined', {
            username: username,
            message: `${username} has joined the chat.`
        });

        // Send confirmation back to the user who joined
        socket.emit('joined_room', { username: username, room: room });

        // Optional: Send updated user list for the room
        // const usersInRoom = rooms[room].map(id => users[id]?.username).filter(Boolean);
        // io.to(room).emit('room_users', { room, users: usersInRoom });
    });



    // Handle sending messages
    socket.on('send_message', (data) => {
        const { room, message } = data;
        const user = users[socket.id];

        // Ensure user exists, has a username, and is in the specified room
        if (user && user.username && user.currentRoom === room) {
            const messageData = {
                username: user.username,
                message: message,
                room: room,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            console.log(`Message from ${user.username} in room ${room}: ${message}`);
            io.to(room).emit('receive_message', messageData);
        } else {
            console.warn(`User ${socket.id} (Username: ${user?.username}) tried to send message to room ${room} but isn't joined correctly (Current Room: ${user?.currentRoom}).`);
            socket.emit('send_error', { message: 'Cannot send message. Ensure you are correctly joined to the room.' });
        }
    });


    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`User Disconnected: ${socket.id}`);
        // Leave the room the user was in
        handleLeaveRoom(socket);
        // Clean up user data
        delete users[socket.id];
    });

})


httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})