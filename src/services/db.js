// Persistent Mock Backend service using localStorage for gramawas

const KEY_USERS = 'gramawas_users';
const KEY_PROPERTIES = 'gramawas_properties';
const KEY_LEDGER = 'gramawas_ledger';
const KEY_CONTRACTS = 'gramawas_contracts';
const KEY_LOGS = 'gramawas_logs';
const KEY_SESSION = 'gramawas_session';

// Helper to get from localstorage or initialize
const getJSON = (key, defaultVal) => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaultVal));
    return defaultVal;
  }
  return JSON.parse(data);
};

const setJSON = (key, val) => {
  localStorage.setItem(key, JSON.stringify(val));
};

// Initial Seed Data
const SEED_USERS = [
  { id: 1, username: 'admin', password: 'admin123', role: 'admin', phone: '9999999999', verified: true },
  { id: 2, username: 'Ramesh Patel', password: 'ramesh123', role: 'landlord', phone: '9876543210', verified: true, pan: 'BPNPP1289K', upi: 'rameshpatel@okhdfc' },
  { id: 3, username: 'Subhash Chandra', password: 'subhash123', role: 'tenant', phone: '9123456789', verified: true, occupation: 'Govt Teacher' },
  { id: 4, username: 'Savitri Devi', password: 'savitri123', role: 'landlord', phone: '9876543211', verified: true, pan: 'SVDEV8831L', upi: 'savitridevi@okaxis' }
];

const SEED_PROPERTIES = [
  {
    id: 1,
    title: 'Modern Single Room (Teacher Friendly)',
    location: 'Near Panchayat Bhavan, village-Aawas',
    town: 'Chhota Udaipur',
    price: 3200,
    deposit: 6000,
    landmark: '100m from Primary School',
    landlordName: 'Ramesh Patel',
    landlordId: 2,
    landlordUPI: 'rameshpatel@okhdfc',
    verified: true,
    hvac: 'Ceiling Fan + Cooler',
    autoEsc: true,
    status: 'Approved' // Approved | Pending
  },
  {
    id: 2,
    title: 'Spacious Double Room with Porch',
    location: 'Near Community Health Centre (CHC)',
    town: 'Sarangpur Town',
    price: 4500,
    deposit: 9000,
    landmark: 'Opposite CHC Clinic',
    landlordName: 'Savitri Devi',
    landlordId: 4,
    landlordUPI: 'savitridevi@okaxis',
    verified: true,
    hvac: 'Air Conditioned',
    autoEsc: true,
    status: 'Approved'
  },
  {
    id: 3,
    title: 'Cozy Budget Room for Rural Students',
    location: 'Sarkari Secondary School Lane',
    town: 'Sarangpur Town',
    price: 2500,
    deposit: 4000,
    landmark: '50m from School Gate',
    landlordName: 'Vijay Kumar',
    landlordId: 2, // Map to Ramesh for demo purposes
    landlordUPI: 'vijaykumar@paytm',
    verified: false,
    hvac: 'Ceiling Fan',
    autoEsc: false,
    status: 'Approved'
  },
  {
    id: 4,
    title: '1 BHK Independent Rurban Floor',
    location: 'Opposite Cooperative Bank Branch',
    town: 'Chhota Udaipur',
    price: 5200,
    deposit: 10000,
    landmark: 'Near Bank of Baroda',
    landlordName: 'Ramesh Patel',
    landlordId: 2,
    landlordUPI: 'rameshpatel@okhdfc',
    verified: true,
    hvac: 'Ceiling Fan + Balcony',
    autoEsc: true,
    status: 'Approved'
  }
];

