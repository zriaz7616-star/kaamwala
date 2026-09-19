(function(){
  'use strict';

  var CURRENCY_SYMBOLS = {PKR:'Rs ', USD:'$', AED:'AED ', GBP:'£'};

  document.addEventListener('DOMContentLoaded', init);

  function init(){
    setDefaults();
    bindTabs();
    bindFields();
    bindItems();
    bindSave();
    renderItems();
    renderPreview();
  }

  function $(id){ return document.getElementById(id); }
  function escapeHtml(s){
    return String(s==null?'':s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function setDefaults(){
    var today = new Date();
    var isoToday = today.toISOString().slice(0,10);
    var due = new Date(today.getTime());
    due.setDate(due.getDate() + 14);
    $('invDate').value = isoToday;
    $('invDue').value = due.toISOString().slice(0,10);
    $('invNumber').value = 'INV-' + String(Date.now()).slice(-5);
  }

  function bindTabs(){
    document.querySelectorAll('.tab').forEach(function(t){
      t.addEventListener('click', function(){
        document.querySelectorAll('.tab').forEach(function(x){ x.classList.remove('is-active'); });
        t.classList.add('is-active');
        var tab = t.getAttribute('data-tab');
        $('view-edit').classList.toggle('is-hidden', tab !== 'edit');
        $('view-preview').classList.toggle('is-hidden', tab !== 'preview');
        if (tab === 'preview') renderPreview();
      });
    });
  }

  function bindFields(){
    var ids = ['fromName','fromEmail','fromPhone','fromAddress',
               'toName','toEmail','toPhone','toAddress',
               'invNumber','invDate','invDue','invCurrency','invNotes'];
    ids.forEach(function(id){
      var el = $(id);
      if (!el) return;
      el.addEventListener('input', renderPreview);
      el.addEventListener('change', renderPreview);
    });
  }

  function bindItems(){
    $('addItemBtn').addEventListener('click', function(){
      addItem({desc:'', qty:1, rate:0});
      renderItems();
      renderPreview();
    });

    var itemsWrap = $('items');
    itemsWrap.addEventListener('input', function(e){
      var t = e.target;
      if (t.matches('.item-desc,.item-qty,.item-rate')) {
        updateAmounts();
        renderPreview();
      }
    });
    itemsWrap.addEventListener('click', function(e){
      var t = e.target;
      if (t.classList.contains('remove-btn')) {
        var row = t.closest('.item-row');
        if (row && row.parentNode) {
          row.parentNode.removeChild(row);
          ensureAtLeastOne();
          updateAmounts();
          renderPreview();
        }
      }
    });
  }

  function ensureAtLeastOne(){
    var wrap = $('items');
    if (wrap.querySelectorAll('.item-row').length === 0) {
      wrap.appendChild(makeItemRow({desc:'', qty:1, rate:0}));
    }
  }

  function addItem(item){
    $('items').appendChild(makeItemRow(item));
  }

  function makeItemRow(item){
    var row = document.createElement('div');
    row.className = 'item-row';

    var desc = document.createElement('input');
    desc.type = 'text';
    desc.className = 'item-desc';
    desc.placeholder = 'Service or product description';
    desc.value = item.desc || '';

    var grid = document.createElement('div');
    grid.className = 'item-grid';

    function numField(cls, labelText, value){
      var label = document.createElement('label');
      var span = document.createElement('span');
      span.textContent = labelText;
      var inp = document.createElement('input');
      inp.type = 'number';
      inp.className = cls;
      inp.inputMode = 'decimal';
      inp.min = '0';
      inp.step = '0.01';
      inp.value = value;
      label.appendChild(span);
      label.appendChild(inp);
      return label;
    }

    grid.appendChild(numField('item-qty','Qty', item.qty != null ? item.qty : 1));
    grid.appendChild(numField('item-rate','Rate', item.rate != null ? item.rate : 0));

    var amtLabel = document.createElement('label');
    var amtSpan = document.createElement('span');
    amtSpan.textContent = 'Amount';
    var amt = document.createElement('input');
    amt.type = 'text';
    amt.className = 'item-amount';
    amt.readOnly = true;
    amt.value = '0.00';
    amtLabel.appendChild(amtSpan);
    amtLabel.appendChild(amt);
    grid.appendChild(amtLabel);

    var rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'remove-btn';
    rm.textContent = '×';
    rm.setAttribute('aria-label','Remove item');
    grid.appendChild(rm);

    row.appendChild(desc);
    row.appendChild(grid);
    return row;
  }

  function bindSave(){
    $('saveBtn').addEventListener('click', saveInvoice);
  }

  function readData(){
    var data = {
      from: {
        name: $('fromName').value.trim(),
        email: $('fromEmail').value.trim(),
        phone: $('fromPhone').value.trim(),
        address: $('fromAddress').value.trim()
      },
      to: {
        name: $('toName').value.trim(),
        email: $('toEmail').value.trim(),
        phone: $('toPhone').value.trim(),
        address: $('toAddress').value.trim()
      },
      invoice: {
        number: $('invNumber').value.trim(),
        date: $('invDate').value,
        due: $('invDue').value,
        currency: $('invCurrency').value,
        notes: $('invNotes').value.trim()
      },
      items: []
    };
    document.querySelectorAll('.item-row').forEach(function(row){
      var desc = row.querySelector('.item-desc').value.trim();
      var qty = parseFloat(row.querySelector('.item-qty').value) || 0;
      var rate = parseFloat(row.querySelector('.item-rate').value) || 0;
      data.items.push({desc:desc, qty:qty, rate:rate, amount: qty * rate});
    });
    return data;
  }

  function calcTotals(items){
    var sub = items.reduce(function(s,it){ return s + (it.amount||0); }, 0);
    return {subtotal:sub, total:sub};
  }

  function formatMoney(n, cur){
    var sym = CURRENCY_SYMBOLS[cur] || (cur + ' ');
    var v = (Math.round((n||0)*100)/100).toLocaleString('en-US',
      {minimumFractionDigits:2, maximumFractionDigits:2});
    return sym + v;
  }

  function formatDate(iso){
    if (!iso) return '—';
    try {
      var d = new Date(iso + 'T00:00:00');
      return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    } catch(e){ return iso; }
  }

  function updateAmounts(){
    var cur = $('invCurrency').value;
    document.querySelectorAll('.item-row').forEach(function(row){
      var qty = parseFloat(row.querySelector('.item-qty').value) || 0;
      var rate = parseFloat(row.querySelector('.item-rate').value) || 0;
      row.querySelector('.item-amount').value = (qty * rate).toFixed(2);
    });
    var totals = calcTotals(readData().items);
    return totals;
  }

  function renderItems(){
    var wrap = $('items');
    if (wrap.querySelectorAll('.item-row').length === 0) {
      wrap.appendChild(makeItemRow({desc:'', qty:1, rate:0}));
    }
    updateAmounts();
  }

  function renderPreview(){
    var d = readData();
    var totals = calcTotals(d.items);
    var cur = d.invoice.currency;
    var el = $('preview');

    var itemsHtml = '';
    var hasItems = d.items.some(function(it){ return it.desc || it.qty || it.rate; });
    if (hasItems) {
      itemsHtml = d.items.map(function(it){
        return '<tr>' +
          '<td>' + (escapeHtml(it.desc) || '<span style="color:#94A3B8">—</span>') + '</td>' +
          '<td class="num">' + escapeHtml(String(it.qty)) + '</td>' +
          '<td class="num">' + formatMoney(it.rate, cur) + '</td>' +
          '<td class="num">' + formatMoney(it.amount, cur) + '</td>' +
        '</tr>';
      }).join('');
    } else {
      itemsHtml = '<tr><td colspan="4" style="text-align:center;color:#94A3B8;padding:20px">No items yet</td></tr>';
    }

    var fromLines = [
      d.from.email, d.from.phone, d.from.address
    ].filter(Boolean).map(function(l){ return '<p class="inv-party-line">'+escapeHtml(l)+'</p>'; }).join('');

    var toLines = [
      d.to.email, d.to.phone, d.to.address
    ].filter(Boolean).map(function(l){ return '<p class="inv-party-line">'+escapeHtml(l)+'</p>'; }).join('');

    el.innerHTML =
      '<div class="inv-head">' +
        '<div>' +
          '<div class="inv-brand">KaamWala</div>' +
          '<div class="inv-label">Invoice</div>' +
        '</div>' +
        '<div style="text-align:right">' +
          '<p class="inv-title">' + escapeHtml(d.invoice.number || '—') + '</p>' +
        '</div>' +
      '</div>' +

      '<div class="inv-parties">' +
        '<div>' +
          '<div class="inv-label">From</div>' +
          '<p class="inv-party-name">' + (escapeHtml(d.from.name) || 'Your business') + '</p>' +
          fromLines +
        '</div>' +
        '<div>' +
          '<div class="inv-label">Bill To</div>' +
          '<p class="inv-party-name">' + (escapeHtml(d.to.name) || 'Client') + '</p>' +
          toLines +
        '</div>' +
      '</div>' +

      '<div class="inv-meta">' +
        '<div class="k">Invoice Date</div><div class="v">' + formatDate(d.invoice.date) + '</div>' +
        '<div class="k">Due Date</div><div class="v">' + formatDate(d.invoice.due) + '</div>' +
      '</div>' +

      '<table class="inv-table">' +
        '<thead><tr>' +
          '<th>Description</th>' +
          '<th class="num">Qty</th>' +
          '<th class="num">Rate</th>' +
          '<th class="num">Amount</th>' +
        '</tr></thead>' +
        '<tbody>' + itemsHtml + '</tbody>' +
      '</table>' +

      '<div class="inv-total">' +
        '<div class="k">Subtotal</div><div class="v">' + formatMoney(totals.subtotal, cur) + '</div>' +
        '<div class="k grand">Total</div><div class="v grand">' + formatMoney(totals.total, cur) + '</div>' +
      '</div>' +

      (d.invoice.notes ? '<div class="inv-notes">' + escapeHtml(d.invoice.notes) + '</div>' : '') +

      '<div class="inv-footer">Made with KaamWala · kaamwala.app</div>';
  }

  function saveInvoice(){
    try {
      var data = readData();
      if (!data.to.name) {
        toast('Please add a client name');
        return;
      }
      if (!data.items.some(function(it){ return it.desc; })) {
        toast('Please add at least one item');
        return;
      }
      data.savedAt = new Date().toISOString();
      data.id = 'inv_' + Date.now();
      var key = 'kw_invoices';
      var all = [];
      try { all = JSON.parse(localStorage.getItem(key) || '[]'); } catch(e){ all = []; }
      all.unshift(data);
      if (all.length > 50) all = all.slice(0, 50);
      localStorage.setItem(key, JSON.stringify(all));
      toast('✓ Invoice saved on this phone');
    } catch (err) {
      toast('Could not save: ' + err.message);
    }
  }

  var toastTimer = null;
  function toast(msg){
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('is-on');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ t.classList.remove('is-on'); }, 2200);
  }
})();
