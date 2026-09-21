(function(){
  'use strict';

  var KEY = 'kw_profile';
  var currentLogo = '';
  var currentQr = '';

  document.addEventListener('DOMContentLoaded', init);

  function init(){
    loadProfile();
    bindLogo();
    bindQr();
    bindProducts();
    document.getElementById('saveProfileBtn').addEventListener('click', save);
    document.getElementById('clearProfileBtn').addEventListener('click', clearProfile);
  }

  function $(id){ return document.getElementById(id); }

  /* ---------- LOAD ---------- */
  function loadProfile(){
    var p = null;
    try { p = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch(e){}
    if (!p) { renderProducts([]); return; }
    function set(id, v){ var el = $(id); if (el) el.value = v == null ? '' : v; }
    set('pBusinessName', p.businessName);
    set('pOwnerName', p.ownerName);
    set('pLicense', p.license);
    set('pEmail', p.email);
    set('pPhone', p.phone);
    set('pAddress', p.address);
    set('pJazzcash', p.jazzcash);
    set('pEasypaisa', p.easypaisa);
    set('pBank', p.bank);
    set('pCurrency', p.currency || 'PKR');
    set('pPrefix', p.prefix || 'INV');
    set('qrText', p.qrText || '');
    currentLogo = p.logo || '';
    currentQr = p.qrImage || '';
    renderLogoPreview();
    renderQrPreview();
    renderProducts(p.products || []);
  }

  /* ---------- LOGO ---------- */
  function bindLogo(){
    $('pickLogoBtn').addEventListener('click', function(){ $('logoInput').click(); });
    $('logoInput').addEventListener('change', onLogoPicked);
    $('removeLogoBtn').addEventListener('click', function(){
      currentLogo = '';
      renderLogoPreview();
      toast('Logo removed');
    });
  }

  function onLogoPicked(e){
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    resizeImage(f, 400, 400, function(dataUrl){
      if (dataUrl.length > 350000){
        resizeImage(f, 250, 250, function(smaller){
          currentLogo = smaller; renderLogoPreview(); toast('✓ Logo ready');
        });
      } else {
        currentLogo = dataUrl; renderLogoPreview(); toast('✓ Logo ready');
      }
    });
    e.target.value = '';
  }

  /* ---------- QR ---------- */
  function bindQr(){
    $('pickQrBtn').addEventListener('click', function(){ $('qrInput').click(); });
    $('qrInput').addEventListener('change', onQrPicked);
    $('removeQrBtn').addEventListener('click', function(){
      currentQr = '';
      var t = $('qrText'); if (t) t.value = '';
      renderQrPreview();
      toast('QR removed');
    });
    $('generateQrBtn').addEventListener('click', generateQrFromText);
  }

  function onQrPicked(e){
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    resizeImage(f, 500, 500, function(dataUrl){
      if (dataUrl.length > 250000){
        resizeImage(f, 350, 350, function(smaller){
          currentQr = smaller; renderQrPreview(); toast('✓ QR ready');
        });
      } else {
        currentQr = dataUrl; renderQrPreview(); toast('✓ QR ready');
      }
    });
    e.target.value = '';
  }

  function generateQrFromText(){
    var text = ($('qrText').value || '').trim();
    if (!text){ toast('Please type something first'); return; }
    if (typeof window.QRCode !== 'function'){
      toast('QR library not loaded');
      return;
    }

    // Hidden container
    var tmp = document.createElement('div');
    tmp.style.position = 'absolute';
    tmp.style.left = '-99999px';
    tmp.style.top = '0';
    document.body.appendChild(tmp);

    try {
      new QRCode(tmp, {
        text: text,
        width: 500,
        height: 500,
        colorDark: '#0F172A',
        colorLight: '#FFFFFF',
        correctLevel: QRCode.CorrectLevel.M
      });
    } catch(e){
      if (tmp.parentNode) tmp.parentNode.removeChild(tmp);
      toast('QR generate failed: ' + e.message);
      return;
    }

    // Give it a tick to render, then grab canvas
    setTimeout(function(){
      var dataUrl = '';
      var canvas = tmp.querySelector('canvas');
      if (canvas && typeof canvas.toDataURL === 'function'){
        try { dataUrl = canvas.toDataURL('image/png'); } catch(e){}
      }
      if (!dataUrl){
        var img = tmp.querySelector('img');
        if (img && img.src) dataUrl = img.src;
      }
      if (tmp.parentNode) tmp.parentNode.removeChild(tmp);
      if (!dataUrl){ toast('QR generate failed'); return; }
      currentQr = dataUrl;
      renderQrPreview();
      toast('✓ QR generated');
    }, 150);
  }

  function renderQrPreview(){
    var el = $('qrPreview');
    if (!el) return;
    if (currentQr){
      el.innerHTML = '<img src="' + currentQr + '" alt="Payment QR">';
    } else {
      el.innerHTML = '<span class="ph">No QR yet</span>';
    }
  }

  /* ---------- IMAGE RESIZE ---------- */
  function resizeImage(file, maxW, maxH, cb){
    var reader = new FileReader();
    reader.onload = function(ev){
      var img = new Image();
      img.onload = function(){
        var canvas = document.createElement('canvas');
        var scale = Math.min(maxW / img.width, maxH / img.height, 1);
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        cb(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = function(){ toast('Image load failed'); };
      img.src = ev.target.result;
    };
    reader.onerror = function(){ toast('File read failed'); };
    reader.readAsDataURL(file);
  }

  function renderLogoPreview(){
    var el = $('logoPreview');
    if (!el) return;
    if (currentLogo){
      el.innerHTML = '<img src="' + currentLogo + '" alt="logo">';
    } else {
      el.innerHTML = '<span class="ph">No logo</span>';
    }
  }

  /* ---------- PRODUCTS ---------- */
  function bindProducts(){
    $('addProductBtn').addEventListener('click', function(){
      addProductRow({name:'', rate:''});
    });
  }

  function renderProducts(list){
    var wrap = $('productsList');
    wrap.innerHTML = '';
    if (!list || list.length === 0){
      addProductRow({name:'', rate:''});
      return;
    }
    list.forEach(function(p){ addProductRow(p); });
  }

  function addProductRow(p){
    var row = document.createElement('div');
    row.className = 'product-row';

    var name = document.createElement('input');
    name.type = 'text';
    name.className = 'pr-name';
    name.placeholder = 'Product / Service name';
    name.value = p.name || '';

    var rate = document.createElement('input');
    rate.type = 'number';
    rate.className = 'pr-rate';
    rate.placeholder = 'Rate';
    rate.inputMode = 'decimal';
    rate.min = '0';
    rate.step = '0.01';
    rate.value = (p.rate != null ? p.rate : '');

    var del = document.createElement('button');
    del.type = 'button';
    del.className = 'pr-del';
    del.textContent = '×';
    del.setAttribute('aria-label','Remove product');
    del.addEventListener('click', function(){
      if (row.parentNode) row.parentNode.removeChild(row);
      if ($('productsList').children.length === 0) addProductRow({name:'', rate:''});
    });

    row.appendChild(name);
    row.appendChild(rate);
    row.appendChild(del);
    $('productsList').appendChild(row);
  }

  function collectProducts(){
    var rows = $('productsList').querySelectorAll('.product-row');
    var out = [];
    for (var i = 0; i < rows.length; i++){
      var n = rows[i].querySelector('.pr-name').value.trim();
      var r = parseFloat(rows[i].querySelector('.pr-rate').value) || 0;
      if (n) out.push({ name: n, rate: r });
    }
    return out;
  }

  /* ---------- SAVE ---------- */
  function save(){
    var p = {
      businessName: $('pBusinessName').value.trim(),
      ownerName: $('pOwnerName').value.trim(),
      license: $('pLicense').value.trim(),
      email: $('pEmail').value.trim(),
      phone: $('pPhone').value.trim(),
      address: $('pAddress').value.trim(),
      jazzcash: $('pJazzcash').value.trim(),
      easypaisa: $('pEasypaisa').value.trim(),
      bank: $('pBank').value.trim(),
      qrImage: currentQr || '',
      qrText: $('qrText').value.trim(),
      currency: $('pCurrency').value,
      prefix: ($('pPrefix').value.trim() || 'INV').toUpperCase(),
      logo: currentLogo || '',
      products: collectProducts(),
      savedAt: new Date().toISOString()
    };
    if (!p.businessName){
      toast('Please enter a business name');
      return;
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
      toast('✓ Profile saved');
      setTimeout(function(){ location.href = 'app.html'; }, 900);
    } catch(e){
      toast('Storage full — QR ya logo chhota karein');
    }
  }

  function clearProfile(){
    if (!confirm('Delete profile? Saved invoices are not affected.')) return;
    try { localStorage.removeItem(KEY); } catch(e){}
    ['pBusinessName','pOwnerName','pLicense','pEmail','pPhone','pAddress',
     'pJazzcash','pEasypaisa','pBank','pPrefix','qrText']
      .forEach(function(id){ var el = $(id); if (el) el.value = ''; });
    var cur = $('pCurrency'); if (cur) cur.value = 'PKR';
    currentLogo = ''; currentQr = '';
    renderLogoPreview(); renderQrPreview();
    renderProducts([]);
    toast('Profile deleted');
  }

  var tTimer = null;
  function toast(msg){
    var t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('is-on');
    if (tTimer) clearTimeout(tTimer);
    tTimer = setTimeout(function(){ t.classList.remove('is-on'); }, 2600);
  }
})();
