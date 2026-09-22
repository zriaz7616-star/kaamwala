(function(){
  'use strict';

  var KEY = 'kw_profile';
  var currentLogo = '';
  var currentQr = '';

  document.addEventListener('DOMContentLoaded', init);

  function init(){
    if (window.pdfjsLib){
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';
    }
    loadProfile();
    bindLogo();
    bindQr();
    bindProducts();
    bindImport();
    document.getElementById('saveProfileBtn').addEventListener('click', save);
    document.getElementById('clearProfileBtn').addEventListener('click', clearProfile);
  }

  function $(id){ return document.getElementById(id); }

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
    $('logoInput').addEventListener('change', onLogoPicked);
    $('removeLogoBtn').addEventListener('click', function(){
      currentLogo = ''; renderLogoPreview(); toast('Logo removed');
    });
  }

  function onLogoPicked(e){
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    resizeImage(f, 400, 400, function(dataUrl){
      if (dataUrl.length > 350000){
        resizeImage(f, 250, 250, function(smaller){
          currentLogo = smaller; renderLogoPreview(); toast('Logo ready');
        });
      } else {
        currentLogo = dataUrl; renderLogoPreview(); toast('Logo ready');
      }
    });
    e.target.value = '';
  }

  /* ---------- QR ---------- */
  function bindQr(){
    $('qrInput').addEventListener('change', onQrPicked);
    $('removeQrBtn').addEventListener('click', function(){
      currentQr = ''; var t = $('qrText'); if (t) t.value = '';
      renderQrPreview(); toast('QR removed');
    });
    $('generateQrBtn').addEventListener('click', generateQrFromText);
  }

  function onQrPicked(e){
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    resizeImage(f, 500, 500, function(dataUrl){
      if (dataUrl.length > 250000){
        resizeImage(f, 350, 350, function(smaller){
          currentQr = smaller; renderQrPreview(); toast('QR ready');
        });
      } else {
        currentQr = dataUrl; renderQrPreview(); toast('QR ready');
      }
    });
    e.target.value = '';
  }

  function generateQrFromText(){
    var text = ($('qrText').value || '').trim();
    if (!text){ toast('Please type something first'); return; }
    if (typeof window.QRCode !== 'function'){ toast('QR library not loaded'); return; }
    var tmp = document.createElement('div');
    tmp.style.position = 'absolute';
    tmp.style.left = '-99999px'; tmp.style.top = '0';
    document.body.appendChild(tmp);
    try {
      new QRCode(tmp, {
        text: text, width: 500, height: 500,
        colorDark: '#0F172A', colorLight: '#FFFFFF',
        correctLevel: QRCode.CorrectLevel.M
      });
    } catch(e){
      if (tmp.parentNode) tmp.parentNode.removeChild(tmp);
      toast('QR failed: ' + e.message); return;
    }
    setTimeout(function(){
      var dataUrl = '';
      var canvas = tmp.querySelector('canvas');
      if (canvas) { try { dataUrl = canvas.toDataURL('image/png'); } catch(e){} }
      if (!dataUrl){
        var img = tmp.querySelector('img');
        if (img && img.src) dataUrl = img.src;
      }
      if (tmp.parentNode) tmp.parentNode.removeChild(tmp);
      if (!dataUrl){ toast('QR failed'); return; }
      currentQr = dataUrl; renderQrPreview(); toast('QR generated');
    }, 150);
  }

  function renderQrPreview(){
    var el = $('qrPreview');
    if (!el) return;
    if (currentQr){ el.innerHTML = '<img src="' + currentQr + '" alt="QR">'; }
    else { el.innerHTML = '<span class="ph">No QR yet</span>'; }
  }

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
    if (currentLogo){ el.innerHTML = '<img src="' + currentLogo + '" alt="logo">'; }
    else { el.innerHTML = '<span class="ph">No logo</span>'; }
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
    name.type = 'text'; name.className = 'pr-name';
    name.placeholder = 'Product / Service';
    name.value = p.name || '';

    var rate = document.createElement('input');
    rate.type = 'number'; rate.className = 'pr-rate';
    rate.placeholder = 'Rate'; rate.inputMode = 'decimal';
    rate.min = '0'; rate.step = '0.01';
    rate.value = (p.rate != null ? p.rate : '');

    var del = document.createElement('button');
    del.type = 'button'; del.className = 'pr-del'; del.textContent = '×';
    del.addEventListener('click', function(){
      if (row.parentNode) row.parentNode.removeChild(row);
      if ($('productsList').children.length === 0) addProductRow({name:'', rate:''});
    });

    row.appendChild(name); row.appendChild(rate); row.appendChild(del);
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

  /* ---------- IMPORT ---------- */
  function bindImport(){
    var inp = $('importFileInput');
    if (!inp) { console.error('importFileInput not found'); return; }
    inp.addEventListener('change', onImportFile);
  }

  function setImportStatus(kind, msg){
    var el = $('importStatus');
    if (!el) return;
    el.className = 'import-status show ' + kind;
    el.textContent = msg;
  }

  function clearImportStatus(){
    var el = $('importStatus');
    if (!el) return;
    el.className = 'import-status';
    el.textContent = '';
  }

  function onImportFile(e){
    var f = e.target.files && e.target.files[0];
    if (!f) {
      setImportStatus('err', 'Koi file select nahi hui.');
      return;
    }
    e.target.value = '';
    var name = (f.name || '').toLowerCase();

    if (name.endsWith('.pdf') || f.type === 'application/pdf'){
      setImportStatus('info', 'Reading PDF...');
      importFromPdf(f);
    } else {
      setImportStatus('info', 'Reading sheet...');
      importFromSheet(f);
    }
  }

  function importFromSheet(file){
    if (!window.XLSX){
      setImportStatus('err', 'Excel library load nahi hui. Internet check karke page refresh karein.');
      return;
    }
    var reader = new FileReader();
    reader.onload = function(ev){
      try {
        var data = new Uint8Array(ev.target.result);
        var wb = window.XLSX.read(data, {type:'array'});
        if (!wb.SheetNames || wb.SheetNames.length === 0){
          setImportStatus('err', 'File empty hai ya read nahi hui.');
          return;
        }
        var sheet = wb.Sheets[wb.SheetNames[0]];
        var rows = window.XLSX.utils.sheet_to_json(sheet, {header:1, defval:''});
        var products = extractProductsFromRows(rows);
        if (products.length === 0){
          setImportStatus('err', 'Koi product nahi mila. Column headers "Name" aur "Rate" hone chahiye.');
          return;
        }
        applyImportedProducts(products);
        setImportStatus('ok', products.length + ' products import ho gaye. Neeche review karein.');
      } catch(err){
        setImportStatus('err', 'Read error: ' + err.message);
      }
    };
    reader.onerror = function(){ setImportStatus('err', 'File read fail.'); };
    reader.readAsArrayBuffer(file);
  }

  function extractProductsFromRows(rows){
    if (!rows || rows.length === 0) return [];
    var headerIdx = -1, nameCol = -1, rateCol = -1;
    var nameKeys = ['name','product','item','description','particulars','goods','service','detail'];
    var rateKeys = ['rate','price','amount','cost','unit price','mrp','value'];
    for (var r = 0; r < Math.min(rows.length, 5); r++){
      var row = rows[r] || [];
      var mName = -1, mRate = -1;
      for (var c = 0; c < row.length; c++){
        var cell = String(row[c] == null ? '' : row[c]).toLowerCase().trim();
        if (!cell) continue;
        if (mName < 0 && nameKeys.some(function(k){ return cell.indexOf(k) !== -1; })) mName = c;
        if (mRate < 0 && rateKeys.some(function(k){ return cell.indexOf(k) !== -1; })) mRate = c;
      }
      if (mName >= 0){ headerIdx = r; nameCol = mName; rateCol = mRate; break; }
    }
    var out = [];
    if (nameCol >= 0){
      for (var i = headerIdx + 1; i < rows.length; i++){
        var row = rows[i] || [];
        var nm = String(row[nameCol] == null ? '' : row[nameCol]).trim();
        if (!nm) continue;
        var rv = 0;
        if (rateCol >= 0){
          var rawRate = row[rateCol];
          rv = parseFloat(String(rawRate == null ? '' : rawRate).replace(/[^0-9.\-]/g,'')) || 0;
        }
        out.push({ name: nm, rate: rv });
      }
    } else {
      for (var j = 0; j < rows.length; j++){
        var rowJ = rows[j] || [];
        var nmJ = String(rowJ[0] == null ? '' : rowJ[0]).trim();
        if (!nmJ) continue;
        if (/^(name|product|item|description)$/i.test(nmJ)) continue;
        var rvJ = 0;
        for (var c2 = 1; c2 < rowJ.length; c2++){
          var n = parseFloat(String(rowJ[c2] == null ? '' : rowJ[c2]).replace(/[^0-9.\-]/g,''));
          if (!isNaN(n) && n > 0){ rvJ = n; break; }
        }
        out.push({ name: nmJ, rate: rvJ });
      }
    }
    var map = {};
    out.forEach(function(p){ map[p.name.toLowerCase()] = p; });
    return Object.keys(map).map(function(k){ return map[k]; }).slice(0, 500);
  }

  function importFromPdf(file){
    if (!window.pdfjsLib){
      setImportStatus('err', 'PDF library load nahi hui. Internet check karke refresh karein.');
      return;
    }
    var reader = new FileReader();
    reader.onload = function(ev){
      var data = new Uint8Array(ev.target.result);
      window.pdfjsLib.getDocument({data: data}).promise.then(function(pdf){
        var maxPages = Math.min(pdf.numPages, 10);
        var tasks = [];
        for (var i = 1; i <= maxPages; i++){
          tasks.push(pdf.getPage(i).then(function(page){
            return page.getTextContent().then(function(tc){
              return tc.items.map(function(it){ return it.str; }).join(' ');
            });
          }));
        }
        return Promise.all(tasks);
      }).then(function(pages){
        var text = pages.join('\n');
        var products = extractProductsFromPdfText(text);
        if (products.length === 0){
          setImportStatus('err', 'PDF se products nahi mile. Scanned PDF ho sakta hai.');
          return;
        }
        applyImportedProducts(products);
        setImportStatus('ok', products.length + ' items mile. Review karein.');
      }).catch(function(err){
        setImportStatus('err', 'PDF error: ' + (err.message || err));
      });
    };
    reader.onerror = function(){ setImportStatus('err', 'File read fail.'); };
    reader.readAsArrayBuffer(file);
  }

  function extractProductsFromPdfText(text){
    var lines = String(text || '').split(/\s{2,}|\n/).map(function(s){ return s.trim(); }).filter(function(s){ return s.length > 2; });
    var out = [];
    var seen = {};
    lines.forEach(function(line){
      var m = line.match(/^(.+?)\s+((?:Rs\.?\s*)?[0-9][0-9,]*(?:\.[0-9]+)?)\s*$/i);
      if (!m){
        m = line.match(/^([0-9][0-9,]*(?:\.[0-9]+)?)\s+(.+)$/);
        if (m){
          var name2 = m[2].trim();
          var rate2 = parseFloat(m[1].replace(/,/g,'')) || 0;
          if (name2 && name2.length >= 2 && name2.length <= 80 && !/^\d+$/.test(name2)){
            var k = name2.toLowerCase();
            if (!seen[k]){ seen[k] = true; out.push({ name: name2, rate: rate2 }); }
          }
        }
        return;
      }
      var nm = m[1].trim();
      var raw = m[2].replace(/Rs\.?\s*/i,'').replace(/,/g,'');
      var rv = parseFloat(raw) || 0;
      if (!nm || nm.length < 2 || nm.length > 80) return;
      if (/^[0-9\s.,]+$/.test(nm)) return;
      var k2 = nm.toLowerCase();
      if (seen[k2]) return;
      seen[k2] = true;
      out.push({ name: nm, rate: rv });
    });
    return out.slice(0, 500);
  }

  function applyImportedProducts(products){
    products.forEach(function(p){
      addProductRow({ name: p.name, rate: p.rate });
    });
    var wrap = $('productsList');
    var rows = wrap.querySelectorAll('.product-row');
    for (var i = 0; i < rows.length; i++){
      var nm = rows[i].querySelector('.pr-name').value.trim();
      var rt = rows[i].querySelector('.pr-rate').value.trim();
      if (!nm && !rt && rows.length > 1){
        rows[i].parentNode.removeChild(rows[i]);
      }
    }
    toast(products.length + ' products added. Save karein.');
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
    if (!p.businessName){ toast('Please enter a business name'); return; }
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
      toast('Profile saved');
      setTimeout(function(){ location.href = 'app.html'; }, 900);
    } catch(e){
      toast('Storage full - QR ya logo chhota karein');
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
    clearImportStatus();
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
