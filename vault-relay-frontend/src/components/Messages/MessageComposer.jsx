import { useRef } from 'react';

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
    handleSend
}) {
    const fileInputRef = useRef(null);

    return (
        <div className="p-4 md:p-6 bg-[#131313]/90 backdrop-blur-xl shrink-0 border-t border-white/5">
            {/* Edit mode banner */}
            {editingMessage && (
                <div className="max-w-4xl mx-auto mb-2 flex items-center gap-3 px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg">
                    <span className="material-symbols-outlined text-primary text-[18px]">edit</span>
                    <span className="text-xs text-primary font-medium flex-1 truncate">Editing message</span>
                    <button
                        onClick={() => { cancelEdit(); setComposerText(''); }}
                        className="p-1 text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                </div>
            )}
            {/* Attachment preview banner */}
            {selectedFile && (
                <div className="max-w-4xl mx-auto mb-2 flex items-center gap-3 px-4 py-2 bg-secondary/10 border border-secondary/20 rounded-lg">
                    <span className="material-symbols-outlined text-secondary text-[18px]">attach_file</span>
                    <span className="text-xs text-secondary font-medium flex-1 truncate">{selectedFile.name}</span>
                    <span className="text-[10px] text-on-surface-variant">
                        {selectedFile.size < 1024 * 1024
                            ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                            : `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`}
                    </span>
                    <button
                        onClick={() => setSelectedFile(null)}
                        className="p-1 text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                </div>
            )}
            <div className="max-w-4xl mx-auto flex items-end gap-3 md:gap-4">
                <div className={`flex-1 bg-surface-container-lowest rounded-xl flex flex-col p-1 transition-all border ${editingMessage ? 'border-primary/50 shadow-[0_0_15px_rgba(0,229,255,0.1)]' : 'border-surface-container-highest'} focus-within:border-primary/50 focus-within:shadow-[0_0_15px_rgba(0,229,255,0.1)]`}>
                    <textarea
                        value={composerText}
                        onChange={handleTextChange}
                        onKeyDown={handleKeyDown}
                        disabled={!isSessionReady}
                        className="w-full bg-transparent border-none text-on-surface text-[15px] py-3 px-4 focus:ring-0 focus:outline-none resize-none max-h-48 scrollbar-hide placeholder:text-on-surface-variant/50 disabled:opacity-50"
                        placeholder={editingMessage ? "Edit your message..." : (isSessionReady ? "Type an encrypted message..." : "Waiting for secure connection...")}
                        rows="1"
                        style={{ minHeight: '44px' }}
                    ></textarea>
                    <div className="flex items-center justify-between px-2 pb-1.5 pt-1">
                        <div className="flex gap-0.5">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer rounded-lg hover:bg-white/5"
                            >
                                <span className="material-symbols-outlined text-xl">attach_file</span>
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) setSelectedFile(file);
                                    e.target.value = ''; // reset so same file can be re-selected
                                }}
                            />
                            <button className="p-2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer rounded-lg hover:bg-white/5 hidden sm:block">
                                <span className="material-symbols-outlined text-xl">mood</span>
                            </button>
                        </div>
                        <div className="flex items-center gap-2 px-1">
                            <button
                                onClick={handleSend}
                                disabled={!composerText.trim() && !selectedFile || !isSessionReady}
                                className={`p-1.5 md:p-2 ${editingMessage ? 'text-secondary' : 'text-primary'} hover:bg-primary/10 rounded-lg transition-all active:scale-95 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed`}
                            >
                                <span className="material-symbols-outlined text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    {editingMessage ? 'check' : 'send'}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
