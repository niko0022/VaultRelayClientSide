import { NavLink } from 'react-router-dom';

const iconClass = ({ isActive }) =>
  `p-3 rounded-full transition-colors ${isActive
    ? 'text-gray-800 bg-white/60 shadow-sm'
    : 'text-gray-500 hover:text-gray-800 hover:bg-white/40'
  }`;

const activeIconClass = ({ isActive }) =>
  `p-3 rounded-2xl transition-colors relative ${isActive
    ? 'text-gray-800 bg-white/60 shadow-sm'
    : 'text-gray-500 hover:text-gray-800 hover:bg-white/40'
  }`;

export default function SideNavBar({ className = "" }) {
  return (
    <aside
      className={`w-20 lg:w-24 flex flex-col items-center py-8 relative h-full ${className}`}
    >
      {/* Logo */}
      <div className="mb-12 cursor-pointer">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-white text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>hexagon</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 flex flex-col gap-5 items-center w-full">
        <NavLink to="/vaults" className={iconClass} title="Vaults">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </NavLink>

        <NavLink to="/contacts" className={iconClass} title="Contacts">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </NavLink>

        <NavLink to="/messages" className={activeIconClass} title="Messages">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </NavLink>
      </nav>

      {/* Bottom Navigation */}
      <div className="flex flex-col gap-5 items-center mt-auto mb-6">
        <NavLink to="/settings" className={iconClass} title="Settings">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </NavLink>
      </div>

      {/* Bottom Logo Badge */}
      <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white font-bold text-xl cursor-pointer shadow-md">
        V
      </div>
    </aside>
  );
}
