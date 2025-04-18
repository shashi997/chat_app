// e:\placement\Zoological Drawdown\real_time_chat\chat_app_v2\client\src\components\Chat.jsx
import React, { useState, useEffect, useRef } from 'react';

// Add onLeaveRoom prop
function Chat({ socket, username, room, onLeaveRoom }) {
    const [currentMessage, setCurrentMessage] = useState('');
    const [messageList, setMessageList] = useState([]);
    const messagesEndRef = useRef(null);

    const sendMessage = async () => {
        if (currentMessage.trim() !== '' && username && room && socket) {
            const messageData = {
                room: room,
                // username is derived server-side based on socket ID now, but sending is fine
                message: currentMessage,
            };
            // No need to add locally, rely on server broadcast for consistency
            await socket.emit('send_message', messageData);
            setCurrentMessage('');
        } else {
            console.error("Cannot send message: Missing data or socket.");
            // Consider showing user feedback
        }
    };

    // Effect to handle incoming messages and notifications
    useEffect(() => {
        if (!socket) return;

        // Clear message list when room changes (or component mounts for a room)
        setMessageList([]);

        const handleReceiveMessage = (data) => {
            console.log("Received message:", data);
            // Filter message for current room? Server should only send relevant ones.
            // if (data.room === room) { // This check might be redundant if server logic is correct
                 setMessageList((list) => [...list, data]);
            // }
        };

        const handleUserEvent = (data, type) => {
             console.log(`User ${type}:`, data);
             setMessageList((list) => [...list, { type: 'notification', ...data }]);
        };

        const handleSendError = (data) => {
            console.error("Send Error:", data.message);
            alert(`Error sending message: ${data.message}`);
        };

        socket.on('receive_message', handleReceiveMessage);
        socket.on('user_joined', (data) => handleUserEvent(data, 'joined'));
        socket.on('user_left', (data) => handleUserEvent(data, 'left'));
        socket.on('send_error', handleSendError);

        // Cleanup listeners on component unmount or socket/room change
        return () => {
            socket.off('receive_message', handleReceiveMessage);
            socket.off('user_joined');
            socket.off('user_left');
            socket.off('send_error', handleSendError);
        };
        // Add room to dependency array to reset messages/listeners if room changes
    }, [socket, room]);

    // Effect to scroll to the bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messageList]);

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] w-full max-w-2xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden border border-gray-200">
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 flex justify-between items-center shadow-md">
                <div>
                    <h2 className="text-xl font-semibold">Room: {room}</h2>
                    <p className="text-sm opacity-90">User: {username}</p>
                </div>
                {/* Leave Room Button */}
                <button
                    onClick={onLeaveRoom} // Use the passed handler
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-indigo-700"
                >
                    Leave Room
                </button>
            </div>

            {/* Message Area */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-4 scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-gray-100">
                {messageList.map((msgData, index) => {
                    // ... (rendering logic remains the same as before)
                    if (msgData.type === 'notification') {
                        return (
                            <div key={index} className="text-center text-gray-500 text-sm italic my-2 px-4">
                                --- {msgData.message} ---
                            </div>
                        );
                    }
                    const isOwnMessage = msgData.username === username;
                    return (
                        <div
                            key={index}
                            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-md ${
                                    isOwnMessage
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-white text-gray-800 border border-gray-200'
                                }`}
                            >
                                {!isOwnMessage && (
                                    <p className="text-xs font-semibold text-indigo-600 mb-1">
                                        {msgData.username}
                                    </p>
                                )}
                                <p className="text-sm break-words">{msgData.message}</p>
                                <p className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-200' : 'text-gray-400'} text-right`}>
                                    {msgData.timestamp}
                                </p>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-gray-100 p-4 flex items-center border-t border-gray-200">
                <input
                    type="text"
                    value={currentMessage}
                    placeholder="Type your message..."
                    className="flex-1 border border-gray-300 rounded-l-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(event) => setCurrentMessage(event.target.value)}
                    onKeyPress={(event) => {
                        event.key === 'Enter' && sendMessage();
                    }}
                />
                <button
                    onClick={sendMessage}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                >
                    Send
                </button>
            </div>
        </div>
    );
}

export default Chat;
