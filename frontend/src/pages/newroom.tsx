import React from 'react';
import { useState } from 'react';
import { Link, RouteChildrenProps } from 'react-router-dom';
import API from '../utils/API';

const NewRoom: React.FC<RouteChildrenProps<any>> = (props) => {
    const [roomName, setRoomName] = useState<string>('');
    const [userName, setUserName] = useState<string>(localStorage.getItem('discode_username') || '');

    const handleSubmit = () => {
        if (!roomName) return alert('Please enter a room name');
        const finalName = userName.trim() || 'Developer';
        localStorage.setItem('discode_username', finalName);

        API.post('/api/room', { title: roomName, author_name: finalName })
            .then((res) => {
                props.history.push(`/room/${res.data.data.id}`);
            })
            .catch((err) => {
                alert('Looks like some error occured');
            });
    };

    return (
        <div className="container-fluid">
            <div>
                <div className="form-group text-center pt-5 mt-3 row justify-content-center">
                    <div className="col-12 col-md-5">
                        <h2 className="mb-4">Create New Room</h2>
                        <div className="text-start mb-3">
                            <label className="form-label fw-bold">Your Name / Handle</label>
                            <input
                                type="text"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                className="form-control"
                                placeholder="e.g. Alice, Senior Dev"
                            />
                        </div>
                        <div className="text-start mb-3">
                            <label className="form-label fw-bold">Room Name</label>
                            <input
                                type="text"
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                                className="form-control"
                                placeholder="e.g. System Design Mock Interview"
                            />
                        </div>
                        <small id="emailHelp" className="form-text text-muted d-block mb-4">
                            Create your room or <Link to="/joinroom"> Join another </Link>
                        </small>
                        <button onClick={handleSubmit} className="btn btn-primary btn-lg w-100">
                            Create & Enter Room
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewRoom;
