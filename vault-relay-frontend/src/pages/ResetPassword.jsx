import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { validateResetToken, resetPassword } from '../services/authService';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [tokenState, setTokenState] = useState('validating'); // 'validating' | 'valid' | 'invalid'
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const hasCalledRef = useRef(false);

    useEffect(() => {
        if (!token) { setTokenState('invalid'); return; }
        if (hasCalledRef.current) return;
        hasCalledRef.current = true;

        validateResetToken(token)
            .then(() => setTokenState('valid'))
            .catch(() => setTokenState('invalid'));
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setIsLoading(true);
        try {
            await resetPassword({ token, newPassword });
            setSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.message || 'Failed to reset password. Please try again.');
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

            {/* Center Reset Password Card */}
            <div className="relative w-full max-w-[440px] z-10">
                <div className="bg-white/40 backdrop-blur-3xl border border-white/60 rounded-[2.5rem] shadow-2xl p-10 md:p-12 flex flex-col">
                    
                    {/* Validating */}
                    {tokenState === 'validating' && (
                        <div className="text-center space-y-4 py-8">
                            <h2 className="text-xl font-bold text-gray-900">Validating Link...</h2>
                            <p className="text-xs text-gray-500">Please wait while we verify your recovery token.</p>
                            <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto"></div>
                        </div>
                    )}

                    {/* Invalid token */}
                    {tokenState === 'invalid' && (
                        <div className="text-center space-y-6">
                            <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto">
                                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">Link Expired</h2>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                This reset link is invalid or has expired. Reset links are valid for 30 minutes.
                            </p>
                            <Link to="/forgot-password" className="inline-block py-3 px-6 bg-black text-white text-xs font-semibold rounded-full hover:bg-gray-800 transition-colors shadow-md cursor-pointer">
                                Request a New Link
                            </Link>
                        </div>
                    )}

                    {/* Success */}
                    {success && (
                        <div className="text-center space-y-6">
                            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
                                <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">Password Updated</h2>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                Your password has been successfully reset. All active sessions have been signed out for security.
                            </p>
                            <p className="text-xs text-gray-400 animate-pulse">Redirecting to login...</p>
                        </div>
                    )}

                    {/* Form */}
                    {tokenState === 'valid' && !success && (
                        <>
                            <h1 className="text-[28px] font-bold text-gray-900 text-center tracking-tight mb-2">
                                New Password
                            </h1>
                            <p className="text-xs text-gray-500 text-center mb-8">
                                Password must be at least 6 characters long and contain 1 uppercase letter and 3 digits.
                            </p>
                            
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

                                {/* New Password Input */}
                                <div className="relative flex items-center">
                                    <span className="absolute left-5 text-gray-400">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </span>
                                    <input
                                        id="reset-password-new"
                                        className="w-full bg-white/50 border border-gray-200/80 rounded-full py-4 pl-14 pr-6 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition-all text-[15px]"
                                        placeholder="New Password"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        autoComplete="new-password"
                                    />
                                </div>

                                {/* Confirm Password Input */}
                                <div className="relative flex items-center">
                                    <span className="absolute left-5 text-gray-400">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </span>
                                    <input
                                        id="reset-password-confirm"
                                        className={`w-full bg-white/50 border rounded-full py-4 pl-14 pr-6 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:bg-white transition-all text-[15px] ${
                                            confirmPassword && confirmPassword !== newPassword ? 'border-red-400 focus:ring-red-200' : 'border-gray-200/80 focus:ring-gray-300'
                                        }`}
                                        placeholder="Confirm Password"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        autoComplete="new-password"
                                    />
                                </div>
                                {confirmPassword && confirmPassword !== newPassword && (
                                    <p className="text-xs text-red-500 pl-4">Passwords do not match</p>
                                )}

                                {/* Submit Button */}
                                <button
                                    id="reset-password-submit"
                                    type="submit"
                                    disabled={isLoading || !newPassword || newPassword !== confirmPassword}
                                    className="w-full py-4 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-900 transition-all active:scale-[0.98] shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                                >
                                    {isLoading ? 'Updating...' : 'Update Password'}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
