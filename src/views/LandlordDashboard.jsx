import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Plus, ToggleLeft, ToggleRight, FileText, Check, AlertCircle, Phone, Award, Printer, QrCode, ClipboardCheck, MessageSquare, ShieldCheck, Sparkles, Send, Clock } from 'lucide-react';

export default function LandlordDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  
  // Dynamic states linked to DB
  const [properties, setProperties] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [contracts, setContracts] = useState([]);
  
  const [newProperty, setNewProperty] = useState({
    title: '',
    price: '',
    deposit: '',
    landmark: '',
    town: 'Sarangpur Town',
    autoEsc: true
  });
  
  // Smart Contract state
  const [contractForm, setContractForm] = useState({
    tenantId: '',
    rentAmount: '',
    depositAmount: '',
    escalation: '10'
  });
  const [generatedContract, setGeneratedContract] = useState(null);

  // QR Flyer state
  const [flyerForm, setFlyerForm] = useState({
    price: '',
    landmark: '',
    contact: ''
  });
  const [generatedFlyer, setGeneratedFlyer] = useState(null);
  
  // Notification states
  const [whatsappReminder, setWhatsappReminder] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Reload data from DB
  const loadDashboardData = () => {
    const session = db.getCurrentSession();
    setCurrentUser(session);

    if (session) {
      // Load landlord's properties
      const allProps = db.getProperties();
      const landlordProps = allProps.filter(
        p => p.landlordId === session.id || p.landlordName === session.username
      );
      setProperties(landlordProps);

      // Load landlord's active ledgers
      const allLedgers = db.getLedger();
      const landlordLedgers = allLedgers.filter(
        l => l.landlordId === session.id || l.landlordName === session.username
      );
      setLedger(landlordLedgers);

      // Load signed agreements
      const allContracts = db.getContracts();
      const landlordContracts = allContracts.filter(
        c => c.landlordId === session.id || c.landlordName === session.username
      );
      setContracts(landlordContracts);

      // Pre-fill flyer contact
      setFlyerForm(f => ({
        ...f,
        contact: session.phone || ''
      }));
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleAddProperty = (e) => {
    e.preventDefault();
    if (!newProperty.title || !newProperty.price || !currentUser) return;
    
    // Save listing into DB (Pending approval initially)
    db.addProperty({
      title: newProperty.title,
      price: parseFloat(newProperty.price),
      deposit: parseFloat(newProperty.deposit || (newProperty.price * 2)),
      landmark: newProperty.landmark || 'Near Rurban Hub',
      town: newProperty.town,
      autoEsc: newProperty.autoEsc,
      landlordId: currentUser.id,
      landlordName: currentUser.username,
      landlordUPI: currentUser.upi || 'rameshpatel@okhdfc',
      phone: currentUser.phone
    });

    setSuccessMsg(`Successfully listed "${newProperty.title}"! This listing is currently Pending Web Owner (Admin) Verification. Once approved, it will go live for all tenants!`);
    
    // Reset form
    setNewProperty({
      title: '',
      price: '',
      deposit: '',
      landmark: '',
      town: 'Sarangpur Town',
      autoEsc: true
    });
    
    loadDashboardData();
    setTimeout(() => setSuccessMsg(''), 6000);
  };

  const toggleStatus = (id) => {
    db.toggleLedgerStatus(id);
    loadDashboardData();
  };

  const handleSmartContractSubmit = (e) => {
    e.preventDefault();
    if (!currentUser) return;

    // Find the tenant details
    const allUsers = db.getUsers();
    const tenantUser = allUsers.find(u => u.id === parseInt(contractForm.tenantId)) || { username: 'Dr. Alok Verma' };

    const escVal = parseFloat(contractForm.escalation);
    const rentVal = parseFloat(contractForm.rentAmount);
    const escalatedRent = Math.round(rentVal + (rentVal * (escVal / 100)));

    const newContract = db.addContract({
      tenantId: tenantUser.id || 99,
      tenantName: tenantUser.username,
      landlordId: currentUser.id,
      landlordName: currentUser.username,
      rentAmount: rentVal,
      depositAmount: contractForm.depositAmount || (rentVal * 2),
      escalation: escVal,
      escalatedRent: escalatedRent
    });

    setGeneratedContract(newContract);
    loadDashboardData();
  };

  const handleFlyerSubmit = (e) => {
    e.preventDefault();
    setGeneratedFlyer({
      price: flyerForm.price,
      landmark: flyerForm.landmark,
      contact: flyerForm.contact,
      qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://gramawas.com/book?price=${flyerForm.price}%26landmark=${encodeURIComponent(flyerForm.landmark)}`
    });
  };

  const triggerWhatsAppReminder = (item) => {
    const textMsg = `*GramAwas Rent Reminder* \nHello ${item.tenantName},\nThis is a friendly reminder that your rent for "${item.roomNo}" is pending.\n*Due Amount:* ₹${item.amount}\n*Due Date:* ${item.dueDate}\n\nYou can track and verify this payment securely for FREE on GramAwas using UPI: ${currentUser?.upi || 'rameshpatel@okhdfc'}.\nThank you!`;
    setWhatsappReminder({
      tenantName: item.tenantName,
      phone: item.phone,
      messageText: textMsg
    });
  };

  // Unique list of tenants renting this landlord's rooms for contract generation
  const activeTenants = Array.from(new Map(ledger.map(item => [item.tenantId, item])).values());

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      
      {/* Dynamic Success Alert Banner */}
      {successMsg && (
        <div className="mb-6 p-4 bg-rurban-green-50 border border-rurban-green-200 text-rurban-blue-900 font-bold rounded-2xl text-sm flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
          <ShieldCheck className="w-5 h-5 text-rurban-green-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Verification status warning */}
      {currentUser && !currentUser.verified && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-rurban-blue-900 font-bold rounded-2xl text-sm flex items-center gap-3 animate-pulse">
          <AlertCircle className="w-5.5 h-5.5 text-amber-500 shrink-0" />
          <span>⚠️ <strong>Awaiting Trust Verification:</strong> Your landlord account is currently waiting for admin verification. Newly listed properties will appear once your profile status is set to verified.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Ledger & Flyer Tool */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          {/* Active Ledger Section */}
          <div className="bg-white border border-rurban-gray-200/80 rounded-3xl p-6 shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-rurban-blue-900">Active Tenant Ledger</h2>
                <p className="text-xs text-rurban-gray-500">Click Status to toggle Payment, track HRA, and send reminders</p>
              </div>
              <span className="text-xs font-bold bg-rurban-green-50 text-rurban-green-600 border border-rurban-green-100 px-3 py-1.5 rounded-full self-start sm:self-center">
                ₹{ledger.filter(l => l.status === 'Paid').reduce((sum, current) => sum + current.amount, 0)} Collected This Month
              </span>
            </div>

            {ledger.length === 0 ? (
              <div className="p-10 border-2 border-dashed border-rurban-gray-200 rounded-2xl text-center bg-rurban-gray-50/50">
                <Clock className="w-10 h-10 text-rurban-gray-300 mx-auto mb-3" />
                <p className="text-xs font-bold text-rurban-blue-900">No Active Tenant Ledger</p>
                <p className="text-[11px] text-rurban-gray-400 mt-0.5">Your ledger will populate as soon as tenants rent your approved properties.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-rurban-gray-50 border-b border-rurban-gray-200 text-rurban-blue-900 font-bold uppercase tracking-wider">
                      <th className="p-3.5">Tenant Details</th>
                      <th className="p-3.5">Room</th>
                      <th className="p-3.5">Rent Amount</th>
                      <th className="p-3.5">Due Date</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rurban-gray-100 text-rurban-gray-700">
                    {ledger.map((item) => (
                      <tr key={item.id} className="hover:bg-rurban-gray-50/50 transition-colors">
                        <td className="p-3.5">
                          <span className="font-bold text-rurban-blue-900 block">{item.tenantName}</span>
                          <span className="text-[10px] text-rurban-gray-400 mt-0.5 font-mono">Ph: {item.phone}</span>
                        </td>
                        <td className="p-3.5 font-semibold text-rurban-blue-900">{item.roomNo}</td>
                        <td className="p-3.5 font-bold text-rurban-green-600">₹{item.amount}</td>
                        <td className="p-3.5 font-medium">{item.dueDate}</td>
                        <td className="p-3.5">
                          <button
                            onClick={() => toggleStatus(item.id)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                              item.status === 'Paid'
                                ? 'bg-rurban-green-50 text-rurban-green-600 border-rurban-green-100'
                                : 'bg-red-50 text-red-500 border-red-100'
                            }`}
                            title="Click to toggle transaction status manually"
                          >
                            {item.status}
                          </button>
                        </td>
                        <td className="p-3.5 text-right">
                          {item.status === 'Pending' ? (
                            <button
                              onClick={() => triggerWhatsAppReminder(item)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-rurban-blue-900 hover:bg-rurban-blue-800 text-white rounded-lg text-[11px] font-bold shadow-sm transition-all"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              Remind
                            </button>
                          ) : (
                            <span className="text-[10px] text-rurban-green-600 font-bold flex items-center gap-1 justify-end">
                              <Check className="w-3.5 h-3.5" /> Bookkeeping Clear
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Gate Flyer Tool Component */}
          <div className="bg-white border border-rurban-gray-200/80 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-rurban-green-50 text-rurban-green-600 border border-rurban-green-100 rounded-xl">
                <QrCode className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-base text-rurban-blue-900">QR Gate Flyer Generator</h3>
                <p className="text-xs text-rurban-gray-500">Generate a printable physical gate flyer so walk-ins can verify and book directly</p>
              </div>
            </div>

            <form onSubmit={handleFlyerSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-rurban-gray-500 mb-1">Rent Amount (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 3200"
                  value={flyerForm.price}
                  onChange={(e) => setFlyerForm({ ...flyerForm, price: e.target.value })}
                  className="w-full p-2.5 bg-rurban-gray-50 border border-rurban-gray-200 rounded-xl text-xs focus:outline-none focus:border-rurban-green-500 text-rurban-blue-900 font-semibold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-rurban-gray-500 mb-1">Local Landmark</label>
                <input
                  type="text"
                  placeholder="e.g. Near Panchayat Bhavan"
                  value={flyerForm.landmark}
                  onChange={(e) => setFlyerForm({ ...flyerForm, landmark: e.target.value })}
                  className="w-full p-2.5 bg-rurban-gray-50 border border-rurban-gray-200 rounded-xl text-xs focus:outline-none focus:border-rurban-green-500 text-rurban-blue-900 font-semibold"
                  required
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-rurban-blue-900 hover:bg-rurban-blue-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Flyer
                </button>
              </div>
            </form>

            {/* Flyer Mockup Preview */}
            {generatedFlyer && (
              <div className="p-6 bg-gradient-to-b from-rurban-blue-950 to-rurban-blue-900 text-white rounded-3xl border border-rurban-gray-100 shadow-lg text-center max-w-sm mx-auto animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[10px] uppercase tracking-widest text-rurban-green-500 font-bold border border-rurban-green-500/20 bg-rurban-green-500/10 px-2.5 py-0.5 rounded-full">
                    GRAMAWAS VERIFIED HOME
                  </span>
                  <Award className="w-4.5 h-4.5 text-rurban-green-500" />
                </div>

                <h3 className="font-extrabold text-xl mb-1 text-white">HOME FOR RENT</h3>
                <p className="text-xs text-rurban-gray-300 mb-6">{generatedFlyer.landmark}</p>

                {/* QR Display */}
                <div className="bg-white p-4 inline-block rounded-2xl mb-6 shadow-md">
                  <div className="w-36 h-36 bg-rurban-gray-50 flex items-center justify-center border-2 border-dashed border-rurban-green-500/30 rounded-xl relative">
                    <QrCode className="w-24 h-24 text-rurban-blue-950" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="p-1 bg-white rounded-md border border-rurban-green-500">
                        <span className="text-[8px] font-bold text-rurban-green-600 uppercase tracking-tight">GA</span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-rurban-green-500 font-bold uppercase tracking-wider mb-2">
                  Scan to Verify & Book this Home
                </p>
                <p className="text-xs text-rurban-gray-300 leading-normal mb-6">
                  Check legal contract, see auto-escalation rates, and complete booking directly on your phone.
                </p>

                <div className="flex justify-between items-center text-xs font-bold p-3 bg-white/5 border border-white/10 rounded-xl">
                  <div>
                    <span className="block text-[9px] text-rurban-gray-400 text-left">Rent Amount</span>
                    <span className="text-base text-rurban-green-500 font-extrabold">₹{generatedFlyer.price}/mo</span>
                  </div>
                  <button 
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rurban-green-500 hover:bg-rurban-green-600 text-white rounded-lg text-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Flyer
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Right Side: Add Property & Smart Contract Generator */}
        <div className="flex flex-col gap-8">
          
          {/* Add Room Listing Form */}
          <div className="bg-white border border-rurban-gray-200/80 rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold text-sm text-rurban-blue-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-rurban-green-500" />
              List New Rurban Room
            </h3>

            <form onSubmit={handleAddProperty} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-rurban-gray-500 mb-1">Room Listing Title</label>
                <input
                  type="text"
                  placeholder="e.g. Master Room near CHC Clinic"
                  value={newProperty.title}
                  onChange={(e) => setNewProperty({ ...newProperty, title: e.target.value })}
                  className="w-full p-2.5 bg-rurban-gray-50 border border-rurban-gray-200 rounded-xl text-xs focus:outline-none focus:border-rurban-green-500 text-rurban-blue-900 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-rurban-gray-500 mb-1">Rent Amount (₹/mo)</label>
                  <input
                    type="number"
                    placeholder="3500"
                    value={newProperty.price}
                    onChange={(e) => setNewProperty({ ...newProperty, price: e.target.value })}
                    className="w-full p-2.5 bg-rurban-gray-50 border border-rurban-gray-200 rounded-xl text-xs focus:outline-none focus:border-rurban-green-500 text-rurban-blue-900 font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-rurban-gray-500 mb-1">Deposit (₹)</label>
                  <input
                    type="number"
                    placeholder="7000"
                    value={newProperty.deposit}
                    onChange={(e) => setNewProperty({ ...newProperty, deposit: e.target.value })}
                    className="w-full p-2.5 bg-rurban-gray-50 border border-rurban-gray-200 rounded-xl text-xs focus:outline-none focus:border-rurban-green-500 text-rurban-blue-900 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-rurban-gray-500 mb-1">Distance Landmark</label>
                <input
                  type="text"
                  placeholder="e.g. 50m from High School Gate"
                  value={newProperty.landmark}
                  onChange={(e) => setNewProperty({ ...newProperty, landmark: e.target.value })}
                  className="w-full p-2.5 bg-rurban-gray-50 border border-rurban-gray-200 rounded-xl text-xs focus:outline-none focus:border-rurban-green-500 text-rurban-blue-900 font-semibold"
                />
              </div>

              {/* Auto Escalation Toggle */}
              <div className="p-3 bg-rurban-gray-50 border border-rurban-gray-200/60 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-rurban-blue-900">Auto-Escalation Toggle</h4>
                  <p className="text-[10px] text-rurban-gray-400 mt-0.5">Automates standard 11-month contract growth (10% standard)</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNewProperty({ ...newProperty, autoEsc: !newProperty.autoEsc })}
                  className="text-rurban-green-500 hover:text-rurban-green-600 transition-colors"
                >
                  {newProperty.autoEsc ? (
                    <ToggleRight className="w-9 h-9" />
                  ) : (
                    <ToggleLeft className="w-9 h-9 text-rurban-gray-300" />
                  )}
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-rurban-green-500 hover:bg-rurban-green-600 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                Create Direct UPI Listing
              </button>
            </form>
          </div>

          {/* Smart 11-Month Contract Generator */}
          <div className="bg-white border border-rurban-gray-200/80 rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold text-sm text-rurban-blue-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-rurban-green-500" />
              11-Month Smart Contract
            </h3>

            <form onSubmit={handleSmartContractSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-rurban-gray-500 mb-1">Select Active Tenant</label>
                <select
                  value={contractForm.tenantId}
                  onChange={(e) => {
                    const tid = e.target.value;
                    const match = activeTenants.find(t => t.tenantId === parseInt(tid));
                    setContractForm({
                      ...contractForm,
                      tenantId: tid,
                      rentAmount: match ? match.amount : ''
                    });
                  }}
                  className="w-full p-2.5 bg-rurban-gray-50 border border-rurban-gray-200 rounded-xl text-xs focus:outline-none focus:border-rurban-green-500 text-rurban-blue-900 font-semibold"
                  required
                >
                  <option value="">Choose tenant...</option>
                  {activeTenants.map(t => (
                    <option key={t.tenantId} value={t.tenantId}>{t.tenantName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-rurban-gray-500 mb-1">Rent Amount (₹)</label>
                  <input
                    type="number"
                    value={contractForm.rentAmount}
                    onChange={(e) => setContractForm({ ...contractForm, rentAmount: e.target.value })}
                    className="w-full p-2.5 bg-rurban-gray-50 border border-rurban-gray-200 rounded-xl text-xs focus:outline-none focus:border-rurban-green-500 text-rurban-blue-900 font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-rurban-gray-500 mb-1">Escalation (% Year)</label>
                  <input
                    type="number"
                    value={contractForm.escalation}
                    onChange={(e) => setContractForm({ ...contractForm, escalation: e.target.value })}
                    className="w-full p-2.5 bg-rurban-gray-50 border border-rurban-gray-200 rounded-xl text-xs focus:outline-none focus:border-rurban-green-500 text-rurban-blue-900 font-semibold"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-rurban-blue-900 hover:bg-rurban-blue-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
              >
                Generate Digital Agreement
              </button>
            </form>

            {/* Smart Contract Preview Modal/Box */}
            {generatedContract && (
              <div className="mt-6 p-4 bg-[#fcfbf9] border-2 border-dashed border-[#c1b59a] rounded-2xl relative animate-in zoom-in-95 duration-200">
                <span className="text-[7px] text-[#8b7a5c] tracking-widest font-black uppercase text-center block mb-3 border-b border-[#e2dac4] pb-1.5">
                  GOVERNMENT OF INDIA STAMP DUTY MOCKUP
                </span>

                {/* Simulated Stamp Duty band */}
                <div className="bg-[#5c4a30]/10 border border-[#5c4a30]/30 rounded-md p-2.5 text-[#5c4a30] text-[9px] font-bold text-center mb-4 flex flex-col gap-0.5">
                  <span className="text-[10px] tracking-wider font-extrabold uppercase">ONE HUNDRED RUPEES</span>
                  <span>NON-JUDICIAL STAMP PAPER</span>
                  <span className="font-mono text-[8px] text-rurban-gray-500 mt-1">NO: {generatedContract.agreementNo}</span>
                </div>

                <div className="text-[9px] text-[#5c4d37] space-y-2.5 font-normal leading-relaxed text-justify">
                  <p>
                    This rent agreement is made on <span className="font-bold">{generatedContract.date}</span> between the landlord, <span className="font-bold">{generatedContract.landlordName}</span> and the tenant, <span className="font-bold">{generatedContract.tenantName}</span>.
                  </p>
                  <p>
                    The tenant agrees to pay monthly rent of <span className="font-extrabold text-rurban-blue-900">₹{generatedContract.rentAmount}</span> for the primary term of 11 months. A refundable security deposit of <span className="font-bold">₹{generatedContract.depositAmount}</span> has been verified via direct secure UPI.
                  </p>

                  {/* Auto calculated escalations */}
                  <div className="p-2.5 bg-rurban-green-50/50 border border-rurban-green-100 rounded-xl">
                    <span className="font-bold text-rurban-blue-900 block mb-1">📈 11-Month Rent Progression Scheduler:</span>
                    <ul className="list-disc pl-3 text-rurban-gray-600 space-y-0.5 font-medium">
                      <li>Months 1 - 11: <span className="font-bold text-rurban-blue-900">₹{generatedContract.rentAmount}/mo</span></li>
                      <li>Month 12 (Renewal): Rent automatically escalates by {generatedContract.escalation}% to <span className="font-bold text-rurban-green-600">₹{generatedContract.escalatedRent}/mo</span>.</li>
                    </ul>
                  </div>
                  
                  <p className="text-center font-bold text-rurban-green-600 border-t border-[#f2edd8] pt-2 flex items-center justify-center gap-1">
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    Agreement Verified & Signed
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* WhatsApp Message simulated popup */}
      {whatsappReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rurban-blue-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-white border border-rurban-gray-200 rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <h3 className="font-bold text-base text-rurban-blue-900 mb-1 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-rurban-green-500" />
              Direct WhatsApp Reminder
            </h3>
            <p className="text-xs text-rurban-gray-400 mb-4">Simulate reminder notification for {whatsappReminder.tenantName}</p>

            <div className="p-4 bg-rurban-gray-50 border border-rurban-gray-200 rounded-2xl text-xs mb-6 flex flex-col gap-2">
              <div className="flex justify-between border-b border-rurban-gray-200/60 pb-1.5 font-bold">
                <span className="text-rurban-gray-400">Receiver:</span>
                <span className="text-rurban-blue-900">{whatsappReminder.tenantName} ({whatsappReminder.phone})</span>
              </div>
              <div className="whitespace-pre-line text-rurban-gray-600 bg-white border border-rurban-gray-100 p-3 rounded-xl max-h-48 overflow-y-auto leading-relaxed italic">
                {whatsappReminder.messageText}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(whatsappReminder.messageText);
                  alert('Reminder message copied to clipboard! In a live environment, this opens a direct WhatsApp chat window.');
                  setWhatsappReminder(null);
                }}
                className="flex-1 py-2.5 bg-rurban-green-500 hover:bg-rurban-green-600 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                Copy & Send Message
              </button>
              <button
                onClick={() => setWhatsappReminder(null)}
                className="px-5 py-2.5 bg-white hover:bg-rurban-gray-50 border border-rurban-gray-200 text-rurban-blue-900 text-xs font-bold rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
