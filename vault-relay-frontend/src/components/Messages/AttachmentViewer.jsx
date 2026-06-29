import { useState, useEffect, useRef } from 'react';
import { decryptAttachment } from '../../lib/crypto/attachmentCrypto';
import prettyBytes from 'pretty-bytes';

/**
 * Lazily fetches, decrypts, and displays an encrypted attachment from S3.
 * - Images are rendered inline as <img>.
 * - Audio files get an inline player with play/pause + progress.
 * - Other files get a download button.
 */
export default function AttachmentViewer({ attachmentUrl, attachmentMeta }) {
    const [objectUrl, setObjectUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const { aesKey, iv, fileName, mimeType, fileSize } = attachmentMeta || {};
    const isImage = mimeType && mimeType.startsWith('image/');
    const isAudio = mimeType && mimeType.startsWith('audio/');

    // Audio player state
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    // Automatically fetch and decrypt images and audio; for other files, wait for user click
    useEffect(() => {
        if ((isImage || isAudio) && attachmentUrl && aesKey) {
            fetchAndDecrypt();
        }
        // Cleanup object URL on unmount
        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [attachmentUrl, aesKey]); // eslint-disable-line react-hooks/exhaustive-deps

    async function fetchAndDecrypt() {
        if (loading || objectUrl) return objectUrl;
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(attachmentUrl);
            if (!response.ok) throw new Error(`Failed to fetch attachment: ${response.status}`);
            const encryptedBuffer = await response.arrayBuffer();
            const decryptedBuffer = await decryptAttachment(encryptedBuffer, aesKey, iv);
            const blob = new Blob([decryptedBuffer], { type: mimeType || 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            setObjectUrl(url);
            return url; // Return so callers can use the url immediately
        } catch (err) {
            console.error('Failed to decrypt attachment:', err);
            setError('Failed to load attachment');
            return null;
        } finally {
            setLoading(false);
        }
    }

    function handleDownload() {
        if (objectUrl) {
            triggerDownload(objectUrl);
        } else {
            fetchAndDecrypt().then((url) => {
                if (url) triggerDownload(url);
            });
        }
    }

    function triggerDownload(url) {
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || 'download';
        a.click();
    }

    // Format seconds to m:ss
    function formatDuration(s) {
        if (!s || !isFinite(s)) return '0:00';
        const mins = Math.floor(s / 60);
        const secs = Math.floor(s % 60);
        return `${mins}:${String(secs).padStart(2, '0')}`;
    }

    function togglePlayPause() {
        const audio = audioRef.current;
        if (!audio) return;
        if (isPlaying) { audio.pause(); } else { audio.play(); }
        setIsPlaying(!isPlaying);
    }

    if (!attachmentUrl || !attachmentMeta) return null;

    // --- Image Attachment ---
    if (isImage) {
        if (loading) {
            return (
                <div className="flex items-center gap-2 py-2 text-gray-500 text-xs">
                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                    Decrypting image...
                </div>
            );
        }
        if (error) {
            return (
                <div className="flex items-center gap-2 py-2 text-error text-xs">
                    <span className="material-symbols-outlined text-sm">error</span>
                    {error}
                </div>
            );
        }
        if (objectUrl) {
            return (
                <div className="mt-1.5 mb-1">
                    <img
                        src={objectUrl}
                        alt={fileName || 'Image'}
                        className="max-w-xs max-h-72 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(objectUrl, '_blank')}
                    />
                    {fileName && (
                        <p className="text-[10px] text-gray-400 mt-1 truncate max-w-xs">
                            {fileName} {fileSize ? `· ${prettyBytes(fileSize)}` : ''}
                        </p>
                    )}
                </div>
            );
        }
        return null;
    }

    // --- Audio / Voice Message ---
    if (isAudio) {
        if (loading) {
            return (
                <div className="flex items-center gap-2 py-2 text-gray-500 text-xs">
                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                    Decrypting audio...
                </div>
            );
        }
        if (error) {
            return (
                <div className="flex items-center gap-2 py-2 text-error text-xs">
                    <span className="material-symbols-outlined text-sm">error</span>
                    {error}
                </div>
            );
        }
        if (objectUrl) {
            const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
            return (
                <div className="mt-1.5 mb-1">
                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 max-w-xs">
                        <button
                            onClick={togglePlayPause}
                            className="w-9 h-9 rounded-full bg-[#1D7A54]/10 hover:bg-[#1D7A54]/20 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                        >
                            <span className="material-symbols-outlined text-[#1D7A54] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                                {isPlaying ? 'pause' : 'play_arrow'}
                            </span>
                        </button>
                        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                            {/* Progress bar */}
                            <div
                                className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden cursor-pointer"
                                onClick={(e) => {
                                    const audio = audioRef.current;
                                    if (!audio || !duration) return;
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    audio.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
                                }}
                            >
                                <div
                                    className="h-full bg-[#1D7A54] rounded-full transition-[width] duration-100"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[10px] text-gray-400 font-mono">
                                    {formatDuration(currentTime)}
                                </span>
                                <span className="text-[10px] text-gray-400 font-mono">
                                    {formatDuration(duration)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <audio
                        ref={audioRef}
                        src={objectUrl}
                        onLoadedMetadata={(e) => setDuration(e.target.duration)}
                        onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                        onEnded={() => { setIsPlaying(false); setCurrentTime(0); }}
                    />
                </div>
            );
        }
        return null;
    }

    // --- Non-Image File Attachment ---
    return (
        <div className="mt-1.5 mb-1">
            <button
                onClick={handleDownload}
                disabled={loading}
                className="flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer border border-gray-100 max-w-xs"
            >
                <span className="material-symbols-outlined text-[#1D7A54] text-2xl">
                    {loading ? 'progress_activity' : 'attach_file'}
                </span>
                <div className="flex flex-col items-start overflow-hidden">
                    <span className="text-sm text-gray-800 font-medium truncate max-w-[200px]">
                        {fileName || 'Attachment'}
                    </span>
                    <span className="text-[10px] text-gray-500">
                        {loading ? 'Decrypting...' : (error || prettyBytes(fileSize || 0) || 'Download')}
                    </span>
                </div>
                {!loading && objectUrl && (
                    <span className="material-symbols-outlined text-[#1D7A54] text-lg ml-auto">download</span>
                )}
            </button>
        </div>
    );
}
