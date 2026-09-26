(function(){
  'use strict';

  var LANG_KEY = 'kw_lang';

  var STRINGS = {
    en: {
      home: 'Home',
      customers: 'Customers',
      invoices: 'Invoices',
      new_invoice: 'New Invoice',
      products: 'Products',
      profile: 'Profile',
      settings: 'Settings',
      greeting: 'Assalam o Alaikum 👋',
      quick_actions: 'Quick Actions',
      recent_invoices: 'Recent Invoices',
      total_customers: 'total customers',
      total_outstanding: 'Total outstanding',
      pending: 'Pending',
      received: 'Received',
      billed: 'Billed',
      paid: 'Paid',
      due: 'Due',
      customer_details: 'Customer Details',
      invoice_history: 'Invoice History',
      contact: 'Contact',
      customers_nav: 'Customers',
      search: 'Search',
      no_customers: 'No customers yet',
      no_invoices: 'No invoices yet',
      add_product: 'Add Product',
      save: 'Save',
      import: 'Import from Excel / CSV / PDF',
      load_template: 'Load Product Template',
      business_edit: 'Business Profile',
      business_edit_sub: 'Logo, contact, payment details',
      language: 'Language',
      language_sub: 'App interface language',
      theme: 'Dark Mode',
      theme_sub: 'Dark background, easier on eyes',
      history: 'Invoice History',
      history_sub: 'View all saved invoices',
      signout: 'Sign Out',
      signout_sub: 'Logout from this device',
      about: 'About',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
      version: 'Version'
    },
    ur: {
      home: 'ہوم',
      customers: 'گاہک',
      invoices: 'بل',
      new_invoice: 'نیا بل',
      products: 'مصنوعات',
      profile: 'کاروبار',
      settings: 'سیٹنگز',
      greeting: 'السلام علیکم 👋',
      quick_actions: 'فوری کام',
      recent_invoices: 'حالیہ بل',
      total_customers: 'کل گاہک',
      total_outstanding: 'کل بقایا',
      pending: 'بقایا',
      received: 'موصول',
      billed: 'بل شدہ',
      paid: 'ادا شدہ',
      due: 'واجب الادا',
      customer_details: 'گاہک کی تفصیلات',
      invoice_history: 'بل کی تاریخ',
      contact: 'رابطہ',
      customers_nav: 'گاہک',
      search: 'تلاش',
      no_customers: 'ابھی کوئی گاہک نہیں',
      no_invoices: 'ابھی کوئی بل نہیں',
      add_product: 'مصنوعات شامل کریں',
      save: 'محفوظ کریں',
      import: 'ایکسل / سی ایس وی / پی ڈی ایف سے درآمد',
      load_template: 'ٹیمپلیٹ لوڈ کریں',
      business_edit: 'کاروبار کی پروفائل',
      business_edit_sub: 'لوگو، رابطہ، ادائیگی کی تفصیلات',
      language: 'زبان',
      language_sub: 'ایپ کی زبان',
      theme: 'ڈارک موڈ',
      theme_sub: 'رات کے لیے آسان',
      history: 'بل کی تاریخ',
      history_sub: 'تمام محفوظ بل دیکھیں',
      signout: 'لاگ آؤٹ',
      signout_sub: 'اس ڈیوائس سے نکلیں',
      about: 'ایپ کے بارے میں',
      privacy: 'پرائیویسی پالیسی',
      terms: 'شرائط و ضوابط',
      version: 'ورژن'
    }
  };

  function getLang(){
    try { return localStorage.getItem(LANG_KEY) || 'en'; }
    catch(e){ return 'en'; }
  }

  function setLang(l){
    if (l !== 'en' && l !== 'ur') l = 'en';
    try { localStorage.setItem(LANG_KEY, l); } catch(e){}
    document.documentElement.setAttribute('lang', l);
    document.body.setAttribute('data-lang', l);
  }

  function t(key){
    var lang = getLang();
    return (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key;
  }

  function apply(){
    document.querySelectorAll('[data-i18n]').forEach(function(el){
      var key = el.getAttribute('data-i18n');
      var translation = t(key);
      if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')){
        el.setAttribute('placeholder', translation);
      } else {
        el.textContent = translation;
      }
    });
    document.documentElement.setAttribute('lang', getLang());
    document.body.setAttribute('data-lang', getLang());
  }

  window.KWi18n = {
    getLang: getLang,
    setLang: setLang,
    t: t,
    apply: apply,
    STRINGS: STRINGS
  };

  // Auto-apply on load
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();
