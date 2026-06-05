import React, { useState } from 'react';
import { db } from '../services/db';
import { UserCheck, Shield, Landmark, Eye, EyeOff, Sparkles, LogIn, ArrowLeftRight, CheckCircle2, AlertCircle } from 'lucide-react';

export default function LoginSignup({ onLoginSuccess, onCancel, preselectedRole }) {
  const [isLogin, setIsLogin] = useState(true);
  const [activeRole, setActiveRole] = useState(preselectedRole || 'tenant'); // 'tenant' | 'landlord' | 'admin'
  const [showPassword, setShowPassword] = useState(false);
  
  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [upi, setUpi] = useState('');
  const [pan, setPan] = useState('');
  const [occupation, setOccupation] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!username || !password) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    try {
      if (isLogin) {
        // LOGIN Flow
        const loggedInUser = db.login(username, password);
        setSuccessMsg(`Welcome back, ${loggedInUser.username}! Redirecting...`);
        setTimeout(() => {
          onLoginSuccess(loggedInUser);
        }, 1200);
      } else {
        // SIGNUP Flow
        if (!phone) {
          setErrorMsg('Phone number is required to build trust and register accounts.');
          return;
        }
        
        const registered = db.register(
          username, 
          password, 
          activeRole, 
          phone, 
          upi, 
          pan, 
          occupation
        );
        
        setSuccessMsg(`Account created for ${registered.username}! Please log in now.`);
        setIsLogin(true); // Switch to login screen
        setPassword(''); // Reset password field for security
      }
    } catch (error) {
      setErrorMsg(error.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-20 animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-white rounded-[2rem] border border-rurban-gray-200/80 shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[580px]">
        
        {/* Left Side Panel: Rurban Brand Promotion Card */}
        <div className="w-full md:w-5/12 bg-gradient-to-br from-rurban-blue-950 via-rurban-blue-900 to-rurban-blue-950 text-white p-8 flex flex-col justify-between relative overflow-hidden">
          {/* Ambient background blur blobs */}
          <div className="absolute -left-12 -top-12 w-40 h-40 rounded-full bg-rurban-green-500/10 blur-2xl" />
          <div className="absolute -right-12 -bottom-12 w-40 h-40 rounded-full bg-rurban-green-500/15 blur-2xl" />

          <div className="relative z-10">
            <div className="flex items-center gap-1.5 mb-8">
              <div className="w-8 h-8 bg-rurban-green-500 rounded-xl flex items-center justify-center shadow-md">
                <Landmark className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-lg font-black tracking-tight">Loca<span className="text-rurban-green-500">Stay</span></span>
              <span className="text-xs">🇮🇳</span>
            </div>

            <h2 className="text-2xl font-extrabold tracking-tight mb-4 leading-tight">
              India's Premier <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rurban-green-500 to-emerald-400">Rurban Rental</span> Network.
            </h2>
            <p className="text-xs text-rurban-gray-400 leading-relaxed mb-6">
              Empowering Tier-3 towns, connecting teachers, medical workers, and students with trusted homeowners through zero-commission direct rentals.
            </p>

            <ul className="space-y-3.5 text-xs text-rurban-gray-300 font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-rurban-green-500 shrink-0" />
                <span>100% Free Direct UPI Rent Tracking</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-rurban-green-500 shrink-0" />
                <span>11-Month Smart Digital Agreements</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-rurban-green-500 shrink-0" />
                <span>Verified HRA tax receipts & SBI linked logs</span>
              </li>
            </ul>
          </div>

          <div className="relative z-10 pt-8 border-t border-white/10 mt-8 flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-rurban-green-500 shrink-0" />
            <span className="text-[10px] text-rurban-gray-400 uppercase tracking-widest leading-none font-bold">
              Secure & KYC Compliant
            </span>
          </div>
        </div>

        {/* Right Side Panel: Interactive Auth Form */}
        <div className="flex-1 p-8 md:p-10 flex flex-col justify-center bg-rurban-gray-50/50">
          
          {/* Header message */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-rurban-blue-900 mb-1">
              {isLogin ? 'Welcome Back!' : 'Create Rurban Account'}
            </h3>
            <p className="text-xs text-rurban-gray-500">
              {isLogin 
                ? 'Sign in to access your direct bookings, active ledger, or listings.' 
                : 'Join the community of verified rural tenants and homeowners today.'
              }
            </p>
          </div>

          {/* Error and Success Alert Banners */}
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-center gap-2 animate-in slide-in-from-top-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="mb-5 p-3.5 bg-rurban-green-50 border border-rurban-green-200 text-rurban-green-600 rounded-xl text-xs flex items-center gap-2 animate-in slide-in-from-top-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}

          {/* Role selector tab bars (Only shown for sign up to let users register specific roles, or to set context for login) */}
          <div className="mb-6 p-1.5 bg-rurban-gray-100/80 rounded-2xl flex gap-1">
            <button
              type="button"
              onClick={() => setActiveRole('tenant')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeRole === 'tenant'
                  ? 'bg-white text-rurban-blue-900 border border-rurban-gray-200/50 shadow-sm'
                  : 'text-rurban-gray-500 hover:text-rurban-blue-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Tenant</span>
            </button>
            
            <button
              type="button"
              onClick={() => setActiveRole('landlord')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeRole === 'landlord'
                  ? 'bg-rurban-blue-900 text-white shadow-sm shadow-rurban-blue-900/10'
                  : 'text-rurban-gray-500 hover:text-rurban-blue-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Landlord</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveRole('admin')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeRole === 'admin'
                  ? 'bg-rurban-green-500 text-white shadow-sm shadow-rurban-green-500/10'
                  : 'text-rurban-gray-500 hover:text-rurban-blue-900'
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {/* Username/Full Name */}
            <div>
              <label className="block text-[11px] font-semibold text-rurban-gray-500 mb-1">
                {activeRole === 'admin' ? 'Admin Username' : 'Full Name / Business Name'}
              </label>
              <input
                type="text"
                placeholder={activeRole === 'admin' ? 'e.g. admin' : 'e.g. Subhash Chandra'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-2.5 bg-white border border-rurban-gray-200/80 rounded-xl text-xs focus:outline-none focus:border-rurban-green-500 text-rurban-blue-900 font-medium"
                required
              />
            </div>

            {/* Phone Number (Sign up only) */}
            {!isLogin && activeRole !== 'admin' && (
              <div>
                <label className="block text-[11px] font-semibold text-rurban-gray-500 mb-1">
                  10-Digit Mobile Phone (UPI linked preferred)
                </label>
                <input
                  type="tel"
                  maxLength="10"
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full p-2.5 bg-white border border-rurban-gray-200/80 rounded-xl text-xs focus:outline-none focus:border-rurban-green-500 text-rurban-blue-900 font-medium font-mono"
                  required
                />
              </div>
            )}

            {/* Dynamic Role-specific Form fields */}
            {!isLogin && activeRole === 'landlord' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-rurban-gray-500 mb-1">
                    UPI Payout ID (for rent)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. rameshpatel@okhdfc"
                    value={upi}
                    onChange={(e) => setUpi(e.target.value)}
                    className="w-full p-2.5 bg-white border border-rurban-gray-200/80 rounded-xl text-xs focus:outline-none focus:border-rurban-green-500 text-rurban-blue-900 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-rurban-gray-500 mb-1">
                    10-Digit PAN (for HRA)
                  </label>
                  <input
                    type="text"
                    maxLength="10"
                    placeholder="e.g. BPNPP1289K"
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    className="w-full p-2.5 bg-white border border-rurban-gray-200/80 rounded-xl text-xs focus:outline-none focus:border-rurban-green-500 text-rurban-blue-900 font-semibold font-mono"
                  />
                </div>
              </div>
            )}

            {!isLogin && activeRole === 'tenant' && (
              <div>
                <label className="block text-[11px] font-semibold text-rurban-gray-500 mb-1">
                  Tenant Occupation / Rurban Status
                </label>
                <select
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="w-full p-2.5 bg-white border border-rurban-gray-200/80 rounded-xl text-xs focus:outline-none focus:border-rurban-green-500 text-rurban-blue-900 font-semibold"
                >
                  <option value="">Select rurban group...</option>
                  <option value="Govt Teacher">🏫 Public School Teacher</option>
                  <option value="PHC Doctor / Nurse">🏥 Primary Health Center (PHC) staff</option>
                  <option value="Police Officer">👮 Police/Administrative Officer</option>
                  <option value="Rural Student">🎓 Rurban / University Student</option>
                  <option value="Bank / PSU Staff">🏦 Local Bank / Cooperative worker</option>
                  <option value="Other">💼 Business owner / Local worker</option>
                </select>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-[11px] font-semibold text-rurban-gray-500 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2.5 pr-10 bg-white border border-rurban-gray-200/80 rounded-xl text-xs focus:outline-none focus:border-rurban-green-500 text-rurban-blue-900 font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-rurban-gray-400 hover:text-rurban-blue-900 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Admin notice warning */}
            {activeRole === 'admin' && isLogin && (
              <div className="p-3 bg-rurban-green-50 border border-rurban-green-100 rounded-xl text-[10px] text-rurban-green-700 leading-normal font-medium">
                🔑 <strong>Admin Seed Account:</strong> Try username <code className="font-bold underline">admin</code> & password <code className="font-bold underline">admin123</code> to log into the platform control board instantly.
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className={`w-full py-3 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 ${
                activeRole === 'tenant' 
                  ? 'bg-rurban-green-500 hover:bg-rurban-green-600'
                  : activeRole === 'landlord'
                  ? 'bg-rurban-blue-900 hover:bg-rurban-blue-800'
                  : 'bg-rurban-green-700 hover:bg-rurban-green-800'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>{isLogin ? 'Sign In Securely' : 'Sign Up Account'}</span>
            </button>
          </form>

          {/* Toggle link */}
          <div className="mt-6 pt-4 border-t border-rurban-gray-200/60 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className="text-xs font-bold text-rurban-blue-900 hover:underline flex items-center justify-center gap-1.5 mx-auto"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-rurban-green-500" />
              <span>
                {isLogin 
                  ? "Don't have an account? Sign Up" 
                  : 'Already registered? Sign In instead'
                }
              </span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