const SEED_LEDGER = [
  // Subhash's Rent History
  { id: 1, tenantId: 3, tenantName: 'Subhash Chandra (Govt Teacher)', landlordId: 2, roomNo: 'Room A-1 (Modern Single Room)', amount: 3200, status: 'Paid', dueDate: '05-May-2026', date: '04-May-2026', txId: 'UPI202605048921', phone: '9123456789' },
  { id: 2, tenantId: 3, tenantName: 'Subhash Chandra (Govt Teacher)', landlordId: 2, roomNo: 'Room A-1 (Modern Single Room)', amount: 3200, status: 'Paid', dueDate: '05-Apr-2026', date: '02-Apr-2026', txId: 'UPI202604021190', phone: '9123456789' },
  { id: 3, tenantId: 3, tenantName: 'Subhash Chandra (Govt Teacher)', landlordId: 2, roomNo: 'Room A-1 (Modern Single Room)', amount: 3200, status: 'Paid', dueDate: '05-Mar-2026', date: '05-Mar-2026', txId: 'UPI202603058821', phone: '9123456789' },
  { id: 4, tenantId: 3, tenantName: 'Subhash Chandra (Govt Teacher)', landlordId: 2, roomNo: 'Room A-1 (Modern Single Room)', amount: 3200, status: 'Pending', dueDate: '05-Jun-2026', date: 'N/A', txId: 'N/A', phone: '9123456789' },

  // Landlord Seed Ledger for UI realism (matches Ramesh Patel's dashboard)
  { id: 5, tenantId: 99, tenantName: 'Dr. Alok Verma (PHC Doctor)', landlordId: 2, roomNo: 'Room B-3', amount: 4800, status: 'Pending', dueDate: '10-May-2026', date: 'N/A', txId: 'N/A', phone: '9123456789' },
  { id: 6, tenantId: 98, tenantName: 'Prashant K. (Rural Student)', landlordId: 2, roomNo: 'Room A-4', amount: 2500, status: 'Paid', dueDate: '05-May-2026', date: '05-May-2026', txId: 'UPI202605051921', phone: '9988776655' },
  { id: 7, tenantId: 97, tenantName: 'Rekha Shinde (ANM Health Worker)', landlordId: 2, roomNo: 'Room C-2', amount: 3800, status: 'Pending', dueDate: '12-May-2026', date: 'N/A', txId: 'N/A', phone: '9845612378' }
];

const SEED_LOGS = [
  { id: 1, event: 'System initialized with secure rurban rental smart tables.', timestamp: '2026-05-27T09:00:00Z', user: 'System' },
  { id: 2, event: 'Seed user "admin" registered successfully.', timestamp: '2026-05-27T09:01:00Z', user: 'System' },
  { id: 3, event: 'Landlord Ramesh Patel listed Room 1: Modern Single Room.', timestamp: '2026-05-27T09:05:00Z', user: 'Ramesh Patel' },
  { id: 4, event: 'Tenant Subhash Chandra verified HRA rental eligibility.', timestamp: '2026-05-27T09:12:00Z', user: 'Subhash Chandra' }
];

