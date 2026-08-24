import React, { useState } from 'react';
import JSZip from 'jszip';
import { ProjectFiles } from '../types';

interface ExportModalProps {
    roomTitle: string;
    files: ProjectFiles;
    activeLanguage: string;
    onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
    roomTitle,
    files,
    activeLanguage,
    onClose
}) => {
    const [copied, setCopied] = useState(false);

    const handleDownloadZip = async () => {
        const zip = new JSZip();
        for (const [filename, content] of Object.entries(files)) {
            zip.file(filename, content);
        }

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const sanitizedTitle = (roomTitle || 'discode-project').toLowerCase().replace(/[^a-z0-9]/g, '-');
        a.download = `${sanitizedTitle}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleCopyMarkdown = () => {
        let markdown = `# ${roomTitle || 'Discode Session'}\n\n`;
        for (const [filename, content] of Object.entries(files)) {
            markdown += `### \`${filename}\`\n\`\`\`${activeLanguage}\n${content}\n\`\`\`\n\n`;
        }
        navigator.clipboard.writeText(markdown);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    return (
        <div
            className="modal show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 9999 }}
        >
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content bg-dark text-white border-secondary">
                    <div className="modal-header border-secondary">
                        <h5 className="modal-title">📦 Export Room Code & Workspace</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose} />
                    </div>
                    <div className="modal-body">
                        <p className="text-muted small mb-3">
                            Export all active files from this room for local development or sharing as a GitHub Gist.
                        </p>

                        <div className="d-grid gap-3">
                            <button onClick={handleDownloadZip} className="btn btn-outline-primary btn-lg text-start py-3 px-3 d-flex align-items-center justify-content-between">
                                <div>
                                    <div className="fw-bold">📁 Download Full Project (.ZIP)</div>
                                    <small className="text-muted">Includes all {Object.keys(files).length} files in the workspace</small>
                                </div>
                                <span className="fs-4">⬇️</span>
                            </button>

                            <button onClick={handleCopyMarkdown} className="btn btn-outline-success btn-lg text-start py-3 px-3 d-flex align-items-center justify-content-between">
                                <div>
                                    <div className="fw-bold">📋 Copy as Formatted Markdown / Gist</div>
                                    <small className="text-muted">{copied ? '✅ Copied to clipboard!' : 'Ready to paste into GitHub Gist or documentation'}</small>
                                </div>
                                <span className="fs-4">{copied ? '✅' : '📑'}</span>
                            </button>
                        </div>
                    </div>
                    <div className="modal-footer border-secondary">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExportModal;
