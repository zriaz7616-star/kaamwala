(function(){
  'use strict';

  var currentFilter = 'all';
  var allInvoices = [];

  document.addEventListener('DOMContentLoaded', function(){
    if (!window.FB) return;
    window.FB.waitForAuth().then(function(u){
      if (!u){ location.href = 'auth.html'; return; }
      loadInvoices();
    });
  });

  function $(id){ return document.getElementById(id); }

  function escapeHtml(s){
    return String(s==null?'':s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  var CURRENCY_SYMBOLS = {PKR:'Rs', USD:'$', AED:'AED', GBP:'GBP'};
  function formatMoney(n, cur){
    var sym = CURRENCY_SYMBOLS[cur] || (cur + ' ');
    var v = (Math.round((n||0)*100)/100).toLocaleString('en-US',
      {minimumFractionDigits:2, maximumFractionDigits:2});
    return sym + ' ' + v;
  }
  function formatDateShort(iso){
    if (!iso) return '—';
    try {
      var d = new Date(iso);
      return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    } catch(e){ return iso; }
  }
  function totalsOf(inv){
    var sub = (inv.items || []).reduce(function(s,it){ return s + (it.amount||0); }, 0);
    return {subtotal:sub, total:sub};
  }

  function loadInvoices(){
    var wrap = $('listWrap');
    wrap.innerHTML = '<div class="empty"><div class="empty-icon">☁️</div><h2>Loading from cloud…</h2></div>';
    window.FB.getInvoices().then(function(list){
      allInvoices = list || [];
      render();
    }).catch(function(err){
      console.error(err);
      wrap.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><h2>Could not load invoices</h2><p>Check internet and try again.</p></div>';
    });
  }

  function render(){
    var wrap = $('listWrap');

    if (allInvoices.length === 0){
      wrap.innerHTML =
        '<div class="empty">' +
          '<div class="empty-icon">📄</div>' +
          '<h2>No saved invoices yet</h2>' +
          '<p>Create your first invoice. Saved invoices appear here and sync across devices.</p>' +
          '<a href="app.html" class="btn btn-primary">+ Create Invoice</a>' +
        '</div>';
      return;
    }

    wrap.innerHTML = allInvoices.map(function(inv){
      var cur = (inv.invoice && inv.invoice.currency) || 'PKR';
      var t = totalsOf(inv);
      var invNum = (inv.invoice && inv.invoice.number) || 'INV';
      var client = (inv.to && inv.to.name) || 'Untitled client';
      var date = formatDateShort(inv.savedAt || (inv.invoice && inv.invoice.date));
      var itemsCount = (inv.items || []).filter(function(x){ return x.desc; }).length;

      return (
        '<div class="inv-card" data-id="' + escapeHtml(inv.id || '') + '">' +
          '<div class="inv-card-top">' +
            '<div>' +
              '<p class="inv-card-num">' + escapeHtml(invNum) + '</p>' +
              '<p class="inv-card-client">' + escapeHtml(client) + '</p>' +
            '</div>' +
            '<p class="inv-card-date">' + escapeHtml(date) + '</p>' +
          '</div>' +
          '<p class="inv-card-total">' + escapeHtml(formatMoney(t.total, cur)) + '</p>' +
          '<p class="inv-card-meta">' + itemsCount + ' item' + (itemsCount === 1 ? '' : 's') + '</p>' +
          '<div class="inv-card-actions">' +
            '<button class="btn-load" data-action="load" data-id="' + escapeHtml(inv.id || '') + '">✏️ Open in Editor</button>' +
            '<button class="btn-del" data-action="delete" data-id="' + escapeHtml(inv.id || '') + '">🗑 Delete</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    wrap.addEventListener('click', onAction);
  }

  function onAction(e){
    var btn = e.target.closest('button[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    var id = btn.getAttribute('data-id');
    if (!id) return;
    if (action === 'load') loadIntoEditor(id);
    else if (action === 'delete') confirmDelete(id);
  }

  function loadIntoEditor(id){
    var inv = null;
    for (var i = 0; i < allInvoices.length; i++){
      if (allInvoices[i].id === id){ inv = allInvoices[i]; break; }
    }
    if (!inv){ toast('Invoice not found'); return; }
    try {
      sessionStorage.setItem('kw_pending_load', JSON.stringify(inv));
      location.href = 'app.html?from=history';
    } catch(e){ toast('Could not load'); }
  }

  function confirmDelete(id){
    var overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML =
      '<div class="confirm-box">' +
        '<h3>Delete invoice?</h3>' +
        '<p>This cannot be undone.</p>' +
        '<div class="confirm-actions">' +
          '<button class="confirm-no" data-ans="no">Cancel</button>' +
          '<button class="confirm-yes" data-ans="yes">Delete</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e){
      var b = e.target.closest('button[data-ans]');
      if (!b) return;
      var ans = b.getAttribute('data-ans');
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (ans !== 'yes') return;
      window.FB.deleteInvoice(id).then(function(){
        allInvoices = allInvoices.filter(function(x){ return x.id !== id; });
        toast('✓ Invoice deleted');
        render();
      }).catch(function(err){
        toast('Delete failed: ' + (err.message || ''));
      });
    });
  }

  var toastTimer = null;
  function toast(msg){
    var t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('is-on');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ t.classList.remove('is-on'); }, 2600);
  }
})();
