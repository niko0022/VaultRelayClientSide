import ConversationListItem from './ConversationListItem';

export default function ConversationSidebar({
    setShowGroupModal,
    convsLoading,
    conversations,
    user,
    selectedConversationId,
    selectConversation
}) {
    return (
        <section className="w-80 lg:w-96 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">
            {/* Search Bar */}
            <div className="mb-4 mt-6 relative px-6">
                <div className="absolute inset-y-0 left-7 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                </div>
                <input
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 text-sm outline-none placeholder-gray-400"
                    placeholder="Search"
                    type="text"
                />
            </div>

            <div className="pb-3 flex justify-between items-center px-6">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Messages</h2>
                <button
                    onClick={() => setShowGroupModal(true)}
                    className="p-2 text-gray-400 hover:text-gray-800 transition-colors hover:bg-gray-50 rounded-full cursor-pointer"
                    title="New Group Chat"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                </button>
            </div>

            {/* Scrollable Message List */}
            <div className="flex-1 overflow-y-auto pb-6 px-3" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {convsLoading && <div className="p-4 text-center text-sm text-gray-400">Loading chats...</div>}
                {!convsLoading && conversations.length === 0 && (
                    <div className="p-4 text-center text-sm text-gray-400">No active conversations.</div>
                )}
                {conversations.map(conv => (
                    <ConversationListItem
                        key={conv.id}
                        conv={conv}
                        user={user}
                        isSelected={selectedConversationId === conv.id}
                        selectConversation={selectConversation}
                    />
                ))}
            </div>
        </section>
    );
}
