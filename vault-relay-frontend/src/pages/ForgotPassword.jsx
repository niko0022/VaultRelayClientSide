import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/authService';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await forgotPassword(email);
            setSubmitted(true); // Always show success — prevents email enumeration
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

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

            {/* Center Forgot Password Card */}
            <div className="relative w-full max-w-[440px] z-10">
                <div className="bg-white/40 backdrop-blur-3xl border border-white/60 rounded-[2.5rem] shadow-2xl p-10 md:p-12 flex flex-col">
                    
                    {/* Header */}
                    <h1 className="text-[32px] font-bold text-gray-900 text-center tracking-tight mb-2">
                        Reset Password
                    </h1>
                    <p className="text-sm text-gray-500 text-center mb-8">
                        {submitted ? "Check your inbox" : "Enter your email to receive a reset link"}
                    </p>

                    {submitted ? (
                        /* Success state */
                        <div className="text-center space-y-6">
                            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
                                <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                If an account exists for <strong className="text-gray-900">{email}</strong>, a password reset link has been sent. Check your spam folder if you don't see it.
                            </p>
                            <Link to="/login" className="inline-block text-sm font-semibold text-gray-900 hover:underline transition-colors mt-2">
                                ← Back to Login
                            </Link>
                        </div>
                    ) : (
                        /* Form */
                        <form className="space-y-5" onSubmit={handleSubmit}>
                            {/* Error Banner */}
                            {error && (
                                <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl">
                                    <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <p className="text-xs text-red-600 font-medium">{error}</p>
                                </div>
                            )}

                            {/* Email Input */}
                            <div className="relative flex items-center">
                                <span className="absolute left-5 text-gray-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </span>
                                <input
                                    id="forgot-password-email"
                                    className="w-full bg-white/50 border border-gray-200/80 rounded-full py-4 pl-14 pr-6 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition-all text-[15px]"
                                    placeholder="Email Address"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                id="forgot-password-submit"
                                type="submit"
                                disabled={isLoading || !email}
                                className="w-full py-4 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-900 transition-all active:scale-[0.98] shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                            >
                                {isLoading ? 'Sending...' : 'Send Reset Link'}
                            </button>

                            {/* Footer Options */}
                            <div className="mt-8 pt-6 border-t border-gray-200/60 text-center">
                                <Link to="/login" className="text-xs text-gray-500 hover:text-gray-900 font-bold transition-colors">
                                    ← Back to Login
                                </Link>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
