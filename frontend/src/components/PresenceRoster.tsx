import React from 'react';
import { UserPresence } from '../types';

interface PresenceRosterProps {
    users: UserPresence[];
    currentUserId: string;
}

export const PresenceRoster: React.FC<PresenceRosterProps> = ({ users, currentUserId }) => {
    return (
        <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="badge bg-dark border border-secondary text-muted small py-1 px-2">
                👥 {users.length} Online
            </span>
            {users.map((user) => {
                const isMe = user.id === currentUserId;
                return (
                    <div
                        key={user.id}
                        className="badge d-flex align-items-center gap-1 py-1 px-2 text-white border"
                        style={{
                            backgroundColor: user.color || '#00adb5',
                            borderColor: isMe ? '#ffffff' : 'transparent',
                            fontSize: '0.85rem'
                        }}
                        title={`${user.name} ${isMe ? '(You)' : ''}`}
                    >
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00ff88', display: 'inline-block' }} />
                        <span>{user.name} {isMe ? '(You)' : ''}</span>
                    </div>
                );
            })}
        </div>
    );
};

export default PresenceRoster;
