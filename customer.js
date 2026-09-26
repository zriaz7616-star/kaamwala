(function(){
  'use strict';

  var CURRENCY_SYMBOLS = {PKR:'Rs', USD:'$', AED:'AED', GBP:'GBP'};
  var params = new URLSearchParams(location.search);
  var customerKey = (params.get('key') || '').trim().toLowerCase();
  var currentProfile = null;
  var customerInvoices = [];
  var customer = null;

  document.addEventListener('DOMContentLoaded', function(){
    if (!customerKey){ location.href = 'customers.html'; return; }
    if (!window.FB) return;
    window.FB.waitForAuth().then(function(u){
      if (!u){ location.href = 'auth.html'; return; }
      return Promise.all([
        window.FB.getProfile(),
        window.FB.getInvoices()
      ]);
    }).then(function(res){
      if (!res) return;
      currentProfile = res[0] || {};
      var all = res[1] || [];
      customerInvoices = all.filter(function(inv){
        var nm = ((inv.to && inv.to.name) || '').trim().toLowerCase();
        return nm === customerKey;
      });
      if (customerInvoices.length === 0){
        location.href = 'customers.html';
        return;
      }
      buildCustomer();
      render();
    }).catch(function(err){
      console.error('[KW] customer load failed:', err);
      document.getElementById('customerRoot').innerHTML =
        '<div class="kw-loading">Could not load. <a href="customers.html" style="color:#0F766E">Back</a></div>';
    });
  });

  function $(id){ return document.getElementById(id); }

  function escapeHtml(s){
    return String(s==null?'':s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function getStatus(inv){
    if (inv.status === 'paid') return 'paid';
    if (inv.status === 'overdue') return 'overdue';
    if (inv.invoice && inv.invoice.due){
      try {
        var due = new Date(inv.invoice.due + 'T23:59:59');
        if (due < new Date()) return 'overdue';
      } catch(e){}
    }
    return 'unpaid';
  }

  function avatarColor(name){
    var colors = ['#0F766E','#D97706','#DC2626','#7C3AED','#0891B2',
                  '#DB2777','#4338CA','#059669','#B45309','#BE123C'];
    var hash = 0;
    for (var i = 0; i < name.length; i++){
      hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    }
    return colors[hash % colors.length];
  }

  function formatMoney(n, cur){
    var sym = CURRENCY_SYMBOLS[cur] || (cur + ' ');
    var v = (Math.round((n||0)*100)/100).toLocaleString('en-US',
      {minimumFractionDigits:2, maximumFractionDigits:2});
    return sym + ' ' + v;
  }

  function formatMoneyShort(n, cur){
    var sym = CURRENCY_SYMBOLS[cur] || (cur + ' ');
    n = Number(n) || 0;
    if (n >= 10000000) return sym + ' ' + (n/10000000).toFixed(1) + 'Cr';
    if (n >= 100000)   return sym + ' ' + (n/100000).toFixed(1) + 'L';
    if (n >= 1000)     return sym + ' ' + (n/1000).toFixed(1) + 'K';
    return sym + ' ' + (Math.round(n*100)/100).toFixed(0);
  }

  function formatDateShort(iso){
    if (!iso) return '—';
    try {
      var d = new Date(iso);
      var diff = Math.floor((new Date() - d) / (1000*60*60*24));
      if (diff === 0) return 'Today';
      if (diff === 1) return 'Yesterday';
      if (diff < 7) return diff + 'd ago';
      return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    } catch(e){ return iso; }
  }

  function buildCustomer(){
    var first = customerInvoices[0];
    customer = {
      name: (first.to && first.to.name) || 'Customer',
      phone: '', email: '', address: '',
      totalBilled: 0, totalPaid: 0, totalUnpaid: 0,
      invoiceCount: customerInvoices.length
    };
    // Use most recent non-empty contact info
    var sorted = customerInvoices.slice().sort(function(a,b){
      var da = a.savedAt || (a.invoice && a.invoice.date) || '';
      var db = b.savedAt || (b.invoice && b.invoice.date) || '';
      return String(db).localeCompare(String(da));
    });
    sorted.forEach(function(inv){
      if (inv.to){
        if (!customer.phone && inv.to.phone) customer.phone = inv.to.phone;
        if (!customer.email && inv.to.email) customer.email = inv.to.email;
        if (!customer.address && inv.to.address) customer.address = inv.to.address;
      }
    });
    customerInvoices.forEach(function(inv){
      var total = (inv.items||[]).reduce(function(s,it){
        return s + (parseFloat(it.amount) || 0);
      }, 0);
      customer.totalBilled += total;
      var st = getStatus(inv);
      if (st === 'paid') customer.totalPaid += total;
      else customer.totalUnpaid += total;
    });
  }

  function render(){
    var currency = (currentProfile && currentProfile.currency) || 'PKR';
    var sorted = customerInvoices.slice().sort(function(a,b){
      var da = a.savedAt || (a.invoice && a.invoice.date) || '';
      var db = b.savedAt || (b.invoice && b.invoice.date) || '';
      return String(db).localeCompare(String(da));
    });

    var initial = (customer.name.charAt(0) || 'C').toUpperCase();
    var bg = avatarColor(customer.name);
    var isClear = customer.totalUnpaid < 0.01;

    var contactHtml = '';
    if (customer.phone){
      contactHtml +=
        '<a href="tel:' + escapeHtml(customer.phone) + '" class="kw-cust-contact-btn">' +
          '<span>📞</span><span>' + escapeHtml(customer.phone) + '</span>' +
        '</a>';
      var phoneClean = customer.phone.replace(/[^0-9]/g, '');
      contactHtml +=
        '<a href="https://wa.me/' + escapeHtml(phoneClean) + '?text=' +
          encodeURIComponent('Assalam o Alaikum ' + customer.name) +
          '" target="_blank" rel="noopener" class="kw-cust-contact-btn wa">' +
          '<span>💬</span><span>WhatsApp</span>' +
        '</a>';
    }
    if (customer.email){
      contactHtml +=
        '<a href="mailto:' + escapeHtml(customer.email) + '" class="kw-cust-contact-btn">' +
          '<span>✉️</span><span>' + escapeHtml(customer.email) + '</span>' +
        '</a>';
    }
    if (customer.address){
      contactHtml +=
        '<div class="kw-cust-contact-btn" style="cursor:default">' +
          '<span>📍</span><span>' + escapeHtml(customer.address) + '</span>' +
        '</div>';
    }

    var invListHtml = sorted.map(function(inv){
      var invNum = (inv.invoice && inv.invoice.number) || 'INV';
      var date = formatDateShort(inv.savedAt || (inv.invoice && inv.invoice.date));
      var total = (inv.items||[]).reduce(function(s,it){
        return s + (parseFloat(it.amount) || 0);
      }, 0);
      var st = getStatus(inv);
      var statusLabel = st === 'paid' ? 'PAID' : (st === 'overdue' ? 'OVERDUE' : 'UNPAID');
      return (
        '<div class="kw-inv-card">' +
          '<div class="kw-inv-avatar" style="background:#F1F5F9;color:#0F766E">📄</div>' +
          '<div class="kw-inv-body">' +
            '<p class="kw-inv-client">' + escapeHtml(invNum) + '</p>' +
            '<p class="kw-inv-meta">' + escapeHtml(date) + '</p>' +
          '</div>' +
          '<div class="kw-inv-amount">' +
            '<p class="kw-inv-total">' + formatMoney(total, currency) + '</p>' +
            '<span class="kw-inv-status ' + st + '">' + statusLabel + '</span>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    var html =
      '<div class="kw-header">' +
        '<div class="kw-header-top">' +
          '<a href="customers.html" class="kw-icon-btn" aria-label="Back">←</a>' +
          '<button class="kw-icon-btn" id="kwShareCust" aria-label="Share">↗</button>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:14px;margin-top:14px">' +
          '<div class="kw-cust-avatar" style="background:' + bg + ';width:64px;height:64px;font-size:1.6rem;border:3px solid rgba(255,255,255,.3)">' +
            escapeHtml(initial) +
          '</div>' +
          '<div style="flex:1;min-width:0">' +
            '<h1 class="kw-biz-name" style="margin:0;font-size:1.35rem">' + escapeHtml(customer.name) + '</h1>' +
            '<p class="kw-biz-meta" style="margin-top:6px">' +
              customer.invoiceCount + ' invoice' + (customer.invoiceCount === 1 ? '' : 's') +
            '</p>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="kw-stats">' +
        '<div class="kw-stat">' +
          '<span class="kw-stat-icon">💵</span>' +
          '<span class="kw-stat-num">' + formatMoneyShort(customer.totalBilled, currency) + '</span>' +
          '<span class="kw-stat-lbl">Billed</span>' +
        '</div>' +
        '<div class="kw-stat revenue">' +
          '<span class="kw-stat-icon">✅</span>' +
          '<span class="kw-stat-num">' + formatMoneyShort(customer.totalPaid, currency) + '</span>' +
          '<span class="kw-stat-lbl">Paid</span>' +
        '</div>' +
        '<div class="kw-stat ' + (isClear ? 'revenue' : 'pending') + '">' +
          '<span class="kw-stat-icon">' + (isClear ? '✓' : '⏳') + '</span>' +
          '<span class="kw-stat-num">' + formatMoneyShort(customer.totalUnpaid, currency) + '</span>' +
          '<span class="kw-stat-lbl">Due</span>' +
        '</div>' +
      '</div>' +

      (contactHtml ? (
        '<div class="kw-section">' +
          '<h2 class="kw-section-title">Contact</h2>' +
          '<div style="display:grid;gap:8px">' + contactHtml + '</div>' +
        '</div>'
      ) : '') +

      '<div class="kw-section">' +
        '<h2 class="kw-section-title">Invoice History</h2>' +
        invListHtml +
      '</div>';

    $('customerRoot').innerHTML = html;

    var shareBtn = $('kwShareCust');
    if (shareBtn){
      shareBtn.addEventListener('click', function(){
        var total = formatMoneyShort(customer.totalUnpaid, currency);
        var text = customer.name + ' — ' + customer.invoiceCount + ' invoices, ' +
          (isClear ? 'All clear' : total + ' outstanding');
        if (navigator.share){
          navigator.share({title: customer.name, text: text}).catch(function(){});
        } else {
          var ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); } catch(e){}
          document.body.removeChild(ta);
          alert('Copied!');
        }
      });
    }
  }
})();
