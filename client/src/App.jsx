import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import Chat from "./components/Chat";
import JoinScreen from "./components/JoinScreen";

// Define socket connection outside component to avoid recreating on re-renders
// But initialize inside useEffect to ensure it runs client-side
let socketInstance = null;
const SERVER_URL = "https://chat-app-server-ten-tau.vercel.app";  // Make server URL a constant


function App() {

  const [socket, setSocket] = useState(null);
  const [username, setUsername] = useState("");
  const [currentRoom, setCurrentRoom] = useState(""); // Track the room the user is currently in
  const [roomList, setRoomList] = useState([]); // State for available rooms
  const [showChat, setShowChat] = useState(false);
  const [joinError, setJoinError] = useState(""); // State for join errors

  // Effect for initializing socket connection and basic listeners
  useEffect(() => {
    // Connect only once
    if (!socketInstance) {
      console.log("Attempting to connect socket...");
      socketInstance = io(SERVER_URL);
      setSocket(socketInstance);

      socketInstance.on('connect', () => {
          console.log("Socket connected:", socketInstance.id);
    });

      socketInstance.on('disconnect', (reason) => {
          console.log("Socket disconnected:", reason);
          // Handle potential cleanup or state reset if needed
          setShowChat(false);
          setCurrentRoom("");
          // Optionally clear username or show a disconnected message
      });

      socketInstance.on('connect_error', (err) => {
          console.error("Socket Connection Error:", err.message, err.data);
          setJoinError(`Connection failed: ${err.message}. Server might be down.`);
          // Maybe retry connection or inform user
      });
  }

  // Cleanup on component unmount
  return () => {
      if (socketInstance && socketInstance.connected) {
          console.log("Disconnecting socket on component unmount...");
          socketInstance.disconnect();
          socketInstance = null;
          setSocket(null);
      }
  };

  }, []); // Empty dependency array ensures this runs only once 


  // Effect for handling room list updates, join confirmation, and errors
  useEffect(() => {
   if (!socket) return;

   const handleRoomListUpdate = (rooms) => {
       console.log("Received room list update:", rooms);
       setRoomList(rooms || []); // Ensure it's always an array
   };

   const handleJoinedRoom = (data) => {
       console.log(`Successfully joined room: ${data.room} as ${data.username}`);
       setCurrentRoom(data.room); // Set the current room
       setUsername(data.username); // Ensure username state is synced
       setShowChat(true); // Show chat interface
       setJoinError(""); // Clear any previous errors
   };

   const handleJoinError = (data) => {
       console.error("Join Error:", data.message);
       setJoinError(data.message); // Set error message to display
       setShowChat(false); // Ensure chat is hidden
       setCurrentRoom(""); // Reset current room
   };

   // Listeners
   socket.on('update_room_list', handleRoomListUpdate);
   socket.on('joined_room', handleJoinedRoom);
   socket.on('join_error', handleJoinError);

   // Cleanup listeners
   return () => {
       socket.off('update_room_list', handleRoomListUpdate);
       socket.off('joined_room', handleJoinedRoom);
       socket.off('join_error', handleJoinError);
   };

  } , [socket]); // Rerun when socket state changes


  // Function to handle joining a room (called from JoinScreen)
  const handleJoinRoom = (roomToJoin) => {
    if (username.trim() && roomToJoin.trim() && socket) {
        console.log(`Attempting to join room '${roomToJoin}' as '${username}'`);
        setJoinError(""); // Clear previous errors
        socket.emit("join_room", { username, room: roomToJoin });
    } else {
        // This validation should ideally be handled more within JoinScreen,
        // but setting error here is okay too.
        setJoinError("Username and room name are required.");
    }
  };


  // Function to handle leaving a room (called from Chat)
  const handleLeaveRoom = () => {
    // No need to explicitly emit 'leave_room' if handled by server on next join/disconnect
    // Simply transition the UI back
    console.log(`Leaving room: ${currentRoom}`);
    setShowChat(false);
    setCurrentRoom("");
    setJoinError(""); // Clear errors when leaving
    // The server's handleLeaveRoom will be triggered implicitly
    // when the user joins another room or disconnects.
    // If you wanted an *explicit* leave action that updates server state immediately
    // without joining another room, you'd emit a 'leave_room' event here.
  };




  return (
    
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex flex-col items-center justify-center p-4 font-sans">
        {!showChat || !currentRoom ? (
            <JoinScreen
                username={username}
                setUsername={(name) => { setUsername(name); setJoinError(""); }} // Clear error on username change
                roomList={roomList}
                joinError={joinError}
                onJoin={handleJoinRoom}
            />
        ) : (
            <Chat
                socket={socket}
                username={username}
                room={currentRoom}
                onLeaveRoom={handleLeaveRoom} // Pass the leave handler
            />
        )}
    </div>

  )
}

export default App
