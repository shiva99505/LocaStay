import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { ShieldAlert, Users, Building, Landmark, CheckCircle, XCircle, Search, TrendingUp, RefreshCw, Terminal, Eye } from 'lucide-react';

export default function AdminDashboard() {
  // DB states
  const [properties, setProperties] = useState([]);
  const [users, setUsers] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [logs, setLogs] = useState([]);
  
  // UI filter states
  const [userFilter, setUserFilter] = useState('all'); // 'all' | 'landlord' | 'tenant'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Refresh data from DB helper
  const reloadData = () => {
    setProperties(db.getProperties());
    setUsers(db.getUsers());
    setLedger(db.getLedger());
    setLogs(db.getLogs());
  };

  useEffect(() => {
    reloadData();
  }, []);

  // Handlers
  const handleApproveListing = (id) => {
    db.updatePropertyStatus(id, 'Approved');
    reloadData();
  };

  const handleRejectListing = (id) => {
    db.deleteProperty(id);
    reloadData();
  };

  const handleToggleUserVerify = (userId, currentVerified) => {
    db.updateUserVerification(userId, !currentVerified);
    reloadData();
  };

  // Metrics calculators
  const pendingListings = properties.filter(p => p.status === 'Pending');
  const activeListings = properties.filter(p => p.status === 'Approved');
  const totalVolume = ledger.filter(l => l.status === 'Paid').reduce((sum, item) => sum + item.amount, 0);
  const totalUsersCount = users.length;

  // Filter listings
  const filteredUsers = users.filter(u => {
    const matchesRole = userFilter === 'all' || u.role === userFilter;
    const matchesSearch = u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.phone.includes(searchQuery);
    return matchesRole && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      
      {/* Top Banner Row */}
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-rurban-blue-900 via-rurban-blue-950 to-rurban-blue-900 p-6 rounded-3xl text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-48 h-48 rounded-full bg-rurban-green-500/10 blur-2xl" />
        <div>
          <h2 className="text-xl font-extrabold flex items-center gap-2">
            <ShieldAlert className="w-5.5 h-5.5 text-rurban-green-500" />
            GramAwas Web Owner Console
          </h2>
          <p className="text-xs text-rurban-gray-300 mt-1">Platform metrics, verify listings, approve rurban trust credentials.</p>
        </div>
        <button
          onClick={reloadData}
          className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold rounded-xl transition-all active:scale-95"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Console
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-3xl border border-rurban-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-rurban-gray-400 font-bold uppercase tracking-wider block">Approved Listings</span>
            <span className="text-2xl font-black text-rurban-blue-900 block mt-1">{activeListings.length}</span>
            <span className="text-[10px] text-rurban-green-600 font-bold block mt-1">✓ Live on portal</span>
          </div>
          <div className="w-12 h-12 bg-rurban-blue-50 text-rurban-blue-900 rounded-2xl flex items-center justify-center">
            <Building className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-3xl border border-rurban-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-rurban-gray-400 font-bold uppercase tracking-wider block">Pending Approvals</span>
            <span className="text-2xl font-black text-rurban-green-600 block mt-1">{pendingListings.length}</span>
            <span className="text-[10px] text-rurban-gray-400 block mt-1">Awaiting review</span>
          </div>
          <div className="w-12 h-12 bg-rurban-green-50 text-rurban-green-600 rounded-2xl flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-3xl border border-rurban-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-rurban-gray-400 font-bold uppercase tracking-wider block">Total Platform Users</span>
            <span className="text-2xl font-black text-rurban-blue-900 block mt-1">{totalUsersCount}</span>
            <span className="text-[10px] text-rurban-blue-900 font-semibold block mt-1">
              {users.filter(u => u.role === 'landlord').length} Landlords | {users.filter(u => u.role === 'tenant').length} Tenants
            </span>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-rurban-blue-850 rounded-2xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-3xl border border-rurban-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-rurban-gray-400 font-bold uppercase tracking-wider block">UPI Transaction Ledger</span>
            <span className="text-2xl font-black text-rurban-green-600 block mt-1">₹{totalVolume.toLocaleString('en-IN')}</span>
            <span className="text-[10px] text-rurban-green-600 font-bold block mt-1">⚡ 100% direct payouts</span>
          </div>
          <div className="w-12 h-12 bg-rurban-green-50/50 text-rurban-green-600 rounded-2xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Section (Left Col: Approvals & Users) */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          {/* Review Listings Box */}
          <div className="bg-white border border-rurban-gray-200 shadow-sm rounded-3xl p-6">
            <div className="flex items-center justify-between mb-5 border-b border-rurban-gray-100 pb-3">
              <h3 className="font-bold text-sm text-rurban-blue-900 flex items-center gap-2">
                <Building className="w-4.5 h-4.5 text-rurban-green-500" />
                Newly Listed Rooms Pending Approval ({pendingListings.length})
              </h3>
              <span className="text-[10px] text-rurban-gray-400">KYC Verify</span>
            </div>

            {pendingListings.length === 0 ? (
              <div className="p-10 border-2 border-dashed border-rurban-gray-200 rounded-2xl text-center bg-rurban-gray-50/50">
                <CheckCircle className="w-10 h-10 text-rurban-green-500 mx-auto mb-3" />
                <p className="text-xs font-bold text-rurban-blue-900">All Listings Reviewed</p>
                <p className="text-[11px] text-rurban-gray-400 mt-0.5">No properties are currently pending admin verification.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {pendingListings.map(prop => (
                  <div key={prop.id} className="p-4 bg-rurban-gray-50 border border-rurban-gray-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[9px] uppercase tracking-wider font-extrabold bg-rurban-blue-50 text-rurban-blue-900 px-2 py-0.5 rounded-md border border-rurban-blue-100">
                          {prop.town}
                        </span>
                        <span className="text-[10px] text-rurban-gray-400 font-medium">by Landlord: <span className="font-bold text-rurban-blue-900">{prop.landlordName}</span></span>
                      </div>
                      <h4 className="font-bold text-xs text-rurban-blue-900">{prop.title}</h4>
                      <p className="text-[10px] text-rurban-gray-400 mt-1">📍 {prop.location} (Landmark: {prop.landmark})</p>
                      
                      <div className="flex gap-4 mt-2 pt-2 border-t border-rurban-gray-200/40 text-[10px] font-semibold text-rurban-gray-500">
                        <span>Rent: <strong className="text-rurban-green-600 font-bold">₹{prop.price}/mo</strong></span>
                        <span>Deposit: <strong>₹{prop.deposit || 'N/A'}</strong></span>
                        <span>Escalation: <strong>{prop.autoEsc ? '11-Month (10%)' : 'Standard'}</strong></span>
                      </div>
                    </div>

                    <div className="flex gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => handleApproveListing(prop.id)}
                        className="px-3 py-1.5 bg-rurban-green-500 hover:bg-rurban-green-600 text-white rounded-xl text-[10px] font-extrabold flex items-center gap-1 shadow-sm transition-all"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectListing(prop.id)}
                        className="px-3 py-1.5 bg-white hover:bg-red-50 border border-red-100 text-red-500 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User Management Panel */}
          <div className="bg-white border border-rurban-gray-200 shadow-sm rounded-3xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-rurban-gray-100 pb-4">
              <h3 className="font-bold text-sm text-rurban-blue-900 flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-rurban-green-500" />
                Registered Rurban Users
              </h3>
              
              <div className="flex gap-2 self-start">
                <button
                  onClick={() => setUserFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                    userFilter === 'all' 
                      ? 'bg-rurban-blue-900 text-white border-transparent shadow-sm'
                      : 'bg-rurban-gray-50 text-rurban-gray-500 hover:bg-rurban-gray-100'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setUserFilter('landlord')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                    userFilter === 'landlord' 
                      ? 'bg-rurban-blue-900 text-white border-transparent shadow-sm'
                      : 'bg-rurban-gray-50 text-rurban-gray-500 hover:bg-rurban-gray-100'
                  }`}
                >
                  Landlords
                </button>
                <button
                  onClick={() => setUserFilter('tenant')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                    userFilter === 'tenant' 
                      ? 'bg-rurban-blue-900 text-white border-transparent shadow-sm'
                      : 'bg-rurban-gray-50 text-rurban-gray-500 hover:bg-rurban-gray-100'
                  }`}
                >
                  Tenants
                </button>
              </div>
            </div>

            {/* User search bar */}
            <div className="mb-4 flex items-center gap-2.5 px-3 py-2 bg-rurban-gray-50 border border-rurban-gray-200 rounded-xl">
              <Search className="w-4 h-4 text-rurban-gray-400" />
              <input
                type="text"
                placeholder="Search users by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none text-xs focus:outline-none placeholder-rurban-gray-400 text-rurban-blue-900 font-semibold"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-rurban-gray-50 border-b border-rurban-gray-200 text-rurban-blue-900 font-bold uppercase tracking-wider">
                    <th className="p-3">User Details</th>
                    <th className="p-3">System Role</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">KYC Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rurban-gray-100 text-rurban-gray-700">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-rurban-gray-50/40 transition-colors">
                      <td className="p-3">
                        <span className="font-bold text-rurban-blue-900 block">{user.username}</span>
                        <span className="text-[10px] text-rurban-gray-400 font-mono">Ph: {user.phone}</span>
                        {user.occupation && (
                          <span className="text-[9px] text-rurban-green-600 block font-semibold mt-0.5">💼 {user.occupation}</span>
                        )}
                        {user.upi && (
                          <span className="text-[9px] text-rurban-gray-400 block font-mono">UPI: {user.upi}</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide border ${
                          user.role === 'admin' 
                            ? 'bg-red-50 text-red-500 border-red-100'
                            : user.role === 'landlord'
                            ? 'bg-rurban-blue-50 text-rurban-blue-900 border-rurban-blue-100'
                            : 'bg-rurban-green-50 text-rurban-green-600 border-rurban-green-100'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-3">
                        {user.verified ? (
                          <span className="text-[10px] font-extrabold text-rurban-green-600 flex items-center gap-1">
                            ✓ Verified
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-rurban-gray-400 flex items-center gap-1">
                            ⚡ Pending
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => handleToggleUserVerify(user.id, user.verified)}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                              user.verified
                                ? 'bg-red-50 hover:bg-red-100 text-red-500 border border-red-100'
                                : 'bg-rurban-green-50 hover:bg-rurban-green-100 text-rurban-green-600 border border-rurban-green-100'
                            }`}
                          >
                            {user.verified ? 'Revoke Trust' : 'Verify Trust'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Section: System Logs (Terminal) */}
        <div className="flex flex-col gap-6">
          
          {/* Platform logs card */}
          <div className="bg-rurban-blue-950 text-white rounded-3xl p-5 shadow-lg border border-white/5 flex flex-col flex-1 min-h-[480px]">
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <h3 className="font-extrabold text-xs tracking-wider flex items-center gap-1.5 uppercase text-rurban-green-500">
                <Terminal className="w-4 h-4 animate-pulse" />
                Live Platform Audit Feed
              </h3>
              <span className="text-[8px] bg-white/10 px-2 py-0.5 rounded text-rurban-gray-400 font-mono">v1.2 TRACE</span>
            </div>

            <div className="flex-1 flex flex-col gap-3 font-mono text-[10px] leading-relaxed max-h-[460px] overflow-y-auto pr-1">
              {logs.map((log) => (
                <div key={log.id} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-colors">
                  <div className="flex justify-between text-rurban-gray-400 text-[8px] mb-1 font-semibold">
                    <span>user: {log.user}</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-rurban-gray-200">{log.event}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 text-[9px] text-rurban-gray-500 text-center flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rurban-green-500 animate-ping" />
              <span>Listening to active browser interactions...</span>
            </div>
          </div>

          {/* Quick Stats Helper */}
          <div className="bg-gradient-to-br from-rurban-blue-900 to-rurban-blue-950 text-white p-6 rounded-3xl shadow-md border border-white/5">
            <h4 className="font-bold text-xs text-rurban-green-500 uppercase tracking-widest mb-3">Platform Analytics</h4>
            <p className="text-xs text-rurban-gray-300 leading-relaxed mb-4">
              GramAwas has secured a 100% payment conversion score across Tier-3 villages, matching public school educators directly with homeowners.
            </p>
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] space-y-2 font-medium">
              <div className="flex justify-between">
                <span className="text-rurban-gray-400">Monthly SBI link conversions:</span>
                <span className="text-white font-bold">88.5%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-rurban-gray-400">Total Cities & Towns covered:</span>
                <span className="text-white font-bold">14 Towns</span>
              </div>
              <div className="flex justify-between">
                <span className="text-rurban-gray-400">Platform uptime SLA:</span>
                <span className="text-rurban-green-500 font-bold">99.98%</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
