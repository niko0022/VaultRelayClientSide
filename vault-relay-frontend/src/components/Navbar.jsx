import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-surface/70 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,229,255,0.08)]">
      <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
        <div className="text-2xl font-black text-primary-container tracking-tighter font-headline">
          Vault Relay
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a className="text-primary-container border-b-2 border-primary-container pb-1 font-headline font-bold tracking-tight" href="#">Features</a>
          <a className="text-on-surface hover:text-primary transition-colors font-headline font-bold tracking-tight" href="#">Security</a>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="bg-primary-container text-on-primary-container px-6 py-2 font-headline font-bold tracking-tight hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] transition-all active:scale-95 duration-200 ease-in-out cursor-pointer">
            Login
          </Link>
          <Link to="/register" className="bg-primary-container text-on-primary-container px-6 py-2 font-headline font-bold tracking-tight hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] transition-all active:scale-95 duration-200 ease-in-out cursor-pointer">
            Register
          </Link>
        </div>
      </div>
    </nav>
  );
}
