import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-surface-container-lowest w-full py-24 px-6 border-t border-outline-variant/10">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 max-w-7xl mx-auto">
        <div className="col-span-1 md:col-span-1">
          <div className="text-lg font-bold text-primary-container mb-6 font-headline">Vault Relay</div>
          <p className="font-body text-sm text-on-surface-variant leading-relaxed mb-6">
            © 2024 Vault Relay. Kinetic Fortress Security. All rights reserved. Built for the future of digital sovereignty.
          </p>
        </div>
        <div>
          <h4 className="text-on-surface font-headline font-bold mb-6">Product</h4>
          <ul className="space-y-4">
            <li><Link className="text-on-surface-variant hover:text-primary transition-colors font-body text-sm" to="#">Privacy Policy</Link></li>
            <li><Link className="text-on-surface-variant hover:text-primary transition-colors font-body text-sm" to="#">Terms of Service</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-on-surface font-headline font-bold mb-6">Security</h4>
          <ul className="space-y-4">
            <li><Link className="text-on-surface-variant hover:text-primary transition-colors font-body text-sm" to="#">Security Whitepaper</Link></li>
            <li><Link className="text-on-surface-variant hover:text-primary transition-colors font-body text-sm" to="#">Audits</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-on-surface font-headline font-bold mb-6">Support</h4>
          <ul className="space-y-4">
            <li><Link className="text-on-surface-variant hover:text-primary transition-colors font-body text-sm" to="#">Contact Support</Link></li>
            <li><Link className="text-on-surface-variant hover:text-primary transition-colors font-body text-sm" to="#">FAQ</Link></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-24 pt-8 border-t border-outline-variant/10 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex gap-6">
          <span className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors cursor-pointer">public</span>
          <span className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors cursor-pointer">monitoring</span>
          <span className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors cursor-pointer">terminal</span>
        </div>
        <div className="text-on-surface-variant font-label text-[10px] uppercase tracking-[0.2em]">
          Status: System Nominal // E2E Active
        </div>
      </div>
    </footer>
  );
}
