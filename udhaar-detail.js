(function(){
  'use strict';

  var CURRENCY_SYMBOLS = {PKR:'Rs.', USD:'$', AED:'AED', GBP:'£'};
  var params = new URLSearchParams(location.search);
  var customerId = params.get('id');
  var currentProfile = null;
  var customer = null;

  document.addEventListener('DOMContentLoaded', function(){
    if (!customerId){ location.href = 'udhaar.html'; return; }
    if (!window.FB) return;
    window.FB.waitForAuth().then(function(u){
      if (!u){ location.href = 'auth.html'; return; }
      return window.FB.getProfile();
    }).then(function(p){
      currentProfile = p || {};
      return loadCustomer();
    }).then(function(){ render(); })
    .catch(function(err){
      console.error(err);
      document.getElementById('detailRoot').innerHTML = '<div class="kw-loading">Could not load. <a href="udhaar.html" style="color:#0F766E">Back</a></div>';
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
  function formatDateTime(iso){
    if (!iso) return '';
    try {
      var d = new Date(iso);
      return d.toLocaleDateString('en-GB',{day:'numeric',month:'short'}) + ', ' +
             d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true});
    } catch(e){ return iso; }
  }
  function formatDateShort(iso){
    if (!iso) return '';
    try {
      var d = new Date(iso);
      var today = new Date();
      if (d.toDateString() === today.toDateString()) return 'Today';
      var diff = Math.floor((today - d) / 86400000);
      if (diff === 1) return 'Yesterday';
      if (diff < 7) return diff + ' days ago';
      return d.toLocaleDateString('en-GB',{day:'numeric',month:'short'});
    } catch(e){ return iso; }
  }
  function avatarColor(name){
    var colors = ['#0F766E','#D97706','#DC2626','#7C3AED','#0891B2','#DB2777','#4338CA','#059669','#B45309','#BE123C'];
    var h = 0;
    for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return colors[h % colors.length];
  }

  function loadCustomer(){
    return window.KWUdhaar.get(customerId).then(function(doc){
      if (!doc){ location.href = 'udhaar.html'; return; }
      customer = doc;
    });
  }

  function render(){
    if (!customer) return;
    var cur = (currentProfile && currentProfile.currency) || 'PKR';
    var totals = window.KWUdhaar.computeTotals(customer);
    var initial = (customer.name.charAt(0) || 'U').toUpperCase();
    var bg = avatarColor(customer.name);
    var sortedEntries = (customer.entries || []).slice().sort(function(a, b){
      return String(b.createdAt || b.date || '').localeCompare(String(a.createdAt || a.date || ''));
    });

    var entriesHtml = '';
    if (sortedEntries.length === 0){
      entriesHtml =
        '<div class="udb-empty-ledger">' +
          '<div class="udb-empty-skeleton">' +
            '<div class="udb-sk-row"><div class="udb-sk-avatar"></div><div class="udb-sk-lines"><div class="udb-sk-line"></div><div class="udb-sk-line short"></div></div></div>' +
            '<div class="udb-sk-row"><div class="udb-sk-avatar"></div><div class="udb-sk-lines"><div class="udb-sk-line"></div><div class="udb-sk-line short"></div></div></div>' +
            '<div class="udb-sk-row"><div class="udb-sk-avatar"></div><div class="udb-sk-lines"><div class="udb-sk-line"></div><div class="udb-sk-line short"></div></div></div>' +
          '</div>' +
        '</div>';
    } else {
      entriesHtml = sortedEntries.map(function(e){
        var isGave = e.type === 'credit'; // I gave them goods/money → they owe me
        var cls = isGave ? 'gave' : 'took';
        var lbl = isGave ? 'I GAVE' : 'I TOOK';
        var icon = isGave ? '↓' : '↑';
        var sign = isGave ? '+' : '-';
        return (
          '<div class="udb-entry ' + cls + '">' +
            '<div class="udb-entry-icon ' + cls + '">' + icon + '</div>' +
            '<div class="udb-entry-body">' +
              '<p class="udb-entry-title">' + lbl + '</p>' +
              (e.note ? '<p class="udb-entry-note">' + escapeHtml(e.note) + '</p>' : '') +
              '<p class="udb-entry-date">' + formatDateShort(e.date || e.createdAt) + '</p>' +
            '</div>' +
            '<div class="udb-entry-amt ' + cls + '">' + sign + formatMoney(e.amount, cur).replace('. ', '.') + '</div>' +
          '</div>'
        );
      }).join('');
    }

    var balanceLabel = totals.balance > 0.01 ? 'You will get' :
                        (totals.balance < -0.01 ? 'You will give' : 'Clear');
    var balanceColor = totals.balance > 0.01 ? '#DC2626' :
                       (totals.balance < -0.01 ? '#059669' : '#94A3B8');

    var html =
      '<div class="udb-detail-header">' +
        '<button class="udb-back" id="udbBack">←</button>' +
        '<div class="udb-detail-avatar" style="background:' + bg + '">' + escapeHtml(initial) + '</div>' +
        '<div class="udb-detail-name-wrap">' +
          '<div class="udb-detail-name">' + escapeHtml(customer.name) + '</div>' +
          (customer.phone ? '<div class="udb-detail-phone">' + escapeHtml(customer.phone) + '</div>' : '') +
        '</div>' +
        '<button class="udb-edit-btn" id="udbEditBtn" aria-label="Edit">✏️</button>' +
        '<button class="udb-more-btn" id="udbMoreBtn" aria-label="More">⋮</button>' +
      '</div>' +

      '<div class="udb-balance-strip">' +
        '<div class="udb-balance-lbl">' + balanceLabel + '</div>' +
        '<div class="udb-balance-amt" style="color:' + balanceColor + '">' +
          formatMoney(Math.abs(totals.balance), cur) +
        '</div>' +
      '</div>' +

      '<div class="udb-safe-badge">' +
        '<span class="udb-safe-icon">🛡️</span>' +
        '<span>Your all entries are safe and secure</span>' +
      '</div>' +

      '<div class="udb-ledger">' +
        (sortedEntries.length === 0
          ? '<div class="udb-first-hint">Add first transaction of ' + escapeHtml(customer.name) + '</div>' +
            '<div class="udb-arrow">↓</div>'
          : entriesHtml) +
      '</div>' +

      '<div class="udb-detail-actions">' +
        '<button class="udb-action took" id="udTookBtn">' +
          '<span class="udb-action-icon">↑</span>' +
          '<span>I TOOK</span>' +
        '</button>' +
        '<button class="udb-action gave" id="udGaveBtn">' +
          '<span class="udb-action-icon">↓</span>' +
          '<span>I GAVE</span>' +
        '</button>' +
      '</div>';

    $('detailRoot').innerHTML = html;

    $('udbBack').onclick = function(){ location.href = 'udhaar.html'; };
    $('udbEditBtn').onclick = openEditModal;
    $('udbMoreBtn').onclick = openMoreMenu;
    $('udTookBtn').onclick = function(){ openEntryModal('payment'); }; // I took money from customer
    $('udGaveBtn').onclick = function(){ openEntryModal('credit'); };   // I gave goods/money
  }

  function openMoreMenu(){
    var overlay = document.createElement('div');
    overlay.className = 'kw-overlay';
    overlay.style.alignItems = 'flex-start';
    overlay.style.paddingTop = '80px';
    overlay.innerHTML =
      '<div class="kw-modal" style="max-width:320px">' +
        '<button class="udb-menu-item" id="mmEdit">✏️ Edit name / phone</button>' +
        '<button class="udb-menu-item" id="mmCall">📞 Call customer</button>' +
        '<button class="udb-menu-item" id="mmWa">💬 WhatsApp</button>' +
        '<button class="udb-menu-item danger" id="mmDelete">🗑 Delete customer</button>' +
        '<button class="kw-secondary" id="mmClose" style="margin-top:10px">Close</button>' +
      '</div>';
    document.body.appendChild(overlay);
    function close(){ if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    overlay.addEventListener('click', function(e){ if (e.target === overlay) close(); });
    overlay.querySelector('#mmClose').onclick = close;
    overlay.querySelector('#mmEdit').onclick = function(){ close(); openEditModal(); };
    overlay.querySelector('#mmCall').onclick = function(){
      close();
      if (customer.phone) location.href = 'tel:' + customer.phone;
      else alert('Koi phone number nahi hai');
    };
    overlay.querySelector('#mmWa').onclick = function(){
      close();
      if (customer.phone){
        var clean = customer.phone.replace(/[^0-9]/g, '');
        window.open('https://wa.me/' + clean, '_blank');
      } else {
        alert('Koi phone number nahi hai');
      }
    };
    overlay.querySelector('#mmDelete').onclick = function(){
      close();
      if (!confirm('Ye customer aur unka saara udhaar delete ho jayega. Confirm?')) return;
      window.KWUdhaar.remove(customerId).then(function(){ location.href = 'udhaar.html'; });
    };
  }

  function openEntryModal(type){
    var isGave = type === 'credit';
    var cur = (currentProfile && currentProfile.currency) || 'PKR';
    var sym = CURRENCY_SYMBOLS[cur] || 'Rs.';

    var overlay = document.createElement('div');
    overlay.className = 'kw-overlay';
    overlay.style.alignItems = 'stretch';
    overlay.style.padding = '0';
    overlay.innerHTML =
      '<div class="udb-entry-full">' +
        '<div class="udb-entry-top">' +
          '<button class="udb-entry-back" id="eBack">←</button>' +
          '<div class="udb-entry-title-bar">' +
            (isGave ? 'I gave' : 'I took') + ' — ' + escapeHtml(customer.name) +
          '</div>' +
        '</div>' +
        '<div class="udb-entry-amount-row">' +
          '<span class="udb-rs">' + sym + '</span>' +
          '<input type="number" inputmode="decimal" id="udAmt" placeholder="New entry" autofocus>' +
          '<span class="udb-amt-date" id="udEntryDate">' + formatDateTime(new Date().toISOString()) + '</span>' +
        '</div>' +
        '<div class="udb-entry-note-row">' +
          '<input type="text" id="udNote" placeholder="Add note (optional)">' +
        '</div>' +
        '<button class="udb-done-btn" id="udDoneBtn" disabled>DONE</button>' +
      '</div>';

    document.body.appendChild(overlay);
    var amtInput = overlay.querySelector('#udAmt');
    var noteInput = overlay.querySelector('#udNote');
    var doneBtn = overlay.querySelector('#udDoneBtn');

    setTimeout(function(){ amtInput.focus(); }, 200);

    amtInput.addEventListener('input', function(){
      doneBtn.disabled = !amtInput.value || parseFloat(amtInput.value) <= 0;
    });

    function close(){ if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    overlay.querySelector('#eBack').onclick = close;

    doneBtn.onclick = function(){
      var amt = parseFloat(amtInput.value);
      if (!amt || amt <= 0) return;
      var note = noteInput.value.trim();
      doneBtn.disabled = true;
      doneBtn.textContent = 'SAVING…';
      window.KWUdhaar.addEntry(customerId, {
        type: type,
        amount: amt,
        note: note,
        date: new Date().toISOString().slice(0,10)
      }).then(function(){
        return loadCustomer();
      }).then(function(){
        close();
        render();
      }).catch(function(err){
        doneBtn.disabled = false;
        doneBtn.textContent = 'DONE';
        alert('Save nahi hua: ' + (err.message || ''));
      });
    };
  }

  function openEditModal(){
    var overlay = document.createElement('div');
    overlay.className = 'kw-overlay';
    overlay.innerHTML =
      '<div class="kw-modal">' +
        '<h3>Edit customer</h3>' +
        '<div class="udb-modal-field">' +
          '<label>Name</label>' +
          '<input type="text" id="edName" value="' + escapeHtml(customer.name) + '">' +
        '</div>' +
        '<div class="udb-modal-field">' +
          '<label>Phone</label>' +
          '<input type="tel" id="edPhone" value="' + escapeHtml(customer.phone || '') + '">' +
        '</div>' +
        '<button class="udb-save-btn" id="edSave">SAVE</button>' +
        '<button class="kw-secondary" id="edCancel" style="margin-top:8px">Cancel</button>' +
      '</div>';
    document.body.appendChild(overlay);
    function close(){ if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    overlay.addEventListener('click', function(e){ if (e.target === overlay) close(); });
    overlay.querySelector('#edCancel').onclick = close;
    overlay.querySelector('#edSave').onclick = function(){
      var name = overlay.querySelector('#edName').value.trim();
      var phone = overlay.querySelector('#edPhone').value.trim();
      if (!name){ alert('Naam likhein'); return; }
      window.KWUdhaar.update(customerId, { name: name, phone: phone }).then(function(){
        customer.name = name; customer.phone = phone;
        close(); render();
      });
    };
  }
})();
