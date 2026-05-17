import { Link } from 'react-router-dom';

export default function SideNavBar() {
  return (
    <aside className="fixed left-0 top-0 h-screen flex flex-col p-4 space-y-4 bg-[#131313] w-72 bg-gradient-to-r from-[#1c1c1c] to-transparent z-40">
      <div className="mb-8 px-2">
        <h1 className="text-cyan-400 font-headline text-2xl font-bold tracking-tighter uppercase">Vault Relay</h1>
        <div className="flex items-center mt-6 gap-3">
          <div className="w-10 h-10 bg-surface-container-highest rounded flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">security</span>
          </div>
          <div>
            <p className="font-headline text-sm font-bold text-on-surface">Signal Protocol</p>
            <p className="text-[10px] text-primary uppercase tracking-widest font-medium">Protocol Active</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        {/* Relays is active for messaging intent */}
        <Link to="/vaults" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-300 hover:bg-[#1c1c1c] transition-colors font-body text-sm font-medium">
          <span className="material-symbols-outlined">enhanced_encryption</span>
          Vaults
        </Link>
        <Link to="/messages" className="flex items-center gap-3 px-4 py-3 bg-[#00e5ff]/10 text-cyan-400 rounded-lg border-l-2 border-cyan-400 font-body text-sm font-medium">
          <span className="material-symbols-outlined">message</span>
          Chats
        </Link>
        <Link to="/contacts" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-300 hover:bg-[#1c1c1c] transition-colors font-body text-sm font-medium">
          <span className="material-symbols-outlined">group</span>
          Contacts
        </Link>
        <Link to="/settings" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-300 hover:bg-[#1c1c1c] transition-colors font-body text-sm font-medium">
          <span className="material-symbols-outlined">person</span>
          User Settings
        </Link>
      </nav>

      <div className="pt-4 border-t border-outline-variant/10 space-y-2">
        <button className="w-full py-2.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all font-['Inter'] text-sm font-bold flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-sm">logout</span>
          LOGOUT
        </button>
      </div>

      <button className="mt-4 w-full bg-primary-container text-on-primary-container font-headline font-bold py-3 rounded hover:shadow-[0_0_15px_rgba(0,229,255,0.4)] transition-all active:scale-95 cursor-pointer">
        New Secure Relay
      </button>
    </aside>
  );
}
