import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    // Show a blank/loading screen while the initial Auth check happens
    // This strictly prevents WASM, Sockets, and Services from booting up
    return (
      <div className="flex h-screen items-center justify-center bg-[#E8F3EE] text-gray-800 font-body">
        <div className="flex flex-col items-center gap-3 bg-white/40 backdrop-blur-3xl border border-white/60 px-8 py-6 rounded-3xl shadow-xl">
          <span className="material-symbols-outlined animate-spin text-gray-500 text-3xl">autorenew</span>
          <p className="animate-pulse text-sm font-semibold tracking-wide text-gray-600">Securely loading your vault...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // User is completely unauthenticated. Hard redirect to login screen.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // User is authenticated, safely render the children (Messages, Contacts, etc.)
  return children;
}

export default ProtectedRoute;
