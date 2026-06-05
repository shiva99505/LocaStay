import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Search, MapPin, Building, ShieldCheck, Download, Award, Landmark, Wallet, AlertCircle, FileText, Check, Phone, ArrowUpRight, HelpCircle, CheckCircle, CreditCard } from 'lucide-react';

export default function TenantPortal({ voiceSearchFilter }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [properties, setProperties] = useState([]);
  const [ledger, setLedger] = useState([]);
  
  const [filterQuery, setFilterQuery] = useState(voiceSearchFilter || '');
  const [selectedProperty, setSelectedProperty] = useState(null);
  
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  
  // Payment Simulation Modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [simulatedTxId, setSimulatedTxId] = useState('');

  // Fetch current session and DB records
  const loadPortalData = () => {
    const session = db.getCurrentSession();
    setCurrentUser(session);
    setProperties(db.getProperties().filter(p => p.status === 'Approved'));
    
    if (session) {
      // Find invoices assigned to this tenant by id or phone
      const allLedgers = db.getLedger();
      const tenantInvoices = allLedgers.filter(
        l => l.tenantId === session.id || l.phone === session.phone || l.tenantName.includes(session.username)
      );
      setLedger(tenantInvoices);
    }
  };

  useEffect(() => {
    loadPortalData();
  }, [voiceSearchFilter]);

  // Search filter
  const filteredProperties = properties.filter(prop => {
    const searchVal = filterQuery.toLowerCase();
    return (
      prop.title.toLowerCase().includes(searchVal) ||
      prop.location.toLowerCase().includes(searchVal) ||
      prop.town.toLowerCase().includes(searchVal) ||
      prop.landmark.toLowerCase().includes(searchVal)
    );
  });

  const triggerHRAReceipt = (invoice) => {
    // Find landlord pan
    const allUsers = db.getUsers();
    const landlordUser = allUsers.find(u => u.username === invoice.landlordName || u.id === invoice.landlordId);
    const landlordPAN = landlordUser?.pan || 'BPNPP1289K';

    setReceiptData({
      receiptNo: `GA-2026-${1000 + invoice.id}`,
      month: invoice.month || invoice.dueDate.split('-').slice(1).join(' '),
      amount: invoice.amount,
      tenantName: `${currentUser?.username} (${currentUser?.occupation || 'Migrant Worker'})`,
      landlordName: invoice.landlordName || 'Ramesh Patel',
      landlordPAN: landlordPAN,
      rentAddress: invoice.roomNo.includes('(') 
        ? invoice.roomNo.split('(')[1].replace(')', '') 
        : `${invoice.roomNo}, GramAwas Rurban Post`,
      date: invoice.date,
      txId: invoice.txId
    });
    setShowReceiptModal(true);
  };

  const handleOpenPaySimulate = (invoice) => {
    setPaymentInvoice(invoice);
    setPaymentSuccess(false);
    setSimulatedTxId('UPI' + Math.floor(100000000000 + Math.random() * 900000000000));
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = () => {
    if (!paymentInvoice) return;
    
    db.payLedgerInvoice(paymentInvoice.id, simulatedTxId);
    setPaymentSuccess(true);
    
    // Refresh ledger list
    setTimeout(() => {
      setShowPaymentModal(false);
      loadPortalData();
    }, 1500);
  };

  const handleBookRoomSimulate = (prop) => {
    if (!currentUser) {
      alert('Please sign in or register to book a room.');
      return;
    }

    // Check if tenant already has an active invoice for this room to prevent duplicates
    const currentInvoices = db.getLedger();
    const isBooked = currentInvoices.some(
      l => (l.tenantId === currentUser.id && l.roomNo.includes(prop.title))
    );

    if (isBooked) {
      alert(`You have already booked and established a rent tracker for "${prop.title}". Check your Rent Tracker ledger.`);
      return;
    }

    // Add first Rent Invoice
    db.addLedgerInvoice({
      tenantId: currentUser.id,
      tenantName: `${currentUser.username} (${currentUser.occupation || 'Tenant'})`,
      landlordId: prop.landlordId || 2,
      landlordName: prop.landlordName,
      roomNo: `Room: ${prop.title}`,
      amount: prop.price,
      dueDate: `05-${new Date().toLocaleString('en-GB', { month: 'short', year: 'numeric' }).replace(/ /g, '-')}`,
      month: new Date().toLocaleString('en-GB', { month: 'long', year: 'numeric' }),
      phone: currentUser.phone
    });

    alert(`🎉 Congratulations! Room "${prop.title}" booked successfully. We generated your direct UPI rent tracking schedule in your dashboard ledger.`);
    loadPortalData();
    setSelectedProperty(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      
      {/* Search and Filters */}
      <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-rurban-gray-200 shadow-sm">
        <div className="w-full md:w-96 flex items-center gap-2.5 px-3 py-2 bg-rurban-gray-50 border border-rurban-gray-200 rounded-xl">
          <Search className="w-4 h-4 text-rurban-gray-400" />
          <input
            type="text"
            placeholder="Filter by school, Panchayat, clinic, landmark..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full bg-transparent border-none text-sm focus:outline-none placeholder-rurban-gray-400 text-rurban-blue-900"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-rurban-gray-500">
          <span className="font-semibold text-rurban-blue-900">Active Filter:</span>
          <span className="px-2.5 py-1 bg-rurban-green-50 border border-rurban-green-100 rounded-md text-rurban-green-600 font-bold">
            {filterQuery ? `"${filterQuery}"` : 'All Rurban Listings'}
          </span>
          {filterQuery && (
            <button 
              onClick={() => setFilterQuery('')} 
              className="text-red-500 hover:underline font-bold ml-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Hyper-Local Property Grid */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-rurban-blue-900 flex items-center gap-2">
              <Building className="w-5 h-5 text-rurban-green-500" />
              Available Village Rooms ({filteredProperties.length})
            </h2>
            <span className="text-xs text-rurban-gray-400">Direct bookings, zero brokerage</span>
          </div>

          {filteredProperties.length === 0 ? (
            <div className="bg-white border border-rurban-gray-200 rounded-2xl p-12 text-center">
              <AlertCircle className="w-12 h-12 text-rurban-gray-300 mx-auto mb-4" />
              <p className="text-rurban-gray-500 font-medium mb-2">No approved rooms match your specific criteria.</p>
              <button 
                onClick={() => setFilterQuery('')}
                className="text-xs font-bold text-rurban-green-600 hover:underline"
              >
                Show all available properties
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredProperties.map((prop) => (
                <div 
                  key={prop.id} 
                  className={`bg-white rounded-3xl border transition-all glow-card overflow-hidden ${
                    selectedProperty?.id === prop.id 
                      ? 'border-rurban-green-500 shadow-md ring-1 ring-rurban-green-500/20' 
                      : 'border-rurban-gray-200/80 shadow-sm'
                  }`}
                >
                  <div className="p-5">
                    {/* Header: Verified badges */}
                    <div className="flex items-center justify-between mb-3.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-rurban-blue-50 text-rurban-blue-900 border border-rurban-blue-100 px-2.5 py-0.5 rounded-full">
                        {prop.town}
                      </span>
                      {prop.verified ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-rurban-green-600 bg-rurban-green-50 border border-rurban-green-100 px-2 py-0.5 rounded-full">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          UPI-Verified Landlord
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-rurban-gray-400 bg-rurban-gray-50 border border-rurban-gray-200 px-2 py-0.5 rounded-full">
                          Awaiting Direct Verification
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-rurban-blue-900 text-sm mb-2">{prop.title}</h3>
                    
                    <div className="flex items-center gap-1.5 text-xs text-rurban-gray-500 mb-4">
                      <MapPin className="w-4 h-4 text-rurban-gray-400 shrink-0" />
                      <span>{prop.location}</span>
                    </div>

                    {/* Landmarks Info */}
                    <div className="p-3 bg-rurban-gray-50 border border-rurban-gray-100 rounded-xl mb-4 text-xs flex items-center justify-between">
                      <span className="text-rurban-gray-500 font-medium">🏫 Landmark:</span>
                      <span className="font-bold text-rurban-blue-900">{prop.landmark}</span>
                    </div>

                    {/* Price and Details */}
                    <div className="flex items-end justify-between pt-2 border-t border-rurban-gray-100">
                      <div>
                        <span className="text-xs text-rurban-gray-400 block font-normal">Monthly Rent</span>
                        <span className="text-xl font-extrabold text-rurban-green-600">₹{prop.price}</span>
                        <span className="text-[10px] text-rurban-gray-400">/mo</span>
                      </div>
                      <button
                        onClick={() => setSelectedProperty(prop)}
                        className="px-4 py-2 bg-rurban-blue-900 hover:bg-rurban-blue-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                      >
                        Details & Contact
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Expanded property details preview */}
          {selectedProperty && (
            <div className="bg-white border border-rurban-green-200 rounded-3xl p-6 shadow-md animate-in slide-in-from-bottom-5 duration-300">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-extrabold text-base text-rurban-blue-900">{selectedProperty.title}</h3>
                  <p className="text-xs text-rurban-gray-500 mt-1">{selectedProperty.location}</p>
                </div>
                <button 
                  onClick={() => setSelectedProperty(null)}
                  className="text-xs font-bold text-red-500 hover:underline"
                >
                  Close Detail
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-rurban-green-50/40 border border-rurban-green-100 rounded-2xl mb-6 text-xs">
                <div>
                  <span className="text-rurban-gray-400 block mb-0.5">Security Deposit</span>
                  <span className="font-bold text-rurban-blue-900 font-semibold">₹{selectedProperty.deposit || (selectedProperty.price * 2)}</span>
                </div>
                <div>
                  <span className="text-rurban-gray-400 block mb-0.5">Contact Landlord</span>
                  <span className="font-bold text-rurban-blue-900">{selectedProperty.landlordName}</span>
                </div>
                <div>
                  <span className="text-rurban-gray-400 block mb-0.5">Direct UPI ID</span>
                  <span className="font-semibold text-rurban-green-600 select-all">{selectedProperty.landlordUPI}</span>
                </div>
                <div>
                  <span className="text-rurban-gray-400 block mb-0.5">Contract Term</span>
                  <span className="font-bold text-rurban-blue-900">
                    {selectedProperty.autoEsc ? '11-Mo (10% Esc)' : 'Standard Monthly'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={`https://wa.me/91${selectedProperty.phone || '9999999999'}?text=Hello%20${selectedProperty.landlordName},%20I%20am%20interested%20in%20your%20room%20"${selectedProperty.title}"%20listed%20on%20GramAwas.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-5 py-3 bg-rurban-green-500 hover:bg-rurban-green-600 text-white text-xs font-bold rounded-xl text-center shadow-md flex items-center justify-center gap-2 transition-all"
                >
                  <Phone className="w-4 h-4 shrink-0" />
                  <span>Call Landlord (Free Direct Booking)</span>
                </a>
                <button
                  onClick={() => handleBookRoomSimulate(selectedProperty)}
                  className="px-5 py-3 bg-rurban-blue-900 hover:bg-rurban-blue-800 text-white text-xs font-bold rounded-xl text-center transition-all shadow-md active:scale-95"
                >
                  Lock Booking & Start Ledger
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Right Col: Rent Tracker & Credit Score Widget */}
        <div className="flex flex-col gap-8">
          
          {/* Rent Tracker Component */}
          <div className="bg-white border border-rurban-gray-200/80 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5 border-b border-rurban-gray-100 pb-3">
              <h3 className="font-bold text-sm text-rurban-blue-900 flex items-center gap-2">
                <Wallet className="w-4.5 h-4.5 text-rurban-green-500" />
                Rent Tracker Ledger
              </h3>
              <span className="text-[10px] font-bold text-rurban-green-600 bg-rurban-green-50 px-2 py-0.5 rounded-full">
                Active Tenant: {currentUser ? currentUser.username : 'Guest'}
              </span>
            </div>

            {!currentUser ? (
              <div className="p-6 text-center">
                <AlertCircle className="w-8 h-8 text-rurban-gray-300 mx-auto mb-3" />
                <p className="text-xs text-rurban-gray-500 font-medium leading-relaxed">
                  Please log in to track your monthly rent payments, verify UPI payouts, and download certified HRA tax receipts.
                </p>
              </div>
            ) : ledger.length === 0 ? (
              <div className="p-6 text-center">
                <Building className="w-8 h-8 text-rurban-gray-300 mx-auto mb-3" />
                <p className="text-xs text-rurban-gray-500 font-bold">No Active Rented Properties</p>
                <p className="text-[11px] text-rurban-gray-400 mt-1">Book an approved village room on the left to start building payment history.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {ledger.map((item) => {
                  const isPaid = item.status === 'Paid';
                  return (
                    <div key={item.id} className="p-4 bg-rurban-gray-50 border border-rurban-gray-100 rounded-2xl flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs text-rurban-blue-900 truncate">{item.month || item.dueDate}</h4>
                        <p className="text-[10px] text-rurban-gray-400 truncate mt-0.5">{item.roomNo}</p>
                        <p className="text-[10px] text-rurban-green-600 font-bold mt-1">₹{item.amount}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isPaid ? (
                          <>
                            <button
                              onClick={() => triggerHRAReceipt(item)}
                              className="p-2 bg-rurban-blue-50 text-rurban-blue-900 border border-rurban-blue-100 hover:bg-rurban-blue-100 rounded-xl transition-all"
                              title="Download Digital HRA Tax Receipt"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <span className="flex items-center gap-1 px-2.5 py-1 bg-rurban-green-50 border border-rurban-green-100 text-[10px] font-bold text-rurban-green-600 rounded-lg">
                              <Check className="w-3.5 h-3.5" /> Paid
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="px-2 py-1 bg-red-50 border border-red-100 text-[10px] font-bold text-red-500 rounded-lg">
                              Pending
                            </span>
                            <button
                              onClick={() => handleOpenPaySimulate(item)}
                              className="px-2.5 py-1 bg-rurban-blue-900 hover:bg-rurban-blue-800 text-[10px] font-bold text-white rounded-lg transition-all shadow-sm"
                            >
                              Pay UPI
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* HRA helper text */}
            <div className="mt-4 p-3 bg-rurban-blue-50 border border-rurban-blue-100 rounded-xl text-[10px] text-rurban-blue-900 leading-relaxed flex items-start gap-2">
              <FileText className="w-4 h-4 shrink-0 text-rurban-blue-900 mt-0.5" />
              <span>Government HRA tax claims require signed receipts. Download your generated HRA receipts instantly above.</span>
            </div>
          </div>

          {/* Credit Profile Widget */}
          <div className="bg-gradient-to-br from-rurban-blue-950 to-rurban-blue-900 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
            {/* Subtle background blur circle */}
            <div className="absolute -right-16 -top-16 w-32 h-32 rounded-full bg-rurban-green-500/10 blur-xl" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-rurban-green-500 bg-rurban-green-500/10 px-2 py-0.5 rounded-full">
                  Rurban Credit Score
                </span>
                <Award className="w-5 h-5 text-rurban-green-500" />
              </div>

              <div className="text-center py-4">
                <span className="text-xs text-rurban-gray-400 block font-normal">Your Rent Credit Score</span>
                <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">785</span>
                <span className="text-xs text-rurban-green-500 font-bold block mt-1">Excellent Status</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-white/10 rounded-full mb-6 overflow-hidden">
                <div className="h-full bg-rurban-green-500 rounded-full" style={{ width: '78.5%' }} />
              </div>

              {/* Bank Partnership info */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-xs">
                <h4 className="font-bold mb-1.5 flex items-center gap-1.5 text-white">
                  <Landmark className="w-4 h-4 text-rurban-green-500" />
                  SBI & Bank of Baroda Rurban Loans
                </h4>
                <p className="text-rurban-gray-300 leading-normal mb-3">
                  Paying rent via the GramAwas UPI tracker builds an official payment history, unlocking home-construction loans with discounted interest rates!
                </p>
                <div className="flex justify-between items-center text-[10px] font-bold text-rurban-green-500 border-t border-white/5 pt-2">
                  <span>Credit Verified</span>
                  <span className="flex items-center gap-0.5 underline cursor-pointer">
                    Apply for Loan
                    <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* UPI Payment Simulator Modal */}
      {showPaymentModal && paymentInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rurban-blue-950/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-white border border-rurban-gray-200 rounded-3xl shadow-2xl p-6 sm:p-8 relative animate-in zoom-in-95 duration-200 text-center">
            
            {/* Header */}
            <div className="w-16 h-16 bg-rurban-green-50 text-rurban-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rurban-green-100">
              <CreditCard className="w-8 h-8" />
            </div>

            {paymentSuccess ? (
              <div className="py-6 animate-in zoom-in duration-200">
                <CheckCircle className="w-12 h-12 text-rurban-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-black text-rurban-blue-900">Payment Successful!</h3>
                <p className="text-xs text-rurban-gray-400 mt-1 font-mono">Tx ID: {simulatedTxId}</p>
                <p className="text-xs text-rurban-green-600 font-semibold mt-4">Platform log saved. HRA receipt generated.</p>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-black text-rurban-blue-900">UPI Rent Gateway</h3>
                <p className="text-xs text-rurban-gray-400 mt-1">Direct Bank Payout without platform Commission fees.</p>

                <div className="my-6 p-4 bg-rurban-gray-50 border border-rurban-gray-200 rounded-2xl text-xs text-left space-y-2 font-medium">
                  <div className="flex justify-between border-b border-rurban-gray-200/50 pb-2">
                    <span className="text-rurban-gray-400">Rented Room:</span>
                    <span className="text-rurban-blue-900 font-bold">{paymentInvoice.roomNo}</span>
                  </div>
                  <div className="flex justify-between border-b border-rurban-gray-200/50 pb-2">
                    <span className="text-rurban-gray-400">Landlord UPI:</span>
                    <span className="text-rurban-green-600 font-bold">{paymentInvoice.landlordUPI || 'rameshpatel@okhdfc'}</span>
                  </div>
                  <div className="flex justify-between border-b border-rurban-gray-200/50 pb-2">
                    <span className="text-rurban-gray-400">Rent Month:</span>
                    <span className="text-rurban-blue-900 font-semibold">{paymentInvoice.month || paymentInvoice.dueDate}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-rurban-gray-400">Amount Due:</span>
                    <span className="text-base text-rurban-green-600 font-extrabold">₹{paymentInvoice.amount}</span>
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    onClick={handleConfirmPayment}
                    className="flex-1 py-3 bg-rurban-green-500 hover:bg-rurban-green-600 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95"
                  >
                    Authorize Payment (UPI PIN)
                  </button>
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="px-5 py-3 bg-white hover:bg-rurban-gray-50 border border-rurban-gray-200 text-rurban-blue-900 text-xs font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* HRA Digital Receipt Modal Preview */}
      {showReceiptModal && receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rurban-blue-950/85 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#fcfbf9] border-2 border-dashed border-[#c1b59a] p-6 sm:p-8 rounded-3xl shadow-2xl relative animate-in zoom-in-95 duration-200">
            
            {/* Close */}
            <button 
              onClick={() => setShowReceiptModal(false)}
              className="absolute top-4 right-4 text-rurban-gray-400 hover:text-rurban-gray-700 bg-rurban-gray-150 p-1.5 rounded-lg"
            >
              <HelpCircle className="w-4.5 h-4.5 rotate-45" />
            </button>

            {/* Stamp Paper header */}
            <div className="text-center border-b border-[#e2dac4] pb-4 mb-6">
              <span className="text-[10px] tracking-widest font-bold uppercase text-[#8b7a5c] block mb-1">
                Receipt for House Rent Allowance (HRA)
              </span>
              <h3 className="text-xl font-extrabold text-[#5c4a30] tracking-tight">RENT RECEIPT</h3>
              <p className="text-[10px] text-rurban-gray-400 mt-0.5">Generated via GramAwas.com — Verified UPI Transaction</p>
            </div>

            {/* Receipt Details block */}
            <div className="text-xs text-[#5c4d37] space-y-4 font-normal">
              
              <div className="flex justify-between border-b border-[#f2edd8] pb-1">
                <span className="font-semibold">Receipt Number:</span>
                <span className="font-bold text-rurban-blue-900">{receiptData.receiptNo}</span>
              </div>
              <div className="flex justify-between border-b border-[#f2edd8] pb-1">
                <span className="font-semibold">Date of Payment:</span>
                <span>{receiptData.date}</span>
              </div>
              <div className="flex justify-between border-b border-[#f2edd8] pb-1">
                <span className="font-semibold">Transaction ID:</span>
                <span className="font-bold select-all text-xs font-mono text-rurban-blue-900">{receiptData.txId}</span>
              </div>

              {/* Legal verbiage */}
              <p className="leading-relaxed bg-[#f6f2e4] p-3 rounded-xl border border-[#ebdcb9] italic text-justify text-[#473a25]">
                "Received with thanks a sum of <span className="font-extrabold text-rurban-blue-900">₹{receiptData.amount}</span> from <span className="font-bold">{receiptData.tenantName}</span> on account of rent for the house located at <span className="font-bold">{receiptData.rentAddress}</span> for the month of <span className="font-bold">{receiptData.month}</span>."
              </p>

              {/* Landlord information */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <span className="block text-[10px] uppercase text-rurban-gray-400 font-bold">Landlord Name</span>
                  <span className="font-bold text-sm block">{receiptData.landlordName}</span>
                  <span className="text-[10px] font-mono text-rurban-gray-400">PAN: {receiptData.landlordPAN}</span>
                </div>

                {/* Revenue Stamp Representation */}
                <div className="relative flex justify-end">
                  <div className="w-20 h-24 bg-[#efebdb] border border-[#d2c9ab] flex flex-col items-center justify-between p-1 rounded-sm shadow-sm relative">
                    <span className="text-[8px] font-bold text-red-700 uppercase tracking-tight">Revenue</span>
                    <div className="w-10 h-10 border border-dashed border-red-300 rounded-full flex items-center justify-center text-red-500 font-bold text-[10px] rotate-12">
                      1 Re
                    </div>
                    <span className="text-[7px] text-rurban-gray-400">Stamp</span>
                    
                    {/* Signed Mock overlay */}
                    <div className="absolute inset-0 flex items-center justify-center rotate-[-15deg] select-none">
                      <span className="font-serif font-bold text-blue-700 opacity-60 text-xs tracking-wider border-y border-blue-700/60 px-1 py-0.5">
                        SIGNED
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Print action CTA */}
            <div className="mt-8 pt-4 border-t border-[#e2dac4] flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-[#8b7a5c] hover:bg-[#726246] text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                Print / Save PDF
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="px-6 py-2.5 bg-white hover:bg-rurban-gray-100 border border-rurban-gray-200 text-rurban-blue-900 text-xs font-bold rounded-xl transition-all"
              >
                Close Preview
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
