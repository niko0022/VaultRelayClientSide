import { useState, useEffect } from 'react';
import { decryptAttachment } from '../../lib/crypto/attachmentCrypto';

/**
 * Lazily fetches, decrypts, and displays an encrypted attachment from S3.
 * - Images are rendered inline as <img>.
 * - Other files get a download button.
 */
export default function AttachmentViewer({ attachmentUrl, attachmentMeta }) {
    const [objectUrl, setObjectUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const { aesKey, iv, fileName, mimeType, fileSize } = attachmentMeta || {};
    const isImage = mimeType && mimeType.startsWith('image/');

    // Automatically fetch and decrypt images; for other files, wait for user click
    useEffect(() => {
        if (isImage && attachmentUrl && aesKey) {
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

    // Format file size
    function formatSize(bytes) {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    if (!attachmentUrl || !attachmentMeta) return null;

    // --- Image Attachment ---
    if (isImage) {
        if (loading) {
            return (
                <div className="flex items-center gap-2 py-2 text-on-surface-variant text-xs">
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
                        <p className="text-[10px] text-on-surface-variant/60 mt-1 truncate max-w-xs">
                            {fileName} {fileSize ? `· ${formatSize(fileSize)}` : ''}
                        </p>
                    )}
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
                className="flex items-center gap-3 px-4 py-3 bg-surface-container-high/50 hover:bg-surface-container-highest/50 rounded-lg transition-colors cursor-pointer border border-white/5 max-w-xs"
            >
                <span className="material-symbols-outlined text-primary text-2xl">
                    {loading ? 'progress_activity' : 'attach_file'}
                </span>
                <div className="flex flex-col items-start overflow-hidden">
                    <span className="text-sm text-on-surface font-medium truncate max-w-[200px]">
                        {fileName || 'Attachment'}
                    </span>
                    <span className="text-[10px] text-on-surface-variant">
                        {loading ? 'Decrypting...' : (error || formatSize(fileSize) || 'Download')}
                    </span>
                </div>
                {!loading && objectUrl && (
                    <span className="material-symbols-outlined text-primary text-lg ml-auto">download</span>
                )}
            </button>
        </div>
    );
}
