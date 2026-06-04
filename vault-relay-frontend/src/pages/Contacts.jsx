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
        <div className="bg-background text-on-background font-body h-screen flex overflow-hidden selection:bg-primary-container selection:text-on-primary-container">
            <SideNavBar />

            <div className="flex flex-1 ml-72 h-screen overflow-hidden">

                {/* Left Panel: Contact List */}
                <main className="flex-1 lg:flex-none lg:w-96 bg-surface-container-low kinetic-grid flex flex-col border-r border-outline-variant/10 relative z-10 shadow-[20px_0_40px_rgba(0,0,0,0.5)]">
                    <div className="p-6 space-y-4">
                        <h2 className="font-headline text-2xl font-bold tracking-tight text-on-background">Contacts</h2>

                        {/* Your Friend Code */}
                        <UserFriendCode
                            friendCode={user?.friendCode}
                            copied={copied}
                            onCopy={handleCopyCode}
                        />

                        {/* Add Friend Search */}
                        <AddFriendForm
                            searchCode={searchCode}
                            onSearchChange={(e) => { setSearchCode(e.target.value); setSearchStatus(null); }}
                            onSubmit={handleSendRequest}
                            isLoading={searchLoading}
                            status={searchStatus}
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 space-y-1 scrollbar-hide">

                        {/* Pending Requests Section */}
                        {pendingRequests.length > 0 && (
                            <div className="mb-4">
                                <div className="flex items-center gap-2 px-2 py-2">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                                        Pending Requests
                                    </span>
                                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                                        <span className="text-[10px] font-bold text-primary">{pendingRequests.length}</span>
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
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                                    Friends
                                </span>
                                <span className="text-[10px] text-on-surface-variant/50">{friends.length}</span>
                            </div>
                        )}

                        {/* Loading State */}
                        {loading && (
                            <div className="p-8 text-center text-sm text-on-surface-variant">Loading contacts...</div>
                        )}

                        {/* Empty State */}
                        {!loading && friends.length === 0 && pendingRequests.length === 0 && (
                            <div className="p-8 text-center space-y-3">
                                <span className="material-symbols-outlined text-4xl text-on-surface-variant/30">group_add</span>
                                <p className="text-sm text-on-surface-variant">No contacts yet.</p>
                                <p className="text-xs text-on-surface-variant/60">Enter a friend code above to add someone.</p>
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
                            <div className="mt-4 pt-4 border-t border-outline-variant/10">
                                <div className="flex items-center gap-2 px-2 py-2">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-error/70">
                                        Blocked
                                    </span>
                                    <span className="text-[10px] text-error/40">{blockedUsers.length}</span>
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

                {/* Right Panel: Contact Details / Empty State */}
                <ContactDetailView
                    selectedFriend={selectedFriend}
                    handleStartMessage={handleStartMessage}
                    handleBlockFriend={handleBlockFriend}
                    handleRemoveFriend={handleRemoveFriend}
                />
            </div>
        </div>
    );
}
