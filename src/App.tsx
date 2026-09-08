/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/AuthProvider';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Auth from './pages/Auth';
import CreateSOS from './pages/CreateSOS';
import Messages from './pages/Messages';
import MyCalls from './pages/MyCalls';
import SOSDetails from './pages/SOSDetails';
import Settings from './pages/Settings';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen font-sans">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/create-sos" element={<CreateSOS />} />
            <Route path="/sos/:id" element={<SOSDetails />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/my-calls" element={<MyCalls />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
