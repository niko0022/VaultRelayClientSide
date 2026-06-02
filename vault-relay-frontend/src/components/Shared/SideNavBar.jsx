import { NavLink } from 'react-router-dom';

const navLinkClass = ({ isActive }) =>
  `flex items-center gap-3 px-4 py-3 rounded-lg font-body text-sm font-medium transition-colors ${
    isActive
      ? 'bg-[#00e5ff]/10 text-cyan-400 border-l-2 border-cyan-400'
      : 'text-slate-500 hover:text-slate-300 hover:bg-[#1c1c1c] border-l-2 border-transparent'
  }`;

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
        <NavLink to="/vaults" className={navLinkClass}>
          <span className="material-symbols-outlined">enhanced_encryption</span>
          Vaults
        </NavLink>
        <NavLink to="/messages" className={navLinkClass}>
          <span className="material-symbols-outlined">message</span>
          Chats
        </NavLink>
        <NavLink to="/contacts" className={navLinkClass}>
          <span className="material-symbols-outlined">group</span>
          Contacts
        </NavLink>
        <NavLink to="/settings" className={navLinkClass}>
          <span className="material-symbols-outlined">person</span>
          User Settings
        </NavLink>
      </nav>
    </aside>
  );
}

