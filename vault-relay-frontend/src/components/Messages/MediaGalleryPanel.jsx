import { useState, useEffect } from 'react';
import { signalStoreAdapter } from '../../lib/signal/SignalStoreAdapter';
import { decryptAttachment } from '../../lib/crypto/attachmentCrypto';
import AttachmentViewer from './AttachmentViewer';

export default function MediaGalleryPanel({ conversationId, onClose }) {
    const [activeTab, setActiveTab] = useState('photos'); // 'photos' | 'files'
    const [loading, setLoading] = useState(false);
    const [attachments, setAttachments] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        let active = true;
        async function loadFromCache() {
            if (!conversationId) return;
            setLoading(true);
            setError(null);
            try {
                // Only read what the chat has already decrypted and saved to IndexedDB
                const localMsgs = await signalStoreAdapter.getLocalMessages(conversationId);

                if (active) {
                    // Keep only messages that were successfully decrypted and have attachment metadata
                    const validAttachments = localMsgs.filter(msg => msg.attachmentUrl && msg.attachmentMeta);
                    setAttachments(validAttachments);
                }
            } catch (err) {
                console.error("Failed to load attachments from local cache", err);
                if (active) setError("Failed to load attachments");
            } finally {
                if (active) setLoading(false);
            }
        }

        loadFromCache();

        return () => {
            active = false;
        };
    }, [conversationId]);

    // Separate photos vs other files
    const photos = attachments.filter(msg => {
        const mime = msg.attachmentMeta?.mimeType || '';
        return mime.startsWith('image/');
    });

    const files = attachments.filter(msg => {
        const mime = msg.attachmentMeta?.mimeType || '';
        return !mime.startsWith('image/');
    });

    return (
        <aside className="w-80 lg:w-96 h-full bg-white border-l border-gray-200 flex flex-col flex-shrink-0 animate-slide-in relative">
            {/* Header */}
            <div className="h-20 px-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-gray-500">folder_open</span>
                    Shared Media
                </h2>
                <button
                    onClick={onClose}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors cursor-pointer"
                    title="Close Panel"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>

            {/* Tabs */}
            <div className="px-6 py-3 border-b border-gray-50 flex gap-2 shrink-0 bg-gray-50/50">
                <button
                    onClick={() => setActiveTab('photos')}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        activeTab === 'photos'
                            ? 'bg-black text-white shadow-sm'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                >
                    Photos ({photos.length})
                </button>
                <button
                    onClick={() => setActiveTab('files')}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        activeTab === 'files'
                            ? 'bg-black text-white shadow-sm'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                >
                    Files ({files.length})
                </button>
            </div>

            {/* List / Content */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                {loading && (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
                        <span className="material-symbols-outlined animate-spin text-2xl text-gray-400">autorenew</span>
                        <span className="text-xs">Loading shared media...</span>
                    </div>
                )}

                {!loading && error && (
                    <div className="text-center py-8 text-xs text-red-500 bg-red-50/50 rounded-xl p-4 border border-red-100">
                        <span className="material-symbols-outlined text-red-400 text-lg mb-1 block">error</span>
                        {error}
                    </div>
                )}

                {!loading && !error && (
                    <>
                        {activeTab === 'photos' && (
                            <>
                                {photos.length === 0 ? (
                                    <div className="text-center py-16 text-gray-400">
                                        <span className="material-symbols-outlined text-4xl mb-2 text-gray-300">image</span>
                                        <p className="text-xs">No photos shared in this chat</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-2">
                                        {photos.map(msg => (
                                            <PhotoThumbnail
                                                key={msg.id}
                                                attachmentUrl={msg.attachmentUrl}
                                                attachmentMeta={msg.attachmentMeta}
                                            />
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        {activeTab === 'files' && (
                            <>
                                {files.length === 0 ? (
                                    <div className="text-center py-16 text-gray-400">
                                        <span className="material-symbols-outlined text-4xl mb-2 text-gray-300">draft</span>
                                        <p className="text-xs">No files shared in this chat</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {files.map(msg => (
                                            <div key={msg.id} className="border-b border-gray-100/50 pb-2 last:border-0 last:pb-0">
                                                <div className="text-[10px] text-gray-400 mb-1 flex justify-between">
                                                    <span>{msg.sender?.displayName || 'Unknown'}</span>
                                                    <span>{new Date(msg.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <AttachmentViewer
                                                    attachmentUrl={msg.attachmentUrl}
                                                    attachmentMeta={msg.attachmentMeta}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </aside>
    );
}

function PhotoThumbnail({ attachmentUrl, attachmentMeta }) {
    const [objectUrl, setObjectUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const { aesKey, iv, fileName, mimeType } = attachmentMeta || {};

    useEffect(() => {
        let active = true;
        async function load() {
            if (!attachmentUrl || !aesKey) return;
            setLoading(true);
            try {
                const response = await fetch(attachmentUrl);
                if (!response.ok) throw new Error();
                const encryptedBuffer = await response.arrayBuffer();
                const decryptedBuffer = await decryptAttachment(encryptedBuffer, aesKey, iv);
                const blob = new Blob([decryptedBuffer], { type: mimeType || 'image/jpeg' });
                const url = URL.createObjectURL(blob);
                if (active) setObjectUrl(url);
            } catch (err) {
                if (active) setError(true);
            } finally {
                if (active) setLoading(false);
            }
        }
        load();
        return () => {
            active = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [attachmentUrl, aesKey, iv, mimeType]);

    if (loading) {
        return (
            <div className="aspect-square bg-gray-50 flex items-center justify-center rounded-xl border border-gray-100/50">
                <span className="material-symbols-outlined text-gray-300 text-sm animate-spin">progress_activity</span>
            </div>
        );
    }

    if (error || !objectUrl) {
        return (
            <div className="aspect-square bg-gray-50 flex items-center justify-center rounded-xl border border-gray-100/50 text-gray-300">
                <span className="material-symbols-outlined text-sm">broken_image</span>
            </div>
        );
    }

    return (
        <div className="aspect-square rounded-xl overflow-hidden border border-gray-100/50 cursor-pointer hover:opacity-90 hover:scale-[1.02] transition-all">
            <img
                src={objectUrl}
                alt={fileName || 'Photo'}
                className="w-full h-full object-cover"
                onClick={() => window.open(objectUrl, '_blank')}
            />
        </div>
    );
}
