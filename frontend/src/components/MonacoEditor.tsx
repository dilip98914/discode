import React, { useRef, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { RemoteCursor } from '../types';

interface MonacoEditorProps {
    language: string;
    theme?: string;
    value: string;
    onChange: (value: string) => void;
    onCursorChange?: (position: { lineNumber: number; column: number }) => void;
    remoteCursors?: RemoteCursor[];
    height?: string;
    readOnly?: boolean;
    fontSize?: number;
}

const mapToMonacoLang = (lang: string): string => {
    switch (lang.toLowerCase()) {
        case 'c':
            return 'c';
        case 'cpp':
        case 'c_cpp':
            return 'cpp';
        case 'python':
            return 'python';
        case 'javascript':
        case 'js':
            return 'javascript';
        case 'java':
            return 'java';
        case 'go':
        case 'golang':
            return 'go';
        case 'rust':
            return 'rust';
        case 'kotlin':
            return 'kotlin';
        default:
            return 'plaintext';
    }
};

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
    language,
    theme = 'vs-dark',
    value,
    onChange,
    onCursorChange,
    remoteCursors = [],
    height = '100%',
    readOnly = false,
    fontSize = 14
}) => {
    const editorRef = useRef<any>(null);
    const decorationsRef = useRef<string[]>([]);
    const isApplyingRemoteRef = useRef<boolean>(false);

    // Editor Mount Handler
    const handleMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;

        // Listen for cursor position changes (both typing and clicking)
        editor.onDidChangeCursorPosition((e) => {
            if (onCursorChange && !isApplyingRemoteRef.current) {
                onCursorChange({
                    lineNumber: e.position.lineNumber,
                    column: e.position.column
                });
            }
        });

        // Listen for local model content changes
        editor.onDidChangeModelContent(() => {
            if (!isApplyingRemoteRef.current) {
                const currentVal = editor.getValue();
                onChange(currentVal);
            }
        });
    };

    // Apply remote socket value changes without interrupting local cursor or typing
    useEffect(() => {
        if (!editorRef.current) return;

        const currentEditorValue = editorRef.current.getValue();
        if (value !== currentEditorValue) {
            isApplyingRemoteRef.current = true;

            const savedPosition = editorRef.current.getPosition();
            const savedScrollTop = editorRef.current.getScrollTop();

            editorRef.current.setValue(value || '');

            if (savedPosition) {
                editorRef.current.setPosition(savedPosition);
            }
            if (savedScrollTop) {
                editorRef.current.setScrollTop(savedScrollTop);
            }

            isApplyingRemoteRef.current = false;
        }
    }, [value]);

    // Render Remote Collaborator Cursors with Visual Colored Badges
    useEffect(() => {
        if (!editorRef.current) return;

        const newDecorations = remoteCursors.map((cursor) => {
            const line = cursor.position?.lineNumber || 1;
            const col = cursor.position?.column || 1;

            return {
                range: {
                    startLineNumber: line,
                    startColumn: col,
                    endLineNumber: line,
                    endColumn: col
                },
                options: {
                    className: 'remote-cursor-line',
                    hoverMessage: { value: `👤 **${cursor.name}**` },
                    before: {
                        content: `\u200B`,
                        inlineClassName: 'remote-cursor-flag'
                    }
                }
            };
        });

        decorationsRef.current = editorRef.current.deltaDecorations(
            decorationsRef.current,
            newDecorations
        );
    }, [remoteCursors]);

    return (
        <div style={{ height, width: '100%', overflow: 'hidden' }}>
            <Editor
                height="100%"
                language={mapToMonacoLang(language)}
                theme={theme === 'vs-light' || theme === 'github' ? 'light' : 'vs-dark'}
                defaultValue={value}
                onMount={handleMount}
                options={{
                    readOnly,
                    fontSize,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 4,
                    wordWrap: 'on',
                    lineNumbers: 'on',
                    cursorBlinking: 'smooth',
                    smoothScrolling: true
                }}
            />
        </div>
    );
};

export default MonacoEditor;
