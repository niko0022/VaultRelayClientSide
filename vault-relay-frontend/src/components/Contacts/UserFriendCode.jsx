export default function UserFriendCode({ friendCode, copied, onCopy }) {
    if (!friendCode) return null;

    return (
        <button
            onClick={onCopy}
            className="w-full flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 group hover:border-teal-300 hover:bg-teal-50/30 transition-all duration-200 cursor-pointer shadow-sm"
        >
            <div className="flex items-center gap-2.5 min-w-0">
                <span className="material-symbols-outlined text-teal-500 text-[18px]">fingerprint</span>
                <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Your Friend Code</p>
                    <span className="text-xs font-mono font-semibold text-gray-700 truncate">{friendCode}</span>
                </div>
            </div>
            <span className={`material-symbols-outlined text-[18px] transition-colors shrink-0 ${copied ? 'text-teal-500' : 'text-gray-300 group-hover:text-teal-400'}`}>
                {copied ? 'check_circle' : 'content_copy'}
            </span>
        </button>
    );
}
