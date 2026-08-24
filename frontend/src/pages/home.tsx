import React from 'react';
import { Link } from 'react-router-dom';
import History from '../components/history';

interface HomeProps {
    previousRooms: string[];
}

const Home: React.FC<HomeProps> = ({ previousRooms }) => {
    return (
        <div className="p-5 text-center">
            <div>
                <h1 className="mb-3 fw-bold text-primary">Discode</h1>
                <h4 className="mb-3 text-secondary">Real-Time Code Collaboration with Monaco & Voice Rooms</h4>
                <p className="text-muted">
                    Collaborate live in VS Code's editor engine with multi-file workspaces, colored cursor flags, and 6-language local execution.
                </p>
                <br />
                <Link className="btn btn-primary btn-lg p-2 m-2 px-4" to="/newroom">
                    ✨ Create a Room
                </Link>
                <Link className="btn btn-outline-primary btn-lg p-2 m-2 px-4" to="/joinroom">
                    🚪 Join a Room
                </Link>
            </div>
            <br />
            {previousRooms.length > 0 ? (
                <div className="mt-4 text-start container" style={{ maxWidth: '700px' }}>
                    <hr />
                    <h4 className="mb-3">Recent Rooms</h4>
                    <History previousRooms={previousRooms} />
                </div>
            ) : (
                <div />
            )}
        </div>
    );
};

export default Home;
