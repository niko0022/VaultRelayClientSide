import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Messages from './pages/Messages';
import Contacts from './pages/Contacts';
import StorageInfo from './pages/StorageInfo';
import UserSetting from './pages/UserSetting';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/vaults" element={<StorageInfo />} />
          <Route path="/settings" element={<UserSetting />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
