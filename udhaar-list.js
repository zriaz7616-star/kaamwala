(function(){
  'use strict';

  var CURRENCY_SYMBOLS = {PKR:'Rs.', USD:'$', AED:'AED ', GBP:'£'};
  var allCustomers = [];
  var currentProfile = null;
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
    var colors = ['#0F766E','#D97706','#DC2626','#7C3AED','#0891B2','#DB2777','#4338CA','#059669','#B45309','#BE123C'];
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
      savedPhones = {};
      (res[1] || []).forEach(function(inv){
        if (inv.to && inv.to.phone){
          var k = inv.to.phone.replace(/[^0-9]/g, '');
          if (k && !savedPhones[k]) savedPhones[k] = { phone: inv.to.phone, name: inv.to.name || '' };
        }
      });
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
      if (bal > 0.01) totalGet += bal;
      else if (bal < -0.01) totalGive += Math.abs(bal);
    });

    var filtered = allCustomers.filter(function(c){
      if (!searchQuery) return true;
      var q = searchQuery.toLowerCase();
      return c.name.toLowerCase().indexOf(q) !== -1 ||
             (c.phone && c.phone.indexOf(q) !== -1);
    });

    filtered.sort(function(a, b){
      var ba = window.KWUdhaar.computeBalance(a);
      var bb = window.KWUdhaar.computeBalance(b);
      return Math.abs(bb) - Math.abs(ba);
    });

    var listHtml = '';
    if (filtered.length === 0){
      listHtml = '<div class="udb-empty">' +
        '<div class="udb-empty-icon">📒</div>' +
        '<h3>' + (allCustomers.length === 0 ? 'Abhi koi customer nahi' : 'Koi result nahi') + '</h3>' +
        '<p>' + (allCustomers.length === 0 ? 'Apna pehla customer add karein.' : 'Different search try karein.') + '</p>' +
        '</div>';
    } else {
      listHtml = filtered.map(function(c){
        var bal = window.KWUdhaar.computeBalance(c);
        var initial = (c.name.charAt(0) || 'U').toUpperCase();
        var bg = avatarColor(c.name);
        var isOweMe = bal > 0.01;
        var isIOwe = bal < -0.01;
        var amountColor = isOweMe ? '#DC2626' : (isIOwe ? '#059669' : '#94A3B8');
        var amountDisplay = Math.abs(bal) < 0.01 ? 'Rs. 0' : formatMoney(Math.abs(bal), cur);
        var actionLabel = isOweMe ? 'COLLECT' : (isIOwe ? 'SEND' : '');
        var actionCls = isOweMe ? 'collect' : 'send';
        return '<div class="udb-cust-row" data-id="' + escapeHtml(c.id) + '">' +
          '<div class="udb-cust-avatar" style="background:' + bg + '">' + escapeHtml(initial) + '</div>' +
          '<div class="udb-cust-mid">' +
            '<p class="udb-cust-name">' + escapeHtml(c.name) + '</p>' +
            '<p class="udb-cust-phone">' + escapeHtml(c.phone || '') + '</p>' +
          '</div>' +
          '<div class="udb-cust-amount" style="color:' + amountColor + '">' + amountDisplay + '</div>' +
          (actionLabel ? '<button class="udb-pill ' + actionCls + '" data-action="quick" data-id="' + escapeHtml(c.id) + '">' + actionLabel + '</button>' : '<div style="width:88px"></div>') +
        '</div>';
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
            '<a href="home.html" class="udb-icon-btn" aria-label="Home">🏠</a>' +
          '</div>' +
        '</div>' +
        '<div class="udb-tabs">' +
          '<button class="udb-tab active">Customers</button>' +
          '<button class="udb-tab" disabled style="opacity:.4">Suppliers</button>' +
        '</div>' +
      '</div>' +
      '<div class="udb-body">' +
        '<div class="udb-total-cards">' +
          '<div class="udb-total-card give"><div class="udb-total-amount">' + escapeHtml(formatMoney(totalGive, cur)) + '</div><div class="udb-total-label">I will give</div></div>' +
          '<div class="udb-total-card get"><div class="udb-total-amount">' + escapeHtml(formatMoney(totalGet, cur)) + '</div><div class="udb-total-label">I will get</div></div>' +
        '</div>' +
        '<div class="udb-search-wrap">' +
          '<div class="udb-search">' +
            '<span class="udb-search-icon">🔍</span>' +
            '<input type="text" id="udSearch" placeholder="Search customers" value="' + escapeHtml(searchQuery) + '">' +
          '</div>' +
        '</div>' +
        '<div class="udb-list-head">' +
          '<span>Contact list</span>' +
          '<span class="udb-list-updated">Updated now · <a href="#" id="udbRefresh">Refresh</a></span>' +
        '</div>' +
        '<div class="udb-list">' + listHtml + '</div>' +
        '<button class="udb-add-btn" id="udbAddBtn">+ ADD CUSTOMER</button>' +
        '<button class="udb-import-btn" id="udbImportBtn">📥 Import from Excel / CSV</button>' +
        '<input type="file" id="udbImportInput" accept=".xlsx,.xls,.csv" style="display:none">' +
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

    // Row click → detail
    document.querySelectorAll('.udb-cust-row').forEach(function(row){
      row.addEventListener('click', function(e){
        if (e.target.closest('.udb-pill')) return;
        location.href = 'udhaar-customer.html?id=' + encodeURIComponent(row.getAttribute('data-id'));
      });
    });

    // SEND / COLLECT → quick entry
    document.querySelectorAll('.udb-pill[data-action="quick"]').forEach(function(b){
      b.addEventListener('click', function(e){
        e.stopPropagation();
        var id = b.getAttribute('data-id');
        var act = b.classList.contains('collect') ? 'payment' : 'credit';
        openQuickEntry(id, act);
      });
    });

    if ($('udbAddBtn')) $('udbAddBtn').onclick = openAddCustomer;
    if ($('udbRefresh')) $('udbRefresh').onclick = function(e){ e.preventDefault(); loadData(); };
    if ($('udbImportBtn')){
      $('udbImportBtn').onclick = function(){ $('udbImportInput').click(); };
      $('udbImportInput').onchange = function(e){
        var f = e.target.files && e.target.files[0];
        if (!f) return;
        e.target.value = '';
        handleImport(f);
      };
    }
  }

  /* ---------- QUICK ENTRY (SEND / COLLECT) ---------- */
  function openQuickEntry(customerId, entryType){
    var c = null;
    for (var i = 0; i < allCustomers.length; i++){
      if (allCustomers[i].id === customerId){ c = allCustomers[i]; break; }
    }
    if (!c) return;
    var isCredit = entryType === 'credit';
    var cur = (currentProfile && currentProfile.currency) || 'PKR';
    var sym = CURRENCY_SYMBOLS[cur] || 'Rs.';

    var overlay = document.createElement('div');
    overlay.className = 'kw-overlay';
    overlay.style.alignItems = 'flex-end';
    overlay.style.padding = '0';
    overlay.innerHTML =
      '<div style="background:#fff;width:100%;border-radius:20px 20px 0 0;padding:22px 20px 26px;box-sizing:border-box;max-width:520px;margin:0 auto">' +
        '<div style="width:40px;height:4px;background:#E2E8F0;border-radius:2px;margin:0 auto 16px"></div>' +
        '<h3 style="margin:0 0 4px;font-size:1.15rem;font-weight:800;color:#0F172A">' +
          (isCredit ? '💸 Send Money' : '💰 Collect Money') +
        '</h3>' +
        '<p style="margin:0 0 16px;color:#64748B;font-size:.9rem">' + escapeHtml(c.name) + '</p>' +
        '<div style="margin-bottom:12px">' +
          '<label style="display:block;font-size:.78rem;font-weight:700;color:#64748B;margin-bottom:6px">Amount (' + sym + ')</label>' +
          '<input type="number" inputmode="decimal" id="qeAmt" placeholder="0" style="width:100%;padding:14px;border:1.5px solid #E2E8F0;border-radius:12px;font-size:20px;font-weight:800;background:#FAFBFC;color:#0F172A;font-family:inherit;box-sizing:border-box;outline:none;text-align:center">' +
        '</div>' +
        '<div style="margin-bottom:14px">' +
          '<label style="display:block;font-size:.78rem;font-weight:700;color:#64748B;margin-bottom:6px">Note (optional)</label>' +
          '<input type="text" id="qeNote" placeholder="e.g. Cash / Goods" style="width:100%;padding:12px 14px;border:1.5px solid #E2E8F0;border-radius:12px;font-size:15px;background:#FAFBFC;color:#0F172A;font-family:inherit;box-sizing:border-box;outline:none">' +
        '</div>' +
        '<div id="qeMsg" style="display:none;margin-bottom:10px;padding:10px;border-radius:10px;font-size:.85rem;text-align:center;font-weight:700"></div>' +
        '<button id="qeSave" style="width:100%;padding:16px;border-radius:14px;background:' + (isCredit ? '#0F172A' : '#059669') + ';color:#fff;border:none;font-family:inherit;font-weight:800;font-size:1rem;cursor:pointer;letter-spacing:.4px">' +
          (isCredit ? 'SEND NOW' : 'COLLECT NOW') +
        '</button>' +
        '<button id="qeCancel" style="width:100%;padding:13px;border-radius:14px;background:#F1F5F9;color:#475569;border:none;font-family:inherit;font-weight:700;font-size:.92rem;cursor:pointer;margin-top:8px">Cancel</button>' +
      '</div>';
    document.body.appendChild(overlay);

    var amtInput = overlay.querySelector('#qeAmt');
    var noteInput = overlay.querySelector('#qeNote');
    var saveBtn = overlay.querySelector('#qeSave');
    var msgEl = overlay.querySelector('#qeMsg');
    setTimeout(function(){ amtInput.focus(); }, 250);

    function close(){ if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    overlay.addEventListener('click', function(e){ if (e.target === overlay) close(); });
    overlay.querySelector('#qeCancel').onclick = close;
    saveBtn.onclick = function(){
      var amt = parseFloat(amtInput.value);
      if (!amt || amt <= 0){
        msgEl.style.display = 'block';
        msgEl.style.background = '#FEF2F2';
        msgEl.style.color = '#991B1B';
        msgEl.textContent = 'Sahi amount likhein';
        return;
      }
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';
      window.KWUdhaar.addEntry(customerId, {
        type: entryType, amount: amt, note: noteInput.value.trim(),
        date: new Date().toISOString().slice(0,10)
      }).then(function(){ close(); loadData(); })
      .catch(function(err){
        saveBtn.disabled = false;
        saveBtn.textContent = isCredit ? 'SEND NOW' : 'COLLECT NOW';
        msgEl.style.display = 'block';
        msgEl.style.background = '#FEF2F2';
        msgEl.style.color = '#991B1B';
        msgEl.textContent = 'Save nahi hua: ' + (err.message || '');
      });
    };
  }

  /* ---------- ADD CUSTOMER ---------- */
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
        '<button class="kw-primary" id="udSave">SAVE</button>' +
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
      if (k && savedPhones[k] && !nameInput.value.trim()) nameInput.value = savedPhones[k].name || '';
    });

    // Contact picker
    var pickBtn = overlay.querySelector('#udPickContact');
    if (pickBtn){
      if (!('contacts' in navigator && 'ContactsManager' in window)){
        pickBtn.disabled = true;
        pickBtn.textContent = '📱 Not supported here';
      } else {
        pickBtn.addEventListener('click', function(){
          pickBtn.disabled = true;
          pickBtn.textContent = 'Opening contacts…';
          navigator.contacts.select(['name','tel'], { multiple:false }).then(function(contacts){
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
            alert('Contact picker error: ' + (err.message || ''));
          });
        });
      }
    }

    function close(){ if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    overlay.addEventListener('click', function(e){ if (e.target === overlay) close(); });
    overlay.querySelector('#udCancel').onclick = close;
    setTimeout(function(){ nameInput.focus(); }, 200);

    overlay.querySelector('#udSave').onclick = function(){
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
    };
  }

  /* ---------- IMPORT ---------- */
  function handleImport(file){
    var reader = new FileReader();
    reader.onload = function(ev){
      try {
        var rows = [];
        var name = file.name.toLowerCase();
        if (name.endsWith('.csv')){
          rows = parseCSV(ev.target.result);
        } else {
          if (!window.XLSX){ alert('Excel library load nahi hui'); return; }
          var wb = window.XLSX.read(new Uint8Array(ev.target.result), {type:'array'});
          var sheet = wb.Sheets[wb.SheetNames[0]];
          rows = window.XLSX.utils.sheet_to_json(sheet, {header:1, defval:''});
        }
        var parsed = extractCustomers(rows);
        if (parsed.length === 0){ alert('Koi valid customer nahi mila'); return; }
        showImportConfirm(parsed);
      } catch(err){ alert('File read error: ' + (err.message || '')); }
    };
    reader.onerror = function(){ alert('File read nahi hui'); };
    if (file.name.toLowerCase().endsWith('.csv')) reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
  }

  function parseCSV(text){
    var rows = [], cur = [], field = '', inQ = false;
    text = String(text||'').replace(/\r\n/g,'\n').replace(/\r/g,'\n');
    for (var i = 0; i < text.length; i++){
      var c = text[i];
      if (inQ){
        if (c === '"' && text[i+1] === '"'){ field += '"'; i++; }
        else if (c === '"') inQ = false;
        else field += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === ','){ cur.push(field); field = ''; }
        else if (c === '\n'){ cur.push(field); rows.push(cur); cur = []; field = ''; }
        else field += c;
      }
    }
    if (field || cur.length){ cur.push(field); rows.push(cur); }
    return rows;
  }

  function extractCustomers(rows){
    if (!rows || !rows.length) return [];
    var nameKeys = ['name','customer','contact','party','client'];
    var phoneKeys = ['phone','mobile','number','contact'];
    var headerIdx = -1, nameCol = -1, phoneCol = -1;
    for (var r = 0; r < Math.min(rows.length, 5); r++){
      var row = rows[r] || [];
      var mN = -1, mP = -1;
      for (var c = 0; c < row.length; c++){
        var cell = String(row[c] == null ? '' : row[c]).toLowerCase().trim();
        if (!cell) continue;
        if (mN < 0 && nameKeys.some(function(k){ return cell.indexOf(k) !== -1; })) mN = c;
        if (mP < 0 && phoneKeys.some(function(k){ return cell.indexOf(k) !== -1; })) mP = c;
      }
      if (mN >= 0){ headerIdx = r; nameCol = mN; phoneCol = mP; break; }
    }
    var out = [];
    if (nameCol >= 0){
      for (var i = headerIdx + 1; i < rows.length; i++){
        var row2 = rows[i] || [];
        var n = String(row2[nameCol] == null ? '' : row2[nameCol]).trim();
        if (!n) continue;
        var ph = phoneCol >= 0 ? String(row2[phoneCol] == null ? '' : row2[phoneCol]).trim() : '';
        out.push({ name: n, phone: ph });
      }
    } else {
      for (var j = 0; j < rows.length; j++){
        var rowJ = rows[j] || [];
        var nJ = String(rowJ[0] == null ? '' : rowJ[0]).trim();
        if (!nJ) continue;
        if (/^(name|customer|contact)$/i.test(nJ)) continue;
        out.push({ name: nJ, phone: String(rowJ[1] == null ? '' : rowJ[1]).trim() });
      }
    }
    return out.slice(0, 500);
  }

  function showImportConfirm(parsed){
    var overlay = document.createElement('div');
    overlay.className = 'kw-overlay';
    overlay.innerHTML =
      '<div class="kw-modal">' +
        '<h3>📥 Import ' + parsed.length + ' customers</h3>' +
        '<p>Ye customers aapke Udhaar Khata mein add ho jayenge.</p>' +
        '<div style="max-height:220px;overflow-y:auto;background:#F8FAFC;border-radius:12px;padding:10px 12px;margin:12px 0;font-size:.85rem">' +
          parsed.slice(0, 10).map(function(p){
            return '<div style="padding:4px 0;border-bottom:1px solid #F1F5F9"><strong>' + escapeHtml(p.name) + '</strong>' +
              (p.phone ? ' <span style="color:#94A3B8">· ' + escapeHtml(p.phone) + '</span>' : '') + '</div>';
          }).join('') +
          (parsed.length > 10 ? '<div style="padding:6px 0;color:#94A3B8;text-align:center;font-size:.78rem">...aur ' + (parsed.length - 10) + ' more</div>' : '') +
        '</div>' +
        '<button class="kw-primary" id="impGo">Import All (' + parsed.length + ')</button>' +
        '<button class="kw-secondary" id="impCancel">Cancel</button>' +
      '</div>';
    document.body.appendChild(overlay);
    function close(){ if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    overlay.addEventListener('click', function(e){ if (e.target === overlay) close(); });
    overlay.querySelector('#impCancel').onclick = close;
    overlay.querySelector('#impGo').onclick = function(){
      var btn = overlay.querySelector('#impGo');
      btn.disabled = true;
      btn.textContent = 'Importing…';
      var done = 0, failed = 0;
      Promise.all(parsed.map(function(p){
        return window.KWUdhaar.create({ name: p.name, phone: p.phone })
          .then(function(){ done++; }).catch(function(){ failed++; });
      })).then(function(){
        close();
        alert('✓ ' + done + ' customers import ho gaye' + (failed ? ' (' + failed + ' fail)' : ''));
        loadData();
      });
    };
  }
})();
