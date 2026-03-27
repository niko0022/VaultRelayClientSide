import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import phone from '../assets/phone_image.png';


export default function Home() {
    return (
        <div className="bg-background text-on-background font-body selection:bg-primary-container selection:text-on-primary-container">
            {/* ─── Navbar ─────────────────────────────────────────────────── */}
            <Navbar />
            {/* ─── Main Content ───────────────────────────────────────────── */}
            <main className="pt-24">
                {/* ─── Hero Section ─────────────────────────────────────────── */}
                <section className="relative min-h-[921px] flex items-center overflow-hidden hero-gradient">
                    <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div className="z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container-high rounded-full mb-8">
                                <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#00daf3]"></span>
                                <span className="text-xs font-label uppercase tracking-widest text-on-surface-variant">Quantum-Ready Encryption</span>
                            </div>
                            <h1 className="font-headline text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8">
                                Protected <span className="text-primary-container">Privacy</span>,<br />
                                Seamless <span className="text-secondary">Connection</span>.
                            </h1>
                            <p className="text-lg md:text-xl text-on-surface-variant mb-12 max-w-lg leading-relaxed">
                                Protected human communication. Built on the Signal protocol architecture, your messages never touch the central server.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button className="bg-primary-container text-on-primary-container px-10 py-4 font-headline font-extrabold text-lg tracking-tight hover:shadow-[0_0_30px_rgba(0,229,255,0.3)] transition-all active:scale-95 cursor-pointer">
                                    Start Secure Chat
                                </button>
                            </div>
                        </div>
                        <div className="relative">
                            <div className="relative z-10 glass-card p-4 rounded-xl shadow-2xl transform rotate-2">
                                <img
                                    className="w-full h-auto rounded-lg grayscale hover:grayscale-0 transition-all duration-700"
                                    alt="Futuristic encrypted mobile interface with data streams"
                                    src={phone}
                                />
                            </div>
                            <div className="absolute -top-12 -right-12 w-64 h-64 bg-secondary-container/20 rounded-full blur-[100px]"></div>
                            <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-primary-container/10 rounded-full blur-[100px]"></div>
                        </div>
                    </div>
                </section>

                {/* ─── Features Section ─────────────────────────────────────── */}
                <section className="py-32 bg-surface-container-low">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="mb-20 space-y-4">
                            <h2 className="font-headline text-4xl md:text-5xl font-black tracking-tighter">Engineered for Stealth.</h2>
                            <p className="text-on-surface-variant max-w-xl">Zero-knowledge infrastructure ensures that even we can&apos;t see what you&apos;re sending.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* E2EE Card (2-col) */}
                            <div className="md:col-span-1 bg-surface-container-high p-12 relative overflow-hidden group">
                                <div className="relative z-10 h-full flex flex-col justify-between">
                                    <div>
                                        <span className="material-symbols-outlined text-primary text-5xl mb-6" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                                        <h3 className="font-headline text-3xl font-bold mb-4">End-to-End Encryption</h3>
                                        <p className="text-on-surface-variant max-w-sm">Every message is sealed with a unique cryptographic key generated on your device.</p>
                                    </div>
                                    <div className="inline-flex items-center gap-2 text-secondary font-headline font-bold text-sm cursor-pointer hover:text-primary transition-colors">
                                        <span>Learn about signal protocol</span>
                                        <span className="material-symbols-outlined">arrow_back</span>
                                    </div>
                                </div>
                            </div>


                            {/* Post-Quantum Kyber Card */}
                            <div className="bg-surface-container-highest p-12 border-t-4 border-primary">
                                <span className="material-symbols-outlined text-primary text-4xl mb-6">memory</span>
                                <h3 className="font-headline text-3xl font-bold mb-4">Post-Quantum Secure</h3>
                                <p className="text-on-surface-variant">Secured by Kyber-768 cryptography. Your data is shielded against future threats from quantum supercomputers and "Harvest Now, Decrypt Later" reconnaissance attacks.</p>
                            </div>

                            {/* WebAssembly Crypto Engine Card */}
                            <div className="md:col-span-1 bg-surface-container-low p-12 flex flex-col items-start gap-6 border border-outline-variant/15 relative overflow-hidden">
                                <span className="material-symbols-outlined text-primary text-4xl">terminal</span>
                                <div className="flex-1 z-10">
                                    <h3 className="font-headline text-3xl font-bold mb-4">WebAssembly Crypto Engine</h3>
                                    <p className="text-on-surface-variant mb-8 text-sm leading-relaxed">Cryptographic heavy lifting is powered by a native Rust-compiled WebAssembly bridge. This guarantees deterministic execution, constant-time operations to thwart side-channel attacks, and near-native speeds directly in your browser.</p>
                                    <div className="inline-flex items-center gap-2 text-secondary font-headline font-bold text-sm cursor-pointer hover:text-primary transition-colors">
                                        View Architecture
                                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                                    </div>
                                </div>
                                {/* Code block decorative background */}
                                <div className="absolute -right-8 -bottom-8 opacity-5 pointer-events-none select-none font-mono text-xs whitespace-pre">
                                    {'pub fn encrypt(msg: &[u8]) -> Vec<u8> {\n  let cipher = AES256_GCM::new(key);\n  cipher.encrypt(nonce, msg)\n}\n\n#[wasm_bindgen]\npub fn init_bridge() -> Result<(), JsValue> {'}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ─── CTA Section ──────────────────────────────────────────── */}
                <section className="py-40 bg-background relative overflow-hidden">
                    <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
                        <h2 className="font-headline text-5xl md:text-7xl font-black tracking-tighter mb-8">
                            Ready to enter<br />the <span className="text-primary-container">Vault?</span>
                        </h2>
                        <p className="text-on-surface-variant text-xl max-w-2xl mx-auto mb-16">Ready to start chatting securely? register or login to use browser version or download the mobile app.</p>
                        <div className="flex flex-wrap justify-center gap-6">
                            <button className="bg-primary-container text-on-primary-container px-12 py-5 font-headline font-black text-xl flex items-center gap-3 active:scale-95 transition-all cursor-pointer">
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>android</span>
                                Coming soon
                            </button>

                            <button className="bg-primary-container text-on-primary-container px-12 py-5 font-headline font-black text-xl flex items-center gap-3 active:scale-95 transition-all cursor-pointer">
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>public</span>
                                open web app
                            </button>

                        </div>
                    </div>
                    <div className="absolute inset-0 opacity-20 pointer-events-none">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-container rounded-full blur-[200px] mix-blend-screen"></div>
                    </div>
                </section>
            </main>

            {/* ─── Footer ─────────────────────────────────────────────────── */}
            <Footer />
        </div>
    );
}
