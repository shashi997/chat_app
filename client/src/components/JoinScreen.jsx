// e:\placement\Zoological Drawdown\real_time_chat\chat_app_v2\client\src\components\JoinScreen.jsx
import React, { useState } from 'react';

function JoinScreen({ username, setUsername, roomList, joinError, onJoin }) {
    const [newRoomName, setNewRoomName] = useState('');

    const handleJoin = (roomToJoin) => {
        if (username.trim() && roomToJoin.trim()) {
            onJoin(roomToJoin); // Call the function passed from App.jsx
        } else {
            // Basic validation feedback could be improved
            alert("Please enter a username and select or create a room.");
        }
    };

    const handleCreateAndJoin = () => {
        if (newRoomName.trim()) {
            handleJoin(newRoomName);
            setNewRoomName(''); // Clear input after attempting join
        } else {
             alert("Please enter a name for the new room.");
        }
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
            <h3 className="text-2xl font-bold mb-6 text-center text-gray-700">Join or Create a Room</h3>

            {joinError && (
                <p className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{joinError}</p>
            )}

            {/* Username Input */}
            <div className="mb-4">
                <label htmlFor="username" className="block text-gray-600 mb-1 font-semibold">Your Username</label>
                <input
                    id="username"
                    type="text"
                    placeholder="Enter your username..."
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
            </div>

            {/* Available Rooms List */}
            <div className="mb-6">
                <h4 className="text-lg font-semibold mb-2 text-gray-700">Available Rooms</h4>
                {roomList.length > 0 ? (
                    <ul className="max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2 bg-gray-50 space-y-1">
                        {roomList.map((room) => (
                            <li key={room}>
                                <button
                                    onClick={() => handleJoin(room)}
                                    className="w-full text-left px-3 py-1 rounded hover:bg-blue-100 text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                    disabled={!username.trim()} // Disable if no username
                                    title={!username.trim() ? "Enter username to join" : `Join ${room}`}
                                >
                                    {room}
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500 italic">No active rooms. Create one!</p>
                )}
            </div>

            {/* Create New Room */}
            <div className="mb-4">
                 <label htmlFor="newRoom" className="block text-gray-600 mb-1 font-semibold">Create New Room</label>
                <div className="flex">
                    <input
                        id="newRoom"
                        type="text"
                        placeholder="Enter new room name..."
                        className="flex-1 border border-gray-300 rounded-l-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        onKeyPress={(event) => { event.key === 'Enter' && handleCreateAndJoin(); }}
                        disabled={!username.trim()} // Disable if no username
                    />
                    <button
                        onClick={handleCreateAndJoin}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-r-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 disabled:opacity-50"
                        disabled={!username.trim() || !newRoomName.trim()}
                    >
                        Create & Join
                    </button>
                </div>
            </div>
        </div>
    );
}

export default JoinScreen;