export const db = {
  // Database state initialization
  init() {
    getJSON(KEY_USERS, SEED_USERS);
    getJSON(KEY_PROPERTIES, SEED_PROPERTIES);
    getJSON(KEY_LEDGER, SEED_LEDGER);
    getJSON(KEY_CONTRACTS, []);
    getJSON(KEY_LOGS, SEED_LOGS);
  },

  // Log tracker
  addLog(event, user = 'System') {
    const logs = getJSON(KEY_LOGS, SEED_LOGS);
    const newLog = {
      id: logs.length + 1,
      event,
      timestamp: new Date().toISOString(),
      user
    };
    logs.unshift(newLog);
    setJSON(KEY_LOGS, logs.slice(0, 100)); // Cap at 100 logs
  },

  getLogs() {
    return getJSON(KEY_LOGS, SEED_LOGS);
  },

  // Auth/Users service
  getUsers() {
    return getJSON(KEY_USERS, SEED_USERS);
  },

  register(username, password, role, phone, upi = '', pan = '', occupation = '') {
    const users = this.getUsers();
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      throw new Error('Username already exists. Please choose another.');
    }
    if (users.find(u => u.phone === phone)) {
      throw new Error('Phone number already registered.');
    }

    const newUser = {
      id: users.length + 1,
      username,
      password,
      role,
      phone,
      verified: role === 'admin' || role === 'tenant', // Auto verify admin and tenant
      upi: upi || (role === 'landlord' ? `${username.toLowerCase().replace(/\s/g, '')}@okupi` : ''),
      pan: pan || (role === 'landlord' ? 'ABCDE1234F' : ''),
      occupation: occupation || (role === 'tenant' ? 'Migrant Employee' : '')
    };

    users.push(newUser);
    setJSON(KEY_USERS, users);
    this.addLog(`User "${username}" signed up as a ${role.toUpperCase()}.`, username);
    return newUser;
  },

  login(username, password) {
    const users = this.getUsers();
    const user = users.find(
      u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );
    if (!user) {
      throw new Error('Invalid username or password.');
    }
    setJSON(KEY_SESSION, user);
    this.addLog(`User "${user.username}" logged in.`, user.username);
    return user;
  },

  logout() {
    const session = this.getCurrentSession();
    if (session) {
      this.addLog(`User "${session.username}" logged out.`, session.username);
    }
    localStorage.removeItem(KEY_SESSION);
  },

  getCurrentSession() {
    const data = localStorage.getItem(KEY_SESSION);
    return data ? JSON.parse(data) : null;
  },

  updateUserVerification(userId, verified) {
    const users = this.getUsers();
    const updated = users.map(u => {
      if (u.id === userId) {
        this.addLog(`Admin updated verification status for "${u.username}" to ${verified}`, 'Admin');
        return { ...u, verified };
      }
      return u;
    });
    setJSON(KEY_USERS, updated);
  },

  // Properties / Listings service
  getProperties() {
    return getJSON(KEY_PROPERTIES, SEED_PROPERTIES);
  },

  addProperty(property) {
    const properties = this.getProperties();
    const newProp = {
      id: properties.length + 1,
      ...property,
      status: 'Pending', // All new landlord listings go to admin approval first!
      verified: false
    };
    properties.push(newProp);
    setJSON(KEY_PROPERTIES, properties);
    this.addLog(`Landlord "${property.landlordName}" created property listing "${property.title}". Awaiting approval.`, property.landlordName);
    return newProp;
  },

  updatePropertyStatus(propId, status) {
    const properties = this.getProperties();
    const updated = properties.map(p => {
      if (p.id === propId) {
        this.addLog(`Admin updated listing status of "${p.title}" to "${status}".`, 'Admin');
        return { ...p, status, verified: status === 'Approved' ? true : p.verified };
      }
      return p;
    });
    setJSON(KEY_PROPERTIES, updated);
  },

  deleteProperty(propId) {
    const properties = this.getProperties();
    const filtered = properties.filter(p => p.id !== propId);
    setJSON(KEY_PROPERTIES, filtered);
    this.addLog(`Listing ID ${propId} was deleted.`, 'Admin/Landlord');
  },

  // Rent Ledger / Invoices service
  getLedger() {
    return getJSON(KEY_LEDGER, SEED_LEDGER);
  },

  addLedgerInvoice(invoice) {
    const ledger = this.getLedger();
    const newInvoice = {
      id: ledger.length + 1,
      ...invoice,
      status: 'Pending',
      date: 'N/A',
      txId: 'N/A'
    };
    ledger.push(newInvoice);
    setJSON(KEY_LEDGER, ledger);
    this.addLog(`Rent invoice for ${invoice.month} (₹${invoice.amount}) created for tenant ${invoice.tenantName}.`, 'System');
    return newInvoice;
  },

  payLedgerInvoice(invoiceId, txId) {
    const ledger = this.getLedger();
    const updated = ledger.map(inv => {
      if (inv.id === invoiceId) {
        this.addLog(`Tenant "${inv.tenantName}" paid rent ₹${inv.amount} via UPI. TxID: ${txId}`, inv.tenantName);
        return {
          ...inv,
          status: 'Paid',
          date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-'),
          txId
        };
      }
      return inv;
    });
    setJSON(KEY_LEDGER, updated);
  },

  toggleLedgerStatus(invoiceId) {
    const ledger = this.getLedger();
    const updated = ledger.map(inv => {
      if (inv.id === invoiceId) {
        const nextStatus = inv.status === 'Paid' ? 'Pending' : 'Paid';
        const date = nextStatus === 'Paid' ? new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : 'N/A';
        const txId = nextStatus === 'Paid' ? 'UPI' + Math.floor(100000000000 + Math.random() * 900000000000) : 'N/A';
        this.addLog(`Landlord toggled rent invoice ID ${invoiceId} for ${inv.tenantName} to "${nextStatus}".`, 'Landlord');
        return {
          ...inv,
          status: nextStatus,
          date,
          txId
        };
      }
      return inv;
    });
    setJSON(KEY_LEDGER, updated);
  },

  // Smart Contracts service
  getContracts() {
    return getJSON(KEY_CONTRACTS, []);
  },

  addContract(contract) {
    const contracts = this.getContracts();
    const newContract = {
      id: contracts.length + 1,
      ...contract,
      agreementNo: `ND-IND-GA-${Math.floor(100000 + Math.random() * 900000)}`,
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    };
    contracts.push(newContract);
    setJSON(KEY_CONTRACTS, contracts);
    this.addLog(`Smart 11-Month agreement signed between landlord "${contract.landlordName}" and tenant "${contract.tenantName}".`, contract.landlordName);
    return newContract;
  }
};

// Auto initialize database immediately
db.init();
