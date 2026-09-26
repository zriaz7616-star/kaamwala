(function(){
  'use strict';

  var CURRENCY_SYMBOLS = {PKR:'Rs', USD:'$', AED:'AED', GBP:'GBP'};
  var allInvoices = [];
  var allCustomers = [];
  var currentProfile = null;
  var searchQuery = '';

  document.addEventListener('DOMContentLoaded', function(){
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
      allInvoices = res[1] || [];
      allCustomers = aggregateCustomers(allInvoices);
      render();
    }).catch(function(err){
      console.error('[KW] customers load failed:', err);
      document.getElementById('customersRoot').innerHTML =
        '<div class="kw-loading">Could not load. <a href="customers.html" style="color:#0F766E">Retry</a></div>';
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

  function aggregateCustomers(invoices){
    var map = {};
    invoices.forEach(function(inv){
      var name = ((inv.to && inv.to.name) || '').trim();
      if (!name) return;
      var key = name.toLowerCase();
      if (!map[key]){
        map[key] = {
          key: key, name: name,
          phone: '', email: '', address: '',
          invoiceCount: 0, totalBilled: 0,
          totalPaid: 0, totalUnpaid: 0,
          lastDate: null
        };
      }
      var c = map[key];
      c.invoiceCount++;
      var total = (inv.items||[]).reduce(function(s,it){
        return s + (parseFloat(it.amount) || 0);
      }, 0);
      c.totalBilled += total;
      var st = getStatus(inv);
      if (st === 'paid') c.totalPaid += total;
      else c.totalUnpaid += total;
      if (inv.to){
        if (!c.phone && inv.to.phone) c.phone = inv.to.phone;
        if (!c.email && inv.to.email) c.email = inv.to.email;
        if (!c.address && inv.to.address) c.address = inv.to.address;
      }
      var d = inv.savedAt || (inv.invoice && inv.invoice.date);
      if (d && (!c.lastDate || d > c.lastDate)) c.lastDate = d;
    });
    var arr = Object.keys(map).map(function(k){ return map[k]; });
    arr.sort(function(a, b){
      if (a.totalUnpaid !== b.totalUnpaid) return b.totalUnpaid - a.totalUnpaid;
      return String(b.lastDate || '').localeCompare(String(a.lastDate || ''));
    });
    return arr;
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
      return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'});
    } catch(e){ return iso; }
  }

  function buildListHtml(){
    var currency = (currentProfile && currentProfile.currency) || 'PKR';
    var filtered = allCustomers;
    if (searchQuery){
      var q = searchQuery.toLowerCase();
      filtered = allCustomers.filter(function(c){
        return c.name.toLowerCase().indexOf(q) !== -1 ||
               (c.phone && c.phone.indexOf(q) !== -1);
      });
    }
    if (filtered.length === 0){
      return (
        '<div class="kw-empty" style="margin:0 16px">' +
          '<div class="kw-empty-icon">👥</div>' +
          '<h3>' + (searchQuery ? 'No matches' : 'No customers yet') + '</h3>' +
          '<p>' + (searchQuery ? 'Try different search' : 'Create an invoice — customers will appear here') + '</p>' +
          '<a href="app.html" class="kw-btn-primary">+ New Invoice</a>' +
        '</div>'
      );
    }
    var inner = filtered.map(function(c){
      var initial = (c.name.charAt(0) || 'C').toUpperCase();
      var bg = avatarColor(c.name);
      var isClear = c.totalUnpaid < 0.01;
      var amtClass = isClear ? 'clear' : 'due';
      var amtLabel = isClear ? 'Clear' : 'Outstanding';
      var amtDisplay = isClear
        ? formatMoneyShort(c.totalPaid, currency)
        : formatMoneyShort(c.totalUnpaid, currency);
      var dateStr = formatDateShort(c.lastDate);
      return (
        '<a href="customer.html?key=' + encodeURIComponent(c.key) + '" class="kw-cust-card">' +
          '<div class="kw-cust-avatar" style="background:' + bg + '">' + escapeHtml(initial) + '</div>' +
          '<div class="kw-cust-body">' +
            '<p class="kw-cust-name">' + escapeHtml(c.name) + '</p>' +
            '<p class="kw-cust-meta">' + c.invoiceCount + ' invoice' + (c.invoiceCount === 1 ? '' : 's') + ' · ' + escapeHtml(dateStr) + '</p>' +
          '</div>' +
          '<div class="kw-cust-amount">' +
            '<p class="kw-cust-owed ' + amtClass + '">' + escapeHtml(amtDisplay) + '</p>' +
            '<span class="kw-cust-owed-lbl">' + amtLabel + '</span>' +
          '</div>' +
        '</a>'
      );
    }).join('');
    return '<div style="margin:0 16px;max-width:640px;margin-left:auto;margin-right:auto">' + inner + '</div>';
  }

  function render(){
    var currency = (currentProfile && currentProfile.currency) || 'PKR';
    var totalOwed = allCustomers.reduce(function(s,c){ return s + c.totalUnpaid; }, 0);
    var totalPaid = allCustomers.reduce(function(s,c){ return s + c.totalPaid; }, 0);

    var html =
      '<div class="kw-header">' +
        '<div class="kw-header-top">' +
          '<div class="kw-brand"><span class="kw-mark">KW</span><span>Customers</span></div>' +
          '<a href="home.html" class="kw-icon-btn" aria-label="Home">🏠</a>' +
        '</div>' +
        '<p class="kw-greeting">' + allCustomers.length + ' total customer' + (allCustomers.length === 1 ? '' : 's') + '</p>' +
        '<h1 class="kw-biz-name">' + escapeHtml(formatMoneyShort(totalOwed, currency)) + '</h1>' +
        '<p class="kw-biz-meta">Total outstanding</p>' +
      '</div>' +

      '<div class="kw-stats">' +
        '<div class="kw-stat">' +
          '<span class="kw-stat-icon">👥</span>' +
          '<span class="kw-stat-num">' + allCustomers.length + '</span>' +
          '<span class="kw-stat-lbl">Customers</span>' +
        '</div>' +
        '<div class="kw-stat pending">' +
          '<span class="kw-stat-icon">⏳</span>' +
          '<span class="kw-stat-num">' + formatMoneyShort(totalOwed, currency) + '</span>' +
          '<span class="kw-stat-lbl">Pending</span>' +
        '</div>' +
        '<div class="kw-stat revenue">' +
          '<span class="kw-stat-icon">✅</span>' +
          '<span class="kw-stat-num">' + formatMoneyShort(totalPaid, currency) + '</span>' +
          '<span class="kw-stat-lbl">Received</span>' +
        '</div>' +
      '</div>' +

      '<div class="kw-search-bar">' +
        '<input type="text" id="kwCustSearch" placeholder="Search name or phone…" value="' + escapeHtml(searchQuery) + '" autocomplete="off">' +
      '</div>' +

      '<div id="kwCustList">' + buildListHtml() + '</div>';

    $('customersRoot').innerHTML = html;
    $('bottomNav').style.display = '';

    var searchEl = $('kwCustSearch');
    if (searchEl){
      searchEl.addEventListener('input', function(){
        searchQuery = this.value.trim();
        var listEl = $('kwCustList');
        if (listEl) listEl.innerHTML = buildListHtml();
      });
    }
  }
})();
