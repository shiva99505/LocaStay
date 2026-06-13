export const locales = ['en', 'hi'] as const;
export type Locale = (typeof locales)[number];

export const localeMeta: Record<Locale, { label: string; native: string; flag: string }> = {
  en: { label: 'English', native: 'English', flag: '🇬🇧' },
  hi: { label: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
};

/**
 * Shared translation dictionary for chrome & high-traffic copy.
 * Feature-page body copy stays in English with Hindi labels layered on
 * common actions — full literal translation of every string is out of scope,
 * but every primary nav/action surface is bilingual.
 */
export const dictionaries = {
  en: {
    brand: { name: 'LocaStay', tagline: "India's First GPS-Powered Rural Property Marketplace" },
    nav: {
      home: 'Home', explore: 'Explore Properties', tenant: 'Tenant Portal', landlord: 'Landlord Hub',
      admin: 'Admin Console', login: 'Sign In', logout: 'Sign Out', register: 'Get Started',
      dashboard: 'Dashboard', profile: 'Profile', notifications: 'Notifications',
    },
    common: {
      search: 'Search', filter: 'Filter', viewAll: 'View all', viewDetails: 'View details', save: 'Save',
      cancel: 'Cancel', submit: 'Submit', next: 'Next', back: 'Back', loading: 'Loading…', noResults: 'No results found',
      perMonth: '/month', deposit: 'Deposit', rent: 'Rent', verified: 'Verified', available: 'Available',
      occupied: 'Occupied', call: 'Call', whatsapp: 'WhatsApp', book: 'Book Now', download: 'Download',
      apply: 'Apply', approve: 'Approve', reject: 'Reject', edit: 'Edit', delete: 'Delete', share: 'Share',
      seeMore: 'See more', seeLess: 'See less', from: 'from', to: 'to', away: 'away', uploadPhoto: 'Upload photo',
    },
    hero: {
      title1: "Organizing Bharat's", title2: 'Rural Rental Economy',
      subtitle: 'GPS-powered property discovery connecting verified rural landlords with tenants — teachers, health staff, students & migrant workers — across Tier-3 India.',
      searchPlaceholder: 'Search by village, town, district or landmark…',
      ctaTenant: 'Find a Home', ctaLandlord: 'List Your Property',
    },
    auth: {
      loginTitle: 'Welcome back', loginSubtitle: 'Sign in to continue to your LocaStay dashboard',
      registerTitle: 'Create your account', registerSubtitle: 'Join thousands finding & listing trusted rural homes',
      name: 'Full name', email: 'Email address', phone: 'Phone number', password: 'Password',
      confirmPassword: 'Confirm password', role: 'I am a', tenant: 'Tenant — looking for a home',
      landlord: 'Landlord — listing a property', signIn: 'Sign in', createAccount: 'Create account',
      noAccount: "Don't have an account?", haveAccount: 'Already have an account?',
      signUpLink: 'Sign up', signInLink: 'Sign in', orContinueWith: 'or try a demo account',
      demoHint: 'New here? Use a demo account below to explore instantly — no signup required.',
      forgotPassword: 'Forgot password?', rememberMe: 'Remember me',
      showPassword: 'Show password', hidePassword: 'Hide password',
      agreeTerms: 'By continuing, you agree to our Terms of Service and Privacy Policy.',
    },
  },
  hi: {
    brand: { name: 'LocaStay', tagline: 'भारत का पहला GPS-संचालित ग्रामीण संपत्ति बाज़ार' },
    nav: {
      home: 'होम', explore: 'संपत्तियां देखें', tenant: 'किरायेदार पोर्टल', landlord: 'मकान मालिक हब',
      admin: 'एडमिन कंसोल', login: 'लॉगिन', logout: 'लॉगआउट', register: 'शुरू करें',
      dashboard: 'डैशबोर्ड', profile: 'प्रोफाइल', notifications: 'सूचनाएं',
    },
    common: {
      search: 'खोजें', filter: 'फ़िल्टर', viewAll: 'सभी देखें', viewDetails: 'विवरण देखें', save: 'सहेजें',
      cancel: 'रद्द करें', submit: 'जमा करें', next: 'आगे', back: 'पीछे', loading: 'लोड हो रहा है…', noResults: 'कोई परिणाम नहीं मिला',
      perMonth: '/माह', deposit: 'जमा राशि', rent: 'किराया', verified: 'सत्यापित', available: 'उपलब्ध',
      occupied: 'भरा हुआ', call: 'कॉल करें', whatsapp: 'व्हाट्सएप', book: 'अभी बुक करें', download: 'डाउनलोड',
      apply: 'लागू करें', approve: 'स्वीकृत करें', reject: 'अस्वीकार करें', edit: 'संपादित करें', delete: 'हटाएं', share: 'साझा करें',
      seeMore: 'और देखें', seeLess: 'कम देखें', from: 'से', to: 'तक', away: 'दूर', uploadPhoto: 'फोटो अपलोड करें',
    },
    hero: {
      title1: 'भारत की ग्रामीण', title2: 'किराया अर्थव्यवस्था को संगठित करना',
      subtitle: 'GPS-संचालित संपत्ति खोज जो सत्यापित ग्रामीण मकान मालिकों को शिक्षकों, स्वास्थ्य कर्मियों, छात्रों और प्रवासी श्रमिकों से जोड़ती है — टियर-3 भारत भर में।',
      searchPlaceholder: 'गांव, कस्बे, जिले या लैंडमार्क से खोजें…',
      ctaTenant: 'घर खोजें', ctaLandlord: 'अपनी संपत्ति सूचीबद्ध करें',
    },
    auth: {
      loginTitle: 'वापसी पर स्वागत है', loginSubtitle: 'अपने LocaStay डैशबोर्ड पर जारी रखने के लिए साइन इन करें',
      registerTitle: 'अपना खाता बनाएं', registerSubtitle: 'विश्वसनीय ग्रामीण घर खोजने और सूचीबद्ध करने वालों से जुड़ें',
      name: 'पूरा नाम', email: 'ईमेल पता', phone: 'फ़ोन नंबर', password: 'पासवर्ड',
      confirmPassword: 'पासवर्ड की पुष्टि करें', role: 'मैं हूं', tenant: 'किरायेदार — घर खोज रहा/रही हूं',
      landlord: 'मकान मालिक — संपत्ति सूचीबद्ध कर रहा/रही हूं', signIn: 'साइन इन करें', createAccount: 'खाता बनाएं',
      noAccount: 'खाता नहीं है?', haveAccount: 'पहले से खाता है?',
      signUpLink: 'साइन अप करें', signInLink: 'साइन इन करें', orContinueWith: 'या डेमो खाता आज़माएं',
      demoHint: 'नए हैं? तुरंत देखने के लिए नीचे दिए गए डेमो खाते का उपयोग करें — साइनअप की ज़रूरत नहीं।',
      forgotPassword: 'पासवर्ड भूल गए?', rememberMe: 'मुझे याद रखें',
      showPassword: 'पासवर्ड दिखाएं', hidePassword: 'पासवर्ड छिपाएं',
      agreeTerms: 'जारी रखकर, आप हमारी सेवा की शर्तों और गोपनीयता नीति से सहमत होते हैं।',
    },
  },
} satisfies Record<Locale, unknown>;

export type Dictionary = typeof dictionaries.en;
