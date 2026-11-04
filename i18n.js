(function(){
  'use strict';
  var LANG_KEY = 'kw_lang';

  var STRINGS = {
    en: {
      home: 'Home', customers: 'Customers', invoices: 'Invoices', new_invoice: 'New Invoice',
      products: 'Products', settings: 'Settings', greeting: 'Assalam o Alaikum 👋',
      quick_actions: 'Quick Actions', recent_invoices: 'Recent Invoices',
      total_customers: 'total customers', total_outstanding: 'Total outstanding',
      pending: 'Pending', received: 'Received', billed: 'Billed', paid: 'Paid', due: 'Due',
      business_edit: 'Business Profile', language: 'Language', theme: 'Dark Mode',
      history: 'Invoice History', signout: 'Sign Out', save: 'Save', add_product: 'Add Product',
      import: 'Import from Excel / CSV / PDF', load_template: 'Load Product Template',
      forget_pass: 'Forgot password?', reset_pass: 'Reset Password'
    },
    ur: {
      home: 'ہوم', customers: 'گاہک', invoices: 'بل', new_invoice: 'نیا بل',
      products: 'مصنوعات', settings: 'سیٹنگز', greeting: 'السلام علیکم 👋',
      quick_actions: 'فوری کام', recent_invoices: 'حالیہ بل',
      total_customers: 'کل گاہک', total_outstanding: 'کل بقایا',
      pending: 'بقایا', received: 'موصول', billed: 'بل شدہ', paid: 'ادا شدہ', due: 'واجب الادا',
      business_edit: 'کاروبار کی پروفائل', language: 'زبان', theme: 'ڈارک موڈ',
      history: 'بل کی تاریخ', signout: 'لاگ آؤٹ', save: 'محفوظ کریں', add_product: 'مصنوعات شامل کریں',
      import: 'ایکسل / سی ایس وی سے درآمد', load_template: 'ٹیمپلیٹ لوڈ کریں',
      forget_pass: 'پاس ورڈ بھول گئے؟', reset_pass: 'پاس ورڈ ری سیٹ کریں'
    },
    hi: {
      home: 'होम', customers: 'ग्राहक', invoices: 'चालान', new_invoice: 'नया चालान',
      products: 'उत्पाद', settings: 'सेटिंग्स', greeting: 'नमस्ते 👋',
      quick_actions: 'त्वरित कार्रवाई', recent_invoices: 'हाल के चालान',
      total_customers: 'कुल ग्राहक', total_outstanding: 'कुल बकाया',
      pending: 'लंबित', received: 'प्राप्त', billed: 'बिल किया गया', paid: 'भुगतान किया गया', due: 'देय',
      business_edit: 'व्यवसाय प्रोफ़ाइल', language: 'भाषा', theme: 'डार्क मोड',
      history: 'चालान इतिहास', signout: 'साइन आउट', save: 'सहेजें', add_product: 'उत्पाद जोड़ें',
      import: 'Excel / CSV से आयात करें', load_template: 'टेम्पलेट लोड करें',
      forget_pass: 'पासवर्ड भूल गए?', reset_pass: 'पासवर्ड रीसेट करें'
    },
    zh: {
      home: '首页', customers: '客户', invoices: '发票', new_invoice: '新发票',
      products: '产品', settings: '设置', greeting: '你好 👋',
      quick_actions: '快捷操作', recent_invoices: '最近发票',
      total_customers: '总客户数', total_outstanding: '总未付款',
      pending: '待定', received: '已收款', billed: '已开票', paid: '已付款', due: '到期',
      business_edit: '企业简介', language: '语言', theme: '深色模式',
      history: '发票历史', signout: '登出', save: '保存', add_product: '添加产品',
      import: '从 Excel / CSV 导入', load_template: '加载模板',
      forget_pass: '忘记密码？', reset_pass: '重置密码'
    },
    ar: {
      home: 'الرئيسية', customers: 'العملاء', invoices: 'الفواتير', new_invoice: 'فاتورة جديدة',
      products: 'المنتجات', settings: 'الإعدادات', greeting: 'السلام عليكم 👋',
      quick_actions: 'إجراءات سريعة', recent_invoices: 'الفواتير الأخيرة',
      total_customers: 'إجمالي العملاء', total_outstanding: 'إجمالي المستحقات',
      pending: 'معلق', received: 'مستلم', billed: 'مفوتر', paid: 'مدفوع', due: 'مستحق',
      business_edit: 'ملف الشركة', language: 'اللغة', theme: 'الوضع الداكن',
      history: 'سجل الفواتير', signout: 'تسجيل الخروج', save: 'حفظ', add_product: 'إضافة منتج',
      import: 'استيراد من Excel / CSV', load_template: 'تحميل القالب',
      forget_pass: 'نسيت كلمة المرور؟', reset_pass: 'إعادة تعيين كلمة المرور'
    },
    es: {
      home: 'Inicio', customers: 'Clientes', invoices: 'Facturas', new_invoice: 'Nueva Factura',
      products: 'Productos', settings: 'Ajustes', greeting: 'Hola 👋',
      quick_actions: 'Acciones Rápidas', recent_invoices: 'Facturas Recientes',
      total_customers: 'clientes totales', total_outstanding: 'Total pendiente',
      pending: 'Pendiente', received: 'Recibido', billed: 'Facturado', paid: 'Pagado', due: 'Vencido',
      business_edit: 'Perfil de Empresa', language: 'Idioma', theme: 'Modo Oscuro',
      history: 'Historial', signout: 'Salir', save: 'Guardar', add_product: 'Agregar Producto',
      import: 'Importar de Excel / CSV', load_template: 'Cargar Plantilla',
      forget_pass: '¿Olvidaste tu contraseña?', reset_pass: 'Restablecer Contraseña'
    },
    fr: {
      home: 'Accueil', customers: 'Clients', invoices: 'Factures', new_invoice: 'Nouvelle Facture',
      products: 'Produits', settings: 'Paramètres', greeting: 'Bonjour 👋',
      quick_actions: 'Actions Rapides', recent_invoices: 'Factures Récentes',
      total_customers: 'clients totaux', total_outstanding: 'Total en attente',
      pending: 'En attente', received: 'Reçu', billed: 'Facturé', paid: 'Payé', due: 'Dû',
      business_edit: 'Profil Entreprise', language: 'Langue', theme: 'Mode Sombre',
      history: 'Historique', signout: 'Déconnexion', save: 'Enregistrer', add_product: 'Ajouter Produit',
      import: 'Importer Excel / CSV', load_template: 'Charger Modèle',
      forget_pass: 'Mot de passe oublié?', reset_pass: 'Réinitialiser'
    }
  };

  function getLang(){ try { return localStorage.getItem(LANG_KEY) || 'en'; } catch(e){ return 'en'; } }
  function setLang(l){ if(!STRINGS[l]) l = 'en'; try { localStorage.setItem(LANG_KEY, l); } catch(e){} document.documentElement.setAttribute('lang', l); document.body.setAttribute('data-lang', l); }
  function t(key){ var lang = getLang(); return (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key; }

  function apply(){
    document.querySelectorAll('[data-i18n]').forEach(function(el){
      var key = el.getAttribute('data-i18n');
      var translation = t(key);
      if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) el.setAttribute('placeholder', translation);
      else el.textContent = translation;
    });
    document.documentElement.setAttribute('lang', getLang());
    document.body.setAttribute('data-lang', getLang());
  }

  window.KWi18n = { getLang, setLang, t, apply, STRINGS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
})();
