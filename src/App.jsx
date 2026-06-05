import React, { useState, useEffect } from 'react';
import LandingPage from './views/LandingPage';
import TenantPortal from './views/TenantPortal';
import LandlordDashboard from './views/LandlordDashboard';
import AdminDashboard from './views/AdminDashboard';
import LoginSignup from './views/LoginSignup';
import VoiceSearchModal from './components/VoiceSearchModal';
import { db } from './services/db';
import { Home, UserCheck, Shield, Mic, Landmark, Heart, LogIn, LogOut, ShieldAlert, Sparkles } from 'lucide-react';
import './App.css';

export default function App() {
  const [activeView, setActiveView] = useState('landing'); // 'landing' | 'tenant' | 'landlord' | 'admin' | 'auth'
  const [currentUser, setCurrentUser] = useState(null);
  const [authRolePreselect, setAuthRolePreselect] = useState('tenant');
  
  const [voiceSearchOpen, setVoiceSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Recover active session on mount
  useEffect(() => {
    const session = db.getCurrentSession();
    if (session) {
      setCurrentUser(session);
    }
  }, []);

  const handleVoiceSearchResult = (query) => {
    setSearchQuery(query);
    setActiveView('tenant');
  };

  const handlePromptLogin = (rolePreselect) => {
    setAuthRolePreselect(rolePreselect || 'tenant');
    setActiveView('auth');
  };

  const handleLogout = () => {
    db.logout();
    setCurrentUser(null);
    setActiveView('landing');
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-rurban-gray-50 flex flex-col font-sans text-rurban-blue-900 selection:bg-rurban-green-500/20 selection:text-rurban-green-700">
      
      {/* Premium Multi-Role Switcher Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-rurban-gray-200/80 transition-all shadow-sm">
        
        {/* UPI Transaction banner */}
        <div className="bg-gradient-to-r from-rurban-blue-900 via-rurban-blue-950 to-rurban-blue-900 text-white text-xs py-2 px-4 text-center font-medium shadow-inner flex items-center justify-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-rurban-green-500 animate-pulse" />
          <span>⚡ <span className="text-rurban-green-500 font-extrabold">100% FREE UPI Rent Tracking:</span> Direct landlord payouts with zero platform commission.</span>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            
            {/* Logo */}
            <div 
              onClick={() => { setActiveView('landing'); setSearchQuery(''); }}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div className="w-10 h-10 bg-rurban-blue-900 group-hover:bg-rurban-green-500 rounded-2xl flex items-center justify-center shadow-md transition-all">
                <Landmark className="w-5.5 h-5.5 text-white" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-xl font-black text-rurban-blue-900 tracking-tight">Gram</span>
                  <span className="text-xl font-black text-rurban-green-500 tracking-tight">Awas</span>
                  <span className="text-xs">🇮🇳</span>
                </div>
                <span className="text-[9px] uppercase tracking-wider text-rurban-gray-400 font-bold leading-none">
                  The Rurban Rental Network
                </span>
              </div>
            </div>

            {/* Navigation Role Controls */}
            <nav className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => { setActiveView('landing'); setSearchQuery(''); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeView === 'landing'
                    ? 'bg-rurban-blue-50 text-rurban-blue-900 border border-rurban-blue-100 shadow-sm'
                    : 'text-rurban-gray-600 hover:text-rurban-blue-900 hover:bg-rurban-gray-50 border border-transparent'
                }`}
              >
                <Home className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Landing</span>
              </button>

              {/* Tenant Portal Access */}
              {(currentUser?.role === 'tenant' || currentUser?.role === 'admin' || !currentUser) && (
                <button
                  onClick={() => currentUser ? setActiveView('tenant') : handlePromptLogin('tenant')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeView === 'tenant'
                      ? 'bg-rurban-green-50 text-rurban-green-600 border border-rurban-green-100 shadow-sm'
                      : 'text-rurban-gray-600 hover:text-rurban-green-500 hover:bg-rurban-gray-50 border border-transparent'
                  }`}
                >
                  <UserCheck className="w-4 h-4 shrink-0" />
                  <span>Tenant Portal</span>
                </button>
              )}

              {/* Landlord Portal Access */}
              {(currentUser?.role === 'landlord' || currentUser?.role === 'admin' || !currentUser) && (
                <button
                  onClick={() => currentUser ? setActiveView('landlord') : handlePromptLogin('landlord')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeView === 'landlord'
                      ? 'bg-rurban-blue-900 text-white shadow-md shadow-rurban-blue-900/10'
                      : 'text-rurban-gray-600 hover:text-rurban-blue-900 hover:bg-rurban-gray-50 border border-transparent'
                  }`}
                >
                  <Shield className="w-4 h-4 shrink-0" />
                  <span>Landlord Hub</span>
                </button>
              )}

              {/* Admin Panel Access */}
              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => setActiveView('admin')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeView === 'admin'
                      ? 'bg-rurban-green-500 text-white shadow-md shadow-rurban-green-500/15'
                      : 'text-rurban-gray-600 hover:text-rurban-green-500 hover:bg-rurban-gray-50 border border-transparent'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Admin Console</span>
                </button>
              )}
            </nav>

            {/* Profile Action / Login Trigger Menu */}
            <div className="flex items-center gap-2">
              
              {/* Dialect Trigger */}
              <button
                onClick={() => setVoiceSearchOpen(true)}
                className="p-2.5 bg-rurban-green-50 hover:bg-rurban-green-100 border border-rurban-green-200 text-rurban-green-600 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 shrink-0"
                title="Search via Local Dialect"
              >
                <Mic className="w-4.5 h-4.5 animate-pulse" />
                <span className="text-[10px] font-extrabold pr-0.5 hidden md:inline uppercase tracking-wide">Dialect Search</span>
              </button>

              {currentUser ? (
                <div className="flex items-center gap-2 border-l border-rurban-gray-200 pl-2">
                  <div className="hidden lg:flex flex-col text-right">
                    <span className="text-xs font-bold text-rurban-blue-900 leading-tight">{currentUser.username}</span>
                    <span className="text-[9px] font-bold text-rurban-green-650 uppercase tracking-widest leading-none mt-0.5">
                      {currentUser.role}
                    </span>
                  </div>
                  
                  {/* Avatar circle */}
                  <div 
                    title={`${currentUser.username} (${currentUser.role})`}
                    className={`w-9.5 h-9.5 rounded-2xl flex items-center justify-center text-xs font-black text-white shadow-md border ${
                      currentUser.role === 'admin'
                        ? 'bg-red-500 border-red-300'
                        : currentUser.role === 'landlord'
                        ? 'bg-rurban-blue-900 border-rurban-blue-800'
                        : 'bg-rurban-green-500 border-rurban-green-450'
                    }`}
                  >
                    {currentUser.username[0].toUpperCase()}
                  </div>

                  <button
                    onClick={handleLogout}
                    className="p-2.5 text-rurban-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Sign Out"
                  >
                    <LogOut className="w-4.5 h-4.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handlePromptLogin('tenant')}
                  className="px-4 py-2.5 bg-rurban-blue-900 hover:bg-rurban-blue-800 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 shrink-0"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}

            </div>

          </div>
        </div>
      </header>

      {/* Main Area */}
      <main className="flex-1">
        {activeView === 'landing' && (
          <LandingPage 
            setRole={setActiveView} 
            onOpenVoiceSearch={() => setVoiceSearchOpen(true)}
            setSearchQuery={setSearchQuery}
            currentUser={currentUser}
            onPromptLogin={handlePromptLogin}
          />
        )}
        {activeView === 'tenant' && (
          <TenantPortal voiceSearchFilter={searchQuery} />
        )}
        {activeView === 'landlord' && (
          <LandlordDashboard />
        )}
        {activeView === 'admin' && (
          <AdminDashboard />
        )}
        {activeView === 'auth' && (
          <LoginSignup 
            preselectedRole={authRolePreselect}
            onLoginSuccess={(user) => {
              setCurrentUser(user);
              if (user.role === 'admin') setActiveView('admin');
              else if (user.role === 'landlord') setActiveView('landlord');
              else setActiveView('tenant');
            }}
            onCancel={() => setActiveView('landing')}
          />
        )}
      </main>

      {/* AI Voice search modal container */}
      <VoiceSearchModal
        isOpen={voiceSearchOpen}
        onClose={() => setVoiceSearchOpen(false)}
        onVoiceSearchResult={handleVoiceSearchResult}
      />

      {/* Premium Footer */}
      <footer className="bg-rurban-blue-950 border-t border-white/5 text-white py-12 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex items-center gap-1.5 justify-center md:justify-start mb-2">
              <span className="text-base font-black text-white">Gram</span>
              <span className="text-base font-black text-rurban-green-500">Awas</span>
              <span className="text-xs">🇮🇳</span>
            </div>
            <p className="text-xs text-rurban-gray-400 max-w-sm">
              Connecting local rurban homeowners with public sector migrant workforces, building trust and formalizing housing.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-xs text-rurban-gray-400 font-semibold">
            <a href="#about" className="hover:text-white transition-colors">About Startup</a>
            <a href="#terms" className="hover:text-white transition-colors">Bilingual Agreements</a>
            <a href="#upi" className="hover:text-white transition-colors">100% Free UPI Policy</a>
            <a href="#sbi" className="hover:text-white transition-colors">SBI credit linkage</a>
          </div>

          <div className="text-center md:text-right text-xs text-rurban-gray-500 font-semibold">
            <p>© 2026 GramAwas Technologies Private Limited.</p>
            <p className="flex items-center justify-center md:justify-end gap-1 mt-1">
              Made with <Heart className="w-3.5 h-3.5 text-red-500 fill-current" /> for Rural India.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
