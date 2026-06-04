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
        <section className="w-80 h-full bg-surface-container-low flex flex-col kinetic-grid border-r border-outline-variant/10">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-headline text-xl font-bold text-on-surface">Active Chats</h2>
                    <button
                        onClick={() => setShowGroupModal(true)}
                        className="p-1.5 text-on-surface-variant hover:text-primary transition-colors hover:bg-white/5 rounded-lg cursor-pointer"
                        title="New Group Chat"
                    >
                        <span className="material-symbols-outlined text-[20px]">group_add</span>
                    </button>
                </div>
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
                    <input
                        className="w-full bg-surface-container-lowest border-none text-sm py-2 pl-10 pr-4 focus:ring-0 focus:outline-none rounded text-on-surface placeholder:text-outline"
                        placeholder="Search chats..."
                        type="text"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 space-y-1 scrollbar-hide">
                {convsLoading && <div className="p-4 text-center text-sm text-on-surface-variant">Loading chats...</div>}
                {!convsLoading && conversations.length === 0 && (
                    <div className="p-4 text-center text-sm text-on-surface-variant">No active conversations.</div>
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
