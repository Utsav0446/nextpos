'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'gu' | 'hi';

export const translations = {
  en: {
    dashboard: 'Dashboard',
    sitting: 'Sitting',
    parcel: 'Parcel',
    billing: 'Billing',
    menu: 'Menu',
    expenses: 'Expenses Log',
    reports: 'Reports',
    settings: 'Settings',
    search: 'Search...',
    welcome: 'Dashboard Overview',
    realtimeAnalytics: 'Real-time analytics for',
    todayRevenue: "Today's Revenue",
    vsYesterday: 'vs yesterday',
    activeOrders: 'Active Orders',
    todayOrders: 'orders placed today',
    avgOrderValue: 'Avg Order Value',
    topCategory: 'Top food category',
    monthlyProfit: 'Monthly Profit',
    sales: 'Sales',
    costs: 'Costs',
    topProducts: 'Top Selling Products',
    systemLogs: 'System Activity Logs',
    noSales: 'No sales recorded today.',
    noLogs: 'No activities logged.',
    language: 'Language',
    table: 'Table',
    dineIn: 'Dine-In',
    takeaway: 'Takeaway',
    items: 'items',
    subtotal: 'Subtotal',
    tax: 'Tax',
    total: 'Total',
    discount: 'Discount',
    grandTotal: 'Grand Total',
    placeOrder: 'Place Order',
    confirmOrder: 'Confirm Order',
    customNotes: 'Custom Notes',
    prepStyle: 'Preparation Style',
    spiceLevel: 'Spice Level',
    texture: 'Texture',
    cancel: 'Cancel',
    confirm: 'Confirm',
    addCategory: 'Add Category',
    addMenuItem: 'Add Menu Item',
    itemName: 'Item Name',
    price: 'Price',
    description: 'Description',
    isAvailable: 'Is Available',
    isVeg: 'Is Veg',
    prepTime: 'Preparation Time (mins)',
    save: 'Save',
    edit: 'Edit',
    delete: 'Delete',
    back: 'Back',
    allCategories: 'All Categories',
    completed: 'Completed',
    pending: 'Pending',
    preparing: 'Preparing',
    cancelled: 'Cancelled',
    showPopup: 'Show Customization Popup',
  },
  gu: {
    dashboard: 'ડેશબોર્ડ',
    sitting: 'બેઠક વ્યવસ્થા',
    parcel: 'પાર્સલ',
    billing: 'બીલીંગ',
    menu: 'મેનુ',
    expenses: 'ખર્ચ લોગ',
    reports: 'રિપોર્ટ',
    settings: 'સેટિંગ્સ',
    search: 'શોધો...',
    welcome: 'ડેશબોર્ડ વિહંગાવલોકન',
    realtimeAnalytics: 'રીઅલ-ટાઇમ વિશ્લેષણ',
    todayRevenue: 'આજની આવક',
    vsYesterday: 'ગઈકાલની સરખામણીમાં',
    activeOrders: 'સક્રિય ઓર્ડર',
    todayOrders: 'આજે મૂકેલા ઓર્ડર',
    avgOrderValue: 'સરેરાશ ઓર્ડર મૂલ્ય',
    topCategory: 'ટોચની કેટેગરી',
    monthlyProfit: 'માસિક નફો',
    sales: 'વેચાણ',
    costs: 'ખર્ચ',
    topProducts: 'સૌથી વધુ વેચાતી વસ્તુઓ',
    systemLogs: 'સિસ્ટમ પ્રવૃત્તિ લોગ',
    noSales: 'આજે કોઈ વેચાણ નોંધાયું નથી.',
    noLogs: 'કોઈ પ્રવૃત્તિ નોંધાઈ નથી.',
    language: 'ભાષા',
    table: 'ટેબલ',
    dineIn: 'ડાઇન-ઇન',
    takeaway: 'ટેકઅવે',
    items: 'વસ્તુઓ',
    subtotal: 'પેટા સરવાળો',
    tax: 'ટેક્સ',
    total: 'કુલ',
    discount: 'ડિસ્કાઉન્ટ',
    grandTotal: 'કુલ રકમ',
    placeOrder: 'ઓર્ડર આપો',
    confirmOrder: 'ઓર્ડર કન્ફર્મ કરો',
    customNotes: 'ખાસ નોંધો',
    prepStyle: 'તૈયારી શૈલી',
    spiceLevel: 'તીખાશનું પ્રમાણ',
    texture: 'ટેક્સચર',
    cancel: 'રદ કરો',
    confirm: 'કન્ફર્મ કરો',
    addCategory: 'કેટેગરી ઉમેરો',
    addMenuItem: 'મેનુ આઇટમ ઉમેરો',
    itemName: 'આઇટમનું નામ',
    price: 'કિંમત',
    description: 'વર્ણન',
    isAvailable: 'ઉપલબ્ધ છે',
    isVeg: 'શાકાહારી',
    prepTime: 'તૈયારીનો સમય (મિનિટ)',
    save: 'સાચવો',
    edit: 'સુધારો',
    delete: 'કાઢી નાખો',
    back: 'પાછા',
    allCategories: 'બધી કેટેગરી',
    completed: 'પૂર્ણ થયેલ',
    pending: 'બાકી',
    preparing: 'તૈયાર થાય છે',
    cancelled: 'રદ થયેલ',
    showPopup: 'કસ્ટમાઇઝ પોપઅપ બતાવો',
  },
  hi: {
    dashboard: 'डैशबोर्ड',
    sitting: 'बैठक व्यवस्था',
    parcel: 'पार्सल',
    billing: 'बिलिंग',
    menu: 'मेन्यू',
    expenses: 'खर्च लॉग',
    reports: 'रिपोर्ट',
    settings: 'सेटिंग्स',
    search: 'खोजें...',
    welcome: 'डैशबोर्ड अवलोकन',
    realtimeAnalytics: 'रीयल-टाइम विश्लेषण',
    todayRevenue: 'आज की आय',
    vsYesterday: 'कल की तुलना में',
    activeOrders: 'सक्रिय ऑर्डर',
    todayOrders: 'आज दिए गए ऑर्डर',
    avgOrderValue: 'औसत ऑर्डर मूल्य',
    topCategory: 'शीर्ष श्रेणी',
    monthlyProfit: 'मासिक लाभ',
    sales: 'बिक्री',
    costs: 'लागत/खर्च',
    topProducts: 'सबसे ज्यादा बिकने वाले उत्पाद',
    systemLogs: 'सिस्टम गतिविधि लॉग',
    noSales: 'आज कोई बिक्री दर्ज नहीं की गई।',
    noLogs: 'कोई गतिविधि दर्ज नहीं की गई।',
    language: 'भाषा',
    table: 'टेबल',
    dineIn: 'डाइन-इन',
    takeaway: 'टेकअवे',
    items: 'आइटम',
    subtotal: 'उप-योग',
    tax: 'टैक्स',
    total: 'कुल',
    discount: 'छूट (डिस्काउंट)',
    grandTotal: 'कुल योग',
    placeOrder: 'ऑर्डर दें',
    confirmOrder: 'ऑर्डर कन्फर्म करें',
    customNotes: 'विशेष नोट्स',
    prepStyle: 'तैयारी की शैली',
    spiceLevel: 'तीखापन स्तर',
    texture: 'बनावट',
    cancel: 'रद्द करें',
    confirm: 'कन्फर्म करें',
    addCategory: 'श्रेणी जोड़ें',
    addMenuItem: 'मेन्यू आइटम जोड़ें',
    itemName: 'आइटम का नाम',
    price: 'कीमत',
    description: 'विवरण',
    isAvailable: 'उपलब्ध है',
    isVeg: 'शाकाहारी',
    prepTime: 'तैयारी का समय (मिनट)',
    save: 'सहेजें',
    edit: 'संपादित करें',
    delete: 'हटाएं',
    back: 'पीछे',
    allCategories: 'सभी श्रेणियां',
    completed: 'पूर्ण',
    pending: 'लंबित',
    preparing: 'तैयार किया जा रहा है',
    cancelled: 'रद्द',
    showPopup: 'कस्टमाइज़ेशन पॉपअप दिखाएं',
  }
};

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['en']) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const saved = localStorage.getItem('app-language') as Language;
    if (saved && (saved === 'en' || saved === 'gu' || saved === 'hi')) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app-language', lang);
  };

  const t = (key: keyof typeof translations['en']) => {
    return translations[language][key] || translations['en'][key] || String(key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
