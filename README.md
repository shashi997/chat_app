# Real-Time Chat Application (MERN + Socket.IO)

This is a simple real-time chat application built using the MERN stack (MongoDB - *although not yet implemented*, Express, React, Node.js) and Socket.IO for WebSocket communication. It allows users to join different chat rooms, create new rooms, and communicate with others in real-time.

## Features

*   **Real-time Messaging:** Send and receive messages instantly without page reloads.
*   **Usernames:** Users identify themselves with a username.
*   **Room Creation:** Users can create new chat rooms.
*   **Room Joining:** Users can see a list of active rooms and join existing ones.
*   **Default "Everyone" Room:** A global room available for all users.
*   **User Join/Leave Notifications:** See when users join or leave a chat room.
*   **Basic Styling:** Uses Tailwind CSS for a clean UI.

## Tech Stack

*   **Backend:**
    *   Node.js
    *   Express.js
    *   Socket.IO (WebSocket library)
    *   `cors` (for handling Cross-Origin Resource Sharing)
*   **Frontend:**
    *   React (via Vite)
    *   Socket.IO Client
    *   Tailwind CSS
*   **Development:**
    *   Vite (Frontend build tool)
    *   `nodemon` (Optional, for automatic server restarts)

## Future Enhancements

*   **Database Integration:** Persist users, rooms, and messages using MongoDB (or another database).
*   **User Authentication:** Implement proper login/signup functionality.
*   **Private Messaging:** Allow users to message each other directly.
*   **Typing Indicators:** Show when a user is typing a message.
*   **User List:** Display a list of users currently in a room.
*   **Error Handling:** More robust error handling on both client and server.
*   **Deployment:** Instructions for deploying the application (e.g., using Heroku, Vercel, AWS).
*   **Scalability:** Consider strategies for handling a larger number of users and rooms (e.g., using Redis for Socket.IO scaling).