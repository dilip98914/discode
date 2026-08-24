import React from 'react';
import { useState } from 'react';
import { Link, RouteChildrenProps } from 'react-router-dom';

const JoinRoom: React.FC<RouteChildrenProps<any>> = (props) => {
    const [roomId, setRoomId] = useState<string>('');
    const [userName, setUserName] = useState<string>(localStorage.getItem('discode_username') || '');

    const handleJoin = () => {
        if (!roomId) return alert('Please enter a room ID');
        const finalName = userName.trim() || 'Developer';
        localStorage.setItem('discode_username', finalName);
        props.history.push(`/room/${roomId.trim()}`);
    };

    return (
        <div className="container-fluid">
            <div>
                <div className="form-group text-center pt-5 mt-3 row justify-content-center">
                    <div className="col-12 col-md-5">
                        <h2 className="mb-4">Join Room</h2>
                        <div className="text-start mb-3">
                            <label className="form-label fw-bold">Your Name / Handle</label>
                            <input
                                type="text"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                className="form-control"
                                placeholder="e.g. Bob, Interviewer"
                            />
                        </div>
                        <div className="text-start mb-3">
                            <label className="form-label fw-bold">Room ID</label>
                            <input
                                type="text"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                className="form-control"
                                placeholder="Paste UUID room ID"
                            />
                        </div>
                        <small id="emailHelp" className="form-text text-muted d-block mb-4">
                            Ask from room host or <Link to="/newroom"> Make your own room </Link>
                        </small>
                        <button onClick={handleJoin} className="btn btn-primary btn-lg w-100">
                            Join Room
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JoinRoom;
