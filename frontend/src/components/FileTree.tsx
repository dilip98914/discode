import React, { useState } from 'react';
import { ProjectFiles } from '../types';

interface FileTreeProps {
    files: ProjectFiles;
    activeFile: string;
    onSelectFile: (filename: string) => void;
    onCreateFile: (filename: string) => void;
    onDeleteFile: (filename: string) => void;
}

export const FileTree: React.FC<FileTreeProps> = ({
    files,
    activeFile,
    onSelectFile,
    onCreateFile,
    onDeleteFile
}) => {
    const [newFileName, setNewFileName] = useState('');
    const [showInput, setShowInput] = useState(false);

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newFileName.trim();
        if (trimmed && !files[trimmed]) {
            onCreateFile(trimmed);
            setNewFileName('');
            setShowInput(false);
        }
    };

    const fileList = Object.keys(files);

    return (
        <div className="d-flex align-items-center gap-1 border-bottom border-secondary pb-1 mb-2 bg-dark px-2 rounded">
            <div className="d-flex align-items-center gap-1 flex-grow-1 overflow-auto" style={{ whiteSpace: 'nowrap' }}>
                {fileList.map((filename) => {
                    const isActive = filename === activeFile;
                    return (
                        <div
                            key={filename}
                            onClick={() => onSelectFile(filename)}
                            className={`btn btn-sm d-flex align-items-center gap-1 ${
                                isActive ? 'btn-primary' : 'btn-outline-secondary text-light'
                            }`}
                            style={{ cursor: 'pointer', padding: '3px 8px', fontSize: '0.82rem' }}
                        >
                            <span>📄 {filename}</span>
                            {fileList.length > 1 && (
                                <span
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(`Delete file ${filename}?`)) {
                                            onDeleteFile(filename);
                                        }
                                    }}
                                    className="text-muted ms-1 hover-danger"
                                    style={{ cursor: 'pointer', fontWeight: 'bold' }}
                                    title="Delete file"
                                >
                                    &times;
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {showInput ? (
                <form onSubmit={handleCreate} className="d-flex align-items-center gap-1">
                    <input
                        type="text"
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        placeholder="file.py"
                        className="form-control form-control-sm bg-dark text-white border-secondary"
                        style={{ width: '110px', height: '28px', fontSize: '0.8rem' }}
                        autoFocus
                    />
                    <button type="submit" className="btn btn-sm btn-success py-0 px-2" style={{ height: '28px' }}>
                        +
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowInput(false)}
                        className="btn btn-sm btn-outline-secondary py-0 px-1"
                        style={{ height: '28px' }}
                    >
                        ✕
                    </button>
                </form>
            ) : (
                <button
                    onClick={() => setShowInput(true)}
                    className="btn btn-sm btn-outline-info py-0 px-2"
                    style={{ height: '28px', fontSize: '0.8rem' }}
                    title="Add new file to room"
                >
                    + New File
                </button>
            )}
        </div>
    );
};

export default FileTree;
