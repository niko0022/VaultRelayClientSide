import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { resendVerification } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';

export default function CheckEmail() {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const email = location.state?.email;

    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');
    const [cooldown, setCooldown] = useState(0);

    // Load and manage cooldown timer from localStorage to persist across refreshes
    useEffect(() => {
        const storedExpires = localStorage.getItem('vr_resend_cooldown_expires');
        if (storedExpires) {
            const remaining = Math.ceil((new Date(storedExpires).getTime() - Date.now()) / 1000);
            if (remaining > 0) {
                setCooldown(remaining);
            }
        }
    }, []);

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => {
            setCooldown(prev => {
                if (prev <= 1) {
                    localStorage.removeItem('vr_resend_cooldown_expires');
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    const handleResend = async () => {
        if (!email) {
            setError('No email address found. Please go back to login and try again.');
            return;
        }
        setError('');
        setSuccessMessage('');
        setIsLoading(true);
        try {
            await resendVerification(email);
            setSuccessMessage('A new verification link has been sent to your email.');

            // Set 60-second cooldown
            const expiry = new Date(Date.now() + 60 * 1000);
            localStorage.setItem('vr_resend_cooldown_expires', expiry.toISOString());
            setCooldown(60);
        } catch (err) {
            setError(err.message || 'Failed to resend verification email.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (err) {
            setError('Failed to log out unverified session.');
        }
    };

    return (
        <div className="relative min-h-screen w-screen flex items-center justify-center p-4 md:p-6 overflow-hidden bg-[#E8F3EE] font-body selection:bg-black/10">
            {/* Soft Blurred Mesh Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#BDE0D8] rounded-full blur-[120px] opacity-70"></div>
            <div className="absolute top-[-5%] right-[-5%] w-[45%] h-[45%] bg-[#FCECD8] rounded-full blur-[100px] opacity-80"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] bg-[#E8E8FF] rounded-full blur-[130px] opacity-75"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#FDF0EB] rounded-full blur-[110px] opacity-80"></div>

            {/* Logo/Badge in top left */}
            <div className="absolute top-6 left-6 z-20">
                <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center shadow-md">
                        <span className="material-symbols-outlined text-white text-base" style={{ fontVariationSettings: "'FILL' 1" }}>hexagon</span>
                    </div>
                    <span className="font-bold text-gray-900 text-sm tracking-tight">VaultRelay</span>
                </Link>
            </div>

            {/* Center Card */}
            <div className="relative w-full max-w-[440px] z-10">
                <div className="bg-white/40 backdrop-blur-3xl border border-white/60 rounded-[2.5rem] shadow-2xl p-10 md:p-12 flex flex-col items-center">

                    {/* Mail Icon */}
                    <div className="w-16 h-16 rounded-full bg-black/5 border border-black/10 flex items-center justify-center mx-auto mb-8 shadow-sm">
                        <span className="material-symbols-outlined text-black text-2xl">mail</span>
                    </div>

                    {/* Header */}
                    <h1 className="text-[32px] font-bold text-gray-900 text-center tracking-tight mb-2">
                        Verify Account
                    </h1>
                    <p className="text-sm text-gray-500 text-center mb-8">
                        Activate your VaultRelay secure vault
                    </p>

                    <div className="text-center space-y-6 w-full">
                        <p className="text-sm text-gray-600 leading-relaxed">
                            We've sent a verification link to your registered email address {email && (<strong className="text-gray-900 font-bold block mt-1">{email}</strong>)}. Please check your inbox and click the link to activate your account.
                        </p>

                        {/* Success message banner */}
                        {successMessage && (
                            <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-left">
                                <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                <p className="text-xs text-emerald-600 font-medium">{successMessage}</p>
                            </div>
                        )}

                        {/* Error message banner */}
                        {error && (
                            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-left">
                                <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <p className="text-xs text-red-600 font-medium">{error}</p>
                            </div>
                        )}

                        {/* Action button */}
                        <button
                            onClick={handleResend}
                            disabled={isLoading || cooldown > 0}
                            className="w-full py-4 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-900 transition-all active:scale-[0.98] shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                            {isLoading ? 'Sending...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Verification Email'}
                        </button>

                        {/* Footer Options */}
                        <div className="mt-8 pt-6 border-t border-gray-200/60 text-center">
                            <button
                                onClick={handleLogout}
                                className="text-xs text-gray-500 hover:text-gray-900 font-bold transition-colors bg-transparent border-none cursor-pointer focus:outline-none"
                            >
                                ← Log Out / Register Again
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
