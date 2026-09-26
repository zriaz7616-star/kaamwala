(function(){
  'use strict';

  var CURRENCY_SYMBOLS = {PKR:'Rs', USD:'$', AED:'AED', GBP:'GBP'};
  var pdfCache = { signature: null, blob: null, file: null, filename: null };
  var prebuildTimer = null;

  var currentUser = null;
  var currentProfile = null;
  var cloudPremium = false;
  var invoiceCount = 0;

  document.addEventListener('DOMContentLoaded', function(){
    if (!window.FB){ alert('Firebase not loaded'); return; }
    window.FB.waitForAuth().then(function(u){
      if (!u){ location.href = 'auth.html'; return; }
      currentUser = u;
      return Promise.all([
        window.FB.getProfile(),
        window.FB.getPremiumStatus(),
        window.FB.getInvoices()
      ]);
    }).then(function(res){
      if (!res) return;
      currentProfile = res[0] || {};
      cloudPremium = !!(res[1] && res[1].premium);
      invoiceCount = (res[2] || []).length;
      bootUI();
    }).catch(function(err){
      console.error('Boot failed:', err);
      setDebug('Boot error: ' + (err.message || ''));
    });
  });

  function bootUI(){
    bindAccount();
    bindTabs();
    bindFields();
    bindItems();
    bindActions();
    bindPaymentStatus();
    setDefaults();
    /* renderBizCard removed */
    renderPremiumBanner();
    populateProductsDatalist();
    renderItems();
    renderPreview();
    setDebug('Ready. Prebuilding PDF…');
    setTimeout(schedulePrebuild, 300);
    setTimeout(handlePendingLoad, 200);
    applyCategoryMode();
  }

  function $(id){ return document.getElementById(id); }
  function setDebug(msg){ var el = $('debug'); if (el) el.textContent = msg; }
  function logDebug(msg){ try { console.log('[KW] ' + msg); } catch(e){} }
  function isPremium(){ return cloudPremium || (window.KW && window.KW.isPremium && window.KW.isPremium()); }
  function escapeHtml(s){
    return String(s==null?'':s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  /* ---------- ACCOUNT ---------- */
  function bindAccount(){
    var btn = $('accountBtn');
    if (btn){
      btn.addEventListener('click', function(e){
        e.preventDefault();
        openAccountMenu();
      });
    }
  }

  function openAccountMenu(){
    if (!currentUser) return;
    var existing = document.querySelector('.kw-overlay');
    if (existing) existing.parentNode.removeChild(existing);

    var overlay = document.createElement('div');
    overlay.className = 'kw-overlay';
    overlay.innerHTML =
      '<div class="kw-modal">' +
        '<h3>👤 Your Account</h3>' +
        '<p style="margin-bottom:10px">Signed in as<br><strong style="color:#0F172A">' + escapeHtml(currentUser.email) + '</strong></p>' +
        (isPremium() ? '<div style="background:#ECFDF5;color:#065F46;padding:10px 12px;border-radius:10px;font-size:.85rem;margin-bottom:12px;font-weight:700;text-align:center">⭐ Premium Active</div>' : '') +
        '<a href="https://wa.me/923007552962?text=KaamWala%20Feedback%3A%20" target="_blank" rel="noopener" class="kw-secondary" style="display:block;text-align:center;text-decoration:none;background:#25D366;color:#fff;font-weight:700;padding:12px;border-radius:12px;margin-top:8px">💬 Send Feedback</a>' +
        '<button class="kw-primary" id="kwLogout">Sign Out</button>' +
        '<button class="kw-secondary" id="kwCloseAcc">Close</button>' +
      '</div>';
    document.body.appendChild(overlay);
    function close(){ if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    overlay.addEventListener('click', function(e){ if (e.target === overlay) close(); });
    $('kwCloseAcc').addEventListener('click', close);
    $('kwLogout').addEventListener('click', function(){
      window.FB.logout().then(function(){
        location.href = 'auth.html';
      });
    });
  }

  /* ---------- BUSINESS CARD ---------- */
  function renderBizCard(){ return; }

  /* ---------- PREMIUM BANNER ---------- */
  function renderPremiumBanner(){
    var wrap = $('premiumBanner');
    if (!wrap) return;
    if (isPremium()){ wrap.innerHTML = ''; return; }
    var remaining = Math.max(0, 3 - invoiceCount);
    wrap.innerHTML =
      '<div class="premium-banner">' +
        '<div class="premium-banner-icon">⭐</div>' +
        '<div class="premium-banner-body">' +
          '<h3>Free plan — ' + remaining + ' invoice' + (remaining === 1 ? '' : 's') + ' remaining</h3>' +
          '<p>Upgrade to remove watermark & get unlimited invoices.</p>' +
        '</div>' +
        '<button class="premium-banner-btn" id="upgradeBtn">Upgrade</button>' +
      '</div>';
    var btn = $('upgradeBtn');
    if (btn) btn.addEventListener('click', openUpgradeModal);
  }

  /* ---------- UPGRADE MODAL ---------- */
  function openUpgradeModal(){
    var existing = document.querySelector('.kw-overlay');
    if (existing) existing.parentNode.removeChild(existing);

    var overlay = document.createElement('div');
    overlay.className = 'kw-overlay';
    overlay.innerHTML =
      '<div class="kw-modal" id="kwUpgradeModal">' +
        '<h3>⭐ Upgrade to Premium</h3>' +
        '<p>Unlock unlimited invoices & remove the "Made with KaamWala" watermark.</p>' +
        '<div class="kw-section-title">Choose your plan</div>' +
        '<div class="kw-price-grid">' +
          '<button type="button" class="kw-price-box is-selected" data-plan="monthly">' +
            '<div class="per">Monthly</div>' +
            '<div class="amt">Rs 499</div>' +
            '<div class="note">per month</div>' +
          '</button>' +
          '<button type="button" class="kw-price-box" data-plan="yearly">' +
            '<div class="per">Yearly</div>' +
            '<div class="amt">Rs 3,999</div>' +
            '<div class="note">save 33%</div>' +
          '</button>' +
        '</div>' +
        '<div class="kw-section-title">How to pay</div>' +
        '<div class="kw-cta-row">' +
          '<strong>1.</strong> Send <strong id="kwPayAmount">Rs 499</strong> (<span id="kwPayPlan">Monthly</span>) to:<br>' +
          '📱 <strong>Easypaisa:</strong> 0342 5681324<br>' +
          '📱 <strong>Raast ID:</strong> 0300 7552962<br>' +
          '<strong>2.</strong> WhatsApp your payment screenshot to <strong>0342 5681324</strong><br>' +
          '<strong>3.</strong> Admin approves your account — premium activates automatically.' +
        '</div>' +
        '<div class="kw-section-title">Have a code? (optional)</div>' +
        '<input type="text" id="kwCodeInput" placeholder="KW-XXXXXX-XXXXXXXX" autocomplete="off" spellcheck="false" autocapitalize="characters">' +
        '<div class="kw-msg" id="kwMsg" style="display:none"></div>' +
        '<button class="kw-primary" id="kwActivate">Unlock Premium</button>' +
        '<button class="kw-secondary" id="kwClose">Close</button>' +
      '</div>';
    document.body.appendChild(overlay);

    function close(){ if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    overlay.addEventListener('click', function(e){ if (e.target === overlay) close(); });
    $('kwClose').addEventListener('click', close);

    var planBoxes = overlay.querySelectorAll('.kw-price-box');
    function updatePay(plan){
      for (var i = 0; i < planBoxes.length; i++){
        planBoxes[i].classList.toggle('is-selected', planBoxes[i].getAttribute('data-plan') === plan);
      }
      var amt = $('kwPayAmount'), lbl = $('kwPayPlan');
      if (plan === 'yearly'){ if (amt) amt.textContent = 'Rs 3,999'; if (lbl) lbl.textContent = 'Yearly'; }
      else { if (amt) amt.textContent = 'Rs 499'; if (lbl) lbl.textContent = 'Monthly'; }
    }
    for (var i = 0; i < planBoxes.length; i++){
      (function(box){
        var plan = box.getAttribute('data-plan');
        box.onclick = function(ev){ ev.preventDefault(); ev.stopPropagation(); updatePay(plan); };
        box.ontouchend = function(ev){ ev.preventDefault(); ev.stopPropagation(); updatePay(plan); };
      })(planBoxes[i]);
    }

    $('kwActivate').addEventListener('click', function(){
      var code = ($('kwCodeInput').value || '').trim();
      var msg = $('kwMsg');
      if (!code){
        msg.style.display = 'block';
        msg.className = 'kw-msg kw-msg-err';
        msg.textContent = 'Enter code, or contact admin for approval.';
        return;
      }
      var res = window.KW ? window.KW.activate(code) : {ok:false, reason:'Not available'};
      if (res.ok){
        msg.style.display = 'block';
        msg.className = 'kw-msg kw-msg-ok';
        msg.textContent = '✓ Premium unlocked (local)! Sync cloud next login.';
        setTimeout(function(){ close(); refreshUI(); }, 1400);
      } else {
        msg.style.display = 'block';
        msg.className = 'kw-msg kw-msg-err';
        msg.textContent = '✗ ' + (res.reason || 'Invalid code');
      }
    });
  }

  function refreshUI(){
    /* renderBizCard removed */
    renderPremiumBanner();
    renderPreview();
    pdfCache = { signature:null, blob:null, file:null, filename:null };
    schedulePrebuild();
  }

  /* ---------- PRODUCTS ---------- */
  function populateProductsDatalist(){
    var p = currentProfile || {};
    var dl = $('kwProducts');
    if (!dl) return;
    dl.innerHTML = '';
    if (!p.products || !p.products.length) return;
    p.products.forEach(function(prod){
      if (!prod.name) return;
      var opt = document.createElement('option');
      opt.value = prod.name;
      dl.appendChild(opt);
    });
  }

  function findProduct(name){
    var p = currentProfile || {};
    if (!p.products) return null;
    var needle = String(name || '').trim().toLowerCase();
    if (!needle) return null;
    for (var i = 0; i < p.products.length; i++){
      if (String(p.products[i].name || '').toLowerCase() === needle) return p.products[i];
    }
    return null;
  }

  /* ---------- DEFAULTS ---------- */
  function setDefaults(){
    var today = new Date();
    var isoToday = today.toISOString().slice(0,10);
    var due = new Date(today.getTime());
    due.setDate(due.getDate() + 14);
    $('invDate').value = isoToday;
    $('invDue').value = due.toISOString().slice(0,10);
    var prefix = (currentProfile && currentProfile.prefix) ? currentProfile.prefix : 'INV';
    if (!$('invNumber').value){
      $('invNumber').value = prefix + '-' + String(Date.now()).slice(-5);
    }
    if (currentProfile && currentProfile.currency && $('invCurrency')) $('invCurrency').value = currentProfile.currency;
  }

  /* ---------- TABS / FIELDS / ITEMS ---------- */
  function bindTabs(){
    document.querySelectorAll('.kw-inv-tab').forEach(function(t){
      t.addEventListener('click', function(){
        document.querySelectorAll('.kw-inv-tab').forEach(function(x){ x.classList.remove('is-active'); });
        t.classList.add('is-active');
        var tab = t.getAttribute('data-tab');
        $('view-edit').classList.toggle('is-hidden', tab !== 'edit');
        $('view-preview').classList.toggle('is-hidden', tab !== 'preview');
        if (tab === 'preview') renderPreview();
        schedulePrebuild();
      });
    });
  }

  function bindFields(){
    var ids = ['toName','toEmail','toPhone','toAddress',
               'invNumber','invDate','invDue','invCurrency','invNotes'];
    ids.forEach(function(id){
      var el = $(id);
      if (!el) return;
      el.addEventListener('input', function(){ renderPreview(); schedulePrebuild(); });
      el.addEventListener('change', function(){ renderPreview(); schedulePrebuild(); });
    });
  }

  function bindItems(){
    $('addItemBtn').addEventListener('click', function(){
      addItem({desc:'', qty:1, rate:0});
      renderItems();
      renderPreview();
      schedulePrebuild();
    });
    var itemsWrap = $('items');
    itemsWrap.addEventListener('input', function(e){
      var t = e.target;
      if (t.matches('.kw-inv-item-desc,.kw-inv-item-qty,.kw-inv-item-rate')){
        updateAmounts();
        renderPreview();
        schedulePrebuild();
      }
    });
    itemsWrap.addEventListener('click', function(e){
      var t = e.target;
      if (t.classList.contains('kw-inv-item-del')){
        var row = t.closest('.kw-inv-item');
        if (row && row.parentNode){
          row.parentNode.removeChild(row);
          ensureAtLeastOne();
          updateAmounts();
          renderPreview();
          schedulePrebuild();
        }
      }
    });
  }

  function bindActions(){
    $('saveBtn').addEventListener('click', saveInvoice);
    $('shareBtn').addEventListener('click', shareInvoice);
    $('pdfBtn').addEventListener('click', downloadPDF);
    var searchBtn = $('searchProductBtn');
    if (searchBtn) searchBtn.addEventListener('click', openSearchModal);
    var printBtn = $('printBtn');
    if (printBtn) printBtn.addEventListener('click', printInvoice);
  }

  function ensureAtLeastOne(){
    var wrap = $('items');
    if (wrap.querySelectorAll('.kw-inv-item').length === 0){
      wrap.appendChild(makeItemRow({desc:'', qty:1, rate:0}));
    }
  }

  function addItem(item){ $('items').appendChild(makeItemRow(item)); }

  function makeItemRow(item){
    var row = document.createElement('div');
    row.className = 'kw-inv-item';

    var desc = document.createElement('input');
    desc.type = 'text';
    desc.className = 'kw-inv-item-desc';
    desc.placeholder = 'Description of product or service';
    desc.value = item.desc || '';
    desc.setAttribute('list', 'kwProducts');
    desc.setAttribute('autocomplete', 'off');

    var grid = document.createElement('div');
    grid.className = 'kw-inv-item-grid';

    function numField(cls, labelText, value, inputMode){
      var label = document.createElement('label');
      var span = document.createElement('span');
      span.textContent = labelText;
      var inp = document.createElement('input');
      inp.type = 'number';
      inp.className = cls;
      inp.inputMode = inputMode || 'decimal';
      inp.min = '0';
      inp.step = '0.01';
      inp.value = value;
      label.appendChild(span);
      label.appendChild(inp);
      return label;
    }

    // Qty
    grid.appendChild(numField('kw-inv-item-qty', 'Qty', item.qty != null ? item.qty : 1, 'numeric'));

    // Rate
    grid.appendChild(numField('kw-inv-item-rate', 'Rate', item.rate != null ? item.rate : 0));

    // Amount (readonly)
    var amtLabel = document.createElement('label');
    var amtSpan = document.createElement('span');
    amtSpan.textContent = 'Amount';
    var amt = document.createElement('input');
    amt.type = 'text';
    amt.className = 'kw-inv-item-amount';
    amt.readOnly = true;
    amt.value = (item.amount != null ? item.amount.toFixed(2) : '0.00');
    amtLabel.appendChild(amtSpan);
    amtLabel.appendChild(amt);
    grid.appendChild(amtLabel);

    // Delete
    var rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'kw-inv-item-del';
    rm.textContent = '×';
    rm.setAttribute('aria-label','Remove item');
    grid.appendChild(rm);

    desc.addEventListener('change', function(){
      var prod = findProduct(desc.value);
      if (!prod) return;
      var rateInput = row.querySelector('.kw-inv-item-rate');
      if (!rateInput) return;
      var cur = parseFloat(rateInput.value);
      if (!cur || cur === 0){
        rateInput.value = prod.rate || 0;
        rateInput.dispatchEvent(new Event('input', {bubbles:true}));
      }
    });

    row.appendChild(desc);
    row.appendChild(grid);
    return row;
  }

  function getPaymentStatus(){
    var el = document.querySelector('input[name="payStatus"]:checked');
    return el ? el.value : 'unpaid';
  }

  function setPaymentStatus(status){
    var els = document.querySelectorAll('input[name="payStatus"]');
    els.forEach(function(el){
      el.checked = (el.value === (status || 'unpaid'));
    });
    updateStatusHint();
  }

  function updateStatusHint(){
    var hint = document.getElementById('statusHint');
    if (!hint) return;
    var el = document.querySelector('input[name="payStatus"]:checked');
    var val = el ? el.value : 'unpaid';
    if (val === 'paid'){
      hint.textContent = 'Payment received — marked as paid ✓';
      hint.style.color = '#059669';
    } else {
      hint.textContent = "Customer hasn't paid yet — amount due.";
      hint.style.color = '#94A3B8';
    }
  }

  function bindPaymentStatus(){
    var els = document.querySelectorAll('input[name="payStatus"]');
    els.forEach(function(el){
      el.addEventListener('change', updateStatusHint);
    });
    updateStatusHint();
  }

  function readData(){
    var p = currentProfile || {};
    var data = {
      from: {
        name: p.businessName || '',
        ownerName: p.ownerName || '',
        license: p.license || '',
        email: p.email || '',
        phone: p.phone || '',
        address: p.address || '',
        logo: p.logo || ''
      },
      to: { name: $('toName').value.trim(), email: $('toEmail').value.trim(),
            phone: $('toPhone').value.trim(), address: $('toAddress').value.trim() },
      invoice: { number: $('invNumber').value.trim(), date: $('invDate').value,
                 due: $('invDue').value, currency: $('invCurrency').value,
                 notes: $('invNotes').value.trim() },
      status: getPaymentStatus(),
      payment: {
        jazzcash: p.jazzcash || '',
        easypaisa: p.easypaisa || '',
        bank: p.bank || '',
        qrImage: p.qrImage || ''
      },
      items: []
    };
    document.querySelectorAll('.kw-inv-item').forEach(function(row){
      var desc = row.querySelector('.kw-inv-item-desc').value.trim();
      var qty = parseFloat(row.querySelector('.kw-inv-item-qty').value) || 0;
      var rate = parseFloat(row.querySelector('.kw-inv-item-rate').value) || 0;
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
    return sym + ' ' + v;
  }

  function formatMoneyPlain(n, cur){
    var sym = CURRENCY_SYMBOLS[cur] || (cur + ' ');
    var v = (Math.round((n||0)*100)/100).toFixed(2);
    var parts = v.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return sym + ' ' + parts.join('.');
  }

  function formatDate(iso){
    if (!iso) return '—';
    try {
      var d = new Date(iso + 'T00:00:00');
      return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    } catch(e){ return iso; }
  }

  function updateAmounts(){
    document.querySelectorAll('.kw-inv-item').forEach(function(row){
      var qty = parseFloat(row.querySelector('.kw-inv-item-qty').value) || 0;
      var rate = parseFloat(row.querySelector('.kw-inv-item-rate').value) || 0;
      row.querySelector('.kw-inv-item-amount').value = (qty * rate).toFixed(2);
    });
    return calcTotals(readData().items);
  }

  function renderItems(){
    var wrap = $('items');
    if (wrap.querySelectorAll('.kw-inv-item').length === 0){
      wrap.appendChild(makeItemRow({desc:'', qty:1, rate:0}));
    }
    updateAmounts();
  }

  /* ---------- PREVIEW ---------- */
  function renderPreview(){
    var d = readData();
    var totals = calcTotals(d.items);
    var cur = d.invoice.currency;
    var el = $('preview');
    if (!el) return;

    // ---- LETTERHEAD ----
    var logoHtml = d.from.logo
      ? '<img src="' + d.from.logo + '" class="inv-logo" alt="logo">'
      : '<div class="inv-logo-ph">' + escapeHtml(((d.from.name||'B').charAt(0)).toUpperCase()) + '</div>';
    var headLines = [];
    if (d.from.ownerName && d.from.ownerName !== d.from.name) headLines.push(d.from.ownerName);
    if (d.from.license) headLines.push(d.from.license);
    var contactLine = [d.from.phone, d.from.email].filter(Boolean).join('  ·  ');

    var headHtml =
      '<div class="inv-head-block">' +
        logoHtml +
        '<div class="inv-head-text">' +
          '<h1 class="inv-biz-name">' + (escapeHtml(d.from.name) || 'Your Business') + '</h1>' +
          (headLines.length ? '<p class="inv-biz-line">' + escapeHtml(headLines.join('  ·  ')) + '</p>' : '') +
          (contactLine ? '<p class="inv-biz-line">' + escapeHtml(contactLine) + '</p>' : '') +
          (d.from.address ? '<p class="inv-biz-line">' + escapeHtml(d.from.address) + '</p>' : '') +
        '</div>' +
      '</div>';

    // ---- INVOICE META (right-aligned like Invoice Simple) ----
    var metaHtml =
      '<div class="inv-meta-right">' +
        '<div class="inv-meta-row"><span class="k">Invoice</span><span class="v">' + escapeHtml(d.invoice.number || '—') + '</span></div>' +
        '<div class="inv-meta-row"><span class="k">Date</span><span class="v">' + formatDate(d.invoice.date) + '</span></div>' +
        '<div class="inv-meta-row"><span class="k">Due</span><span class="v">' + formatDate(d.invoice.due) + '</span></div>' +
      '</div>'
      +
      '<div style="text-align:right;margin-top:8px">' +
        '<span class="inv-status-badge ' + (d.status === 'paid' ? 'paid' : 'unpaid') + '">' +
          '<span class="dot"></span>' +
          (d.status === 'paid' ? 'PAID' : 'UNPAID') +
        '</span>' +
      '</div>';

    // ---- BILL TO ----
    var toLines = [d.to.phone, d.to.email, d.to.address].filter(Boolean);
    var billTo =
      '<div class="inv-billto">' +
        '<div class="inv-billto-label">Bill To</div>' +
        '<p class="inv-billto-name">' + (escapeHtml(d.to.name) || 'Customer') + '</p>' +
        toLines.map(function(l){ return '<p class="inv-billto-line">' + escapeHtml(l) + '</p>'; }).join('') +
      '</div>';

    // ---- ITEMS (Rate before Qty like Invoice Simple) ----
    var hasItems = d.items.some(function(it){ return it.desc || it.qty || it.rate; });
    var itemsHtml;
    if (hasItems){
      itemsHtml = d.items.map(function(it){
        return '<tr>' +
          '<td>' + (escapeHtml(it.desc) || '<span style="color:#94A3B8">—</span>') + '</td>' +
          '<td class="num">' + formatMoney(it.rate, cur) + '</td>' +
          '<td class="num">' + escapeHtml(String(it.qty)) + '</td>' +
          '<td class="num">' + formatMoney(it.amount, cur) + '</td>' +
        '</tr>';
      }).join('');
    } else {
      itemsHtml = '<tr><td colspan="4" style="text-align:center;color:#94A3B8;padding:22px">No items yet</td></tr>';
    }

    var itemsTable =
      '<table class="inv-items-table">' +
        '<thead><tr>' +
          '<th>Description</th>' +
          '<th class="num">Rate</th>' +
          '<th class="num">Qty</th>' +
          '<th class="num">Amount</th>' +
        '</tr></thead>' +
        '<tbody>' + itemsHtml + '</tbody>' +
      '</table>';

    // ---- PAYMENT (left) + TOTALS (right) ----
    var payLines = [];
    if (d.payment.easypaisa) payLines.push('<div><strong>Easypaisa:</strong> ' + escapeHtml(d.payment.easypaisa) + '</div>');
    if (d.payment.jazzcash) payLines.push('<div><strong>Raast ID:</strong> ' + escapeHtml(d.payment.jazzcash) + '</div>');
    if (d.payment.bank) payLines.push('<div><strong>Bank:</strong> ' + escapeHtml(d.payment.bank) + '</div>');

    var paymentHtml = '';
    if (payLines.length || d.payment.qrImage){
      paymentHtml =
        '<div class="inv-payment-simple">' +
          (d.payment.qrImage ? '<div class="inv-payment-simple-qr"><img src="' + d.payment.qrImage + '" alt="QR"></div>' : '') +
          '<div class="inv-payment-simple-info">' +
            '<div class="inv-payment-simple-title">Payment Info</div>' +
            payLines.join('') +
          '</div>' +
        '</div>';
    } else {
      paymentHtml = '<div></div>';
    }

    var totalsHtml =
      '<div class="inv-totals-block">' +
        '<div class="inv-totals">' +
          '<div class="k">Subtotal</div><div class="v">' + formatMoney(totals.subtotal, cur) + '</div>' +
          '<div class="k grand-k">Total</div><div class="v grand-v">' + formatMoney(totals.total, cur) + '</div>' +
        '</div>' +
      '</div>';

    var bottomRow =
      '<div class="inv-bottom-row">' +
        paymentHtml +
        totalsHtml +
      '</div>';

    // ---- NOTES ----
    var notesHtml = d.invoice.notes
      ? '<div class="inv-notes-block">' + escapeHtml(d.invoice.notes) + '</div>' : '';

    // ---- FOOTER + SIGNATURE ----
    var footerHtml =
      '<div class="inv-signature">' +
        '<div class="inv-signature-label">Authorized Signature</div>' +
        '<div class="inv-signature-line"></div>' +
      '</div>' +
      '<div class="inv-footer-line">' +
        (isPremium() ? 'Thank you for your business.' : 'Made with KaamWala · kaamwala.app') +
      '</div>';

    el.innerHTML =
      headHtml + metaHtml + billTo + itemsTable + bottomRow + notesHtml + footerHtml;
  }

  /* ---------- SAVE ---------- */
  function saveInvoice(){
    var data = readData();
    if (!data.to.name){ toast('Please add a client name'); return; }
    if (!data.items.some(function(it){ return it.desc; })){
      toast('Please add at least one item'); return;
    }

    var editingId = $('editingId') ? $('editingId').value : '';
    var now = new Date().toISOString();

    if (editingId){
      data.id = editingId;
      data.createdAt = data.createdAt || now;
      data.savedAt = now;
      doSave(data, false);
    } else {
      if (!isPremium() && invoiceCount >= 3){
        toast('Free limit reached — upgrade for unlimited');
        setTimeout(openUpgradeModal, 800);
        return;
      }
      data.id = 'inv_' + Date.now();
      data.createdAt = now;
      data.savedAt = now;
      doSave(data, true);
    }
  }

  function doSave(data, isNew){
    var btn = $('saveBtn');
    btn.disabled = true;
    toast('Saving to cloud…');
    window.FB.saveInvoice(data).then(function(){
      if (isNew) invoiceCount++;
      if ($('editingId')) $('editingId').value = data.id;
      if ($('topbarTitle')) $('topbarTitle').textContent = 'Editing Invoice';
      toast(isNew ? '✓ Invoice saved' : '✓ Invoice updated');
      renderPremiumBanner();
    }).catch(function(err){
      toast('Save failed: ' + (err.message || ''));
    }).then(function(){ btn.disabled = false; });
  }

  /* ---------- PENDING LOAD (from history) ---------- */
  function handlePendingLoad(){
    var raw = null;
    try { raw = sessionStorage.getItem('kw_pending_load'); } catch(e){}
    if (!raw) { console.log('[KW] no pending data'); return; }
    try { sessionStorage.removeItem('kw_pending_load'); } catch(e){}

    try {
      var d = JSON.parse(raw);
      console.log('[KW] Loaded pending:', d);
      console.log('[KW] items:', d.items);

      function setVal(id, v){
        var el = $(id);
        if (!el) return;
        el.value = v == null ? '' : v;
        el.dispatchEvent(new Event('input', {bubbles:true}));
      }
      setVal('toName', d.to && d.to.name);
      setVal('toEmail', d.to && d.to.email);
      setVal('toPhone', d.to && d.to.phone);
      setVal('toAddress', d.to && d.to.address);
      setVal('invNumber', d.invoice && d.invoice.number);
      setVal('invDate', d.invoice && d.invoice.date);
      setVal('invDue', d.invoice && d.invoice.due);
      setVal('invNotes', d.invoice && d.invoice.notes);
      setPaymentStatus(d.status || 'unpaid');
      var curEl = $('invCurrency');
      if (curEl && d.invoice && d.invoice.currency){
        curEl.value = d.invoice.currency;
        curEl.dispatchEvent(new Event('change', {bubbles:true}));
      }
      if (d.id){
        if ($('editingId')) $('editingId').value = d.id;
        if ($('topbarTitle')) $('topbarTitle').textContent = 'Editing Invoice';
      }

      var items = d.items || [];
      if (!Array.isArray(items)){
        var arr = [];
        var ks = Object.keys(items).sort(function(a,b){ return Number(a) - Number(b); });
        ks.forEach(function(k){ if (items[k]) arr.push(items[k]); });
        items = arr;
      }

      console.log('[KW] Normalized items:', items);

      var itemsWrap = $('items');
      while (itemsWrap.firstChild) itemsWrap.removeChild(itemsWrap.firstChild);

      if (items.length === 0){
        itemsWrap.appendChild(makeItemRow({desc:'', qty:1, rate:0}));
        toast('Invoice loaded (0 items in data)');
      } else {
        for (var i = 0; i < items.length; i++){
          var it = items[i];
          var qty = (it && it.qty != null && !isNaN(parseFloat(it.qty))) ? parseFloat(it.qty) : 1;
          var rate = (it && it.rate != null && !isNaN(parseFloat(it.rate))) ? parseFloat(it.rate) : 0;
          var desc = (it && it.desc) ? String(it.desc) : '';
          var newRow = makeItemRow({desc: desc, qty: qty, rate: rate});
          itemsWrap.appendChild(newRow);
        }
        toast('Invoice loaded with ' + items.length + ' item(s)');
      }

      updateAmounts();
      renderPreview();
      schedulePrebuild();
    } catch(e){
      console.error('[KW] Load failed:', e);
      toast('Load failed: ' + e.message);
    }
  }

  /* ---------- PRINT ---------- */
  function printInvoice(){
    if (!validateForShare()) return;
    var previewView = $('view-preview');
    var wasHidden = previewView.classList.contains('is-hidden');
    if (wasHidden){
      document.querySelectorAll('.kw-inv-tab').forEach(function(x){ x.classList.remove('is-active'); });
      var previewTab = document.querySelector('.kw-inv-tab[data-tab="preview"]');
      if (previewTab) previewTab.classList.add('is-active');
      $('view-edit').classList.add('is-hidden');
      previewView.classList.remove('is-hidden');
      renderPreview();
    }
    toast('Opening print…');
    setTimeout(function(){
      try { window.print(); } catch(e){ toast('Print not supported'); }
    }, 250);
  }

  /* ---------- PDF ---------- */
  function loadScript(src){
    return new Promise(function(resolve, reject){
      var s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = function(){ resolve(); };
      s.onerror = function(){ reject(new Error('Failed: ' + src)); };
      document.head.appendChild(s);
    });
  }
  function ensureJsPDF(){
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve();
    return loadScript('jspdf.umd.min.js')
      .catch(function(){
        return loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      });
  }

  function buildInvoicePDF(){
    return ensureJsPDF().then(function(){
      var d = readData();
      var totals = calcTotals(d.items);
      var jsPDF = window.jspdf.jsPDF;
      var pdf = new jsPDF({unit:'mm', format:'a4', orientation:'portrait'});
      var M = 18, W = 210, CW = W - 2*M, y = M;
      var TEAL = [15,118,110], DARK = [15,23,42], GRAY = [100,116,139];
      var LIGHT = [226,232,240], SOFT = [248,250,252];
      var cur = d.invoice.currency;

      /* ---------- LETTERHEAD ---------- */
      var logoSide = 20;
      var headX = M;
      if (d.from.logo){
        try {
          pdf.addImage(d.from.logo, 'JPEG', M, y, logoSide, logoSide);
          headX = M + logoSide + 5;
        } catch(e){}
      }
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(17);
      pdf.setTextColor(TEAL[0],TEAL[1],TEAL[2]);
      var nameLines = pdf.splitTextToSize(d.from.name || 'Your Business', CW - (headX - M));
      pdf.text(nameLines[0], headX, y + 6);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
      var metaLines = [];
      if (d.from.ownerName && d.from.ownerName !== d.from.name) metaLines.push(d.from.ownerName);
      if (d.from.license) metaLines.push(d.from.license);
      var contactLine = [d.from.phone, d.from.email].filter(Boolean).join('  ·  ');
      if (contactLine) metaLines.push(contactLine);
      var metaY = y + 12;
      metaLines.forEach(function(l){
        var ll = pdf.splitTextToSize(l, CW - (headX - M));
        pdf.text(ll[0], headX, metaY);
        metaY += 4;
      });
      if (d.from.address){
        var al = pdf.splitTextToSize(d.from.address, CW - (headX - M));
        al.slice(0, 2).forEach(function(line){
          pdf.text(line, headX, metaY);
          metaY += 4;
        });
      }

      y = Math.max(y + logoSide + 4, metaY + 2);
      pdf.setDrawColor(TEAL[0],TEAL[1],TEAL[2]); pdf.setLineWidth(0.8);
      pdf.line(M, y, W-M, y);
      y += 8;

      /* ---------- INVOICE TITLE ---------- */
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16);
      pdf.setTextColor(DARK[0],DARK[1],DARK[2]);
      pdf.text('INVOICE', M, y);

      pdf.setFontSize(11);
      pdf.setTextColor(TEAL[0],TEAL[1],TEAL[2]);
      pdf.text(d.invoice.number || '', W - M, y, {align:'right'});

      y += 5;
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9);
      pdf.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
      pdf.text('Date: ' + formatDate(d.invoice.date), W - M, y, {align:'right'});
      y += 4;
      pdf.text('Due: ' + formatDate(d.invoice.due), W - M, y, {align:'right'});
      y += 8;

      /* ---------- BILL TO ---------- */
      var boxY = y;
      var boxH = 22;
      pdf.setFillColor(SOFT[0],SOFT[1],SOFT[2]);
      pdf.rect(M, boxY, CW, boxH, 'F');
      pdf.setFillColor(TEAL[0],TEAL[1],TEAL[2]);
      pdf.rect(M, boxY, 1.5, boxH, 'F');

      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7);
      pdf.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
      pdf.text('BILL TO', M + 5, boxY + 5);

      pdf.setFontSize(11); pdf.setTextColor(DARK[0],DARK[1],DARK[2]);
      pdf.text(d.to.name || 'Customer', M + 5, boxY + 11);

      pdf.setFont('helvetica','normal'); pdf.setFontSize(8.5);
      pdf.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
      var toLine1 = [d.to.phone, d.to.email].filter(Boolean).join('  ·  ');
      if (toLine1) pdf.text(toLine1, M + 5, boxY + 16);
      if (d.to.address){
        var tal = pdf.splitTextToSize(d.to.address, CW - 10);
        pdf.text(tal[0], M + 5, boxY + 20);
      }

      y = boxY + boxH + 8;

      /* ---------- ITEMS TABLE ---------- */
      var descX = M + 2;
      var qtyX = M + CW - 66;
      var rateX = M + CW - 36;
      var amtX = W - M - 2;

      pdf.setFillColor(TEAL[0],TEAL[1],TEAL[2]);
      pdf.rect(M, y, CW, 7, 'F');
      pdf.setFont('helvetica','bold'); pdf.setFontSize(8);
      pdf.setTextColor(255,255,255);
      pdf.text('DESCRIPTION', descX, y + 4.8);
      pdf.text('QTY', qtyX + 10, y + 4.8, {align:'right'});
      pdf.text('RATE', rateX + 12, y + 4.8, {align:'right'});
      pdf.text('AMOUNT', amtX, y + 4.8, {align:'right'});
      y += 7;

      pdf.setFont('helvetica','normal'); pdf.setFontSize(9.5);
      pdf.setTextColor(DARK[0],DARK[1],DARK[2]);
      var renderedItems = d.items.filter(function(it){ return it.desc || it.amount; });
      if (renderedItems.length === 0){
        pdf.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
        pdf.text('No items', descX, y + 6);
        y += 10;
      } else {
        renderedItems.forEach(function(it, idx){
          if (y > 250){ pdf.addPage(); y = 20; }
          var descLines = pdf.splitTextToSize(it.desc || '—', CW - 78);
          var rowH = Math.max(8, descLines.length * 4.6 + 3);

          if (idx % 2 === 1){
            pdf.setFillColor(SOFT[0],SOFT[1],SOFT[2]);
            pdf.rect(M, y, CW, rowH, 'F');
          }

          descLines.forEach(function(line, i){
            pdf.text(line, descX, y + 5 + i * 4.6);
          });
          pdf.text(String(it.qty), qtyX + 10, y + 5, {align:'right'});
          pdf.text(formatMoneyPlain(it.rate, cur), rateX + 12, y + 5, {align:'right'});
          pdf.text(formatMoneyPlain(it.amount, cur), amtX, y + 5, {align:'right'});

          pdf.setDrawColor(LIGHT[0],LIGHT[1],LIGHT[2]); pdf.setLineWidth(0.15);
          pdf.line(M, y + rowH, W - M, y + rowH);
          y += rowH;
        });
      }

      y += 5;

      /* ---------- TOTALS ---------- */
      if (y > 220){ pdf.addPage(); y = 20; }
      var tw = 70;
      var tX = W - M - tw;

      pdf.setFont('helvetica','normal'); pdf.setFontSize(9.5);
      pdf.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
      pdf.text('Subtotal', tX, y + 4);
      pdf.setTextColor(DARK[0],DARK[1],DARK[2]);
      pdf.setFont('helvetica','bold');
      pdf.text(formatMoneyPlain(totals.subtotal, cur), W - M, y + 4, {align:'right'});

      y += 8;
      pdf.setDrawColor(TEAL[0],TEAL[1],TEAL[2]); pdf.setLineWidth(0.5);
      pdf.line(tX, y, W - M, y);
      y += 7;
      pdf.setFontSize(12);
      pdf.setTextColor(TEAL[0],TEAL[1],TEAL[2]);
      pdf.text('Total', tX, y);
      pdf.text(formatMoneyPlain(totals.total, cur), W - M, y, {align:'right'});
      y += 12;

      /* ---------- PAYMENT ---------- */
      var payLines = [];
      if (d.payment.easypaisa) payLines.push('Easypaisa: ' + d.payment.easypaisa);
      if (d.payment.jazzcash) payLines.push('Raast ID: ' + d.payment.jazzcash);
      if (d.payment.bank) payLines.push('Bank: ' + d.payment.bank);

      if (payLines.length || d.payment.qrImage){
        if (y > 220){ pdf.addPage(); y = 20; }
        var hasQr = !!d.payment.qrImage;
        var qrSize = 28;
        var infoW = hasQr ? CW - qrSize - 8 : CW;
        var boxH = Math.max(hasQr ? qrSize + 10 : 0, payLines.length * 5 + 14);

        pdf.setFillColor(SOFT[0],SOFT[1],SOFT[2]);
        pdf.rect(M, y, CW, boxH, 'F');

        pdf.setFont('helvetica','bold'); pdf.setFontSize(8);
        pdf.setTextColor(TEAL[0],TEAL[1],TEAL[2]);
        pdf.text('PAYMENT DETAILS', M + 5, y + 6);

        pdf.setFont('helvetica','normal'); pdf.setFontSize(9);
        pdf.setTextColor(DARK[0],DARK[1],DARK[2]);
        payLines.forEach(function(line, i){
          var ll = pdf.splitTextToSize(line, infoW - 10);
          pdf.text(ll[0], M + 5, y + 12 + i * 5);
        });

        if (hasQr){
          try {
            var qx = M + CW - qrSize - 5;
            var qy = y + 5;
            pdf.addImage(d.payment.qrImage, 'JPEG', qx, qy, qrSize, qrSize);
            pdf.setFont('helvetica','normal'); pdf.setFontSize(6.5);
            pdf.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
            pdf.text('Scan to pay', qx + qrSize/2, qy + qrSize + 3, {align:'center'});
          } catch(e){}
        }
        y += boxH + 6;
      }

      /* ---------- NOTES ---------- */
      if (d.invoice.notes){
        if (y > 240){ pdf.addPage(); y = 20; }
        var notesLines = pdf.splitTextToSize(d.invoice.notes, CW - 12);
        var notesH = notesLines.length * 4.5 + 10;
        pdf.setFillColor(SOFT[0],SOFT[1],SOFT[2]);
        pdf.rect(M, y, CW, notesH, 'F');
        pdf.setFont('helvetica','normal'); pdf.setFontSize(9);
        pdf.setTextColor(71,85,105);
        notesLines.forEach(function(line, i){
          pdf.text(line, M + 5, y + 6 + i * 4.5);
        });
        y += notesH + 6;
      }

      /* ---------- FOOTER ---------- */
      if (y > 250) y = 250;
      pdf.setDrawColor(LIGHT[0],LIGHT[1],LIGHT[2]); pdf.setLineWidth(0.3);
      pdf.line(M, y + 4, W - M, y + 4);
      pdf.setFont('helvetica','normal'); pdf.setFontSize(8);
      pdf.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
      if (!isPremium()){
        pdf.text('Made with KaamWala · kaamwala.app', W/2, y + 10, {align:'center'});
      } else {
        pdf.text('Thank you for your business.', W/2, y + 10, {align:'center'});
      }

      return pdf;
    });
  }

  function dataSignature(){
    var d = readData();
    return JSON.stringify({
      f: d.from, t: d.to, i: d.invoice, p: d.payment,
      prem: isPremium(),
      it: d.items.map(function(x){ return [x.desc, x.qty, x.rate]; })
    });
  }

  function invoiceFilename(ext){
    var d = readData();
    function safe(s){ return String(s||'').replace(/[^a-zA-Z0-9\-_]/g,'_').slice(0,24) || 'invoice'; }
    return safe(d.invoice.number || 'INV') + '_' + safe(d.to.name || 'client') + '.' + ext;
  }

  function prebuildPDF(){
    var sig = dataSignature();
    if (pdfCache.signature === sig && pdfCache.file) return Promise.resolve(pdfCache);
    return buildInvoicePDF().then(function(pdf){
      var blob = pdf.output('blob');
      var filename = invoiceFilename('pdf');
      var file = new File([blob], filename, {type:'application/pdf'});
      pdfCache = { signature: sig, blob: blob, file: file, filename: filename };
      setDebug('Ready. PDF cached (' + Math.round(blob.size/1024) + ' KB).');
      return pdfCache;
    });
  }

  function schedulePrebuild(){
    if (prebuildTimer) clearTimeout(prebuildTimer);
    prebuildTimer = setTimeout(function(){
      prebuildPDF().catch(function(err){ logDebug('Prebuild: ' + err.message); });
    }, 300);
  }

  function downloadBlob(blob, filename){
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function(){
      document.body.removeChild(a); URL.revokeObjectURL(url);
    }, 500);
  }

  function validateForShare(){
    var d = readData();
    if (!d.to.name){ toast('Add a client name first'); return false; }
    if (!d.items.some(function(it){ return it.desc; })){ toast('Add at least one item first'); return false; }
    return true;
  }
  function canShareFile(file){
    return typeof navigator.share === 'function' &&
           typeof navigator.canShare === 'function' &&
           navigator.canShare({files:[file]});
  }

  function downloadPDF(){
    if (!validateForShare()) return;
    var btn = $('pdfBtn');
    btn.disabled = true;
    toast('Preparing PDF…');
    prebuildPDF()
      .then(function(cache){
        downloadBlob(cache.blob, cache.filename);
        toast('✓ PDF saved to Downloads');
      })
      .catch(function(err){
        setDebug('[PDF] ERROR: ' + err.message);
        toast('PDF failed');
      })
      .then(function(){ btn.disabled = false; });
  }

  function openShareModal(cache){
    var overlay = document.createElement('div');
    overlay.className = 'kw-overlay';
    overlay.innerHTML =
      '<div class="kw-modal">' +
        '<h3>✓ Invoice ready</h3>' +
        '<p>Tap below to share via WhatsApp, Email, or any app.</p>' +
        '<button class="kw-primary" id="kwShareGo">📤 Open Share Menu</button>' +
        '<button class="kw-secondary" id="kwShareCancel">Cancel</button>' +
      '</div>';
    document.body.appendChild(overlay);
    function close(){ if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    overlay.addEventListener('click', function(e){ if (e.target === overlay) close(); });
    $('kwShareCancel').addEventListener('click', close);
    $('kwShareGo').addEventListener('click', function(){
      var d = readData();
      navigator.share({
        files: [cache.file],
        title: 'Invoice ' + (d.invoice.number || ''),
        text: 'Invoice ' + (d.invoice.number || '') + ' from ' + (d.from.name || 'KaamWala') + '\n\nGenerated with KaamWala — free invoice maker for Pakistan\nhttps://zriaz7616-star.github.io/kaamwala/'
      }).then(function(){ close(); toast('✓ Shared'); })
        .catch(function(err){
          close();
          if (err && err.name === 'AbortError') return;
          downloadBlob(cache.blob, cache.filename);
          toast('✓ PDF saved to Downloads');
        });
    });
  }

  function shareInvoice(){
    if (!validateForShare()) return;
    var sig = dataSignature();
    if (pdfCache.signature === sig && pdfCache.file && canShareFile(pdfCache.file)){
      var d = readData();
      navigator.share({
        files: [pdfCache.file],
        title: 'Invoice ' + (d.invoice.number || ''),
        text: 'Invoice ' + (d.invoice.number || '') + ' from ' + (d.from.name || 'KaamWala') + '\n\nGenerated with KaamWala — free invoice maker for Pakistan\nhttps://zriaz7616-star.github.io/kaamwala/'
      }).then(function(){ toast('✓ Shared'); })
        .catch(function(err){
          if (err && err.name === 'AbortError') return;
          downloadBlob(pdfCache.blob, pdfCache.filename);
          toast('✓ PDF saved to Downloads');
        });
      return;
    }
    var btn = $('shareBtn');
    btn.disabled = true;
    toast('Preparing…');
    prebuildPDF()
      .then(function(cache){
        btn.disabled = false;
        if (canShareFile(cache.file)){ openShareModal(cache); }
        else { downloadBlob(cache.blob, cache.filename); toast('✓ PDF saved to Downloads'); }
      })
      .catch(function(err){
        btn.disabled = false;
        setDebug('[Share] ERROR: ' + err.message);
        toast('Share failed');
      });
  }

  function applyCategoryMode(){
    try {
      var cat = (currentProfile && currentProfile.category) || '';
      var isFreelancer = !cat || cat === 'freelancer';

      var ids = ['invoiceDetailsSection', 'toEmailField', 'toAddressField'];
      ids.forEach(function(id){
        var el = document.getElementById(id);
        if (el) el.style.display = isFreelancer ? '' : 'none';
      });

      var title = document.getElementById('billToTitle');
      if (title) title.textContent = isFreelancer ? 'Bill To' : 'Customer Details';

      if (!isFreelancer){
        var numEl = document.getElementById('invNumber');
        var dateEl = document.getElementById('invDate');
        var dueEl = document.getElementById('invDue');
        var prefix = (currentProfile && currentProfile.prefix) ? currentProfile.prefix : 'INV';
        if (numEl && !numEl.value) numEl.value = prefix + '-' + String(Date.now()).slice(-5);
        var today = new Date().toISOString().slice(0,10);
        if (dateEl && !dateEl.value) dateEl.value = today;
        if (dueEl && !dueEl.value) dueEl.value = today;
      }
      console.log('[KW] Mode: ' + (isFreelancer ? 'freelancer' : 'shop:' + cat));
    } catch(e){ console.error('applyCategoryMode error:', e); }
  }

  /* ---------- SEARCH MODAL ---------- */
  function openSearchModal(){
    var modal = $('kwSearchModal');
    if (!modal) return;
    modal.style.display = 'flex';
    var input = $('kwSearchInput');
    if (input){ input.value = ''; input.focus(); }
    renderSearchResults('');
  }

  function closeSearchModal(){
    var modal = $('kwSearchModal');
    if (modal) modal.style.display = 'none';
  }

  function renderSearchResults(query){
    var listEl = $('kwSearchList');
    if (!listEl) return;

    var p = currentProfile || {};
    var products = (p.products || []).filter(function(x){ return x && x.name; });

    if (products.length === 0){
      listEl.innerHTML = '<div style="text-align:center;padding:30px 16px;color:#94A3B8;font-size:.9rem">' +
        '<div style="font-size:2rem;margin-bottom:8px">📭</div>' +
        'Aapki product list khaali hai.<br>Profile page par jayein aur products add karein.' +
        '<br><br><a href="profile.html" style="color:#0F766E;font-weight:700">Go to Profile →</a>' +
        '</div>';
      return;
    }

    var q = String(query || '').trim().toLowerCase();
    var filtered = q ? products.filter(function(x){
      return String(x.name || '').toLowerCase().indexOf(q) !== -1;
    }) : products.slice(0, 100);

    if (filtered.length === 0){
      listEl.innerHTML = '<div style="text-align:center;padding:30px 16px;color:#94A3B8;font-size:.9rem">' +
        '<div style="font-size:2rem;margin-bottom:8px">🔍</div>' +
        'Koi product nahi mila: <strong>' + escapeHtml(query) + '</strong>' +
        '</div>';
      return;
    }

    var html = '';
    filtered.forEach(function(item){
      var name = item.name || '';
      var rate = item.rate != null ? item.rate : 0;
      html += '<button type="button" class="kw-search-item" data-name="' + escapeHtml(name) + '" data-rate="' + rate + '"' +
        ' style="display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;' +
        'padding:14px 16px;background:#fff;border:1px solid #E2E8F0;border-radius:12px;margin-bottom:8px;' +
        'cursor:pointer;font-family:inherit;text-align:left;min-height:56px">' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-weight:700;color:#0F172A;font-size:.98rem;word-break:break-word">' + escapeHtml(name) + '</div>' +
          '<div style="color:#64748B;font-size:.85rem;margin-top:2px">Rs ' + (Math.round(rate*100)/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) + '</div>' +
        '</div>' +
        '<div style="color:#0F766E;font-size:1.3rem;font-weight:800">+</div>' +
      '</button>';
    });
    listEl.innerHTML = html;

    // Bind click handlers
    listEl.querySelectorAll('.kw-search-item').forEach(function(btn){
      btn.addEventListener('click', function(){
        var name = btn.getAttribute('data-name');
        var rate = parseFloat(btn.getAttribute('data-rate')) || 0;
        addItemAndFill(name, rate);
        closeSearchModal();
      });
    });
  }

  function addItemAndFill(name, rate){
    // Check if an empty row exists — if yes, use it
    var rows = document.querySelectorAll('.kw-inv-item');
    var targetRow = null;
    for (var i = 0; i < rows.length; i++){
      var d = rows[i].querySelector('.kw-inv-item-desc').value.trim();
      if (!d){ targetRow = rows[i]; break; }
    }
    if (!targetRow){
      addItem({desc:'', qty:1, rate:0});
      var allRows = document.querySelectorAll('.kw-inv-item');
      targetRow = allRows[allRows.length - 1];
    }
    if (!targetRow) return;
    targetRow.querySelector('.kw-inv-item-desc').value = name;
    var qtyEl = targetRow.querySelector('.kw-inv-item-qty');
    var rateEl = targetRow.querySelector('.kw-inv-item-rate');
    if (qtyEl && (!qtyEl.value || parseFloat(qtyEl.value) === 0)) qtyEl.value = 1;
    if (rateEl) rateEl.value = rate;
    if (rateEl) rateEl.dispatchEvent(new Event('input', {bubbles:true}));

    // Scroll to item row
    try { targetRow.scrollIntoView({behavior:'smooth', block:'center'}); } catch(e){}
    toast('✓ ' + name + ' added');
  }

  var toastTimer = null;
  function toast(msg){
    var t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('is-on');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ t.classList.remove('is-on'); }, 3200);
  }
})();
