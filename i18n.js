(function(){
  'use strict';
  var LANG_KEY = 'kw_lang';

  var STRINGS = {
    en: {
      home: 'Home', customers: 'Customers', invoices: 'Invoices', new_invoice: 'New Invoice',
      products: 'Products', purchase: 'Purchase', settings: 'Settings', greeting: 'Assalam-O-Alaikum 👋',
      quick_actions: 'Quick Actions', recent_invoices: 'Recent Invoices',
      total_customers: 'Total Customers', total_outstanding: 'Total Outstanding',
      pending: 'Pending', received: 'Received', billed: 'Billed', paid: 'Paid', due: 'Due',
      business_edit: 'Business Profile', language: 'Language', theme: 'Dark Mode',
      history: 'Invoice History', signout: 'Sign Out', save: 'Save', add_product: 'Add Product',
      import: 'Import', load_template: 'Load Template',
      customer_details: 'CUSTOMER DETAILS', client_name: 'Customer Name *', phone: 'Phone', email: 'Email', address: 'Address',
      items: 'ITEMS', invoice_details: 'INVOICE DETAILS', invoice_num: 'Invoice #', date: 'Date', due_date: 'Due Date',
      currency: 'Currency', payment_status: 'PAYMENT STATUS', unpaid: 'Unpaid', notes: 'NOTES', notes_optional: 'Notes',
      add_item: '+ Add Item', search: '🔍 Search', no_invoices: 'No invoices yet'
    },
    ur: {
      home: 'ہوم', customers: 'گاہک', invoices: 'بل', new_invoice: 'نیا بل',
      products: 'مصنوعات', purchase: 'خریداری', settings: 'سیٹنگز', greeting: 'السلام علیکم 👋',
      quick_actions: 'فوری کام', recent_invoices: 'حالیہ بل',
      total_customers: 'کل گاہک', total_outstanding: 'کل بقایا',
      pending: 'بقایا', received: 'موصول', billed: 'بل شدہ', paid: 'ادا شدہ', due: 'واجب الادا',
      business_edit: 'کاروبار کی پروفائل', language: 'زبان', theme: 'ڈارک موڈ',
      history: 'بل کی تاریخ', signout: 'لاگ آؤٹ', save: 'محفوظ کریں', add_product: 'مصنوعات شامل کریں',
      import: 'درآمد کریں', load_template: 'ٹیمپلیٹ لوڈ کریں',
      customer_details: 'گاہک کی تفصیلات', client_name: 'گاہک کا نام *', phone: 'فون', email: 'ای میل', address: 'پتہ',
      items: 'اشیاء', invoice_details: 'بل کی تفصیلات', invoice_num: 'بل نمبر', date: 'تاریخ', due_date: 'آخری تاریخ',
      currency: 'کرنسی', payment_status: 'ادائیگی کی حیثیت', unpaid: 'غیر ادا شدہ', notes: 'نوٹس', notes_optional: 'نوٹس',
      add_item: '+ آئٹم شامل کریں', search: '🔍 تلاش', no_invoices: 'ابھی کوئی بل نہیں'
    },
    hi: {
      home: 'होम', customers: 'ग्राहक', invoices: 'चालान', new_invoice: 'नया चालान',
      products: 'उत्पाद', purchase: 'खरीद', settings: 'सेटिंग्स', greeting: 'नमस्ते 👋',
      quick_actions: 'त्वरित कार्रवाई', recent_invoices: 'हाल के चालान',
      total_customers: 'कुल ग्राहक', total_outstanding: 'कुल बकाया',
      pending: 'लंबित', received: 'प्राप्त', billed: 'बिल किया गया', paid: 'भुगतान किया गया', due: 'देय',
      business_edit: 'व्यवसाय प्रोफ़ाइल', language: 'भाषा', theme: 'डार्क मोड',
      history: 'चालान इतिहास', signout: 'साइन आउट', save: 'सहेजें', add_product: 'उत्पाद जोड़ें',
      import: 'आयात करें', load_template: 'टेम्पलेट लोड करें',
      customer_details: 'ग्राहक विवरण', client_name: 'ग्राहक का नाम *', phone: 'फ़ोन', email: 'ईमेल', address: 'पता',
      items: 'सामान', invoice_details: 'चालान विवरण', invoice_num: 'चालान #', date: 'तारीख', due_date: 'नियत तारीख',
      currency: 'मुद्रा', payment_status: 'भुगतान की स्थिति', unpaid: 'अवैतनिक', notes: 'नोट्स', notes_optional: 'नोट्स',
      add_item: '+ आइटम जोड़ें', search: '🔍 खोजें', no_invoices: 'अभी तक कोई चालान नहीं'
    },
    zh: {
      home: '首页', customers: '客户', invoices: '发票', new_invoice: '新发票',
      products: '产品', purchase: '采购', settings: '设置', greeting: '你好 👋',
      quick_actions: '快捷操作', recent_invoices: '最近发票',
      total_customers: '总客户数', total_outstanding: '总未付款',
      pending: '待定', received: '已收款', billed: '已开票', paid: '已付款', due: '到期',
      business_edit: '企业简介', language: '语言', theme: '深色模式',
      history: '发票历史', signout: '登出', save: '保存', add_product: '添加产品',
      import: '导入', load_template: '加载模板',
      customer_details: '客户详情', client_name: '客户姓名 *', phone: '电话', email: '电子邮件', address: '地址',
      items: '项目', invoice_details: '发票详情', invoice_num: '发票 #', date: '日期', due_date: '截止日期',
      currency: '货币', payment_status: '付款状态', unpaid: '未付', notes: '备注', notes_optional: '备注',
      add_item: '+ 添加项目', search: '🔍 搜索', no_invoices: '还没有发票'
    }
  };

  function getLang(){ try { return localStorage.getItem(LANG_KEY) || 'en'; } catch(e){ return 'en'; } }
  function setLang(l){ if(!STRINGS[l]) l='en'; try { localStorage.setItem(LANG_KEY, l); } catch(e){} apply(); }
  function t(key){ var lang = getLang(); return (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key; }

  function apply(){
    var lang = getLang();
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', (lang === 'ur' || lang === 'ar') ? 'rtl' : 'ltr');
    document.body.setAttribute('data-lang', lang);

    document.querySelectorAll('[data-i18n]').forEach(function(el){
      var key = el.getAttribute('data-i18n');
      var translation = t(key);
      if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) el.setAttribute('placeholder', translation);
      else el.textContent = translation;
    });
  }

  window.KWi18n = { getLang, setLang, t, apply, STRINGS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
})();
