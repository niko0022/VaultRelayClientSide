import { useState } from 'react';
import SideNavBar from '../components/Shared/SideNavBar';
import { useAuth } from '../contexts/AuthContext';
import { getAvatarUploadUrl, completeAvatarUpload, deleteAvatar, updateProfile } from '../services/authService';

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
        <>
            <label className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider pt-2">{label}</label>
            <div className="flex gap-2">
                <input
                    className="w-full font-body bg-surface-container-lowest border-none rounded-lg p-3 text-on-surface focus:ring-1 focus:outline-none focus:ring-primary transition-all disabled:opacity-50"
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
                        className="bg-primary/20 px-4 rounded-lg text-primary text-sm hover:bg-primary/30 font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center min-w-[80px]"
                    >
                        {isSaving ? <span className="material-symbols-outlined animate-spin text-[18px]">autorenew</span> : "Save"}
                    </button>
                ) : (
                    <button
                        onClick={() => { setNewValue(currentValue || ''); setIsEditing(true); }}
                        className="bg-surface-container-high px-4 rounded-lg text-primary text-sm hover:bg-surface-container-highest font-bold transition-colors cursor-pointer min-w-[80px]"
                    >
                        Edit
                    </button>
                )}
            </div>
        </>
    );
}

export default function UserSetting() {
    const { user, checkAuth } = useAuth();
    const [avatarUploading, setAvatarUploading] = useState(false);

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
        <div className="bg-surface text-on-surface font-body h-screen flex overflow-hidden selection:bg-primary-container selection:text-on-primary-container">
            <SideNavBar />

            {/* Main Content Area */}
            <main className="flex-1 ml-72 p-8 h-screen overflow-y-auto bg-surface">
                <div className="max-w-4xl mx-auto space-y-12 pb-24">
                    {/* Page Header */}
                    <header className="space-y-2">
                        <h1 className="text-4xl font-headline font-bold tracking-tight text-on-surface">Security Settings</h1>
                        <p className="text-on-surface-variant max-w-xl">Configure your cryptographic identity, session protocols, and vault clearance levels.</p>
                    </header>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                        {/* Account Identity Section */}
                        <section className="md:col-span-12 lg:col-span-12 bg-surface-container-low rounded-xl p-8 border border-outline-variant/10 shadow-2xl space-y-8">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-headline font-bold flex items-center gap-2 text-on-surface">
                                    <span className="material-symbols-outlined text-cyan-400">person</span>
                                    Account Identity
                                </h2>
                                <span className="text-[10px] uppercase tracking-widest text-primary px-2 py-1 bg-primary/10 rounded">Active Node</span>
                            </div>
                            <div className="flex flex-col md:flex-row gap-8 items-start">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="relative group">
                                        <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-primary/30 group-hover:border-primary transition-colors bg-surface-container-highest flex items-center justify-center">
                                            {user?.avatarUrl ? (
                                                <img className="w-full h-full object-cover" alt="User avatar" src={user.avatarUrl} />
                                            ) : (
                                                <span className="material-symbols-outlined text-5xl text-on-surface-variant">person</span>
                                            )}
                                            {avatarUploading && (
                                                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                                                    <span className="material-symbols-outlined animate-spin text-primary">autorenew</span>
                                                </div>
                                            )}
                                        </div>
                                        <label className="absolute bottom-0 right-0 p-2 bg-primary-container text-on-primary-container rounded-full shadow-lg hover:scale-110 transition-transform cursor-pointer">
                                            <span className="material-symbols-outlined text-sm">edit</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={avatarUploading} />
                                        </label>
                                    </div>
                                    {user?.avatarUrl && (
                                        <button
                                            onClick={handleAvatarRemove}
                                            disabled={avatarUploading}
                                            className="text-[10px] text-error/70 hover:text-error uppercase tracking-widest font-bold transition-colors cursor-pointer"
                                        >
                                            Remove Avatar
                                        </button>
                                    )}
                                </div>
                                <div className="flex-1 w-full space-y-6">
                                    <div className="space-y-2">
                                        <label className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider">Email</label>
                                        <div className="flex gap-2">
                                            <input className="w-full font-body bg-surface-container-lowest border-none rounded-lg p-3 text-on-surface focus:ring-1 focus:outline-none focus:ring-primary transition-all" type="email" defaultValue={user?.email || ''} readOnly />
                                            <button className="bg-surface-container-high px-4 rounded-lg text-primary text-sm hover:bg-surface-container-highest font-bold transition-colors cursor-pointer">Update</button>
                                        </div>
                                        <EditableField label="Username" fieldKey="username" currentValue={user?.username} onSave={handleSaveProfile} />
                                        <EditableField label="Display Name" fieldKey="displayName" currentValue={user?.displayName} onSave={handleSaveProfile} />
                                    </div>
                                </div>
                            </div>
                        </section>
                        {/* Session Management */}
                        <section className="md:col-span-12 bg-surface-container-low rounded-xl p-8 border border-outline-variant/10">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xl font-headline font-bold flex items-center gap-2 text-on-surface">
                                    <span className="material-symbols-outlined text-cyan-400">devices</span>
                                    Active Sessions
                                </h2>
                                <button className="text-xs text-primary font-bold hover:underline uppercase tracking-widest cursor-pointer">Terminate All Others</button>
                            </div>
                            <div className="space-y-4">
                                {/* Session 1 */}
                                <div className="flex items-center justify-between p-4 bg-surface-container-high rounded-lg hover:bg-surface-container-highest transition-colors group cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded bg-surface-container-lowest flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-cyan-400">laptop_mac</span>
                                        </div>
                                        <div>
                                            <div className="font-bold font-headline text-sm text-on-surface">macOS Relay Client • 192.168.1.42</div>
                                            <div className="text-xs text-on-surface-variant">Last active: Just now • London, UK</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-[10px] text-primary flex items-center gap-1 font-bold">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                            CURRENT SESSION
                                        </span>
                                    </div>
                                </div>
                                {/* Session 2 */}
                                <div className="flex items-center justify-between p-4 bg-surface-container-low border border-outline-variant/5 rounded-lg hover:bg-surface-container-high transition-colors group cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded bg-surface-container-lowest flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-neutral-500">smartphone</span>
                                        </div>
                                        <div>
                                            <div className="font-bold font-headline text-sm text-on-surface">Vault Mobile Pro • iPhone 15</div>
                                            <div className="text-xs text-on-surface-variant">Last active: 4 hours ago • Paris, FR</div>
                                        </div>
                                    </div>
                                    <button className="opacity-0 group-hover:opacity-100 p-2 text-error hover:bg-error/10 rounded transition-all cursor-pointer">
                                        <span className="material-symbols-outlined text-sm">logout</span>
                                    </button>
                                </div>
                            </div>
                        </section>
                        {/* Destruction Protocols (Danger Zone) */}
                        <section className="md:col-span-12 bg-error-container/10 border border-error/20 rounded-xl p-8 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                                <span className="material-symbols-outlined text-9xl text-error">dangerous</span>
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4 text-error">
                                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                                    <h2 className="text-xl font-headline font-bold uppercase tracking-tighter">Destruction Protocols</h2>
                                </div>
                                <div className="max-w-xl mb-8">
                                    <p className="text-on-error-container font-medium">Irreversibly delete account, cryptographic keys, and all message data.</p>
                                    <p className="text-xs text-on-error-container/60 mt-2">Warning: This action triggers a recursive wipe across all relay nodes. Data recovery is mathematically impossible once initiated.</p>
                                </div>
                                <button className="px-8 py-4 bg-error text-on-error rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-error/80 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_10px_30px_rgba(255,180,171,0.2)] cursor-pointer">
                                    Nuke Everything
                                </button>
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}
