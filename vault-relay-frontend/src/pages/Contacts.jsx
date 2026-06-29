import SideNavBar from '../components/Shared/SideNavBar';
import { useAuth } from '../contexts/AuthContext';
import { useContactActions } from '../hooks/useContactActions';
import ContactDetailView from '../components/Contacts/ContactDetailView';
import ContactListItem from '../components/Contacts/ContactListItem';
import FriendRequestCard from '../components/Contacts/FriendRequestCard';
import BlockedUserListItem from '../components/Contacts/BlockedUserListItem';
import UserFriendCode from '../components/Contacts/UserFriendCode';
import AddFriendForm from '../components/Contacts/AddFriendForm';

export default function Contacts() {
    const { user } = useAuth();

    const {
        friends,
        pendingRequests,
        blockedUsers,
        loading,
        selectedFriend,
        setSelectedFriend,
        searchCode,
        setSearchCode,
        searchStatus,
        setSearchStatus,
        searchLoading,
        actionLoading,
        copied,
        handleSendRequest,
        handleAccept,
        handleDecline,
        handleStartMessage,
        handleRemoveFriend,
        handleBlockFriend,
        handleUnblock,
        handleCopyCode
    } = useContactActions(user);

    return (
        <div
            className="text-gray-900 font-body overflow-hidden h-screen flex p-4 gap-3"
            style={{ background: 'linear-gradient(135deg, #d4f0ee 0%, #e8f5e8 25%, #f0ece0 50%, #f5e8dc 75%, #eddee8 100%)' }}
        >
            {/* Left: Nav rail + Contact list — both sit on the gradient */}
            <div className="flex h-full flex-shrink-0">
                <SideNavBar />
                {/* Left Panel: Contact List */}
                <main className="w-80 lg:w-96 flex-shrink-0 bg-white rounded-2xl flex flex-col overflow-hidden shadow-xl shadow-black/10">

                        {/* Header */}
                        <div className="px-6 pt-7 pb-4 border-b border-gray-200/60">
                            <h2 className="font-headline text-2xl font-bold tracking-tight text-gray-800 mb-5">Contacts</h2>

                            {/* Your Friend Code */}
                            <UserFriendCode
                                friendCode={user?.friendCode}
                                copied={copied}
                                onCopy={handleCopyCode}
                            />

                            {/* Add Friend Search */}
                            <div className="mt-3">
                                <AddFriendForm
                                    searchCode={searchCode}
                                    onSearchChange={(e) => { setSearchCode(e.target.value); setSearchStatus(null); }}
                                    onSubmit={handleSendRequest}
                                    isLoading={searchLoading}
                                    status={searchStatus}
                                />
                            </div>
                        </div>

                        {/* Scrollable List */}
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 scrollbar-hide">

                            {/* Pending Requests Section */}
                            {pendingRequests.length > 0 && (
                                <div className="mb-4">
                                    <div className="flex items-center gap-2 px-2 py-2 mb-1">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-600">
                                            Pending Requests
                                        </span>
                                        <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center">
                                            <span className="text-[10px] font-bold text-teal-600">{pendingRequests.length}</span>
                                        </div>
                                    </div>
                                    {pendingRequests.map(req => (
                                        <FriendRequestCard
                                            key={req.friendshipId}
                                            req={req}
                                            onAccept={() => handleAccept(req.friendshipId)}
                                            onDecline={() => handleDecline(req.friendshipId)}
                                            isLoading={actionLoading === req.friendshipId}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Friends Section Header */}
                            {friends.length > 0 && (
                                <div className="flex items-center gap-2 px-2 py-2">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                                        Friends
                                    </span>
                                    <span className="text-[10px] text-gray-400/70">{friends.length}</span>
                                </div>
                            )}

                            {/* Loading State */}
                            {loading && (
                                <div className="p-8 text-center text-sm text-gray-400">Loading contacts...</div>
                            )}

                            {/* Empty State */}
                            {!loading && friends.length === 0 && pendingRequests.length === 0 && (
                                <div className="p-8 text-center space-y-3">
                                    <span className="material-symbols-outlined text-4xl text-gray-300">group_add</span>
                                    <p className="text-sm text-gray-400">No contacts yet.</p>
                                    <p className="text-xs text-gray-300">Enter a friend code above to add someone.</p>
                                </div>
                            )}

                            {/* Friends List */}
                            {friends.map(friend => (
                                <ContactListItem
                                    key={friend.friendshipId}
                                    friend={friend}
                                    isSelected={selectedFriend?.friendshipId === friend.friendshipId}
                                    onSelect={() => setSelectedFriend(friend)}
                                />
                            ))}

                            {/* Blocked Users Section */}
                            {blockedUsers.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-200/60">
                                    <div className="flex items-center gap-2 px-2 py-2">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-400">
                                            Blocked
                                        </span>
                                        <span className="text-[10px] text-rose-300">{blockedUsers.length}</span>
                                    </div>
                                    {blockedUsers.map(blocked => (
                                        <BlockedUserListItem
                                            key={blocked.friendshipId}
                                            blocked={blocked}
                                            onUnblock={() => handleUnblock(blocked.user.id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                </main>
            </div>

            {/* Right Panel: Contact Details */}
            <ContactDetailView
                selectedFriend={selectedFriend}
                handleStartMessage={handleStartMessage}
                handleBlockFriend={handleBlockFriend}
                handleRemoveFriend={handleRemoveFriend}
            />
        </div>
    );
}
