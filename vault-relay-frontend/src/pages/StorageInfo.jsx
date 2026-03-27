import SideNavBar from '../components/SideNavBar';

export default function StorageInfo() {
    return (
        <div className="bg-background text-on-background font-body min-h-screen flex selection:bg-primary-container selection:text-on-primary-container">
            <SideNavBar />

            {/* Main Content Area */}
            <main className="flex-1 ml-72 p-8 h-screen overflow-y-auto">
                <div className="max-w-6xl mx-auto space-y-12 pb-24">

                    {/* Top Action Bar (from HTML header) */}
                    <div className="flex justify-between items-center w-full mb-8 pb-6 border-b border-outline-variant/10">
                        <div className="hidden md:flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary-container shadow-[0_0_8px_#00e5ff] animate-pulse"></span>
                            <span className="text-[10px] font-bold tracking-widest uppercase text-primary">Secure Protocol Active</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                                <button className="p-2 text-outline-variant hover:bg-primary-container/10 hover:text-primary-container rounded transition-all active:scale-95 duration-200 relative cursor-pointer">
                                    <span className="material-symbols-outlined text-xl">notifications</span>
                                    <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-secondary rounded-full"></span>
                                </button>
                            </div>
                            <div className="ml-4 flex items-center gap-3 pl-4 border-l border-outline-variant/20">
                                <div className="text-right hidden sm:block">
                                    <div className="text-[10px] font-bold text-outline-variant uppercase tracking-widest">Security Level</div>
                                    <div className="text-xs font-headline font-bold text-primary">OMEGA-9</div>
                                </div>
                                <img alt="User security profile" className="w-10 h-10 rounded-full border transform hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all border-primary/20 object-cover cursor-pointer" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAofk_hmhPKnme-RDBKCUAaSWdTGhxwi_yrVB35wSJPB2QjAMe_8hcopbAziTFSaoIkSSepEiOmVDGzn9DqFmpNk0AjHpY3JwfYxaxTKtmEkmSSYUv6nNN_dxmANT0ZLtNilxv76kEbgdr_XfP3uRGzGB0SNkhmWn-OHuWT_7e8zn5LYtluxIXL5qvN3d7SNFtIYFLNwlWxoC6d1tGMdnASE9GxNea5acyYiMo2O_tPx0Ssa-Ecef8pyRY5qxmO8f4GhpyuqvhH2aT7" />
                            </div>
                        </div>
                    </div>

                    {/* Dashboard Header */}
                    <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h1 className="font-headline text-5xl font-bold tracking-tight text-on-surface mb-2">Core Vaults</h1>
                            <p className="text-on-surface-variant font-body text-sm max-w-xl">Centralized cryptographic storage for high-frequency trading keys and protocol governance credentials. Layered with Obsidian-class encryption.</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="bg-surface-container-low px-6 py-4 rounded-xl flex flex-col items-end border border-outline-variant/5">
                                <span className="text-[10px] text-outline uppercase font-bold tracking-[0.2em] mb-1">Total Capacity</span>
                                <span className="text-2xl font-headline font-bold text-primary">1.42 TB <span className="text-sm font-medium text-outline-variant">/ 2.0 TB</span></span>
                            </div>
                            <div className="bg-surface-container-low px-6 py-4 rounded-xl flex flex-col items-end border border-outline-variant/5 bg-gradient-to-b from-surface-container-low to-secondary/5">
                                <span className="text-[10px] text-outline uppercase font-bold tracking-[0.2em] mb-1">Active Keys</span>
                                <span className="text-2xl font-headline font-bold text-secondary text-shadow">4,892</span>
                            </div>
                        </div>
                    </div>

                    {/* Vault Bento Grid */}
                    <div className="grid grid-cols-1">
                        {/* Vault Card 1: High Priority */}
                        <div className="lg:col-span-2 group relative overflow-hidden bg-surface-container rounded-2xl p-8 border border-outline-variant/10 hover:border-primary/30 transition-all duration-500 cursor-pointer hover:shadow-[0_0_30px_rgba(0,229,255,0.05)]">
                            <div className="absolute top-0 right-0 p-4 z-10">
                                <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold tracking-widest uppercase rounded-full">Primary Storage</span>
                            </div>
                            <div className="flex flex-col h-full relative z-10">
                                <div className="flex items-start gap-6 mb-8">
                                    <div className="w-16 h-16 rounded-xl bg-surface-container-highest flex items-center justify-center border border-primary/20 shadow-[0_0_15px_rgba(0,229,255,0.1)]">
                                        <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>dataset</span>
                                    </div>
                                    <div>
                                        <h3 className="font-headline text-2xl font-bold text-on-surface group-hover:text-primary transition-colors">Alpha Sentinel Vault</h3>
                                        <div className="flex items-center gap-4 mt-2">
                                            <span className="text-xs font-bold text-outline-variant flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-[16px]">security</span>
                                                RSA-4096 / AES-GCM
                                            </span>
                                            <span className="text-xs font-bold text-outline-variant flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-[16px]">vpn_key</span>
                                                1,240 Keys
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-auto">
                                    <div className="flex justify-between items-end mb-4">
                                        <div>
                                            <div className="text-[10px] font-bold text-outline uppercase tracking-widest mb-1.5">Capacity Utilization</div>
                                            <div className="text-2xl font-headline font-bold text-on-surface">820.5 GB <span className="text-outline-variant text-sm font-medium">/ 1 TB</span></div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-bold text-outline uppercase tracking-widest mb-1.5">Uptime</div>
                                            <div className="text-xl font-headline font-bold text-primary drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]">99.999%</div>
                                        </div>
                                    </div>
                                    <div className="w-full h-3 bg-surface-container-lowest rounded-full overflow-hidden border border-outline-variant/10">
                                        <div className="h-full bg-gradient-to-r from-primary to-primary-container w-[82%]" style={{ boxShadow: "0 0 10px rgba(0,229,255,0.4)" }}></div>
                                    </div>
                                </div>
                            </div>
                            {/* Interactive Glow Effect */}
                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                        </div>
                    </div>

                    {/* System Footer Activity */}
                    <section className="mt-16 bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/10">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="font-headline text-xl font-bold tracking-tight text-on-surface">Recent Security Events</h2>
                            <button className="text-[10px] font-bold text-primary hover:bg-primary/20 transition-all uppercase tracking-widest cursor-pointer bg-primary/10 px-4 py-2 rounded-lg">View Full Log Cluster</button>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-4 py-3 px-4 hover:bg-surface-container-low rounded-lg transition-colors group cursor-pointer border border-transparent hover:border-outline-variant/10">
                                <span className="text-[11px] font-mono text-outline-variant w-16 group-hover:text-primary transition-colors">14:22:01</span>
                                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-[16px] text-primary">login</span>
                                </div>
                                <span className="text-xs font-medium flex-grow text-on-surface">AUTH_SUCCESS: User [ADMIN_OMEGA] verified via Hardware Key.</span>
                                <span className="text-[10px] font-bold text-outline-variant group-hover:text-on-surface-variant uppercase tracking-widest">RELAY_NODE_04</span>
                            </div>
                            <div className="flex items-center gap-4 py-3 px-4 hover:bg-surface-container-low rounded-lg transition-colors group cursor-pointer border border-transparent hover:border-outline-variant/10">
                                <span className="text-[11px] font-mono text-outline-variant w-16 group-hover:text-secondary transition-colors">14:18:44</span>
                                <div className="w-8 h-8 rounded bg-secondary/10 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-[16px] text-secondary">sync</span>
                                </div>
                                <span className="text-xs font-medium flex-grow text-on-surface">VAULT_SYNC: 'Alpha Sentinel Vault' state synchronized across 4 nodes.</span>
                                <span className="text-[10px] font-bold text-outline-variant group-hover:text-on-surface-variant uppercase tracking-widest">GLOBAL_MESH</span>
                            </div>
                            <div className="flex items-center gap-4 py-3 px-4 bg-error/5 hover:bg-error/10 rounded-lg transition-colors group cursor-pointer border border-error/10">
                                <span className="text-[11px] font-mono text-error/80 w-16 group-hover:text-error transition-colors">14:15:10</span>
                                <div className="w-8 h-8 rounded bg-error/20 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-[16px] text-error">warning</span>
                                </div>
                                <span className="text-xs font-medium flex-grow text-on-surface group-hover:text-error transition-colors">PROXY_ALERT: 12 failed decryption attempts detected from IP: 192.168.0.x</span>
                                <span className="text-[10px] font-bold text-error uppercase tracking-widest">BLOCK_EXECUTED</span>
                            </div>
                            <div className="flex items-center gap-4 py-3 px-4 hover:bg-surface-container-low rounded-lg transition-colors group cursor-pointer border border-transparent hover:border-outline-variant/10">
                                <span className="text-[11px] font-mono text-outline-variant w-16 group-hover:text-primary-container transition-colors">13:58:32</span>
                                <div className="w-8 h-8 rounded bg-primary-container/10 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-[16px] text-primary-container">key</span>
                                </div>
                                <span className="text-xs font-medium flex-grow text-on-surface">KEY_ROTATION: 42 keys rotated in 'Governance' vault. Next rotation in 720h.</span>
                                <span className="text-[10px] font-bold text-outline-variant group-hover:text-on-surface-variant uppercase tracking-widest">AUTO_PILOT</span>
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            {/* Visual Accents: Kinetic Fortress Branding */}
            <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-20 z-[60] pointer-events-none"></div>
        </div>
    );
}
