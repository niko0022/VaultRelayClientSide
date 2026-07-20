import { useState, useEffect } from 'react';

/**
 * PasscodeModal
 * @param {boolean} isOpen - Modal visibility state
 * @param {string} mode - 'set' (define new passcode) | 'verify' (validate existing passcode)
 * @param {function} onClose - Closes the modal
 * @param {function} onSubmit - Callback resolving the passcode string: (passcode) => void
 * @param {string} title - Optional title override
 * @param {string} errorMsg - External error message to display (optional)
 */
export default function PasscodeModal({ isOpen, mode = 'verify', onClose, onSubmit, title, errorMsg }) {
    const [passcode, setPasscode] = useState('');
    const [confirmPasscode, setConfirmPasscode] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setPasscode('');
            setConfirmPasscode('');
            setError('');
        }
    }, [isOpen]);

    useEffect(() => {
        if (errorMsg) {
            setError(errorMsg);
        }
    }, [errorMsg]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        const cleanedPasscode = passcode.trim();
        if (!cleanedPasscode) {
            setError('Passcode cannot be empty.');
            return;
        }

        if (mode === 'set') {
            if (cleanedPasscode.length < 4) {
                setError('Passcode must be at least 4 characters.');
                return;
            }
            if (cleanedPasscode !== confirmPasscode.trim()) {
                setError('Passcodes do not match.');
                return;
            }
        }

        onSubmit(cleanedPasscode);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 m-0">
            <div className="bg-white/95 border border-white/60 rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-8 m-4 animate-in zoom-in-95 duration-200">
                
                {/* Lock icon */}
                <div className="w-12 h-12 rounded-full bg-black/5 border border-black/10 flex items-center justify-center mb-6 shadow-sm">
                    <span className="material-symbols-outlined text-gray-900 text-xl">
                        {mode === 'set' ? 'enhanced_encryption' : 'lock_open'}
                    </span>
                </div>

                {/* Title */}
                <h3 className="font-body text-xl font-bold text-gray-900 mb-2">
                    {title || (mode === 'set' ? 'Set Chat Passcode' : 'Enter Passcode')}
                </h3>
                <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                    {mode === 'set' 
                        ? 'Choose a secure passcode to protect access to this chat. This is saved only on your device.'
                        : 'Provide the secure passcode to reveal this conversation.'}
                </p>

                {/* Error Banner */}
                {error && (
                    <div className="flex items-center gap-2.5 px-3 py-2 bg-red-50 border border-red-200 rounded-xl mb-4 text-left">
                        <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-[11px] text-red-600 font-medium leading-normal">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Passcode input */}
                    <div className="relative">
                        <input
                            type="password"
                            placeholder={mode === 'set' ? 'Enter passcode' : 'Passcode'}
                            className="w-full bg-black/5 border border-gray-200 rounded-2xl py-3 px-5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/20 focus:bg-white transition-all text-center tracking-widest"
                            value={passcode}
                            onChange={(e) => setPasscode(e.target.value)}
                            autoFocus
                            required
                        />
                    </div>

                    {/* Confirmation input (only in set mode) */}
                    {mode === 'set' && (
                        <div className="relative">
                            <input
                                type="password"
                                placeholder="Confirm passcode"
                                className="w-full bg-black/5 border border-gray-200 rounded-2xl py-3 px-5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/20 focus:bg-white transition-all text-center tracking-widest"
                                value={confirmPasscode}
                                onChange={(e) => setConfirmPasscode(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2.5 text-xs font-semibold text-white bg-black hover:bg-gray-900 rounded-xl shadow-md active:scale-95 transition-all cursor-pointer"
                        >
                            {mode === 'set' ? 'Save Lock' : 'Unlock'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
