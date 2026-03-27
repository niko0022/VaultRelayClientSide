import React from 'react';
import SideNavBar from '../components/SideNavBar';

export default function Contacts() {
    return (
        <div className="bg-background text-on-background font-body h-screen flex overflow-hidden selection:bg-primary-container selection:text-on-primary-container">
            <SideNavBar />

            {/* Main Content Wrapper (offset by 72 for SideNavBar) */}
            <div className="flex flex-1 ml-72 h-screen overflow-hidden">

                {/* Middle Column: Contact List */}
                <main className="flex-1 lg:flex-none lg:w-96 bg-surface-container-low kinetic-grid flex flex-col border-r border-outline-variant/10 relative z-10 shadow-[20px_0_40px_rgba(0,0,0,0.5)]">
                    <div className="p-6 space-y-4">
                        <h2 className="font-headline text-2xl font-bold tracking-tight text-on-background">Relay Contacts</h2>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
                            <input className="w-full bg-surface-container-lowest border-none focus:ring-1 focus:ring-primary-container focus:outline-none text-on-surface text-sm pl-10 pr-4 py-3 rounded-lg placeholder:text-on-surface-variant/50 transition-all font-body" placeholder="Search secure nodes..." type="text" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 space-y-1 scrollbar-hide">
                        {/* Active Contact */}
                        <div className="p-4 bg-primary-container/5 ring-1 ring-primary-container/20 rounded-xl cursor-pointer group transition-all duration-200">
                            <div className="flex items-center gap-4">
                                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-surface-container-highest shrink-0">
                                    <img alt="professional portrait" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDz60CkO8I2lx5sw2U62TGlnS4mhqhgccnJmC5LSgP6Dq2LErP_nmgqYEh08azmbWviBdl_Vo8piyKJwJ7VgFgfl7UwI1pVFef9n5DOPI3R9WI0yvxGasqnqa8F-PqxFsp1PpIRySHmlU75kz-MABhzepOp0At_19LmKuX0PMJigegJBsGNBtf6rbk71EHkNYMaU_aE6ZdNNIWGXNhc800wfyxxWf81g40BqJ-phNgdiSZI4nOZSfdLQLI2PFYcaXMBBDTwNgtaM_0P" />
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary-container rounded-full ring-2 ring-background"></div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-headline font-bold text-on-surface truncate">Elias Vance</h3>
                                        <span className="text-[10px] font-label font-bold text-on-surface-variant">2m ago</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="material-symbols-outlined text-primary-container text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                                        <span className="text-[10px] font-label font-bold uppercase tracking-wider text-primary-container">E2EE Verified</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Other Contact */}
                        <div className="p-4 hover:bg-surface-container-low rounded-xl cursor-pointer group transition-all duration-200 mt-1">
                            <div className="flex items-center gap-4">
                                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-surface-container-highest shrink-0">
                                    <img alt="close-up portrait" className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBd2BOB2mVZqIsAqkzgmYFkRfIKRjHOrqUD71rgwzO28N4P6QR-Sp6vI6PaM7M0uiYyPsfV060GOFOYKwSKATN5Bw-4W2I0K8_tRclf0Y-euDatA5KQaCquGn_t0vuMXMv1id73jGqhVoOB2icl7TnNa8i-b7uOIatxAtBlQOXMlf2vGiVQHdYEo6dwyQbiOg3PDN2WHPY8zPGR87Z2sVxnzYUoWozWTgSDzlDqLdzalHmMCDZzgIBl4742mfLNWR_TYBurRU2n07hz" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-headline font-medium font-bold text-on-surface/80 group-hover:text-on-surface truncate transition-colors">Sarah K. Chen</h3>
                                        <span className="text-[10px] font-label font-bold text-on-surface-variant">1h ago</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="material-symbols-outlined text-on-surface-variant text-[14px]">shield</span>
                                        <span className="text-[10px] font-label font-bold uppercase tracking-wider text-on-surface-variant">Level 2 Secure</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Right Column: Contact Details / Action Center */}
                <section className="hidden md:flex flex-1 bg-surface-container-lowest flex-col relative overflow-hidden">
                    {/* Decorative abstract glow */}
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-container/10 blur-[150px] -z-10 rounded-full pointer-events-none"></div>

                    <div className="max-w-5xl w-full mx-auto p-16 flex flex-col items-center justify-center flex-1 h-full overflow-y-auto">
                        <div className="flex flex-col items-center gap-12 w-full mt-auto mb-auto">

                            {/* Avatar Display */}
                            <div className="relative group mx-auto">
                                <div className="w-64 h-64 rounded-[2rem] overflow-hidden ring-4 ring-primary-container/20 shadow-[0_0_50px_rgba(0,229,255,0.1)] transition-transform duration-500 group-hover:scale-[1.02]">
                                    <img alt="detailed high-resolution portrait" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD5xE5dG96VZCzHBW6S1KBfI18EGIJW34IAtm0bGeikMYPnWRnJ6GwmJ2PIxL97SgjhlQHN0-2PXlu1vBqWXIwRGzt254QFmnvsaEqKlEzjl_gaEzbKYFQ-A_AVTHYumP3wsL9LGVbCohzoOCKCuBuuiapZlsteD6R3XZ4FbUwRfan699z1ZnJbK-To1DYlsDwuN52DMiXdKKXJW3ZPBKCJwz_lNGSVk-ki-nEKhyFIW_WQ2o_Freqeu76k1moQRCTCCqB1lJN1udEr" />
                                </div>
                            </div>

                            {/* Identity Info */}
                            <div className="flex-1 space-y-10 text-center w-full max-w-2xl mx-auto">
                                <div className="space-y-4">
                                    <div className="flex flex-col items-center gap-4">
                                        <h2 className="font-headline text-5xl lg:text-7xl font-bold tracking-tighter text-on-background">Elias Vance</h2>
                                        <span className="bg-primary-container/10 text-primary-container text-xs font-bold px-4 py-1.5 rounded-full border border-primary-container/20 uppercase tracking-[0.2em] h-fit">Master Keyholder</span>
                                    </div>
                                    <p className="text-2xl lg:text-3xl text-on-surface-variant font-body font-light">Lead Architect @ CipherSystems</p>
                                    <div className="flex items-center justify-center gap-2 mt-4">
                                        <span className="material-symbols-outlined text-primary-container/50 text-base">alternate_email</span>
                                        <p className="text-base lg:text-lg font-mono font-bold text-primary-container/80 tracking-widest uppercase">elias.vance.vault.relay</p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col gap-6 w-full max-w-md mx-auto pt-4">
                                    <button className="w-full bg-primary-container text-on-primary-container px-12 py-6 rounded-xl font-headline font-bold uppercase tracking-[0.2em] text-sm lg:text-base hover:shadow-[0_0_40px_rgba(0,229,255,0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer">
                                        <span className="material-symbols-outlined text-2xl">forum</span>
                                        Start Secure Message
                                    </button>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button className="bg-surface-container-highest/20 border border-outline-variant/20 text-on-surface/50 hover:text-on-surface hover:border-outline-variant/60 hover:bg-surface-container-highest/40 px-6 py-4 rounded-xl font-headline font-bold uppercase tracking-widest text-[10px] xl:text-xs transition-all flex items-center justify-center gap-2 group cursor-pointer whitespace-nowrap">
                                            <span className="material-symbols-outlined text-lg opacity-50 group-hover:opacity-100 transition-opacity">block</span>
                                            Block Contact
                                        </button>
                                        <button className="bg-surface-container-highest/20 border border-outline-variant/20 text-on-surface/50 hover:text-error hover:border-error/40 hover:bg-error/5 px-6 py-4 rounded-xl font-headline font-bold uppercase tracking-widest text-[10px] xl:text-xs transition-all flex items-center justify-center gap-2 group cursor-pointer whitespace-nowrap">
                                            <span className="material-symbols-outlined text-lg opacity-50 group-hover:opacity-100 transition-opacity">person_remove</span>
                                            Unfriend
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
