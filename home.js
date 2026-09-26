(function(){
  'use strict';

  var CURRENCY_SYMBOLS = {PKR:'Rs', USD:'$', AED:'AED', GBP:'GBP'};
  var currentUser = null;
  var currentProfile = null;
  var allInvoices = [];

  document.addEventListener('DOMContentLoaded', function(){
    if (!window.FB){ return; }
    window.FB.waitForAuth().then(function(u){
      if (!u){ location.href = 'auth.html'; return; }
      currentUser = u;
      return Promise.all([
        window.FB.getProfile(),
        window.FB.getInvoices(),
        window.FB.getPremiumStatus()
      ]);
    }).then(function(res){
      if (!res) return;
      currentProfile = res[0] || {};
      allInvoices = res[1] || [];
      window.__kwPremium = !!(res[2] && res[2].premium);
      renderDashboard();
    }).catch(function(err){
      console.error('[KW] dashboard failed:', err);
      document.getElementById('homeRoot').innerHTML =
        '<div class="kw-loading">Could not load. <a href="home.html" style="color:#0F766E">Retry</a></div>';
    });
  });

  function $(id){ return document.getElementById(id); }

  function escapeHtml(s){
    return String(s==null?'':s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function formatMoney(n, cur){
    var sym = CURRENCY_SYMBOLS[cur] || (cur + ' ');
    var v = (Math.round((n||0)*100)/100).toLocaleString('en-US',
      {minimumFractionDigits:2, maximumFractionDigits:2});
    return sym + ' ' + v;
  }

  function formatMoneyShort(n, cur){
    var sym = CURRENCY_SYMBOLS[cur] || (cur + ' ');
    if (n >= 10000000) return sym + ' ' + (n/10000000).toFixed(1) + 'Cr';
    if (n >= 100000) return sym + ' ' + (n/100000).toFixed(1) + 'L';
    if (n >= 1000) return sym + ' ' + (n/1000).toFixed(1) + 'K';
    return sym + ' ' + (Math.round(n*100)/100).toFixed(0);
  }

  function formatDateShort(iso){
    if (!iso) return '—';
    try {
      var d = new Date(iso);
      var today = new Date();
      var diff = Math.floor((today - d) / (1000*60*60*24));
      if (diff === 0) return 'Today';
      if (diff === 1) return 'Yesterday';
      if (diff < 7) return diff + 'd ago';
      return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'});
    } catch(e){ return iso; }
  }

  function calcTotals(items){
    var sub = (items||[]).reduce(function(s,it){ return s + (parseFloat(it.amount)||0); }, 0);
    return sub;
  }

  function getInvoiceStatus(inv){
    if (inv.status === 'paid') return 'paid';
    if (inv.status === 'overdue') return 'overdue';
    // Auto-detect overdue: if due date passed and not paid
    if (inv.invoice && inv.invoice.due){
      try {
        var due = new Date(inv.invoice.due + 'T23:59:59');
        if (due < new Date() && inv.status !== 'paid') return 'overdue';
      } catch(e){}
    }
    return 'unpaid';
  }

  function renderDashboard(){
    var p = currentProfile || {};
    var bizName = p.businessName || 'Your Business';
    var currency = (p.currency) || 'PKR';
    var premiumPill = window.__kwPremium
      ? '<span class="kw-premium-pill">⭐ PREMIUM</span>'
      : '';

    // Compute stats
    var totalInv = allInvoices.length;
    var totalRevenue = 0;
    var pendingAmount = 0;
    var paidCount = 0;

    allInvoices.forEach(function(inv){
      var t = calcTotals(inv.items);
      var status = getInvoiceStatus(inv);
      if (status === 'paid'){
        totalRevenue += t;
        paidCount++;
      } else {
        pendingAmount += t;
      }
    });

    // Recent 5
    var recent = allInvoices.slice(0, 5);

    var recentHtml = '';
    if (recent.length === 0){
      recentHtml =
        '<div class="kw-empty">' +
          '<div class="kw-empty-icon">📄</div>' +
          '<h3>No invoices yet</h3>' +
          '<p>Create your first invoice. It takes just 1 minute.</p>' +
          '<a href="app.html" class="kw-btn-primary">+ New Invoice</a>' +
        '</div>';
    } else {
      recentHtml = recent.map(function(inv){
        var client = (inv.to && inv.to.name) || 'Client';
        var initial = (client.charAt(0) || 'C').toUpperCase();
        var invNum = (inv.invoice && inv.invoice.number) || 'INV';
        var date = formatDateShort(inv.savedAt || (inv.invoice && inv.invoice.date));
        var total = calcTotals(inv.items);
        var status = getInvoiceStatus(inv);
        var statusLabel = status === 'paid' ? 'PAID' : (status === 'overdue' ? 'OVERDUE' : 'UNPAID');
        return (
          '<div class="kw-inv-card" data-id="' + escapeHtml(inv.id || '') + '" onclick="window.location.href=\'history.html\'">' +
            '<div class="kw-inv-avatar">' + escapeHtml(initial) + '</div>' +
            '<div class="kw-inv-body">' +
              '<p class="kw-inv-client">' + escapeHtml(client) + '</p>' +
              '<p class="kw-inv-meta">' +
                '<span>' + escapeHtml(invNum) + '</span>' +
                '<span>·</span>' +
                '<span>' + escapeHtml(date) + '</span>' +
              '</p>' +
            '</div>' +
            '<div class="kw-inv-amount">' +
              '<p class="kw-inv-total">' + formatMoney(total, currency) + '</p>' +
              '<span class="kw-inv-status ' + status + '">' + statusLabel + '</span>' +
            '</div>' +
          '</div>'
        );
      }).join('');
    }

    var html =
      '<div class="kw-header">' +
        '<div class="kw-header-top">' +
          '<div class="kw-brand">' +
            '<span class="kw-mark">KW</span>' +
            '<span>KaamWala</span>' +
          '</div>' +
          '<button class="kw-icon-btn" id="kwAcctBtn" aria-label="Account">👤</button>' +
        '</div>' +
        '<p class="kw-greeting">Assalam o Alaikum 👋</p>' +
        '<h1 class="kw-biz-name">' + escapeHtml(bizName) + premiumPill + '</h1>' +
        '<p class="kw-biz-meta">' + (p.phone ? escapeHtml(p.phone) + ' · ' : '') + (p.email ? escapeHtml(p.email) : '') + '</p>' +
      '</div>' +

      '<div class="kw-stats">' +
        '<div class="kw-stat">' +
          '<span class="kw-stat-icon">📄</span>' +
          '<span class="kw-stat-num">' + totalInv + '</span>' +
          '<span class="kw-stat-lbl">Invoices</span>' +
        '</div>' +
        '<div class="kw-stat revenue">' +
          '<span class="kw-stat-icon">💰</span>' +
          '<span class="kw-stat-num">' + formatMoneyShort(totalRevenue, currency) + '</span>' +
          '<span class="kw-stat-lbl">Received</span>' +
        '</div>' +
        '<div class="kw-stat pending">' +
          '<span class="kw-stat-icon">⏳</span>' +
          '<span class="kw-stat-num">' + formatMoneyShort(pendingAmount, currency) + '</span>' +
          '<span class="kw-stat-lbl">Pending</span>' +
        '</div>' +
      '</div>' +

      '<div class="kw-section">' +
        '<h2 class="kw-section-title">Quick Actions</h2>' +
        '<div class="kw-actions">' +
          '<a href="app.html" class="kw-action new">' +
            '<span class="kw-action-icon">+</span>' +
            '<span class="kw-action-label">New<br>Invoice</span>' +
          '</a>' +
          '<a href="products.html" class="kw-action products">' +
            '<span class="kw-action-icon">📦</span>' +
            '<span class="kw-action-label">Products</span>' +
          '</a>' +
          '<a href="customers.html" class="kw-action customers">' +
            '<span class="kw-action-icon">👥</span>' +
            '<span class="kw-action-label">Customers</span>' +
          '</a>' +
          '<a href="settings.html" class="kw-action profile">' +
            '<span class="kw-action-icon">⚙️</span>' +
            '<span class="kw-action-label">Settings</span>' +
          '</a>' +
        '</div>' +
      '</div>' +

      '<div class="kw-section">' +
        '<h2 class="kw-section-title">Recent Invoices</h2>' +
        recentHtml +
      '</div>';

    $('homeRoot').innerHTML = html;
    $('bottomNav').style.display = '';

    var acctBtn = $('kwAcctBtn');
    if (acctBtn){
      acctBtn.addEventListener('click', function(){
        location.href = 'settings.html';
      });
    }
  }
})();
