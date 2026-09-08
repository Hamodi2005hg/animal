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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/create-sos" element={<CreateSOS />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/my-calls" element={<MyCalls />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
