import { Link } from 'react-router-dom';
import SideNavBar from '../components/SideNavBar';

export default function Messages() {
    return (
        <div className="bg-background text-on-surface font-body overflow-hidden h-screen flex relative">
            {/* SideNavBar (Shared Component) */}
            <SideNavBar />

            {/* Main Content Canvas */}
            <main className="flex flex-1 ml-72 h-screen overflow-hidden">
                {/* Secondary Pane: Conversation List */}
                <section className="w-80 h-full bg-surface-container-low flex flex-col kinetic-grid">
                    <div className="p-6">
                        <h2 className="font-headline text-xl font-bold text-on-surface mb-4">Active Chats</h2>
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
                        {/* Chat Item Active */}
                        <div className="p-3 bg-surface-container-high rounded-lg cursor-pointer flex gap-3 relative">
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-primary"></div>
                            <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-secondary">terminal</span>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <div className="flex justify-between items-baseline">
                                    <h3 className="font-headline text-sm font-bold text-primary truncate">Proxy_Alpha_01</h3>
                                    <span className="text-[10px] text-on-surface-variant">09:41</span>
                                </div>
                                <p className="text-xs text-on-surface-variant truncate">Payload signature verified...</p>
                            </div>
                        </div>

                        {/* Chat Item */}
                        <div className="p-3 hover:bg-surface-container-high/50 rounded-lg cursor-pointer flex gap-3 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-on-surface-variant">person</span>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <div className="flex justify-between items-baseline">
                                    <h3 className="font-headline text-sm font-bold text-on-surface truncate">Ghost_Operator</h3>
                                    <span className="text-[10px] text-on-surface-variant">Yesterday</span>
                                </div>
                                <p className="text-xs text-on-surface-variant truncate">Node rotation complete.</p>
                            </div>
                        </div>

                        {/* Chat Item */}
                        <div className="p-3 hover:bg-surface-container-high/50 rounded-lg cursor-pointer flex gap-3 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0 relative">
                                <span className="material-symbols-outlined text-on-surface-variant">shield</span>
                                <div className="absolute -right-0.5 -bottom-0.5 w-3 h-3 bg-primary rounded-full border-2 border-surface-container-low"></div>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <div className="flex justify-between items-baseline">
                                    <h3 className="font-headline text-sm font-bold text-on-surface truncate">Security_Core</h3>
                                    <span className="text-[10px] text-on-surface-variant">2d ago</span>
                                </div>
                                <p className="text-xs text-on-surface-variant truncate">Integrity check passed.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Main Area: Active Chat */}
                <section className="flex-1 h-full flex flex-col bg-surface overflow-hidden relative">
                    {/* TopAppBar for active chat */}
                    <header className="h-16 w-full flex items-center justify-between px-6 bg-[#131313]/70 backdrop-blur-xl sticky top-0 z-50 shadow-[0_0_20px_rgba(0,229,255,0.08)] shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                                <h2 class="font-headline text-lg font-bold text-primary tracking-tight leading-tight">Proxy_Alpha_01</h2>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(0,229,255,0.8)]"></div>
                                    <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">End-to-End Encrypted</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button className="p-2 text-on-surface-variant hover:text-primary transition-colors hover:bg-white/5 rounded cursor-pointer">
                                <span className="material-symbols-outlined">search</span>
                            </button>
                            <button className="p-2 text-on-surface-variant hover:text-primary transition-colors hover:bg-white/5 rounded cursor-pointer">
                                <span className="material-symbols-outlined">settings</span>
                            </button>
                        </div>
                    </header>

                    {/* Message History */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-6 flex flex-col scrollbar-hide">
                        {/* System Indicator */}
                        <div className="flex justify-center">
                            <div className="bg-surface-container-low px-4 py-1 rounded text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-medium">
                                Communication Tunnel Established: 12.04.2024
                            </div>
                        </div>

                        {/* Received Message */}
                        <div className="flex flex-col items-start max-w-[70%] gap-1">
                            <div className="bg-surface-container-high text-on-surface p-4 rounded-tr-xl rounded-br-xl rounded-bl-xl shadow-sm border-l-2 border-primary/20">
                                <p className="text-[15px] leading-relaxed">System handshake complete. Relay point 7 is now handling outbound traffic. Do you have the decrypted manifest?</p>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-on-surface-variant uppercase font-bold">Proxy_Alpha_01</span>
                                <span className="text-[10px] text-on-surface-variant/50">09:38</span>
                            </div>
                        </div>

                        {/* Sent Message */}
                        <div className="flex flex-col items-end self-end max-w-[70%] gap-1">
                            <div className="bg-secondary-container text-on-secondary-container p-4 rounded-tl-xl rounded-bl-xl rounded-br-xl shadow-lg">
                                <p className="text-[15px] leading-relaxed">Manifest is ready. Transferring via ephemeral vault. Check your secondary relay for the access token.</p>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-on-surface-variant/50">09:40</span>
                                <span className="material-symbols-outlined text-[12px] text-primary">done_all</span>
                                <span className="text-[10px] text-primary uppercase font-bold">Secure</span>
                            </div>
                        </div>

                        {/* Media Relay Card (Bento Style) - Received Message */}
                        <div className="flex flex-col items-start max-w-[70%] gap-1">
                            <div className="bg-surface-container-high rounded-xl overflow-hidden shadow-xl w-full">
                                <div className="aspect-video relative group overflow-hidden">
                                    <img
                                        className="w-full h-full object-cover grayscale brightness-75 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                                        alt="Futuristic server room with dark racks and glowing cyan cables and light patterns in a cinematic moody atmosphere"
                                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuC6friNN6GNFcGqIfr7xOtCOB3DODyMuv0qIOuuk7ixp2IE8SXVy3B7Jv5lYoJThMhr5CkQ54QWn42g-3TAiDlQbN6OerDUQNb3jv3MbJalsQ8LSrs_t2yFrlK4LwYq81rs0VGjeBDL6j7tMsQYq0RYDCFbe792o5OwTZRa1lZembOM8-Ln1Rr_HFtNhqWoZ6coHphIUo68Z35e_8WTWKPe6dw36YKv-WU_pQDKqJYE2r7jmngxKsFKt_91xgVblEei4D6H1nsslutX"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-surface-container-high via-transparent to-transparent"></div>
                                    <div className="absolute bottom-4 left-4">
                                        <span className="bg-primary/20 backdrop-blur-md text-primary text-[10px] font-bold px-2 py-1 rounded border border-primary/30 uppercase tracking-widest">Attachment Encrypted</span>
                                    </div>
                                </div>
                                <div className="p-4 flex items-center justify-between border-t border-outline-variant/10">
                                    <div>
                                        <p className="text-xs font-bold font-headline text-on-surface">relay_node_schematics.osv</p>
                                        <p className="text-[10px] text-on-surface-variant">14.2 MB • Binary Vault</p>
                                    </div>
                                    <button className="w-10 h-10 rounded bg-surface-container-highest flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all cursor-pointer">
                                        <span className="material-symbols-outlined text-on-surface-variant hover:text-primary">download</span>
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-on-surface-variant uppercase font-bold">Proxy_Alpha_01</span>
                                <span className="text-[10px] text-on-surface-variant/50">09:41</span>
                            </div>
                        </div>

                        {/* Received Message */}
                        <div className="flex flex-col items-start max-w-[70%] gap-1">
                            <div className="bg-surface-container-high text-on-surface p-4 rounded-tr-xl rounded-br-xl rounded-bl-xl shadow-sm border-l-2 border-primary/20">
                                <p className="text-[15px] leading-relaxed">Payload signature verified. Initiating clean-up protocol in 300 seconds. Awaiting your final confirmation.</p>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-on-surface-variant uppercase font-bold">Proxy_Alpha_01</span>
                                <span className="text-[10px] text-on-surface-variant/50">09:41</span>
                            </div>
                        </div>
                    </div>

                    {/* Secure Input Field */}
                    <div className="p-6 bg-[#131313]/90 backdrop-blur-xl shrink-0">
                        <div className="max-w-4xl mx-auto flex items-end gap-4">
                            <div className="flex-1 bg-surface-container-lowest rounded-xl flex flex-col p-1 transition-all border border-transparent">
                                <textarea
                                    className="w-full bg-transparent border-none text-on-surface text-[15px] py-3 px-4 focus:ring-0 focus:outline-none resize-none max-h-48 scrollbar-hide placeholder:text-outline"
                                    placeholder="Type an encrypted message..."
                                    rows="1"
                                ></textarea>
                                <div className="flex items-center justify-between px-3 pb-2 pt-1">
                                    <div className="flex gap-1">
                                        <button className="p-2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
                                            <span className="material-symbols-outlined text-xl">attach_file</span>
                                        </button>
                                        <button className="p-2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
                                            <span className="material-symbols-outlined text-xl">mood</span>
                                        </button>
                                        <button className="p-2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
                                            <span className="material-symbols-outlined text-xl">schedule_send</span>
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all active:scale-90 cursor-pointer">
                                            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Visual Accents: Kinetic Fortress Branding */}
            <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-20 z-[60] pointer-events-none"></div>
        </div>
    );
}
