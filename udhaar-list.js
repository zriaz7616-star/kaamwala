(function(){
  'use strict';

  var CURRENCY_SYMBOLS = {PKR:'Rs.', USD:'$', AED:'AED', GBP:'£'};
  var allCustomers = [];
  var currentProfile = null;
  var currentFilter = 'customers';
  var searchQuery = '';
  var savedPhones = {};

  document.addEventListener('DOMContentLoaded', function(){
    if (!window.FB) return;
    window.FB.waitForAuth().then(function(u){
      if (!u){ location.href = 'auth.html'; return; }
      return window.FB.getProfile();
    }).then(function(p){
      currentProfile = p || {};
      return loadData();
    }).catch(function(err){
      console.error('[KW] udhaar load:', err);
      document.getElementById('udRoot').innerHTML = '<div class="kw-loading">Could not load. <a href="udhaar.html" style="color:#0F766E">Retry</a></div>';
    });
  });

  function $(id){ return document.getElementById(id); }
  function escapeHtml(s){
    return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function formatMoney(n, cur){
    var sym = CURRENCY_SYMBOLS[cur] || (cur + ' ');
    var v = (Math.round((n||0)*100)/100).toLocaleString('en-US',
      {minimumFractionDigits:0, maximumFractionDigits:0});
    return sym + ' ' + v;
  }
  function avatarColor(name){
    var colors = ['#0F766E','#D97706','#DC2626','#7C3AED','#0891B2',
                  '#DB2777','#4338CA','#059669','#B45309','#BE123C'];
    var h = 0;
    for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return colors[h % colors.length];
  }

  function loadData(){
    return Promise.all([
      window.KWUdhaar.listAll(),
      window.FB.getInvoices().catch(function(){ return []; })
    ]).then(function(res){
      allCustomers = res[0] || [];
      // Collect saved phones from invoices
      (res[1] || []).forEach(function(inv){
        if (inv.to && inv.to.phone){
          var k = inv.to.phone.replace(/[^0-9]/g, '');
          if (k && !savedPhones[k]){
            savedPhones[k] = { phone: inv.to.phone, name: inv.to.name || '' };
          }
        }
      });
      // Also from existing udhaar
      allCustomers.forEach(function(c){
        if (c.phone){
          var k2 = c.phone.replace(/[^0-9]/g, '');
          if (k2 && !savedPhones[k2]) savedPhones[k2] = { phone: c.phone, name: c.name };
        }
      });
      render();
    });
  }

  function render(){
    var cur = (currentProfile && currentProfile.currency) || 'PKR';
    var totalGive = 0, totalGet = 0;
    allCustomers.forEach(function(c){
      var bal = window.KWUdhaar.computeBalance(c);
      if (bal > 0.01) totalGet += bal;      // They owe me — I will get
      else if (bal < -0.01) totalGive += Math.abs(bal); // I owe them — I will give
    });

    var filtered = allCustomers.filter(function(c){
      if (searchQuery){
        var q = searchQuery.toLowerCase();
        if (c.name.toLowerCase().indexOf(q) === -1 &&
            (!c.phone || c.phone.indexOf(q) === -1)) return false;
      }
      return true;
    });

    // Sort: owe-me first (descending), then owe-them
    filtered.sort(function(a, b){
      var ba = window.KWUdhaar.computeBalance(a);
      var bb = window.KWUdhaar.computeBalance(b);
      return Math.abs(bb) - Math.abs(ba);
    });

    var listHtml = '';
    if (filtered.length === 0){
      listHtml =
        '<div class="udb-empty">' +
          '<div class="udb-empty-icon">📒</div>' +
          '<h3>' + (allCustomers.length === 0 ? 'Abhi koi customer nahi' : 'Koi result nahi') + '</h3>' +
          '<p>' + (allCustomers.length === 0 ? 'Apna pehla customer add karein aur udhaar ka hisaab rakhein.' : 'Different search try karein.') + '</p>' +
        '</div>';
    } else {
      listHtml = filtered.map(function(c){
        var bal = window.KWUdhaar.computeBalance(c);
        var initial = (c.name.charAt(0) || 'U').toUpperCase();
        var bg = avatarColor(c.name);
        var isOweMe = bal > 0.01;
        var isClear = Math.abs(bal) < 0.01;
        var isIOwe = bal < -0.01;
        var amountColor = isOweMe ? '#DC2626' : (isIOwe ? '#059669' : '#94A3B8');
        var amountDisplay = isClear ? 'Rs. 0' : formatMoney(Math.abs(bal), cur);
        var actionLabel = isOweMe ? 'COLLECT' : (isIOwe ? 'SEND' : '');
        var actionCls = isOweMe ? 'collect' : 'send';
        return (
          '<div class="udb-cust-row" data-id="' + escapeHtml(c.id) + '">' +
            '<div class="udb-cust-avatar" style="background:' + bg + '">' + escapeHtml(initial) + '</div>' +
            '<div class="udb-cust-mid">' +
              '<p class="udb-cust-name">' + escapeHtml(c.name) + '</p>' +
              '<p class="udb-cust-phone">' + escapeHtml(c.phone || '') + '</p>' +
            '</div>' +
            '<div class="udb-cust-amount" style="color:' + amountColor + '">' + amountDisplay + '</div>' +
            (actionLabel ? '<button class="udb-pill ' + actionCls + '" data-action="open" data-id="' + escapeHtml(c.id) + '">' + actionLabel + '</button>' : '<div style="width:88px"></div>') +
          '</div>'
        );
      }).join('');
    }

    var html =
      '<div class="udb-header">' +
        '<div class="udb-header-top">' +
          '<button class="udb-business-btn" id="udbBizBtn">' +
            '<span>' + escapeHtml((currentProfile && currentProfile.businessName) || 'My Business') + '</span>' +
            '<span class="udb-caret">▾</span>' +
          '</button>' +
          '<div class="udb-header-actions">' +
            '<button class="udb-icon-btn" id="udbStarBtn" aria-label="Premium">⭐</button>' +
            '<button class="udb-icon-btn" id="udbMenuBtn" aria-label="Menu">☰</button>' +
          '</div>' +
        '</div>' +
        '<div class="udb-tabs">' +
          '<button class="udb-tab' + (currentFilter === 'customers' ? ' active' : '') + '" data-f="customers">Customers</button>' +
          '<button class="udb-tab' + (currentFilter === 'suppliers' ? ' active' : '') + '" data-f="suppliers">Suppliers</button>' +
        '</div>' +
      '</div>' +

      '<div class="udb-body">' +

        '<div class="udb-total-cards">' +
          '<div class="udb-total-card give">' +
            '<div class="udb-total-amount">' + escapeHtml(formatMoney(totalGive, cur)) + '</div>' +
            '<div class="udb-total-label">I will give</div>' +
          '</div>' +
          '<div class="udb-total-card get">' +
            '<div class="udb-total-amount">' + escapeHtml(formatMoney(totalGet, cur)) + '</div>' +
            '<div class="udb-total-label">I will get</div>' +
          '</div>' +
        '</div>' +

        '<div class="udb-search-wrap">' +
          '<div class="udb-search">' +
            '<span class="udb-search-icon">🔍</span>' +
            '<input type="text" id="udSearch" placeholder="Search customers" value="' + escapeHtml(searchQuery) + '">' +
          '</div>' +
          '<button class="udb-filter-btn" id="udbFilterBtn" aria-label="Filter">' +
            '<span>⇅</span>' +
          '</button>' +
        '</div>' +

        '<div class="udb-list-head">' +
          '<span>Contact list</span>' +
          '<span class="udb-list-updated">Updated now · <a href="#" id="udbRefresh">Refresh</a></span>' +
        '</div>' +

        '<div class="udb-list">' + listHtml + '</div>' +

        '<button class="udb-add-btn" id="udbAddBtn">+ ADD CUSTOMER</button>' +

      '</div>';

    $('udRoot').innerHTML = html;
    $('bottomNav').style.display = '';
    $('udAddBtn').style.display = 'none';

    var searchEl = $('udSearch');
    if (searchEl){
      searchEl.addEventListener('input', function(){
        searchQuery = this.value.trim();
        var cursor = this.selectionStart;
        render();
        var s2 = $('udSearch');
        if (s2){ s2.focus(); s2.setSelectionRange(cursor, cursor); }
      });
    }

    document.querySelectorAll('.udb-tab').forEach(function(b){
      b.addEventListener('click', function(){
        currentFilter = b.getAttribute('data-f');
        if (currentFilter === 'suppliers'){ currentFilter = 'customers'; }
        render();
      });
    });

    document.querySelectorAll('.udb-pill[data-action="open"]').forEach(function(b){
      b.addEventListener('click', function(e){
        e.stopPropagation();
        location.href = 'udhaar-customer.html?id=' + encodeURIComponent(b.getAttribute('data-id'));
      });
    });
    document.querySelectorAll('.udb-cust-row').forEach(function(row){
      row.addEventListener('click', function(e){
        if (e.target.closest('.udb-pill')) return;
        location.href = 'udhaar-customer.html?id=' + encodeURIComponent(row.getAttribute('data-id'));
      });
    });

    var addBtn = $('udbAddBtn');
    if (addBtn) addBtn.onclick = openAddCustomer;
    var refreshBtn = $('udbRefresh');
    if (refreshBtn) refreshBtn.onclick = function(e){ e.preventDefault(); loadData(); };
    var menuBtn = $('udbMenuBtn');
    if (menuBtn) menuBtn.onclick = function(){ location.href = 'settings.html'; };
    var starBtn = $('udbStarBtn');
    if (starBtn) starBtn.onclick = function(){ location.href = 'settings.html'; };
  }

  function openAddCustomer(){
    var overlay = document.createElement('div');
    overlay.className = 'kw-overlay';
    overlay.innerHTML =
      '<div class="kw-modal">' +
        '<h3>Create new contact</h3>' +
        '<div class="udb-modal-field">' +
          '<label>Contact name</label>' +
          '<input type="text" id="udName" placeholder="e.g. Abdul Rehman" autocomplete="off">' +
        '</div>' +
        '<div class="udb-modal-field">' +
          '<label>Phone No. <span style="color:#94A3B8;font-weight:500">(optional)</span></label>' +
          '<input type="tel" id="udPhone" list="kwSavedPhones" placeholder="03001234567" autocomplete="off">' +
          '<datalist id="kwSavedPhones"></datalist>' +
          '<button type="button" class="kw-contacts-btn" id="udPickContact">📱 Pick from Contacts</button>' +
        '</div>' +
        '<div class="udb-modal-field">' +
          '<label>Contact type</label>' +
          '<div class="udb-type-pills">' +
            '<button type="button" class="udb-type-pill active" data-type="customer">Customer</button>' +
            '<button type="button" class="udb-type-pill" data-type="supplier">Supplier</button>' +
          '</div>' +
        '</div>' +
        '<div class="kw-msg" id="udMsg" style="display:none"></div>' +
        '<button class="udb-save-btn" id="udSave">SAVE</button>' +
        '<button class="kw-secondary" id="udCancel" style="margin-top:8px">Cancel</button>' +
      '</div>';
    document.body.appendChild(overlay);

    var dl = overlay.querySelector('#kwSavedPhones');
    Object.keys(savedPhones).forEach(function(k){
      var item = savedPhones[k];
      var opt = document.createElement('option');
      opt.value = item.phone;
      opt.label = item.name || item.phone;
      dl.appendChild(opt);
    });

    var phoneInput = overlay.querySelector('#udPhone');
    var nameInput = overlay.querySelector('#udName');

    phoneInput.addEventListener('change', function(){
      var k = phoneInput.value.replace(/[^0-9]/g, '');
      if (k && savedPhones[k] && !nameInput.value.trim()){
        nameInput.value = savedPhones[k].name || '';
      }
    });

    // Contact Picker API (Android Chrome)
    var pickBtn = overlay.querySelector('#udPickContact');
    if (pickBtn){
      if (!('contacts' in navigator && 'ContactsManager' in window)){
        pickBtn.disabled = true;
        pickBtn.textContent = '📱 Contact picker not supported';
      } else {
        pickBtn.addEventListener('click', function(){
          pickBtn.disabled = true;
          pickBtn.textContent = 'Opening contacts…';
          var props = ['name', 'tel'];
          var opts = { multiple: false };
          navigator.contacts.select(props, opts).then(function(contacts){
            pickBtn.disabled = false;
            pickBtn.textContent = '📱 Pick from Contacts';
            if (!contacts || !contacts.length) return;
            var c = contacts[0];
            var name = (c.name && c.name[0]) ? c.name[0] : '';
            var tel = (c.tel && c.tel[0]) ? c.tel[0] : '';
            if (name) nameInput.value = name;
            if (tel) phoneInput.value = tel.replace(/[^0-9+]/g, '');
            nameInput.focus();
          }).catch(function(err){
            pickBtn.disabled = false;
            pickBtn.textContent = '📱 Pick from Contacts';
            if (err && err.name === 'AbortError') return;
            console.warn('Contact picker:', err);
            alert('Contact picker error: ' + (err.message || 'try manually'));
          });
        });
      }
    }

    function close(){ if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    overlay.addEventListener('click', function(e){ if (e.target === overlay) close(); });
    overlay.querySelector('#udCancel').addEventListener('click', close);

    overlay.querySelectorAll('.udb-type-pill').forEach(function(p){
      p.addEventListener('click', function(){
        overlay.querySelectorAll('.udb-type-pill').forEach(function(x){ x.classList.remove('active'); });
        p.classList.add('active');
      });
    });

    setTimeout(function(){ nameInput.focus(); }, 200);

    overlay.querySelector('#udSave').addEventListener('click', function(){
      var name = nameInput.value.trim();
      var phone = phoneInput.value.trim();
      var msg = overlay.querySelector('#udMsg');
      if (!name){
        msg.style.display = 'block';
        msg.style.background = '#FEF2F2';
        msg.style.color = '#991B1B';
        msg.textContent = 'Naam likhein';
        nameInput.focus();
        return;
      }
      var btn = overlay.querySelector('#udSave');
      btn.disabled = true;
      btn.textContent = 'SAVING…';
      window.KWUdhaar.create({ name: name, phone: phone }).then(function(id){
        close();
        location.href = 'udhaar-customer.html?id=' + encodeURIComponent(id);
      }).catch(function(err){
        btn.disabled = false;
        btn.textContent = 'SAVE';
        msg.style.display = 'block';
        msg.style.background = '#FEF2F2';
        msg.style.color = '#991B1B';
        msg.textContent = 'Save nahi hua: ' + (err.message || '');
      });
    });
  }
})();
