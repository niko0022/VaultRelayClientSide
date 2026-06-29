import { useRef, useState, useEffect, useCallback } from 'react';
import EmojiPickerButton from './EmojiPickerButton';

export default function MessageComposer({
    editingMessage,
    selectedFile,
    setSelectedFile,
    composerText,
    isSessionReady,
    cancelEdit,
    setComposerText,
    handleTextChange,
    handleKeyDown,
    handleSend,
    isBlocked = false,
    blockedById = null,
    currentUserId = null
}) {
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);

    const handleEmojiSelect = (emoji) => {
        if (!textareaRef.current) {
            setComposerText(prev => prev + emoji);
            return;
        }
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const before = text.substring(0, start);
        const after = text.substring(end, text.length);

        setComposerText(before + emoji + after);

        // Put focus back and place cursor after the emoji
        setTimeout(() => {
            textarea.focus();
            textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        }, 0);
    };

    // --- Voice Recording State ---
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);

    const MAX_RECORDING_SECONDS = 120;

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        clearInterval(timerRef.current);
        setIsRecording(false);
        setRecordingTime(0);
    }, []);

    const startRecording = useCallback(async () => {
        if (isRecording) { stopRecording(); return; }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
            chunksRef.current = [];

            recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            recorder.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                if (blob.size > 0) {
                    const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
                    setSelectedFile(file);
                }
            };

            mediaRecorderRef.current = recorder;
            recorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => {
                    if (prev + 1 >= MAX_RECORDING_SECONDS) { stopRecording(); return prev; }
                    return prev + 1;
                });
            }, 1000);
        } catch (err) {
            console.error('Microphone access denied:', err);
        }
    }, [isRecording, stopRecording, setSelectedFile]);

    // Cleanup on unmount
    useEffect(() => () => { stopRecording(); }, [stopRecording]);

    const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const isAudioFile = selectedFile?.type?.startsWith('audio/');

    return (
        <div className="absolute bottom-6 left-8 right-8 z-20">
            {/* Edit mode banner */}
            {editingMessage && (
                <div className="mb-2 flex items-center gap-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-2xl shadow-sm">
                    <span className="material-symbols-outlined text-blue-500 text-[18px]">edit</span>
                    <span className="text-xs text-blue-600 font-medium flex-1 truncate">Editing message</span>
                    <button
                        onClick={() => { cancelEdit(); setComposerText(''); }}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                </div>
            )}

            {/* Recording indicator */}
            {isRecording && (
                <div className="mb-2 flex items-center gap-3 px-4 py-2 bg-red-50 border border-red-200 rounded-2xl shadow-sm">
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs text-red-600 font-medium flex-1">Recording… {formatTime(recordingTime)}</span>
                    <button
                        onClick={stopRecording}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-[16px]">stop</span>
                    </button>
                </div>
            )}

            {/* Attachment preview banner */}
            {selectedFile && !isRecording && (
                <div className="mb-2 flex items-center gap-3 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-sm">
                    <span className="material-symbols-outlined text-emerald-500 text-[18px]">
                        {isAudioFile ? 'mic' : 'attach_file'}
                    </span>
                    <span className="text-xs text-emerald-600 font-medium flex-1 truncate">{selectedFile.name}</span>
                    <span className="text-[10px] text-gray-400">
                        {selectedFile.size < 1024 * 1024
                            ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                            : `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`}
                    </span>
                    <button
                        onClick={() => setSelectedFile(null)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                </div>
            )}

            {/* Main Input Pill */}
            <div className="bg-white rounded-full shadow-lg border border-gray-100 flex items-center px-2 py-2">
                {/* Attachment button */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isBlocked}
                    className="p-3 text-gray-400 hover:text-gray-800 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <svg className="w-5 h-5 rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setSelectedFile(file);
                        e.target.value = '';
                    }}
                />

                {/* Mic button */}
                <button
                    onClick={startRecording}
                    disabled={!isSessionReady || !!editingMessage || isBlocked}
                    className={`p-2 transition-colors cursor-pointer rounded-full disabled:opacity-30 disabled:cursor-not-allowed ${isRecording ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-gray-800'}`}
                >
                    <span className="material-symbols-outlined text-xl">
                        {isRecording ? 'stop_circle' : 'mic'}
                    </span>
                </button>

                {/* Emoji picker */}
                <EmojiPickerButton
                    disabled={!isSessionReady || isRecording || isBlocked}
                    onEmojiSelect={handleEmojiSelect}
                />

                {/* Text input */}
                <input
                    ref={textareaRef}
                    value={composerText}
                    onChange={handleTextChange}
                    onKeyDown={handleKeyDown}
                    disabled={!isSessionReady || isRecording || isBlocked}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-gray-900 placeholder-gray-400 py-3 outline-none text-[15px] min-w-0"
                    placeholder={
                        isBlocked
                            ? (blockedById === currentUserId ? "You have blocked this user." : "You cannot reply.")
                            : (editingMessage ? "Edit your message..." : (isSessionReady ? "Write a Message" : "Connecting..."))
                    }
                    type="text"
                />

                {/* Send button */}
                <button
                    onClick={handleSend}
                    disabled={(!composerText.trim() && !selectedFile) || !isSessionReady || isBlocked}
                    className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors shadow-md ml-2 flex-shrink-0 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                >
                    {editingMessage ? (
                        <span className="material-symbols-outlined text-xl">check</span>
                    ) : (
                        <svg className="w-5 h-5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                        </svg>
                    )}
                </button>
            </div>
        </div>
    );
}
