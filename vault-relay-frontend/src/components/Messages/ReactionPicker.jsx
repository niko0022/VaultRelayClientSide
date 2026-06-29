import { useState, useRef, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';

const PRESET_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export default function ReactionPicker({ onReact, disabled = false }) {
    const [showPicker, setShowPicker] = useState(false);
    const containerRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        if (!showPicker) return;
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setShowPicker(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showPicker]);

    // Close on Escape
    useEffect(() => {
        if (!showPicker) return;
        const handler = (e) => { if (e.key === 'Escape') setShowPicker(false); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [showPicker]);

    return (
        <div
            ref={containerRef}
            className={`flex items-center gap-0.5 bg-white border border-gray-200 rounded-full px-1.5 py-1 shadow-lg transition-all duration-200 ${disabled ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}
        >
            {PRESET_EMOJIS.map(emoji => (
                <button
                    key={emoji}
                    type="button"
                    onClick={() => onReact(emoji)}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 hover:scale-110 active:scale-125 transition-all text-base select-none cursor-pointer"
                >
                    {emoji}
                </button>
            ))}

            <div className="relative flex items-center">
                <button
                    type="button"
                    onClick={() => setShowPicker(prev => !prev)}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 hover:scale-110 active:scale-125 transition-all text-sm text-gray-400 hover:text-gray-700 font-bold select-none cursor-pointer"
                    title="More emojis"
                >
                    +
                </button>

                {showPicker && (
                    <div className="absolute bottom-10 right-0 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <EmojiPicker
                            onEmojiClick={(emojiData) => {
                                onReact(emojiData.emoji);
                                setShowPicker(false);
                            }}
                            theme="light"
                            emojiStyle="native"
                            lazyLoadEmojis={true}
                            searchPlaceholder="Search emoji..."
                            width={280}
                            height={350}
                            previewConfig={{ showPreview: false }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
