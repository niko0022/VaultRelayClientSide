import { useState } from 'react';
import SideNavBar from '../components/Shared/SideNavBar';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getAvatarUploadUrl, completeAvatarUpload, deleteAvatar, updateProfile } from '../services/authService';
import LinkedDevices from '../components/Settings/LinkedDevices';

function EditableField({ label, fieldKey, currentValue, onSave }) {
    const [isEditing, setIsEditing] = useState(false);
    const [newValue, setNewValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!newValue.trim()) {
            setIsEditing(false);
            return;
        }
        setIsSaving(true);
        try {
            await onSave(fieldKey, newValue);
            setIsEditing(false);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-1.5 w-full">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1">{label}</label>
            <div className="flex gap-2">
                <input
                    className="flex-1 bg-gray-50 border border-gray-100 rounded-full py-2.5 px-4 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm disabled:opacity-50"
                    type="text"
                    value={isEditing ? newValue : (currentValue || '')}
                    onChange={(e) => setNewValue(e.target.value)}
                    readOnly={!isEditing}
                    disabled={isSaving}
                />
                {isEditing ? (
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-black text-white px-5 rounded-full text-xs font-semibold hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center min-w-[70px]"
                    >
                        {isSaving ? (
                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        ) : "Save"}
                    </button>
                ) : (
                    <button
                        onClick={() => { setNewValue(currentValue || ''); setIsEditing(true); }}
                        className="bg-gray-100 text-gray-700 px-5 rounded-full text-xs font-semibold hover:bg-gray-200 transition-colors cursor-pointer min-w-[70px]"
                    >
                        Edit
                    </button>
                )}
            </div>
        </div>
    );
}

