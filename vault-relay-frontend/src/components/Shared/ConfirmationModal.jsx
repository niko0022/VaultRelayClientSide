export default function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel' }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white border border-gray-200 rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-8 m-4 animate-in zoom-in-95 duration-200">
                <h3 className="font-headline text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 mb-6 leading-relaxed">{message}</p>
                <div className="flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-gray-200 rounded-2xl transition-colors cursor-pointer"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className="px-5 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-2xl shadow-lg shadow-red-500/10 hover:shadow-red-500/20 active:scale-95 transition-all cursor-pointer"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
