import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { RouteComponentProps, withRouter } from 'react-router';
import MonacoEditor from '../components/MonacoEditor';
import FileTree from '../components/FileTree';
import PresenceRoster from '../components/PresenceRoster';
import ExportModal from '../components/ExportModal';
import API from '../utils/API';
import SplitPane from 'react-split-pane';
import socket from '../utils/socket';
import Peer from 'peerjs';
import { UserPresence, RemoteCursor, ProjectFiles, CodeHistoryItem } from '../types';

interface RoomProps {
    updatePreviousRooms: (room: string) => any;
}

let myPeer: Peer;
let myAudio: MediaStream | null = null;

const USER_COLORS = ['#ff4d4f', '#40a9ff', '#73d13d', '#9254de', '#ffc53d', '#36cfc9', '#ff7a45'];

const Room: React.FC<RouteComponentProps<any> & RoomProps> = (props) => {
    const [id, setId] = useState<string>('');
    const [title, setTitle] = useState<string>('');
    const [input, setInput] = useState<string>('');
    const [output, setOutput] = useState<string>('');
    const [windowWidth, setWindowWidth] = useState<number>(window.innerWidth);

    // Multi-File State & Refs (To prevent stale closures in socket events)
    const [files, setFiles] = useState<ProjectFiles>({
        'main.py': '# Collaborative Python Script\nprint("Hello from Discode!")\n'
    });
    const filesRef = useRef<ProjectFiles>(files);
    filesRef.current = files;

    const [activeFile, setActiveFile] = useState<string>('main.py');
    const activeFileRef = useRef<string>(activeFile);
    activeFileRef.current = activeFile;

    // Language & Font
    const languages = ['python', 'javascript', 'java', 'go', 'c', 'cpp', 'text'];
    const [language, setLanguage] = useState<string>(localStorage.getItem('language') ?? 'python');
    const [fontSize, setFontSize] = useState<number>(14);

    // User Handle & Presence
    const [userName, setUserName] = useState<string>(
        localStorage.getItem('discode_username') || `Dev-${Math.floor(1000 + Math.random() * 9000)}`
    );
    const userNameRef = useRef<string>(userName);
    userNameRef.current = userName;

    const userColor = useMemo(() => USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)], []);
    const [presenceUsers, setPresenceUsers] = useState<UserPresence[]>([]);
    const [remoteCursors, setRemoteCursors] = useState<{ [userId: string]: RemoteCursor }>({});

    // History & Export Modals
    const [showHistory, setShowHistory] = useState<boolean>(false);
    const [historyList, setHistoryList] = useState<CodeHistoryItem[]>([]);
    const [showExport, setShowExport] = useState<boolean>(false);

    // Runner Status
    const idleStatus = 'Idle';
    const runningStatus = 'Running...';
    const completedStatus = 'Completed';
    const errorStatus = 'Error';
    const [submissionStatus, setSubmissionStatus] = useState<string>(idleStatus);
    const [submissionId, setSubmissionId] = useState<string>('');

    // Audio
    const [inAudio, setInAudio] = useState<boolean>(false);

    const activeCode = files[activeFile] ?? '';

    // Broadcast active file code change
    const handleCodeChange = useCallback((newCode: string) => {
        const currentFile = activeFileRef.current;
        const updatedFiles = { ...filesRef.current, [currentFile]: newCode };
        setFiles(updatedFiles);

        socket.emit('updateBody', { value: newCode, roomId: props.match.params.id });
        socket.emit('files:sync', {
            roomId: props.match.params.id,
            files: updatedFiles,
            activeFile: currentFile
        });
    }, [props.match.params.id]);

    // Handle File Operations
    const handleSelectFile = (filename: string) => {
        setActiveFile(filename);
        socket.emit('file:switch', { roomId: id, activeFile: filename });
    };

    const handleCreateFile = (filename: string) => {
        const updatedFiles = { ...filesRef.current, [filename]: '' };
        setFiles(updatedFiles);
        setActiveFile(filename);
        socket.emit('files:sync', { roomId: id, files: updatedFiles, activeFile: filename });
    };

    const handleDeleteFile = (filename: string) => {
        const remaining = { ...filesRef.current };
        delete remaining[filename];
        const nextActive = Object.keys(remaining)[0] || 'main.py';
        if (!remaining[nextActive]) remaining[nextActive] = '';
        setFiles(remaining);
        setActiveFile(nextActive);
        socket.emit('files:sync', { roomId: id, files: remaining, activeFile: nextActive });
    };

    // Join and Sync Lifecycle
    useEffect(() => {
        const roomId = props.match.params.id;
        setId(roomId);

        const joinRoom = () => {
            socket.emit('joinroom', roomId);
            socket.emit('user:join', {
                roomId,
                user: {
                    id: socket.id,
                    name: userNameRef.current,
                    color: userColor,
                    activeFile: activeFileRef.current
                }
            });
        };

        if (socket.connected) {
            joinRoom();
        }
        socket.on('connect', joinRoom);

        // Fetch initial room state from backend
        API.get(`/api/room/${roomId}`)
            .then((res) => {
                const { title: rTitle, body: rBody, language: rLang, input: rInput } = res.data.data;
                if (rTitle) {
                    setTitle(rTitle);
                    document.title = `Discode: ${rTitle}`;
                    props.updatePreviousRooms(`${roomId}!${rTitle}`);
                }
                if (rLang) setLanguage(rLang);
                if (rInput) setInput(rInput);

                if (rBody) {
                    try {
                        const parsed = JSON.parse(rBody);
                        if (parsed && parsed.files && Object.keys(parsed.files).length > 0) {
                            setFiles(parsed.files);
                            const initialActive = parsed.activeFile || Object.keys(parsed.files)[0];
                            setActiveFile(initialActive);
                        } else {
                            setFiles({ [`main.${getExtension(rLang || 'python')}`]: rBody });
                        }
                    } catch {
                        setFiles({ [`main.${getExtension(rLang || 'python')}`]: rBody });
                    }
                }
            })
            .catch(() => props.history.push('/404'));

        // Real-Time Socket Listeners
        socket.on('presence:update', (users: UserPresence[]) => {
            setPresenceUsers(users || []);
        });

        socket.on('cursor:update', (cursor: RemoteCursor) => {
            setRemoteCursors((prev) => ({ ...prev, [cursor.userId]: cursor }));
        });

        socket.on('cursor:remove', ({ userId }: { userId: string }) => {
            setRemoteCursors((prev) => {
                const copy = { ...prev };
                delete copy[userId];
                return copy;
            });
        });

        socket.on('files:synced', ({ files: incomingFiles }: { files: ProjectFiles }) => {
            if (incomingFiles) {
                setFiles(incomingFiles);
            }
        });

        socket.on('updateBody', (incomingBody: string) => {
            setFiles((prev) => ({ ...prev, [activeFileRef.current]: incomingBody }));
        });

        socket.on('setBody', (incomingBody: string) => {
            setFiles((prev) => ({ ...prev, [activeFileRef.current]: incomingBody }));
        });

        socket.on('updateInput', (incomingInput: string) => setInput(incomingInput));
        socket.on('setInput', (incomingInput: string) => setInput(incomingInput));
        socket.on('setLanguage', (lang: string) => setLanguage(lang));
        socket.on('setOutput', (out: string) => setOutput(out));

        const resizeCallback = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', resizeCallback);

        return () => {
            window.removeEventListener('resize', resizeCallback);
            socket.off('connect', joinRoom);
            socket.off('presence:update');
            socket.off('cursor:update');
            socket.off('cursor:remove');
            socket.off('files:synced');
            socket.off('updateBody');
            socket.off('setBody');
            socket.off('updateInput');
            socket.off('setInput');
            socket.off('setLanguage');
            socket.off('setOutput');
            socket.emit('leaveroom', roomId);
        };
    }, [props.match.params.id, userColor]);

    // Handle Cursor Movement
    const handleCursorChange = (pos: { lineNumber: number; column: number }) => {
        socket.emit('cursor:move', { roomId: id, position: pos });
    };

    // Code Execution
    const handleSubmit = () => {
        if (submissionStatus === runningStatus) return;
        setSubmissionStatus(runningStatus);

        const projectPayload = JSON.stringify({ files, activeFile });

        API.patch(`/api/room/${id}`, {
            title,
            body: projectPayload,
            input,
            language,
            author_name: userName
        }).catch(() => setSubmissionStatus(errorStatus));

        API.post('/api/runner/create', {
            source_code: activeCode,
            language,
            input,
            files
        })
            .then((res) => {
                const { id: runnerId, status } = res.data;
                setSubmissionId(runnerId);
                setSubmissionStatus(status);
            })
            .catch(() => {
                setSubmissionId('');
                setSubmissionStatus(errorStatus);
            });
    };

    useEffect(() => {
        if (submissionId) {
            const interval = setInterval(() => {
                API.get(`/api/runner/status?id=${encodeURIComponent(submissionId)}`).then((res) => {
                    const { status } = res.data;
                    if (status !== runningStatus) {
                        clearInterval(interval);
                        setSubmissionStatus(status);
                        API.get(`/api/runner/details?id=${encodeURIComponent(submissionId)}`).then((det) => {
                            const { stdout, stderr, build_stderr } = det.data;
                            const combined =
                                (build_stderr ? `[Compiler Error]\n${build_stderr}\n` : '') +
                                (stdout || '') +
                                (stderr ? `\n[Runtime Error]\n${stderr}` : '');
                            setOutput(combined);
                            socket.emit('setOutput', { value: combined, roomId: id });
                        });
                    }
                });
            }, 700);
            return () => clearInterval(interval);
        }
    }, [submissionId, id]);

    const fetchHistory = () => {
        API.get(`/api/room/${id}/history`)
            .then((res) => {
                setHistoryList(res.data.data || []);
                setShowHistory(true);
            })
            .catch(() => alert('Could not fetch room history'));
    };

    // Voice Room Logic
    useEffect(() => {
        if (inAudio) {
            const peerPort = window.location.port
                ? parseInt(window.location.port, 10)
                : window.location.protocol === 'https:'
                ? 443
                : 80;

            myPeer = new Peer({
                host: window.location.hostname,
                port: peerPort,
                path: '/peerjs',
                secure: window.location.protocol === 'https:'
            });

            myPeer.on('open', (userId) => {
                navigator.mediaDevices
                    .getUserMedia({ audio: true, video: false })
                    .then((stream) => {
                        myAudio = stream;
                        socket.emit('joinAudioRoom', id, userId);
                    })
                    .catch(() => alert('Microphone access denied'));
            });

            return () => {
                if (myPeer) myPeer.destroy();
                if (myAudio) myAudio.getTracks().forEach((t) => t.stop());
            };
        }
    }, [inAudio, id]);

    return (
        <div className="bg-dark text-white min-vh-100 d-flex flex-column">
            {/* Top Toolbar */}
            <div className="p-2 border-bottom border-secondary bg-black d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div className="d-flex align-items-center gap-2">
                    <h5 className="mb-0 text-primary fw-bold">Discode</h5>
                    <span className="badge bg-secondary">{title || 'Collaborative Room'}</span>
                    <PresenceRoster users={presenceUsers} currentUserId={socket.id} />
                </div>

                <div className="d-flex align-items-center gap-2 flex-wrap">
                    {/* Language Selector */}
                    <select
                        className="form-select form-select-sm bg-dark text-white border-secondary"
                        style={{ width: '130px' }}
                        value={language}
                        onChange={(e) => {
                            setLanguage(e.target.value);
                            localStorage.setItem('language', e.target.value);
                            socket.emit('setLanguage', { value: e.target.value, roomId: id });
                        }}
                    >
                        {languages.map((l) => (
                            <option key={l} value={l}>
                                {l.toUpperCase()}
                            </option>
                        ))}
                    </select>

                    {/* Font Size */}
                    <select
                        className="form-select form-select-sm bg-dark text-white border-secondary"
                        style={{ width: '80px' }}
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                    >
                        {[12, 14, 16, 18, 20].map((s) => (
                            <option key={s} value={s}>
                                {s}px
                            </option>
                        ))}
                    </select>

                    {/* Handle */}
                    <input
                        type="text"
                        value={userName}
                        onChange={(e) => {
                            setUserName(e.target.value);
                            localStorage.setItem('discode_username', e.target.value);
                            socket.emit('user:join', {
                                roomId: id,
                                user: {
                                    id: socket.id,
                                    name: e.target.value,
                                    color: userColor,
                                    activeFile: activeFileRef.current
                                }
                            });
                        }}
                        className="form-control form-control-sm bg-dark text-white border-secondary"
                        style={{ width: '110px' }}
                        placeholder="Your name"
                        title="Your collaborator display handle"
                    />

                    {/* Action Buttons */}
                    <button className="btn btn-sm btn-outline-info" onClick={fetchHistory} title="View 30-day code audit history">
                        📜 History
                    </button>

                    <button className="btn btn-sm btn-outline-success" onClick={() => setShowExport(true)} title="Export workspace to ZIP or Gist">
                        📦 Export
                    </button>

                    <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => navigator.clipboard.writeText(window.location.href)}
                        title="Copy shareable room link"
                    >
                        🔗 Link
                    </button>

                    {/* Voice Room */}
                    <button
                        className={`btn btn-sm ${inAudio ? 'btn-danger' : 'btn-outline-primary'}`}
                        onClick={() => setInAudio(!inAudio)}
                    >
                        {inAudio ? 'Leave Voice' : '🎙️ Join Voice'}
                    </button>

                    {/* Run Button */}
                    <button
                        className={`btn btn-sm ${submissionStatus === runningStatus ? 'btn-warning' : 'btn-primary'} fw-bold px-3`}
                        onClick={handleSubmit}
                        disabled={submissionStatus === runningStatus}
                    >
                        {submissionStatus === runningStatus ? '⏳ Running...' : '▶ Run Code'}
                    </button>
                </div>
            </div>

            {/* Main Workspace Area */}
            <div className="flex-grow-1 position-relative">
                <SplitPane
                    split="vertical"
                    minSize={250}
                    maxSize={windowWidth - 250}
                    defaultSize={windowWidth * 0.65}
                    style={{ height: 'calc(100vh - 58px)' }}
                >
                    {/* Left: Multi-File Code Editor */}
                    <div className="d-flex flex-column h-100 p-2 bg-dark">
                        <FileTree
                            files={files}
                            activeFile={activeFile}
                            onSelectFile={handleSelectFile}
                            onCreateFile={handleCreateFile}
                            onDeleteFile={handleDeleteFile}
                        />
                        <div className="flex-grow-1 border border-secondary rounded overflow-hidden">
                            <MonacoEditor
                                language={language}
                                theme="vs-dark"
                                value={activeCode}
                                onChange={handleCodeChange}
                                onCursorChange={handleCursorChange}
                                remoteCursors={Object.values(remoteCursors)}
                                fontSize={fontSize}
                            />
                        </div>
                    </div>

                    {/* Right: I/O Console Panels */}
                    <div className="d-flex flex-column h-100 p-2 bg-dark gap-2">
                        {/* Stdin Panel */}
                        <div className="d-flex flex-column" style={{ height: '35%' }}>
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className="fw-bold small text-muted">📥 Custom Input (stdin)</span>
                            </div>
                            <textarea
                                className="form-control bg-black text-white border-secondary font-monospace flex-grow-1 small"
                                style={{ resize: 'none' }}
                                value={input}
                                onChange={(e) => {
                                    setInput(e.target.value);
                                    socket.emit('updateInput', { value: e.target.value, roomId: id });
                                }}
                                placeholder="Enter custom inputs to be read by stdin..."
                            />
                        </div>

                        {/* Stdout/Stderr Panel */}
                        <div className="d-flex flex-column flex-grow-1">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className="fw-bold small text-muted">📤 Execution Output (stdout / stderr)</span>
                                <span className={`badge ${submissionStatus === completedStatus ? 'bg-success' : submissionStatus === errorStatus ? 'bg-danger' : 'bg-dark'}`}>
                                    {submissionStatus}
                                </span>
                            </div>
                            <pre className="p-2 bg-black text-light border border-secondary rounded font-monospace flex-grow-1 small overflow-auto mb-0" style={{ maxHeight: '100%' }}>
                                <code>{output || 'Click "Run Code" to compile and execute locally.'}</code>
                            </pre>
                        </div>
                    </div>
                </SplitPane>
            </div>

            {/* Export Modal */}
            {showExport && (
                <ExportModal
                    roomTitle={title}
                    files={files}
                    activeLanguage={language}
                    onClose={() => setShowExport(false)}
                />
            )}

            {/* 30-Day Audit History Modal */}
            {showHistory && (
                <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 9999 }}>
                    <div className="modal-dialog modal-lg modal-dialog-scrollable">
                        <div className="modal-content bg-dark text-white border-secondary">
                            <div className="modal-header border-secondary">
                                <h5 className="modal-title">📜 30-Day Code Attribution History</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowHistory(false)} />
                            </div>
                            <div className="modal-body">
                                {historyList.length === 0 ? (
                                    <p className="text-center py-4 text-muted">No historical snapshots found for this room.</p>
                                ) : (
                                    <div className="list-group">
                                        {historyList.map((item) => (
                                            <div key={item.id} className="list-group-item bg-black text-white border-secondary mb-2 rounded">
                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                    <div>
                                                        <span className="badge bg-primary me-2">👤 {item.author_name}</span>
                                                        <span className="badge bg-secondary me-2">{item.action}</span>
                                                        <span className="badge bg-dark border border-secondary">{item.language}</span>
                                                    </div>
                                                    <small className="text-muted">
                                                        {item.created_at ? new Date(item.created_at).toLocaleString() : 'Just now'}
                                                    </small>
                                                </div>
                                                <pre className="p-2 mt-2 bg-dark rounded small text-light" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                                                    <code>{item.code_snapshot}</code>
                                                </pre>
                                                <button
                                                    className="btn btn-sm btn-outline-warning mt-1"
                                                    onClick={() => {
                                                        if (window.confirm('Restore this snapshot to active workspace?')) {
                                                            try {
                                                                const parsed = JSON.parse(item.code_snapshot);
                                                                if (parsed && parsed.files) {
                                                                    setFiles(parsed.files);
                                                                    setActiveFile(parsed.activeFile || Object.keys(parsed.files)[0]);
                                                                } else {
                                                                    setFiles({ [`main.${getExtension(item.language || 'python')}`]: item.code_snapshot });
                                                                }
                                                            } catch {
                                                                setFiles({ [`main.${getExtension(item.language || 'python')}`]: item.code_snapshot });
                                                            }
                                                            setShowHistory(false);
                                                        }
                                                    }}
                                                >
                                                    Restore Snapshot
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer border-secondary">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowHistory(false)}>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

function getExtension(lang: string): string {
    switch (lang.toLowerCase()) {
        case 'python': return 'py';
        case 'javascript': case 'js': return 'js';
        case 'java': return 'java';
        case 'go': case 'golang': return 'go';
        case 'c': return 'c';
        case 'cpp': case 'c_cpp': return 'cpp';
        default: return 'txt';
    }
}

export default withRouter(Room);
