import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'error') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {/* Toast Container */}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-md w-full pointer-events-none px-4 md:px-0">
                {toasts.map(t => (
                    <div
                        key={t.id}
                        onClick={() => removeToast(t.id)}
                        className={`pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-2xl shadow-lg border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 cursor-pointer hover:opacity-90 ${
                            t.type === 'error'
                                ? 'bg-red-50/95 border-red-200 text-red-800'
                                : t.type === 'success'
                                ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800'
                                : 'bg-white/90 border-gray-200 text-gray-800'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[20px] shrink-0">
                            {t.type === 'error' ? 'error' : t.type === 'success' ? 'check_circle' : 'info'}
                        </span>
                        <p className="text-sm font-medium leading-normal flex-1">{t.message}</p>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
