import React from 'react';
import SideNavBar from '../components/SideNavBar';

export default function UserSetting() {
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
                                <div className="relative group">
                                    <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-primary/30 group-hover:border-primary transition-colors cursor-pointer">
                                        <img className="w-full h-full object-cover" alt="Technical professional headshot" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCOfVwkiJORRRrqynJpL3C5fTHl2TUohOaxmeIOwHaz5LeHmFyvM9xdWJt_C20HuWvujA98MwRYpbwLgkX7A71P9ieUE6Suh2_YOAymWRMnf8XKY995G2IGVM7IlBdynlkyQXDJHOBar5w8gZo39930sEbcx4krj_16MIoZpKChLZ7_soxylu3bJXpTYADovL4nMnkrF8I9bGe4p6UaYtdnwdntwo5KWgKMWc_EXEW0RRwFUgbPmqrzZAHO_SV_FUyLU9XTGy1y8Zrl" />
                                    </div>
                                    <button className="absolute bottom-0 right-0 p-2 bg-primary-container text-on-primary-container rounded-full shadow-lg hover:scale-110 transition-transform cursor-pointer">
                                        <span className="material-symbols-outlined text-sm">edit</span>
                                    </button>
                                </div>
                                <div className="flex-1 w-full space-y-6">
                                    <div className="space-y-2">
                                        <label className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider">Email</label>
                                        <div className="flex gap-2">
                                            <input className="w-full font-body bg-surface-container-lowest border-none rounded-lg p-3 text-on-surface focus:ring-1 focus:outline-none focus:ring-primary transition-all" type="email" defaultValue="operator.04@vault-relay.net" />
                                            <button className="bg-surface-container-high px-4 rounded-lg text-primary text-sm hover:bg-surface-container-highest font-bold transition-colors cursor-pointer">Update</button>
                                        </div>
                                        <label className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider pt-2">Password</label>
                                        <div className="flex gap-2">
                                            <input className="w-full font-body bg-surface-container-lowest border-none rounded-lg p-3 text-on-surface focus:ring-1 focus:outline-none focus:ring-primary transition-all" type="email" defaultValue="operator.04@vault-relay.net" />
                                            <button className="bg-surface-container-high px-4 rounded-lg text-primary text-sm hover:bg-surface-container-highest font-bold transition-colors cursor-pointer">Update</button>
                                        </div>
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
