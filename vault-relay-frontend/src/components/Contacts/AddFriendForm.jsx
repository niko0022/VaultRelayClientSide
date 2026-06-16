export default function AddFriendForm({ searchCode, onSearchChange, onSubmit, isLoading, status }) {
    return (
        <>
            <form onSubmit={onSubmit} className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">person_search</span>
                <input
                    className="w-full bg-white border border-gray-200 focus:ring-2 focus:ring-teal-300 focus:border-teal-300 focus:outline-none text-gray-700 text-sm pl-10 pr-20 py-3 rounded-xl placeholder:text-gray-300 transition-all font-mono shadow-sm"
                    placeholder="Enter friend code..."
                    type="text"
                    value={searchCode}
                    onChange={onSearchChange}
                />
                <button
                    type="submit"
                    disabled={!searchCode.trim() || isLoading}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-teal-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg uppercase tracking-wider hover:bg-teal-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                >
                    {isLoading ? '...' : 'Add'}
                </button>
            </form>

            {/* Search Feedback */}
            {status && (
                <div className={`text-xs px-3 py-2 mt-2 rounded-lg font-medium ${
                    status.type === 'success'
                        ? 'bg-teal-50 text-teal-600 border border-teal-100'
                        : 'bg-rose-50 text-rose-500 border border-rose-100'
                }`}>
                    {status.message}
                </div>
            )}
        </>
    );
}
