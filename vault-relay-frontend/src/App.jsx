import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/Shared/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Messages from './pages/Messages';
import Contacts from './pages/Contacts';
import StorageInfo from './pages/StorageInfo';
import UserSetting from './pages/UserSetting';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import CheckEmail from './pages/CheckEmail';
import VerifyAccount from './pages/VerifyAccount';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/check-email" element={<CheckEmail />} />
          <Route path="/verify-account" element={<VerifyAccount />} />
          {/* Protected Routes - These components are physically blocked from mounting if unauthenticated */}
          <Route path="/messages" element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          } />
          <Route path="/contacts" element={
            <ProtectedRoute>
              <Contacts />
            </ProtectedRoute>
          } />
          <Route path="/vaults" element={
            <ProtectedRoute>
              <StorageInfo />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <UserSetting />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </ToastProvider>
  );
}

export default App;
