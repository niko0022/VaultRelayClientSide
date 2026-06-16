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
        <div className="relative min-h-screen w-screen flex items-center justify-center p-4 md:p-6 overflow-hidden bg-[#E8F3EE] font-body selection:bg-black/10">
            {/* Soft Blurred Mesh Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#BDE0D8] rounded-full blur-[120px] opacity-70"></div>
            <div className="absolute top-[-5%] right-[-5%] w-[45%] h-[45%] bg-[#FCECD8] rounded-full blur-[100px] opacity-80"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] bg-[#E8E8FF] rounded-full blur-[130px] opacity-75"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#FDF0EB] rounded-full blur-[110px] opacity-80"></div>

            {/* Back to Home Link (Subtle Logo/Badge in top left) */}
            <div className="absolute top-6 left-6 z-20">
                <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center shadow-md">
                        <span className="material-symbols-outlined text-white text-base" style={{ fontVariationSettings: "'FILL' 1" }}>hexagon</span>
                    </div>
                    <span className="font-bold text-gray-900 text-sm tracking-tight">VaultRelay</span>
                </Link>
            </div>

            {/* Center Registration Card */}
            <div className="relative w-full max-w-[500px] z-10 my-8">
                <div className="bg-white/40 backdrop-blur-3xl border border-white/60 rounded-[2.5rem] shadow-2xl p-8 md:p-10 flex flex-col">
                    
                    {/* Header */}
                    <h1 className="text-[40px] font-bold text-gray-900 text-center tracking-tight mb-8">
                        Register
                    </h1>

                    {/* Form */}
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        {/* Error Banner */}
                        {error && (
                            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl">
                                <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <p className="text-xs text-red-600 font-medium">{error}</p>
                            </div>
                        )}

                        {/* Full Name Input */}
                        <div className="relative flex items-center">
                            <span className="absolute left-5 text-gray-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </span>
                            <input
                                className="w-full bg-white/50 border border-gray-200/80 rounded-full py-3.5 pl-14 pr-6 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition-all text-[15px]"
                                placeholder="Full Name"
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                required
                            />
                        </div>

                        {/* Username Input */}
                        <div className="relative flex items-center">
                            <span className="absolute left-5 text-gray-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.333 0 4 .667 4 2v1H5v-1c0-1.333 2.667-2 4-2z" />
                                </svg>
                            </span>
                            <input
                                className="w-full bg-white/50 border border-gray-200/80 rounded-full py-3.5 pl-14 pr-6 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition-all text-[15px]"
                                placeholder="Username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                minLength={3}
                                maxLength={32}
                            />
                        </div>

                        {/* Email Input */}
                        <div className="relative flex items-center">
                            <span className="absolute left-5 text-gray-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </span>
                            <input
                                className="w-full bg-white/50 border border-gray-200/80 rounded-full py-3.5 pl-14 pr-6 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition-all text-[15px]"
                                placeholder="Email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        {/* Passwords grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Password */}
                            <div className="relative flex items-center">
                                <span className="absolute left-5 text-gray-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </span>
                                <input
                                    className="w-full bg-white/50 border border-gray-200/80 rounded-full py-3.5 pl-14 pr-6 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition-all text-[15px]"
                                    placeholder="Password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                            </div>

                            {/* Verify Password */}
                            <div className="relative flex items-center">
                                <span className="absolute left-5 text-gray-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </span>
                                <input
                                    className="w-full bg-white/50 border border-gray-200/80 rounded-full py-3.5 pl-14 pr-6 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition-all text-[15px]"
                                    placeholder="Verify"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>

                        {/* Acknowledgment Checkbox */}
                        <div className="flex items-start gap-3 px-3 py-1">
                            <input
                                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-black focus:ring-black accent-black cursor-pointer"
                                id="terms"
                                type="checkbox"
                                checked={agreedToTerms}
                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                            />
                            <label className="text-xs text-gray-500 leading-normal cursor-pointer" htmlFor="terms">
                                I agree to the <Link to="#" className="text-gray-900 font-bold hover:underline transition-all">Security Protocols</Link> and Terms of Service.
                            </label>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-900 transition-all active:scale-[0.98] shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                            {loading ? "Creating Account..." : "Create Account"}
                        </button>
                    </form>

                    {/* Footer Options */}
                    <div className="mt-8 pt-6 border-t border-gray-200/60 text-center">
                        <p className="text-xs text-gray-500">
                            Already have an account?
                            <Link to="/login" className="text-gray-900 font-bold ml-1.5 hover:underline transition-colors">Sign In</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
