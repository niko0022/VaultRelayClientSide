import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../services/authService';

export default function Register() {
    const navigate = useNavigate();
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (!agreedToTerms) {
            setError('You must agree to the Security Protocols');
            return;
        }

        setLoading(true);
        try {
            await register({ email, password, displayName, username });
            navigate('/messages');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="bg-surface text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container overflow-x-hidden min-h-screen flex flex-col relative">
            {/* ─── TopAppBar ──────────────────────────────────────────────── */}
            <header className="fixed top-0 w-full z-50 bg-[#131313]/70 backdrop-blur-xl shadow-[0_0_40px_rgba(0,229,255,0.08)] flex items-center gap-1 justify-center px-6 h-16">
                <Link to="/" className="text-2xl font-bold tracking-tighter text-[#00e5ff] font-headline">
                    Vault Relay
                </Link>
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-[#00e5ff]">shield</span>
                </div>
            </header>

            {/* ─── Main Content ───────────────────────────────────────────── */}
            <main className="relative flex-grow w-full flex items-center justify-center p-6 bg-surface overflow-hidden pt-24 pb-12">
                {/* Abstract Background Elements */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-container/5 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary-container/5 rounded-full blur-[150px]"></div>

                {/* Registration Canvas */}
                <div className="relative w-full max-w-xl z-10">
                    {/* Branding Header */}
                    <div className="mb-12 text-center">
                        <h1 className="font-headline text-5xl font-bold tracking-tighter text-on-surface mb-2 uppercase">
                            Register
                        </h1>
                    </div>

                    {/* Registration Card */}
                    <div className="bg-surface-container-low rounded-xl p-1 bg-gradient-to-br from-outline-variant/20 to-transparent">
                        <div className="glass-panel rounded-xl p-8 md:p-12 shadow-2xl">
                            <form className="space-y-6" onSubmit={handleSubmit}>
                                {/* Error Banner */}
                                {error && (
                                    <div className="flex items-center gap-3 px-4 py-3 bg-error-container/20 border border-error/30 rounded-lg">
                                        <span className="material-symbols-outlined text-error text-lg">error</span>
                                        <p className="text-sm text-error font-medium">{error}</p>
                                    </div>
                                )}

                                {/* Full Name */}
                                <div className="space-y-2">
                                    <label className="block font-label text-xs font-medium text-on-surface-variant ml-1 uppercase tracking-wider">Full Name</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <span className="material-symbols-outlined text-sm text-outline">person</span>
                                        </div>
                                        <input
                                            className="w-full bg-surface-container-lowest border-none rounded-lg py-4 pl-11 pr-4 text-on-surface placeholder:text-outline/40 focus:ring-1 focus:ring-primary-container transition-all"
                                            placeholder="Full Name"
                                            type="text"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Username */}
                                <div className="space-y-2">
                                    <label className="block font-label text-xs font-medium text-on-surface-variant ml-1 uppercase tracking-wider">Username</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <span className="material-symbols-outlined text-sm text-outline">badge</span>
                                        </div>
                                        <input
                                            className="w-full bg-surface-container-lowest border-none rounded-lg py-4 pl-11 pr-4 text-on-surface placeholder:text-outline/40 focus:ring-1 focus:ring-primary-container transition-all"
                                            placeholder="username"
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            required
                                            minLength={3}
                                            maxLength={32}
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div className="space-y-2">
                                    <label className="block font-label text-xs font-medium text-on-surface-variant ml-1 uppercase tracking-wider">Email</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <span className="material-symbols-outlined text-sm text-outline">alternate_email</span>
                                        </div>
                                        <input
                                            className="w-full bg-surface-container-lowest border-none rounded-lg py-4 pl-11 pr-4 text-on-surface placeholder:text-outline/40 focus:ring-1 focus:ring-primary-container transition-all"
                                            placeholder="user@gmail.com"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Security Keys Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="block font-label text-xs font-medium text-on-surface-variant ml-1 uppercase tracking-wider">Password</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <span className="material-symbols-outlined text-sm text-outline">key</span>
                                            </div>
                                            <input
                                                className="w-full bg-surface-container-lowest border-none rounded-lg py-4 pl-11 pr-4 text-on-surface placeholder:text-outline/40 focus:ring-1 focus:ring-primary-container transition-all"
                                                placeholder="••••••••"
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                minLength={6}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block font-label text-xs font-medium text-on-surface-variant ml-1 uppercase tracking-wider">Verify Password</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <span className="material-symbols-outlined text-sm text-outline">verified_user</span>
                                            </div>
                                            <input
                                                className="w-full bg-surface-container-lowest border-none rounded-lg py-4 pl-11 pr-4 text-on-surface placeholder:text-outline/40 focus:ring-1 focus:ring-primary-container transition-all"
                                                placeholder="••••••••"
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                required
                                                minLength={6}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Acknowledgment Checkbox */}
                                <div className="flex items-start gap-3 px-1">
                                    <input
                                        className="mt-0.5 w-4 h-4 rounded bg-surface-container-lowest border-outline-variant text-primary-container focus:ring-primary-container cursor-pointer"
                                        id="terms"
                                        type="checkbox"
                                        checked={agreedToTerms}
                                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                                    />
                                    <label className="font-label text-xs text-on-surface-variant leading-relaxed cursor-pointer" htmlFor="terms">
                                        I acknowledge the <Link to="#" className="text-primary-fixed-dim hover:text-primary-container hover:underline transition-all">Security Protocols</Link> and agree to the immutable Terms of Service.
                                    </label>
                                </div>

                                {/* CTA Action */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="group relative w-full py-4 bg-primary-container text-on-primary-container font-headline font-bold rounded-lg overflow-hidden transition-all active:scale-[0.98] shadow-[0_0_30px_rgba(0,229,255,0.2)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                                    <div className="flex items-center justify-center gap-2">
                                        {loading ? (
                                            <span className="tracking-widest uppercase">Creating Account...</span>
                                        ) : (
                                            <>
                                                <span className="tracking-widest uppercase">Create Account</span>
                                                <span className="material-symbols-outlined text-lg">arrow_forward</span>
                                            </>
                                        )}
                                    </div>
                                </button>
                            </form>

                            {/* Footer Options */}
                            <div className="mt-8 pt-8 border-t border-outline-variant/10 text-center">
                                <p className="font-label text-sm text-on-surface-variant">
                                    Already have an account?
                                    <Link to="/login" className="text-primary-fixed-dim font-bold ml-1 hover:text-primary-container transition-colors">Sign In</Link>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Background Decoration Grid */}
            <div
                className="fixed inset-0 pointer-events-none z-0 opacity-10"
                style={{ backgroundImage: "radial-gradient(circle at 2px 2px, #849396 1px, transparent 0)", backgroundSize: "48px 48px" }}
            ></div>
        </div>
    );
}
