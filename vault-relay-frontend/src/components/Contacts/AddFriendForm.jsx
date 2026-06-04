export default function AddFriendForm({ searchCode, onSearchChange, onSubmit, isLoading, status }) {
    return (
        <>
            <form onSubmit={onSubmit} className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">person_add</span>
                <input
                    className="w-full bg-surface-container-lowest border-none focus:ring-1 focus:ring-primary-container focus:outline-none text-on-surface text-sm pl-10 pr-20 py-3 rounded-lg placeholder:text-on-surface-variant/50 transition-all font-mono"
                    placeholder="Enter friend code..."
                    type="text"
                    value={searchCode}
                    onChange={onSearchChange}
                />
                <button
                    type="submit"
                    disabled={!searchCode.trim() || isLoading}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-primary-container text-on-primary-container text-xs font-bold px-3 py-1.5 rounded-md uppercase tracking-wider hover:shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                    {isLoading ? '...' : 'Add'}
                </button>
            </form>

            {/* Search Feedback */}
            {status && (
                <div className={`text-xs px-3 py-2 rounded-lg ${status.type === 'success' ? 'bg-primary/10 text-primary' : 'bg-error/10 text-error'}`}>
                    {status.message}
                </div>
            )}
        </>
    );
}
