import { useState, useEffect } from 'react';
import prettyBytes from 'pretty-bytes';
import SideNavBar from '../components/SideNavBar';
import { signalStoreAdapter } from '../lib/signal/SignalStoreAdapter';
import { chatService } from '../services/chatService';
import { getEvents, onEventsChange } from '../lib/eventLog';

export default function StorageInfo() {
    const [storageStats, setStorageStats] = useState({ usage: 0, quota: 0, percentage: 0 });
    const [dbStats, setDbStats] = useState({
        messages: 0,
        preKeys: 0,
        signedPreKeys: 0,
        kyberPreKeys: 0,
        sessions: 0
    });
    const [serverPreKeyCount, setServerPreKeyCount] = useState(null);
    const [activityLog, setActivityLog] = useState(() => getEvents());

    useEffect(() => {
        if (navigator.storage && navigator.storage.estimate) {
            navigator.storage.estimate()
                .then(({ usage, quota }) => {
                    const percentage = quota > 0 ? (usage / quota) * 100 : 0;
                    setStorageStats({ usage, quota, percentage });
                })
                .catch(err => {
                    console.error("Failed to estimate storage usage", err);
                });
        }

        signalStoreAdapter.getDatabaseStats()
            .then(stats => {
                setDbStats(stats);
            })
            .catch(err => {
                console.error("Failed to fetch database stats", err);
            });

        chatService.getPreKeyCount()
            .then(res => {
                if (res && typeof res.count === 'number') {
                    setServerPreKeyCount(res.count);
                }
            })
            .catch(err => {
                console.error("Failed to fetch server pre-key count", err);
            });

        return onEventsChange(setActivityLog);
    }, []);

    const totalKeys = dbStats.preKeys + dbStats.signedPreKeys + dbStats.kyberPreKeys + (serverPreKeyCount || 0);
    return (
        <div className="bg-background text-on-background font-body min-h-screen flex selection:bg-primary-container selection:text-on-primary-container">
            <SideNavBar />

            {/* Main Content Area */}
            <main className="flex-1 ml-72 p-8 h-screen overflow-y-auto">
                <div className="max-w-6xl mx-auto space-y-12 pb-24">
                    {/* Dashboard Header */}
                    <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h1 className="font-headline text-5xl font-bold tracking-tight text-on-surface mb-2">Core Vaults</h1>
                            <p className="text-on-surface-variant font-body text-sm max-w-xl">Centralized cryptographic storage for high-frequency trading keys and protocol governance credentials. Layered with Obsidian-class encryption.</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="bg-surface-container-low px-6 py-4 rounded-xl flex flex-col items-end border border-outline-variant/5">
                                <span className="text-[10px] text-outline uppercase font-bold tracking-[0.2em] mb-1">Total Capacity</span>
                                <span className="text-2xl font-headline font-bold text-primary">
                                    {prettyBytes(storageStats.usage)}
                                    <span className="text-sm font-medium text-outline-variant"> / {prettyBytes(storageStats.quota)}</span>
                                </span>
                            </div>
                            <div className="bg-surface-container-low px-6 py-4 rounded-xl flex flex-col items-end border border-outline-variant/5 bg-gradient-to-b from-surface-container-low to-secondary/5">
                                <span className="text-[10px] text-outline uppercase font-bold tracking-[0.2em] mb-1">Active Keys</span>
                                <span className="text-2xl font-headline font-bold text-secondary text-shadow">{totalKeys.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Vault Bento Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                                                {totalKeys.toLocaleString()} Keys
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-auto">
                                    <div className="flex justify-between items-end mb-4">
                                        <div>
                                            <div className="text-[10px] font-bold text-outline uppercase tracking-widest mb-1.5">Capacity Utilization</div>
                                            <div className="text-2xl font-headline font-bold text-on-surface">
                                                {prettyBytes(storageStats.usage)}
                                                <span className="text-outline-variant text-sm font-medium"> / {prettyBytes(storageStats.quota)}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-bold text-outline uppercase tracking-widest mb-1.5">Uptime</div>
                                            <div className="text-xl font-headline font-bold text-primary drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]">99.999%</div>
                                        </div>
                                    </div>
                                    <div className="w-full h-3 bg-surface-container-lowest rounded-full overflow-hidden border border-outline-variant/10">
                                        <div
                                            className="h-full bg-gradient-to-r from-primary to-primary-container transition-all duration-500"
                                            style={{
                                                width: `${Math.max(storageStats.percentage, 0.5)}%`,
                                                boxShadow: "0 0 10px rgba(0,229,255,0.4)"
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                            {/* Interactive Glow Effect */}
                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                        </div>

                        {/* Database Metrics Card */}
                        <div className="lg:col-span-1 group relative overflow-hidden bg-surface-container rounded-2xl p-8 border border-outline-variant/10 hover:border-secondary/30 transition-all duration-500 cursor-pointer hover:shadow-[0_0_30px_rgba(240,0,255,0.05)] flex flex-col justify-between">
                            <div className="absolute top-0 right-0 p-4 z-10">
                                <span className="px-3 py-1 bg-secondary/10 text-secondary text-[10px] font-bold tracking-widest uppercase rounded-full">Secure Database</span>
                            </div>
                            <div className="flex flex-col h-full relative z-10">
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-surface-container-highest flex items-center justify-center border border-secondary/20 shadow-[0_0_15px_rgba(240,0,255,0.1)]">
                                        <span className="material-symbols-outlined text-secondary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>folder_managed</span>
                                    </div>
                                    <div>
                                        <h3 className="font-headline text-lg font-bold text-on-surface group-hover:text-secondary transition-colors">IndexedDB Schema</h3>
                                        <span className="text-[10px] font-bold text-outline-variant uppercase tracking-widest">signal-storage</span>
                                    </div>
                                </div>
                                <div className="space-y-4 my-auto">
                                    <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                                        <span className="text-xs text-outline-variant font-medium">Local Messages</span>
                                        <span className="text-sm font-bold text-on-surface font-mono">{dbStats.messages.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                                        <span className="text-xs text-outline-variant font-medium">Secure Sessions</span>
                                        <span className="text-sm font-bold text-on-surface font-mono">{dbStats.sessions.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                                        <span className="text-xs text-outline-variant font-medium">One-Time Pre-Keys (Local)</span>
                                        <span className="text-sm font-bold text-on-surface font-mono">{dbStats.preKeys.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                                        <span className="text-xs text-outline-variant font-medium">One-Time Pre-Keys (Server)</span>
                                        <span className="text-sm font-bold text-on-surface font-mono">
                                            {serverPreKeyCount !== null ? serverPreKeyCount.toLocaleString() : 'Checking...'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                                        <span className="text-xs text-outline-variant font-medium">Signed Pre-Keys</span>
                                        <span className="text-sm font-bold text-on-surface font-mono">{dbStats.signedPreKeys.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-2">
                                        <span className="text-xs text-outline-variant font-medium">Post-Quantum Keys</span>
                                        <span className="text-sm font-bold text-on-surface font-mono">{dbStats.kyberPreKeys.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute inset-0 bg-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                        </div>
                    </div>

                    {/* System Footer Activity */}
                    <section className="mt-16 bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/10">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="font-headline text-xl font-bold tracking-tight text-on-surface">Recent Security Events</h2>
                            <span className="text-[10px] font-bold text-outline-variant uppercase tracking-widest">{activityLog.length} events this session</span>
                        </div>
                        <div className="space-y-2">
                            {activityLog.length === 0 && (
                                <div className="text-center py-8 text-outline-variant text-xs">No security events recorded this session.</div>
                            )}
                            {[...activityLog].reverse().map((evt, i) => {
                                const isError = evt.level === 'error';
                                const isWarn = evt.level === 'warn';
                                const color = isError ? 'error' : isWarn ? 'secondary' : 'primary';
                                const icon = isError ? 'warning' : evt.type === 'AUTH' ? 'login' : evt.type === 'SOCKET' ? 'sync' : evt.type === 'KEY_GEN' || evt.type === 'KEY_UPLOAD' ? 'vpn_key' : 'verified_user';
                                const time = evt.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
                                return (
                                    <div key={i} className={`flex items-center gap-4 py-3 px-4 rounded-lg transition-colors group cursor-pointer border ${isError ? 'bg-error/5 hover:bg-error/10 border-error/10' : 'hover:bg-surface-container-low border-transparent hover:border-outline-variant/10'
                                        }`}>
                                        <span className={`text-[11px] font-mono w-16 transition-colors ${isError ? 'text-error/80 group-hover:text-error' : `text-outline-variant group-hover:text-${color}`
                                            }`}>{time}</span>
                                        <div className={`w-8 h-8 rounded bg-${color}/10 flex items-center justify-center shrink-0`}>
                                            <span className={`material-symbols-outlined text-[16px] text-${color}`}>{icon}</span>
                                        </div>
                                        <span className={`text-xs font-medium flex-grow ${isError ? 'text-on-surface group-hover:text-error' : 'text-on-surface'
                                            }`}>{evt.type}: {evt.message}</span>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${isError ? 'text-error' : 'text-outline-variant group-hover:text-on-surface-variant'
                                            }`}>CLIENT</span>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>
            </main>

            {/* Visual Accents: Kinetic Fortress Branding */}
            <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-20 z-[60] pointer-events-none"></div>
        </div>
    );
}