export default function UserSetting() {
    const { user, checkAuth, logout, nukeAccount } = useAuth();
    const [avatarUploading, setAvatarUploading] = useState(false);
    const navigate = useNavigate();

    const handleSaveProfile = async (fieldKey, value) => {
        try {
            await updateProfile({ [fieldKey]: value });
            await checkAuth(); // Refresh global state
        } catch (err) {
            console.error(`${fieldKey} update failed`, err);
            alert(err.message);
            throw err;
        }
    };

    const handleLogout = async () => {
        if (!window.confirm("Are you sure you want to logout?")) return;
        try {
            await logout();
            navigate("/login");
        } catch (err) {
            alert("Logout failed: " + err.message);
        }
    };

    const handleNukeAccount = async () => {
        const confirm1 = window.confirm("WARNING: This will permanently delete your account, all friends, and all messages. Are you absolutely sure?");
        if (!confirm1) return;
        const confirm2 = window.prompt("Type 'DELETE' to confirm");
        if (confirm2 !== "DELETE") return;

        try {
            await nukeAccount();
            navigate("/register");
        } catch (err) {
            alert("Account deletion failed: " + err.message);
        }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setAvatarUploading(true);
        try {
            const { uploadUrl, key } = await getAvatarUploadUrl({
                contentType: file.type,
                originalName: file.name
            });

            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type
                }
            });

            if (!uploadRes.ok) throw new Error('Failed to upload image to S3');

            await completeAvatarUpload({ key });
            await checkAuth(); // refresh the user
        } catch (err) {
            console.error("Avatar upload failed", err);
            alert("Failed to upload avatar: " + err.message);
        } finally {
            setAvatarUploading(false);
            e.target.value = '';
        }
    };

    const handleAvatarRemove = async () => {
        if (!window.confirm("Remove your avatar?")) return;
        setAvatarUploading(true);
        try {
            await deleteAvatar();
            await checkAuth();
        } catch (err) {
            console.error("Avatar removal failed", err);
            alert("Failed to remove avatar.");
        } finally {
            setAvatarUploading(false);
        }
    };

    return (
        <div
            className="text-gray-900 font-body overflow-hidden h-screen flex p-4 gap-3"
            style={{ background: 'linear-gradient(135deg, #d4f0ee 0%, #e8f5e8 25%, #f0ece0 50%, #f5e8dc 75%, #eddee8 100%)' }}
        >
            {/* Slim inline Navigation Rail */}
            <SideNavBar />

            {/* Main Content Area */}
            <main className="flex-1 bg-[#F8FAF9] rounded-2xl shadow-xl shadow-black/10 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-8 lg:p-12 relative">
                    <div className="max-w-4xl mx-auto space-y-8 pb-24">
                    {/* Page Header */}
                    <header className="space-y-2">
                        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">Security Settings</h1>
                        <p className="text-gray-500 text-sm max-w-xl">Configure your cryptographic identity, session protocols, and vault clearance levels.</p>
                    </header>

                    <div className="space-y-6">
                        {/* Account Identity Section */}
                        <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold flex items-center gap-2 text-gray-950">
                                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    Account Identity
                                </h2>
                                <span className="text-[10px] font-bold text-[#1D7A54] bg-[#EAF5F0] px-2.5 py-1 rounded-full uppercase tracking-wider">Active Node</span>
                            </div>
                            <div className="flex flex-col md:flex-row gap-8 items-start">
                                <div className="flex flex-col items-center gap-2 shrink-0">
                                    <div className="relative group">
                                        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-100 bg-gray-50 flex items-center justify-center relative shadow-sm">
                                            {user?.avatarUrl ? (
                                                <img className="w-full h-full object-cover" alt="User avatar" src={user.avatarUrl} />
                                            ) : (
                                                <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                            )}
                                            {avatarUploading && (
                                                <div className="absolute inset-0 bg-white/85 flex items-center justify-center">
                                                    <svg className="animate-spin h-6 w-6 text-black" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        <label className="absolute bottom-0 right-0 p-2 bg-black text-white rounded-full shadow-lg hover:scale-110 transition-transform cursor-pointer">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={avatarUploading} />
                                        </label>
                                    </div>
                                    {user?.avatarUrl && (
                                        <button
                                            onClick={handleAvatarRemove}
                                            disabled={avatarUploading}
                                            className="text-xs text-red-500 hover:text-red-700 font-bold transition-colors mt-2 cursor-pointer"
                                        >
                                            Remove Avatar
                                        </button>
                                    )}
                                </div>
                                <div className="flex-grow w-full space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1">Email</label>
                                        <div className="flex gap-2">
                                            <input
                                                className="flex-grow bg-gray-50 border border-gray-100 rounded-full py-2.5 px-4 text-gray-400 focus:outline-none text-sm cursor-not-allowed"
                                                type="email"
                                                defaultValue={user?.email || ''}
                                                readOnly
                                            />
                                            <button
                                                className="bg-gray-100 text-gray-400 px-5 rounded-full text-xs font-semibold cursor-not-allowed"
                                                disabled
                                            >
                                                Immutable
                                            </button>
                                        </div>
                                    </div>
                                    <EditableField label="Username" fieldKey="username" currentValue={user?.username} onSave={handleSaveProfile} />
                                    <EditableField label="Display Name" fieldKey="displayName" currentValue={user?.displayName} onSave={handleSaveProfile} />
                                </div>
                            </div>
                        </section>

                        {/* Session Management */}
                        <LinkedDevices />

                        {/* Destruction Protocols (Danger Zone) */}
                        <section className="bg-red-50/50 rounded-3xl p-8 border border-red-100/60 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="space-y-1.5 text-center md:text-left">
                                <h3 className="font-bold text-red-950 text-base flex items-center justify-center md:justify-start gap-2">
                                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    Destruction Protocols
                                </h3>
                                <p className="text-xs text-red-700/60 max-w-xl">Irreversibly delete account, cryptographic keys, and all message data. Warning: This action triggers a recursive wipe across all relay nodes.</p>
                            </div>
                            <button
                                onClick={handleNukeAccount}
                                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider py-3.5 px-6 rounded-full transition-all active:scale-[0.98] shadow-sm shrink-0 cursor-pointer"
                            >
                                Nuke Everything
                            </button>
                        </section>
                    </div>
                </div>
                </div>
            </main>
        </div>
    );
}
