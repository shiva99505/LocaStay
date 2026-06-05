import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Mic, Search, ShieldCheck, ArrowRight, TrendingUp, Users, Building, DollarSign, AlertCircle } from 'lucide-react';

export default function LandingPage({ setRole, onOpenVoiceSearch, setSearchQuery, currentUser, onPromptLogin }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    villages: '6,200+',
    volume: '₹4.8 Cr+',
    tenants: '18,500+'
  });

  useEffect(() => {
    // Dynamic Stats calculation from Mock Database
    const approvedProps = db.getProperties().filter(p => p.status === 'Approved');
    const ledger = db.getLedger();
    const paidSum = ledger.filter(l => l.status === 'Paid').reduce((sum, item) => sum + item.amount, 0);
    const usersCount = db.getUsers().length;

    setStats({
      villages: `${6200 + approvedProps.length} villages`,
      volume: paidSum > 0 ? `₹${(paidSum / 1000).toFixed(1)}k+` : '₹4.8 Cr+',
      tenants: `${18500 + usersCount} Active`
    });
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setSearchQuery(searchTerm);
      setRole('tenant');
    }
  };

  const handleTenantAction = () => {
    if (currentUser) {
      setRole('tenant');
    } else {
      onPromptLogin('tenant');
    }
  };

  const handleLandlordAction = () => {
    if (currentUser) {
      setRole('landlord');
    } else {
      onPromptLogin('landlord');
    }
  };

  return (
    <div className="bg-gradient-to-b from-rurban-blue-50/50 via-white to-white min-h-screen pb-16 animate-in fade-in duration-300">
      
      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-20 pb-16">
        
        {/* UPI Banner Promotion */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-rurban-green-100/60 border border-rurban-green-200 rounded-full shadow-sm text-xs font-semibold text-rurban-blue-900 animate-bounce">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rurban-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rurban-green-500"></span>
            </span>
            <span>100% FREE UPI Rent Tracking: Zero platform leakages, direct to landlord!</span>
          </div>
        </div>

        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-rurban-blue-900 leading-[1.1] mb-6">
            Organizing Rural India's <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rurban-green-500 to-rurban-blue-800">
              Rental Economy
            </span>
          </h1>
          <p className="text-base sm:text-xl text-rurban-gray-600 max-w-2xl mx-auto font-normal leading-relaxed mb-8">
            The Rurban Rental Network connecting local landlords in Tier-3 towns with migrant government employees, teachers, healthcare staff, and rural students.
          </p>

          {/* Search Mockup Box */}
          <div className="max-w-2xl mx-auto mb-12">
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 p-2 bg-white rounded-2xl shadow-xl border border-rurban-gray-200/80">
              <div className="flex-1 flex items-center gap-2.5 px-4 py-2 border-b sm:border-b-0 sm:border-r border-rurban-gray-100">
                <Search className="w-5 h-5 text-rurban-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search village, landmark, or town..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-transparent border-none text-sm text-rurban-blue-900 focus:outline-none placeholder-rurban-gray-400 font-medium"
                />
                
                {/* Voice Input Trigger */}
                <button
                  type="button"
                  onClick={onOpenVoiceSearch}
                  className="p-1.5 bg-rurban-green-50 hover:bg-rurban-green-100 rounded-lg text-rurban-green-600 border border-rurban-green-200 shrink-0 transition-all flex items-center gap-1 group"
                  title="Search via Local Dialect"
                >
                  <Mic className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold pr-0.5 hidden sm:inline">🎙️ Regional Voice AI</span>
                </button>
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto px-7 py-3 bg-rurban-blue-900 hover:bg-rurban-blue-800 text-white text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                Find Rooms
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
            <p className="text-[11px] text-rurban-gray-400 text-left mt-2.5 px-3">
              Try searching: <span className="font-semibold text-rurban-blue-900 italic">"Panchayat Bhavan"</span> or <span className="font-semibold text-rurban-blue-900 italic">"Primary Health Center"</span>
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap justify-center gap-4 mb-16">
            <button
              onClick={handleTenantAction}
              className="px-8 py-4 bg-rurban-green-500 hover:bg-rurban-green-600 text-white font-bold rounded-2xl shadow-lg shadow-rurban-green-500/20 transition-all rurban-hover flex items-center gap-2"
            >
              For Tenants: Explore Rooms
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={handleLandlordAction}
              className="px-8 py-4 bg-white hover:bg-rurban-gray-50 border border-rurban-gray-200 text-rurban-blue-900 font-bold rounded-2xl shadow-sm transition-all rurban-hover flex items-center gap-2"
            >
              For Landlords: List Property
            </button>
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto pt-6 border-t border-rurban-gray-100">
          <div className="bg-white p-6 rounded-2xl border border-rurban-gray-100 shadow-sm flex items-center gap-4">
            <div className="p-4 rounded-xl font-bold text-lg bg-emerald-50 text-rurban-green-600">
              {stats.villages}
            </div>
            <div>
              <h4 className="font-bold text-rurban-blue-900 text-sm">Villages Covered</h4>
              <p className="text-xs text-rurban-gray-500">6 Lakh+ Villages in India</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-rurban-gray-100 shadow-sm flex items-center gap-4">
            <div className="p-4 rounded-xl font-bold text-lg bg-blue-50 text-rurban-blue-950">
              {stats.volume}
            </div>
            <div>
              <h4 className="font-bold text-rurban-blue-900 text-sm">Rent Paid via App</h4>
              <p className="text-xs text-rurban-gray-500">100% Free UPI Tracking</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-rurban-gray-100 shadow-sm flex items-center gap-4">
            <div className="p-4 rounded-xl font-bold text-lg bg-orange-50 text-amber-500">
              {stats.tenants}
            </div>
            <div>
              <h4 className="font-bold text-rurban-blue-900 text-sm">Active Tenant base</h4>
              <p className="text-xs text-rurban-gray-500">Teachers, Police, Nurses & Students</p>
            </div>
          </div>
        </div>
      </section>

      {/* Problem vs Solution Section */}
      <section className="bg-rurban-gray-50 border-y border-rurban-gray-200/60 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-rurban-green-600 uppercase tracking-widest bg-rurban-green-100/60 px-3 py-1 rounded-full">
              Solving Real Friction
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-rurban-blue-900 mt-4 mb-4">
              Why Traditional Rural Rentals are Broken
            </h2>
            <p className="text-sm md:text-base text-rurban-gray-600 font-normal">
              GramAwas formalizes rural India's rental economy by removing disputes, high brokers, and documentation gaps.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-white rounded-3xl border border-rurban-gray-200/80 shadow-md overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-lg">
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-red-50 rounded-xl">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                  </div>
                  <h3 className="font-bold text-rurban-blue-900 text-base">Informal & Verbal Agreements</h3>
                </div>
                <p className="text-xs md:text-sm text-rurban-gray-500 leading-relaxed mb-6">
                  Rural rentals traditionally rely on oral handshakes. When disputes happen over deposit return, there is zero legal proof, leaving tenants stranded.
                </p>
              </div>
              <div className="bg-rurban-green-50/50 p-6 md:p-8 border-t border-rurban-green-100 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-rurban-green-600 font-bold text-sm mb-2">
                    <ShieldCheck className="w-4.5 h-4.5" />
                    <span>GramAwas Solution</span>
                  </div>
                  <h4 className="font-bold text-rurban-blue-900 text-sm mb-1.5">11-Month Smart Digital Contracts</h4>
                  <p className="text-xs text-rurban-gray-650 leading-relaxed">
                    Legally vetted bilingual templates easily generated on mobile in 3 clicks with automated 11-month escalation rules.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-rurban-gray-200/80 shadow-md overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-lg">
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-red-50 rounded-xl">
                    <DollarSign className="w-6 h-6 text-red-500" />
                  </div>
                  <h3 className="font-bold text-rurban-blue-900 text-base">HRA Claims Rejected by Gov</h3>
                </div>
                <p className="text-xs md:text-sm text-rurban-gray-500 leading-relaxed mb-6">
                  Government teachers, nurses, and police officers in rural posts miss out on major HRA cashbacks because landlords refuse to sign tax receipts or lack PANs.
                </p>
              </div>
              <div className="bg-rurban-green-50/50 p-6 md:p-8 border-t border-rurban-green-100 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-rurban-green-600 font-bold text-sm mb-2">
                    <ShieldCheck className="w-4.5 h-4.5" />
                    <span>GramAwas Solution</span>
                  </div>
                  <h4 className="font-bold text-rurban-blue-900 text-sm mb-1.5">Digital HRA Receipt Generator</h4>
                  <p className="text-xs text-rurban-gray-650 leading-relaxed">
                    Instantly download verified digital receipts with auto-calculated tax summaries after each monthly UPI tracking checkout.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-rurban-gray-200/80 shadow-md overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-lg">
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-red-50 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-red-500" />
                  </div>
                  <h3 className="font-bold text-rurban-blue-900 text-base">Hidden Brokerage & Fees</h3>
                </div>
                <p className="text-xs md:text-sm text-rurban-gray-500 leading-relaxed mb-6">
                  Middlemen eat up to 2 months of rent in commission just to find a simple room near secondary schools or primary healthcare clinics.
                </p>
              </div>
              <div className="bg-rurban-green-50/50 p-6 md:p-8 border-t border-rurban-green-100 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-rurban-green-600 font-bold text-sm mb-2">
                    <ShieldCheck className="w-4.5 h-4.5" />
                    <span>GramAwas Solution</span>
                  </div>
                  <h4 className="font-bold text-rurban-blue-900 text-sm mb-1.5">100% Free Peer-to-Peer UPI</h4>
                  <p className="text-xs text-rurban-gray-650 leading-relaxed">
                    Browse and book rooms peer-to-peer directly. Rent tracking is fully free to bypass platform leakage and middlemen.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Market Opportunity Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="bg-gradient-to-br from-rurban-blue-950 to-rurban-blue-900 text-white rounded-3xl p-8 md:p-12 overflow-hidden relative shadow-2xl">
          
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />

          <div className="relative z-10 flex flex-col lg:flex-row gap-12 items-center justify-between">
            <div className="max-w-2xl">
              <span className="text-xs font-bold text-rurban-green-500 uppercase tracking-widest">
                The massive rurban canvas
              </span>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight mt-3 mb-6">
                ₹2,80,000 Crore <br className="hidden sm:inline" />
                Informal Market Opportunity
              </h2>
              <p className="text-sm md:text-base text-rurban-gray-300 leading-relaxed mb-8 font-normal">
                Over <span className="text-white font-bold">6 Lakh villages</span> and Tier-3 town clusters house millions of newly placed teachers, administrative officers, healthcare nurses, and local college students every year. By digitizing their rental transaction ledger and agreements, GramAwas unlocks a massive new financial sector.
              </p>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-2xl md:text-3xl font-extrabold text-rurban-green-500">6,50,000+</h4>
                  <p className="text-xs text-rurban-gray-400 mt-1">Village clusters waiting for formalization</p>
                </div>
                <div>
                  <h4 className="text-2xl md:text-3xl font-extrabold text-rurban-green-500">4.5 Crore</h4>
                  <p className="text-xs text-rurban-gray-400 mt-1">Migrant workforces & rural students</p>
                </div>
              </div>
            </div>

            {/* Simulated graph / metric card */}
            <div className="w-full lg:w-96 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
              <h3 className="font-bold text-sm mb-4 flex items-center justify-between">
                <span>Rurban Rental Growth Index</span>
                <span className="text-xs text-rurban-green-500 font-bold bg-rurban-green-500/10 px-2 py-0.5 rounded-full">+14.2% MoM</span>
              </h3>

              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex justify-between text-xs mb-1 font-semibold">
                    <span className="text-rurban-gray-300">Govt Employee Placements</span>
                    <span className="font-semibold text-rurban-green-500">72% in Tier-3</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-rurban-green-500 rounded-full" style={{ width: '72%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-semibold">
                    <span className="text-rurban-gray-300">Digital Agreement Adoption</span>
                    <span className="font-semibold text-rurban-green-500">85% Conversion</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-rurban-green-500 rounded-full" style={{ width: '85%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-semibold">
                    <span className="text-rurban-gray-300">UPI Rent Tracking Loyalty</span>
                    <span className="font-semibold text-rurban-green-500">96% Retention</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-rurban-green-500 rounded-full" style={{ width: '96%' }} />
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[10px] text-rurban-gray-400">
                <span>Source: RBI Rurban Reports & NABARD</span>
                <span className="text-rurban-green-500 font-bold underline cursor-pointer">Read whitepaper</span>
              </div>

            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
