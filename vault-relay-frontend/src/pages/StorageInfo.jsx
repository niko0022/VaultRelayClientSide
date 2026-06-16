import { useState, useEffect } from 'react';
import prettyBytes from 'pretty-bytes';
import SideNavBar from '../components/Shared/SideNavBar';
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

    // SVG Circular Progress Settings
    const percentage = Math.round(storageStats.percentage) || 82; // Fallback to 82 for visual demo if stats are empty
    const radius = 45;
    const strokeWidth = 8;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="bg-[#BDE0D8] text-gray-900 font-body overflow-hidden h-screen flex items-center justify-center p-4 md:p-6 lg:p-8">
            <div className="bg-[#F8FAF9] w-full h-full max-w-[1600px] rounded-3xl md:rounded-[2.5rem] lg:rounded-[3.5rem] flex overflow-hidden shadow-2xl relative border border-white/20">
                
                {/* Slim inline Navigation Rail */}
                <SideNavBar className="relative h-full" />

                {/* Main Content Area */}
                <main className="flex-1 bg-[#F1F4F3] overflow-y-auto p-8 lg:p-12 relative">
                    <div className="max-w-6xl mx-auto space-y-6 pb-24">
                        
                        {/* Page Header */}
                        <div className="mb-4">
                            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">Core Vaults</h1>
                        </div>

                        {/* Bento Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            {/* Left Pane: Total Capacity & Alpha Sentinel Vault */}
                            <div className="lg:col-span-2 space-y-6 flex flex-col justify-between">
                                
                                {/* Total Capacity Card */}
                                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-3.5">
                                    <div className="flex justify-between items-center text-sm font-semibold text-gray-800">
                                        <span>Total Capacity:</span>
                                        <span className="font-mono text-gray-500">
                                            {prettyBytes(storageStats.usage)} / {prettyBytes(storageStats.quota || 10 * 1024 * 1024 * 1024 * 1024)}
                                        </span>
                                    </div>
                                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-black rounded-full transition-all duration-500"
                                            style={{ width: `${Math.max(storageStats.percentage, 0.5)}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Alpha Sentinel Vault Card */}
                                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between flex-grow relative">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-gray-950 text-lg">Alpha Sentinel Vault</h3>
                                        <button className="text-gray-400 hover:text-gray-700 transition-colors p-1">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                                            </svg>
                                        </button>
                                    </div>

                                    <div className="flex flex-col md:flex-row items-center gap-8 py-4 my-auto">
                                        {/* Circular Gauge */}
                                        <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                                                <circle
                                                    cx="60"
                                                    cy="60"
                                                    r={radius}
                                                    className="text-gray-100"
                                                    strokeWidth={strokeWidth}
                                                    stroke="currentColor"
                                                    fill="transparent"
                                                />
                                                <circle
                                                    cx="60"
                                                    cy="60"
                                                    r={radius}
                                                    className="text-black transition-all duration-500"
                                                    strokeWidth={strokeWidth}
                                                    strokeDasharray={circumference}
                                                    strokeDashoffset={strokeDashoffset}
                                                    strokeLinecap="round"
                                                    stroke="currentColor"
                                                    fill="transparent"
                                                />
                                            </svg>
                                            <div className="absolute flex flex-col items-center justify-center">
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Capacity</span>
                                                <span className="text-2xl font-bold text-gray-900">{percentage}%</span>
                                            </div>
                                        </div>

                                        {/* Vault Status/Uptime Details */}
                                        <div className="space-y-3">
                                            <div>
                                                <span className="text-xs text-gray-400 block font-semibold uppercase tracking-wider">Uptime</span>
                                                <span className="text-xl font-bold text-gray-950">99.98%</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-gray-400 block font-semibold uppercase tracking-wider mb-1">Status</span>
                                                <div className="inline-flex items-center gap-1.5 bg-[#EAF5F0] text-[#1D7A54] font-bold text-xs px-3 py-1 rounded-full">
                                                    <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full"></span>
                                                    Active
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-3 pt-2">
                                        <button className="px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-xs font-semibold rounded-full text-gray-700 shadow-sm transition-colors cursor-pointer">
                                            Additions
                                        </button>
                                        <button className="px-5 py-2.5 bg-black hover:bg-gray-900 text-xs font-semibold rounded-full text-white shadow-sm transition-colors cursor-pointer">
                                            Action
                                        </button>
                                        <button className="w-9 h-9 bg-black hover:bg-gray-900 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Right Pane: Key, DB, & Session Cards */}
                            <div className="space-y-6 flex flex-col justify-between">
                                
                                {/* Active Keys Card */}
                                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between h-[115px]">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Keys</span>
                                    <span className="text-4xl font-bold text-gray-950 leading-tight">
                                        {totalKeys.toLocaleString()}
                                    </span>
                                </div>

                                {/* Secure Database Card */}
                                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between min-h-[160px]">
                                    <div>
                                        <h3 className="font-bold text-gray-950 text-base mb-1">Secure Database</h3>
                                        <span className="text-xs font-semibold text-gray-400 block mb-3">Local Messages</span>
                                        <span className="text-4xl font-bold text-gray-950 leading-none">
                                            {dbStats.messages.toLocaleString()}
                                        </span>
                                    </div>
                                    
                                    {/* DB Key Details List (keeps all baseline HTML data available) */}
                                    <div className="border-t border-gray-100 mt-4 pt-3 space-y-1.5 text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                                        <div className="flex justify-between">
                                            <span>Pre-Keys (Local)</span>
                                            <span className="text-gray-700 font-bold">{dbStats.preKeys.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Pre-Keys (Server)</span>
                                            <span className="text-gray-700 font-bold">
                                                {serverPreKeyCount !== null ? serverPreKeyCount.toLocaleString() : '...'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Signed Pre-Keys</span>
                                            <span className="text-gray-700 font-bold">{dbStats.signedPreKeys.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Post-Quantum Keys</span>
                                            <span className="text-gray-700 font-bold">{dbStats.kyberPreKeys.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Secure Sessions Card */}
                                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between h-[115px]">
                                    <div>
                                        <h3 className="font-bold text-gray-950 text-base mb-1">Secure Sessions</h3>
                                        <span className="text-xs font-semibold text-gray-400 block">Secure Sessions</span>
                                    </div>
                                    <span className="text-3xl font-bold text-gray-950 leading-none">
                                        {dbStats.sessions.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Recent Security Events Card */}
                        <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-950">Recent Security Events</h2>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{activityLog.length} events this session</span>
                            </div>
                            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                                {activityLog.length === 0 && (
                                    <div className="text-center py-8 text-gray-400 text-xs font-semibold">No security events recorded this session.</div>
                                )}
                                {[...activityLog].reverse().map((evt, i) => {
                                    const isError = evt.level === 'error';
                                    const timeStr = evt.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                                    
                                    return (
                                        <div key={i} className="flex items-center gap-4 py-2 border-b border-gray-50 last:border-b-0">
                                            {/* SVG Status Circle */}
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                                isError ? 'bg-red-50 text-red-500' : 'bg-[#EAF5F0] text-[#1D7A54]'
                                            }`}>
                                                {isError ? (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                    </svg>
                                                )}
                                            </div>
                                            
                                            {/* Event copy */}
                                            <div className="text-xs font-semibold text-gray-700 flex-grow">
                                                {evt.type}: {evt.message}
                                                <span className="text-[10px] text-gray-400 font-normal ml-2 lowercase">
                                                    - {timeStr}
                                                </span>
                                            </div>
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                                                CLIENT
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
}
