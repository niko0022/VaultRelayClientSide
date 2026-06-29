import { useState } from 'react';
import ConversationListItem from './ConversationListItem';
import { resolveConversationName } from '../../utils/conversationUtils';

export default function ConversationSidebar({
    setShowGroupModal,
    convsLoading,
    conversations,
    user,
    selectedConversationId,
    selectConversation
}) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredConversations = conversations.filter(conv => {
        const displayName = resolveConversationName(conv, user?.id) || (conv.type === 'GROUP' ? 'Group Chat' : 'Unknown User');
        return displayName.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <section className="w-80 lg:w-96 flex-shrink-0 bg-white rounded-2xl flex flex-col overflow-hidden shadow-xl shadow-black/10">
            {/* Search Bar */}
            <div className="mb-4 mt-6 relative px-6">
                <div className="absolute inset-y-0 left-7 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                </div>
                <input
                    className="w-full pl-10 pr-10 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 text-sm outline-none placeholder-gray-400 transition-all"
                    placeholder="Search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery('')}
                        className="absolute inset-y-0 right-8 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                )}
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
                {!convsLoading && conversations.length > 0 && filteredConversations.length === 0 && (
                    <div className="p-4 text-center text-sm text-gray-400">
                        No conversations match "{searchQuery}"
                    </div>
                )}
                {filteredConversations.map(conv => (
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
