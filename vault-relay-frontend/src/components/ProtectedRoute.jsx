import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    // Show a blank/loading screen while the initial Auth check happens
    // This strictly prevents WASM, Sockets, and Services from booting up
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        <p className="animate-pulse">Loading</p>
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
