import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { confirmEmailChange } from '../services/authService';

// Reuse the same hashEmail helper as AuthContext
async function hashEmail(email) {
    if (!email) return '';
    const msgBuffer = new TextEncoder().encode(String(email).trim().toLowerCase());
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
    const [newEmail, setNewEmail] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const hasCalledRef = useRef(false);

    useEffect(() => {
        if (!token) { setStatus('error'); setErrorMsg('No verification token found in the URL.'); return; }
        if (hasCalledRef.current) return;
        hasCalledRef.current = true;

        confirmEmailChange(token)
            .then(async (data) => {
                const confirmed = data?.newEmail;
                const targetUserId = data?.userId;
                setNewEmail(confirmed || '');

                // Update the localStorage email→userId mapping so login works with new email
                if (confirmed && targetUserId) {
                    const newHash = await hashEmail(confirmed);
                    // Remove any old hash mappings for this user
                    for (let i = localStorage.length - 1; i >= 0; i--) {
                        const key = localStorage.key(i);
                        if (key && key.startsWith('vr_hash_') && localStorage.getItem(key) === targetUserId) {
                            localStorage.removeItem(key);
                        }
                    }
                    localStorage.setItem(`vr_hash_${newHash}`, targetUserId);
                }

                setStatus('success');
                setTimeout(() => navigate('/settings'), 4000);
            })
            .catch((err) => {
                setStatus('error');
                setErrorMsg(err.message || 'This verification link is invalid or has expired.');
            });
    }, [token, navigate]);

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

            {/* Center Verify Email Card */}
            <div className="relative w-full max-w-[440px] z-10">
                <div className="bg-white/40 backdrop-blur-3xl border border-white/60 rounded-[2.5rem] shadow-2xl p-10 md:p-12 flex flex-col items-center">
                    
                    {/* Logo/Icon Container */}
                    <div className="w-12 h-12 rounded-lg bg-black flex items-center justify-center shadow-md mb-8">
                        <span className="material-symbols-outlined text-white text-xl">mail</span>
                    </div>

                    {status === 'verifying' && (
                        <div className="text-center space-y-4 w-full">
                            <h2 className="text-xl font-bold text-gray-900">Verifying Email</h2>
                            <p className="text-xs text-gray-500">Please wait while we verify your new email address.</p>
                            <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto"></div>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="text-center space-y-6 w-full">
                            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
                                <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">Email Updated!</h2>
                            {newEmail && (
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    Your email has been successfully changed to <strong className="text-gray-950">{newEmail}</strong>.
                                </p>
                            )}
                            <p className="text-xs text-gray-400 animate-pulse">Redirecting to settings...</p>
                            <Link to="/settings" className="inline-block text-sm font-semibold text-gray-900 hover:underline transition-colors mt-2">
                                Go to Settings →
                            </Link>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="text-center space-y-6 w-full">
                            <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto">
                                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">Verification Failed</h2>
                            <p className="text-sm text-gray-500 leading-relaxed">{errorMsg}</p>
                            <Link to="/settings" className="inline-block py-3 px-6 bg-black text-white text-xs font-semibold rounded-full hover:bg-gray-800 transition-colors shadow-md cursor-pointer w-full text-center">
                                Back to Settings
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
