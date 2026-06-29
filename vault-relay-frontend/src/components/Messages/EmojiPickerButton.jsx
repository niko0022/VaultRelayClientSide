import { useState, useRef, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';

export default function EmojiPickerButton({ onEmojiSelect, disabled = false }) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open]);

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen(prev => !prev)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Emoji"
            >
                <span className="text-lg select-none">😊</span>
            </button>

            {open && (
                <div className="absolute bottom-12 left-0 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <EmojiPicker
                        onEmojiClick={(emojiData) => {
                            onEmojiSelect(emojiData.emoji);
                        }}
                        theme="light"
                        emojiStyle="native"
                        lazyLoadEmojis={true}
                        searchPlaceholder="Search emoji..."
                        width={320}
                        height={400}
                        previewConfig={{ showPreview: false }}
                    />
                </div>
            )}
        </div>
    );
}
