import { Link } from 'react-router-dom';
import chatPreview from '../assets/brave_screenshot_stitch.withgoogle.com.png';

/* ─── Decorative: Encrypted message card ───────────────────────────────── */
function EncryptedMessageCard() {
    return (
        <div className="relative w-full">
            <div className="rounded-2xl bg-gray-900/80 backdrop-blur-xl border border-white/10 p-6 shadow-2xl space-y-4">

                {/* Row label */}
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">What the server sees</p>

                {/* Encrypted ciphertext block */}
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-gray-400 leading-relaxed">
                    <p>*^@#%&amp;.$!£€¥</p>
                    <p>%^*€^&amp;$#@~.*!</p>
                    <p>@#%^.%~*&amp;$^#!</p>
                    <p className="text-gray-600">~^.#%*@!$€£¥&amp;</p>
                </div>

                {/* Arrow separator with lock */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-white/10"></div>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400/30 to-cyan-600/30 border border-teal-400/40 flex items-center justify-center shadow-[0_0_16px_rgba(0,200,200,0.3)]">
                        <span className="material-symbols-outlined text-teal-300 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                    </div>
                    <div className="flex-1 h-px bg-white/10"></div>
                </div>

                {/* Row label */}
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">What only you see</p>

                {/* Decrypted readable message bubble */}
                <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl px-4 py-3">
                    <p className="text-white text-sm font-medium leading-relaxed">Your messages are end-to-end encrypted. Nobody else can read them.</p>
                </div>

            </div>
        </div>
    );
}

/* ─── Main Home Page ────────────────────────────────────────────────────── */
export default function Home() {
    return (
        <div className="min-h-screen font-body" style={{
            background: 'linear-gradient(135deg, #d4f0ee 0%, #e8f5e8 25%, #f0ece0 50%, #f5e8dc 75%, #eddee8 100%)'
        }}>
            {/* ─── Navbar ──────────────────────────────────────────────────── */}
            <nav className="fixed top-0 w-full z-50 bg-white/30 backdrop-blur-xl border-b border-white/40 shadow-sm">
                <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-base" style={{ fontVariationSettings: "'FILL' 1" }}>hexagon</span>
                        </div>
                        <span className="font-black text-gray-900 text-lg tracking-tight">VaultRelay</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8">
                        <a className="text-gray-900 font-semibold text-sm border-b-2 border-gray-900 pb-0.5" href="#">Home</a>
                        <a className="text-gray-500 hover:text-gray-900 font-medium text-sm transition-colors" href="#">Features</a>
                        <a className="text-gray-500 hover:text-gray-900 font-medium text-sm transition-colors" href="#">Security</a>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link to="/login">
                            <button className="bg-gray-900 text-white px-5 py-2 rounded-full font-semibold text-sm hover:bg-gray-800 active:scale-95 transition-all cursor-pointer">
                                Login
                            </button>
                        </Link>
                        <Link to="/register">
                            <button className="bg-gray-900 text-white px-5 py-2 rounded-full font-semibold text-sm hover:bg-gray-800 active:scale-95 transition-all cursor-pointer">
                                Register
                            </button>
                        </Link>
                    </div>
                </div>
            </nav>

            <main>
                {/* ═══════════════════════════════════════════════════════════
                    TOP HALF — Hero + Feature cards  (Screen 1)
                ═══════════════════════════════════════════════════════════ */}
                <section className="pt-28 pb-16 px-6 max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        {/* Left: Hero copy */}
                        <div>
                            <h1 className="text-5xl md:text-6xl font-black tracking-tight text-gray-900 leading-[1.05] mb-5">
                                Privacy by Design,<br />
                                Security by Signal
                            </h1>
                            <p className="text-gray-600 text-lg leading-relaxed max-w-md mb-10">
                                Experience end-to-end encrypted messaging with the world-renowned Signal Protocol. Your conversations are truly private.
                            </p>
                            <Link to="/register">
                                <button className="bg-gray-900 text-white px-8 py-3.5 rounded-full font-semibold text-sm hover:bg-gray-800 transition-all active:scale-95 cursor-pointer shadow-lg">
                                    Get Started Free
                                </button>
                            </Link>
                        </div>

                        {/* Right: Mock chat preview */}
                        <div className="relative">
                            {/* Glow blob */}
                            <div className="absolute inset-0 bg-teal-300/20 rounded-3xl blur-[60px] scale-110 pointer-events-none" />
                            <img src={chatPreview} alt="VaultRelay Chat Preview" className="w-full rounded-2xl shadow-2xl border border-white/30 relative z-10" />
                        </div>
                    </div>

                    {/* ─── Feature Cards Row ──────────────────────────────── */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-16">
                        {/* Signal Protocol */}
                        <div className="bg-white/40 backdrop-blur-md border border-white/50 rounded-2xl p-7 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                            {/* Wave icon decoration */}
                            <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-xl bg-teal-100/80">
                                <span className="material-symbols-outlined text-teal-600 text-2xl">lock</span>
                            </div>
                            <h3 className="text-gray-900 font-bold text-lg mb-2">Signal Protocol</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                State-of-the-art encryption built on the world-renowned Signal Protocol. Your conversations are for-data.
                            </p>
                        </div>

                        {/* Zero-Knowledge */}
                        <div className="bg-white/40 backdrop-blur-md border border-white/50 rounded-2xl p-7 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                            <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-xl bg-purple-100/80">
                                <span className="material-symbols-outlined text-purple-600 text-2xl">shield</span>
                            </div>
                            <h3 className="text-gray-900 font-bold text-lg mb-2">Zero-Knowledge</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                No data is stored on our servers. All encryption happens on-device to keep your information private.
                            </p>
                        </div>

                        {/* Secure Media */}
                        <div className="bg-white/40 backdrop-blur-md border border-white/50 rounded-2xl p-7 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                            <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-100/80">
                                <span className="material-symbols-outlined text-cyan-600 text-2xl">cloud_done</span>
                            </div>
                            <h3 className="text-gray-900 font-bold text-lg mb-2">Secure Media</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                Encrypted voice and photo sharing. Your passwords, messages, and media stay completely private.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ═══════════════════════════════════════════════════════════
                    BOTTOM HALF — Gold Standard CTA + Encryption Demo  (Screen 2)
                ═══════════════════════════════════════════════════════════ */}
                <section className="px-6 pb-24 max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left: CTA card */}
                        <div className="bg-white/40 backdrop-blur-md border border-white/50 rounded-3xl p-10 flex flex-col justify-between shadow-sm">
                            <div>
                                <h2 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight mb-5">
                                    The Gold Standard<br />
                                    of Privacy.
                                </h2>
                                <p className="text-gray-500 text-base leading-relaxed mb-8 max-w-sm">
                                    Experience secure, end-to-end encrypted messaging built on the Signal encryption protocol. Your conversations, completely private.
                                </p>
                                {/* Buttons */}
                                <div className="flex flex-wrap gap-3 mb-8">
                                    <Link to="/register">
                                        <button className="bg-gray-900 text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-gray-800 active:scale-95 transition-all cursor-pointer shadow-md">
                                            Download Now
                                        </button>
                                    </Link>
                                    <Link to="/register">
                                        <button className="bg-white/60 text-gray-800 px-6 py-2.5 rounded-full font-semibold text-sm border border-gray-200 hover:bg-white/80 active:scale-95 transition-all cursor-pointer">
                                            Learn More
                                        </button>
                                    </Link>
                                </div>
                            </div>
                            {/* Trust badges */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="material-symbols-outlined text-gray-500 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                                <span className="material-symbols-outlined text-gray-500 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
                                <span className="material-symbols-outlined text-gray-500 text-lg">code</span>
                                <span className="text-gray-500 text-sm ml-1">Signal Protocol &nbsp;|&nbsp; No Data Collection &nbsp;|&nbsp; Open Source</span>
                            </div>
                        </div>

                        {/* Right: Encrypted message demo */}
                        <div className="flex items-center justify-center p-4">
                            <div className="w-full max-w-sm">
                                <EncryptedMessageCard />
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
