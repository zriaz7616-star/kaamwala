(function(){
  'use strict';

  var CURRENCY_SYMBOLS = {PKR:'Rs', USD:'$', AED:'AED', GBP:'GBP'};
  var allInvoices = [];
  var currentProfile = null;
  var currentFilter = 'all';

  document.addEventListener('DOMContentLoaded', function(){
    if (!window.FB) return;
    window.FB.waitForAuth().then(function(u){
      if (!u){ location.href = 'auth.html'; return; }
      return Promise.all([window.FB.getProfile(), window.FB.getInvoices()]);
    }).then(function(res){
      if (!res) return;
      currentProfile = res[0] || {};
      allInvoices = res[1] || [];
      render();
    }).catch(function(err){
      console.error('[KW] history failed:', err);
      document.getElementById('listRoot').innerHTML =
        '<div class="kw-loading">Could not load. <a href="history.html" style="color:#0F766E">Retry</a></div>';
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
      return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    } catch(e){ return iso; }
  }

  function calcTotal(inv){
    return (inv.items||[]).reduce(function(s,it){
      return s + (parseFloat(it.amount) || 0);
    }, 0);
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

  function render(){
    var cur = (currentProfile && currentProfile.currency) || 'PKR';
    var totalBilled = 0, totalPaid = 0, totalUnpaid = 0;
    allInvoices.forEach(function(inv){
      var t = calcTotal(inv);
      totalBilled += t;
      var s = getStatus(inv);
      if (s === 'paid') totalPaid += t;
      else totalUnpaid += t;
    });

    var filtered = allInvoices.filter(function(inv){
      if (currentFilter === 'all') return true;
      return getStatus(inv) === currentFilter;
    });

    var listHtml;
    if (filtered.length === 0){
      listHtml =
        '<div class="kw-empty" style="margin:16px">' +
          '<div class="kw-empty-icon">📄</div>' +
          '<h3>' + (allInvoices.length === 0 ? 'No invoices yet' : 'No ' + currentFilter + ' invoices') + '</h3>' +
          '<p>' + (allInvoices.length === 0 ? 'Create your first invoice — takes 1 minute.' : 'Try a different filter.') + '</p>' +
          (allInvoices.length === 0 ? '<a href="app.html" class="kw-btn-primary">+ New Invoice</a>' : '') +
        '</div>';
    } else {
      listHtml = filtered.map(function(inv){
        var client = (inv.to && inv.to.name) || 'Client';
        var invNum = (inv.invoice && inv.invoice.number) || 'INV';
        var date = formatDateShort(inv.savedAt || (inv.invoice && inv.invoice.date));
        var total = calcTotal(inv);
        var status = getStatus(inv);
        var statusLabel = status === 'paid' ? 'PAID' : (status === 'overdue' ? 'OVERDUE' : 'UNPAID');
        return (
          '<div class="inv-card">' +
            '<div class="inv-top">' +
              '<div>' +
                '<p class="inv-num">' + escapeHtml(invNum) + '</p>' +
                '<p class="inv-client">' + escapeHtml(client) + '</p>' +
              '</div>' +
              '<div style="text-align:right">' +
                '<p class="inv-date">' + escapeHtml(date) + '</p>' +
                '<span class="inv-status-badge-sm ' + status + '">' + statusLabel + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="inv-meta-row">' +
              '<span style="color:#64748B;font-size:.82rem">' + (inv.items || []).length + ' item' + ((inv.items || []).length === 1 ? '' : 's') + '</span>' +
              '<p class="inv-amount">' + formatMoney(total, cur) + '</p>' +
            '</div>' +
            '<div class="inv-actions-row">' +
              '<button class="inv-action-btn edit" data-action="load" data-id="' + escapeHtml(inv.id || '') + '">✏️ Edit</button>' +
              '<button class="inv-action-btn share" data-action="share" data-id="' + escapeHtml(inv.id || '') + '">📤 Share</button>' +
              '<button class="inv-action-btn del" data-action="delete" data-id="' + escapeHtml(inv.id || '') + '">🗑 Delete</button>' +
            '</div>' +
          '</div>'
        );
      }).join('');
    }

    var html =
      '<div class="kw-header">' +
        '<div class="kw-header-top">' +
          '<div class="kw-brand"><span class="kw-mark">KW</span><span>Invoices</span></div>' +
          '<a href="home.html" class="kw-icon-btn" aria-label="Home">🏠</a>' +
        '</div>' +
        '<p class="kw-greeting">' + allInvoices.length + ' total invoice' + (allInvoices.length === 1 ? '' : 's') + '</p>' +
        '<h1 class="kw-biz-name">' + escapeHtml(formatMoneyShort(totalBilled, cur)) + '</h1>' +
        '<p class="kw-biz-meta">Total billed</p>' +
      '</div>' +

      '<div class="kw-stats">' +
        '<div class="kw-stat">' +
          '<span class="kw-stat-icon">📄</span>' +
          '<span class="kw-stat-num">' + allInvoices.length + '</span>' +
          '<span class="kw-stat-lbl">Invoices</span>' +
        '</div>' +
        '<div class="kw-stat revenue">' +
          '<span class="kw-stat-icon">✅</span>' +
          '<span class="kw-stat-num">' + formatMoneyShort(totalPaid, cur) + '</span>' +
          '<span class="kw-stat-lbl">Received</span>' +
        '</div>' +
        '<div class="kw-stat pending">' +
          '<span class="kw-stat-icon">⏳</span>' +
          '<span class="kw-stat-num">' + formatMoneyShort(totalUnpaid, cur) + '</span>' +
          '<span class="kw-stat-lbl">Pending</span>' +
        '</div>' +
      '</div>' +

      '<div class="kw-filter-row">' +
        '<button class="kw-filter-btn' + (currentFilter === 'all' ? ' active' : '') + '" data-filter="all">All</button>' +
        '<button class="kw-filter-btn' + (currentFilter === 'unpaid' ? ' active' : '') + '" data-filter="unpaid">Unpaid</button>' +
        '<button class="kw-filter-btn' + (currentFilter === 'paid' ? ' active' : '') + '" data-filter="paid">Paid</button>' +
        '<button class="kw-filter-btn' + (currentFilter === 'overdue' ? ' active' : '') + '" data-filter="overdue">Overdue</button>' +
      '</div>' +

      '<div style="padding:12px 16px 40px;max-width:640px;margin:0 auto" id="listWrap">' + listHtml + '</div>';

    $('listRoot').innerHTML = html;
    $('bottomNav').style.display = '';

    document.querySelectorAll('.kw-filter-btn').forEach(function(b){
      b.addEventListener('click', function(){
        currentFilter = b.getAttribute('data-filter');
        render();
      });
    });

    var listWrap = $('listWrap');
    if (listWrap){
      listWrap.addEventListener('click', function(e){
        var btn = e.target.closest('button[data-action]');
        if (!btn) return;
        var action = btn.getAttribute('data-action');
        var id = btn.getAttribute('data-id');
        if (action === 'load') loadIntoEditor(id);
        else if (action === 'share') shareInvoice(id);
        else if (action === 'delete') confirmDelete(id);
      });
    }
  }

  function loadIntoEditor(id){
    var inv = null;
    for (var i = 0; i < allInvoices.length; i++){
      if (allInvoices[i].id === id){ inv = allInvoices[i]; break; }
    }
    if (!inv){ alert('Invoice not found'); return; }
    try {
      sessionStorage.setItem('kw_pending_load', JSON.stringify(inv));
      location.href = 'app.html';
    } catch(e){ alert('Could not load'); }
  }

  function shareInvoice(id){
    var inv = null;
    for (var i = 0; i < allInvoices.length; i++){
      if (allInvoices[i].id === id){ inv = allInvoices[i]; break; }
    }
    if (!inv){ alert('Invoice not found'); return; }

    var cur = (currentProfile && currentProfile.currency) || 'PKR';
    var client = (inv.to && inv.to.name) || 'Customer';
    var total = calcTotal(inv);
    var invNum = (inv.invoice && inv.invoice.number) || 'INV';
    var status = getStatus(inv);
    var statusText = status === 'paid' ? 'PAID ✓' : (status === 'overdue' ? 'OVERDUE' : 'UNPAID');

    var text =
      '*Invoice ' + invNum + '*\n' +
      'To: ' + client + '\n' +
      'Amount: ' + formatMoney(total, cur) + '\n' +
      'Status: ' + statusText + '\n\n' +
      'View in KaamWala: https://zriaz7616-star.github.io/kaamwala/history.html';

    if (navigator.share){
      navigator.share({ title: 'Invoice ' + invNum, text: text })
        .catch(function(err){
          if (err && err.name === 'AbortError') return;
        });
    } else {
      // Fallback: WhatsApp
      window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
    }
  }

  function confirmDelete(id){
    if (!confirm('Delete this invoice? This cannot be undone.')) return;
    window.FB.deleteInvoice(id).then(function(){
      allInvoices = allInvoices.filter(function(x){ return x.id !== id; });
      render();
    }).catch(function(err){
      alert('Delete failed: ' + (err.message || ''));
    });
  }
})();
