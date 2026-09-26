(function(){
  'use strict';

  var currentProfile = null;
  var productList = [];
  var dirty = false;

  document.addEventListener('DOMContentLoaded', function(){
    if (!window.FB) return;
    window.FB.waitForAuth().then(function(u){
      if (!u){ location.href = 'auth.html'; return; }
      return window.FB.getProfile();
    }).then(function(p){
      if (!p) p = {};
      currentProfile = p;
      productList = (p.products || []).slice();
      if (productList.length === 0) productList.push({ name:'', rate:'' });
      render();
      bindImport();
    }).catch(function(err){
      console.error('[KW] products load failed:', err);
      document.getElementById('productsRoot').innerHTML =
        '<div class="kw-loading">Could not load. <a href="products.html" style="color:#0F766E">Retry</a></div>';
    });
  });

  function $(id){ return document.getElementById(id); }

  function escapeHtml(s){
    return String(s==null?'':s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function render(){
    var t = window.KWi18n ? window.KWi18n.t : function(k){ return k; };
    var count = productList.filter(function(p){ return p && p.name && p.name.trim(); }).length;

    var rows = productList.map(function(p, idx){
      return (
        '<div class="kw-prod-row" data-idx="' + idx + '">' +
          '<input type="text" class="kw-prod-name" placeholder="Product / Service" value="' + escapeHtml(p.name || '') + '" data-idx="' + idx + '">' +
          '<input type="number" class="kw-prod-rate" placeholder="Rate" inputmode="decimal" min="0" step="0.01" value="' + (p.rate != null ? p.rate : '') + '" data-idx="' + idx + '">' +
          '<button type="button" class="kw-prod-del" data-idx="' + idx + '" aria-label="Delete">×</button>' +
        '</div>'
      );
    }).join('');

    var html =
      '<div class="kw-header">' +
        '<div class="kw-header-top">' +
          '<div class="kw-brand"><span class="kw-mark">KW</span><span>' + escapeHtml(t('products')) + '</span></div>' +
          '<a href="home.html" class="kw-icon-btn" aria-label="Home">🏠</a>' +
        '</div>' +
        '<p class="kw-greeting">' + count + ' ' + (count === 1 ? 'item' : 'items') + ' in your list</p>' +
        '<h1 class="kw-biz-name">' + escapeHtml(t('products')) + '</h1>' +
        '<p class="kw-biz-meta">Rates apne hisaab se edit karein</p>' +
      '</div>' +

      '<div class="kw-section">' +
        '<h2 class="kw-section-title">' + escapeHtml(t('load_template')) + '</h2>' +
        '<select id="kwCategorySelect" style="width:100%;padding:13px 14px;border:1.5px solid #E2E8F0;border-radius:11px;font-size:15px;background:#fff;color:#0F172A;font-family:inherit;min-height:48px;margin-bottom:8px">' +
          '<option value="">— Choose category —</option>' +
        '</select>' +
        '<button type="button" id="kwLoadTemplateBtn" class="kw-btn-primary" style="width:100%;justify-content:center">📦 ' + escapeHtml(t('load_template')) + '</button>' +
      '</div>' +

      '<div class="kw-section">' +
        '<h2 class="kw-section-title">' + escapeHtml(t('import')) + '</h2>' +
        '<label class="kw-btn-primary" style="width:100%;justify-content:center;background:#EEF2FF;color:#4338CA">' +
          '📥 ' + escapeHtml(t('import')) +
          '<input type="file" id="kwImportInput" accept=".xlsx,.xls,.csv,.pdf,application/pdf" style="display:none">' +
        '</label>' +
        '<div id="kwImportStatus" style="margin-top:10px;padding:10px 12px;border-radius:10px;font-size:.85rem;display:none"></div>' +
      '</div>' +

      '<div class="kw-section">' +
        '<h2 class="kw-section-title">Your Products <span class="kw-prod-count">' + count + '</span></h2>' +
        '<div id="kwProductList">' + rows + '</div>' +
        '<button type="button" id="kwAddProductBtn" style="width:100%;padding:12px;background:#F0FDFA;color:#0F766E;border:1.5px dashed #99F6E4;border-radius:11px;font-weight:700;font-size:.9rem;cursor:pointer;font-family:inherit;min-height:48px;margin-top:6px">+ ' + escapeHtml(t('add_product')) + '</button>' +
      '</div>' +

      '<div style="padding:16px;max-width:640px;margin:0 auto">' +
        '<button type="button" id="kwSaveBtn" class="kw-btn-primary" style="width:100%;justify-content:center;min-height:52px;font-size:1rem">💾 ' + escapeHtml(t('save')) + '</button>' +
      '</div>';

    $('productsRoot').innerHTML = html;
    $('bottomNav').style.display = '';

    bindEvents();
    populateCategorySelect();
  }

  function populateCategorySelect(){
    var sel = $('kwCategorySelect');
    if (!sel || !window.KW_CATEGORIES) return;
    Object.keys(window.KW_CATEGORIES).forEach(function(k){
      var c = window.KW_CATEGORIES[k];
      var opt = document.createElement('option');
      opt.value = k;
      opt.textContent = c.icon + '  ' + c.label;
      sel.appendChild(opt);
    });
  }

  function collectFromDOM(){
    var rows = document.querySelectorAll('.kw-prod-row');
    var out = [];
    rows.forEach(function(row){
      var name = row.querySelector('.kw-prod-name').value.trim();
      var rate = parseFloat(row.querySelector('.kw-prod-rate').value) || 0;
      if (name) out.push({ name: name, rate: rate });
    });
    return out;
  }

  function bindEvents(){
    var listWrap = $('kwProductList');
    if (listWrap){
      listWrap.addEventListener('input', function(e){
        if (e.target.classList.contains('kw-prod-name') || e.target.classList.contains('kw-prod-rate')){
          dirty = true;
        }
      });
      listWrap.addEventListener('click', function(e){
        if (e.target.classList.contains('kw-prod-del')){
          var idx = parseInt(e.target.getAttribute('data-idx'), 10);
          productList = collectFromDOM();
          productList.splice(idx, 1);
          if (productList.length === 0) productList.push({ name:'', rate:'' });
          render();
          bindImport();
          dirty = true;
        }
      });
    }

    var addBtn = $('kwAddProductBtn');
    if (addBtn){
      addBtn.addEventListener('click', function(){
        productList = collectFromDOM();
        productList.push({ name:'', rate:'' });
        render();
        bindImport();
        dirty = true;
        setTimeout(function(){
          var rows = document.querySelectorAll('.kw-prod-row');
          var last = rows[rows.length - 1];
          if (last) last.querySelector('.kw-prod-name').focus();
        }, 50);
      });
    }

    var templateBtn = $('kwLoadTemplateBtn');
    if (templateBtn){
      templateBtn.addEventListener('click', function(){
        var sel = $('kwCategorySelect');
        if (!sel || !sel.value){ alert('Pehle category select karein'); return; }
        var cat = window.KW_CATEGORIES[sel.value];
        if (!cat || !cat.products) return;
        if (!confirm('Add ' + cat.products.length + ' products from "' + cat.label + '"?')) return;
        productList = collectFromDOM();
        cat.products.forEach(function(p){
          var name = Array.isArray(p) ? p[0] : (p.name || '');
          var rate = Array.isArray(p) ? p[1] : (p.rate || 0);
          productList.push({ name: name, rate: rate });
        });
        render();
        bindImport();
        dirty = true;
      });
    }

    var saveBtn = $('kwSaveBtn');
    if (saveBtn){
      saveBtn.addEventListener('click', function(){
        var list = collectFromDOM();
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving…';
        var updated = Object.assign({}, currentProfile, { products: list, savedAt: new Date().toISOString() });
        window.FB.saveProfile(updated).then(function(){
          currentProfile = updated;
          dirty = false;
          saveBtn.textContent = '✓ Saved';
          setTimeout(function(){
            saveBtn.textContent = '💾 ' + (window.KWi18n ? window.KWi18n.t('save') : 'Save');
            saveBtn.disabled = false;
          }, 1500);
        }).catch(function(err){
          alert('Save failed: ' + (err.message || ''));
          saveBtn.disabled = false;
          saveBtn.textContent = '💾 ' + (window.KWi18n ? window.KWi18n.t('save') : 'Save');
        });
      });
    }
  }

  function bindImport(){
    var inp = $('kwImportInput');
    if (!inp) return;
    inp.addEventListener('change', function(e){
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      e.target.value = '';
      var name = (f.name || '').toLowerCase();
      setStatus('info', 'Reading…');
      if (name.endsWith('.pdf')){
        importFromPdf(f);
      } else {
        importFromSheet(f);
      }
    });
  }

  function setStatus(kind, msg){
    var el = $('kwImportStatus');
    if (!el) return;
    var colors = {
      info: { bg:'#EEF2FF', c:'#3730A3' },
      ok:   { bg:'#ECFDF5', c:'#065F46' },
      err:  { bg:'#FEF2F2', c:'#991B1B' }
    };
    var cc = colors[kind] || colors.info;
    el.style.display = 'block';
    el.style.background = cc.bg;
    el.style.color = cc.c;
    el.textContent = msg;
  }

  function importFromSheet(file){
    if (!window.XLSX){ setStatus('err', 'Excel library not loaded'); return; }
    var reader = new FileReader();
    reader.onload = function(ev){
      try {
        var wb = window.XLSX.read(new Uint8Array(ev.target.result), {type:'array'});
        var sheet = wb.Sheets[wb.SheetNames[0]];
        var rows = window.XLSX.utils.sheet_to_json(sheet, {header:1, defval:''});
        var found = [];
        rows.forEach(function(r, idx){
          var nm = String((r[0] == null ? '' : r[0])).trim();
          if (!nm) return;
          if (idx === 0 && /^(name|product|item|description)$/i.test(nm)) return;
          var rate = 0;
          for (var c = 1; c < r.length; c++){
            var n = parseFloat(String(r[c] == null ? '' : r[c]).replace(/[^0-9.\-]/g,''));
            if (!isNaN(n) && n > 0){ rate = n; break; }
          }
          found.push({ name: nm, rate: rate });
        });
        if (!found.length){ setStatus('err', 'Koi product nahi mila'); return; }
        productList = collectFromDOM().concat(found);
        render();
        bindImport();
        dirty = true;
        setStatus('ok', '✓ ' + found.length + ' products imported');
      } catch(err){
        setStatus('err', 'Read error: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function importFromPdf(file){
    if (!window.pdfjsLib){ setStatus('err', 'PDF library not loaded'); return; }
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';
    var reader = new FileReader();
    reader.onload = function(ev){
      window.pdfjsLib.getDocument({data: new Uint8Array(ev.target.result)}).promise
        .then(function(pdf){
          var tasks = [];
          var max = Math.min(pdf.numPages, 10);
          for (var i = 1; i <= max; i++){
            tasks.push(pdf.getPage(i).then(function(p){
              return p.getTextContent().then(function(tc){
                return tc.items.map(function(it){ return it.str; }).join(' ');
              });
            }));
          }
          return Promise.all(tasks);
        }).then(function(pages){
          var text = pages.join('\n');
          var found = [];
          var lines = text.split(/\s{2,}|\n/).map(function(s){ return s.trim(); }).filter(function(s){ return s.length > 2; });
          lines.forEach(function(line){
            var m = line.match(/^(.+?)\s+((?:Rs\.?\s*)?[0-9][0-9,]*(?:\.[0-9]+)?)\s*$/i);
            if (m){
              var nm = m[1].trim();
              var rate = parseFloat(m[2].replace(/Rs\.?\s*/i,'').replace(/,/g,'')) || 0;
              if (nm && nm.length >= 2 && nm.length <= 80 && !/^[0-9\s.,]+$/.test(nm)){
                found.push({ name: nm, rate: rate });
              }
            }
          });
          if (!found.length){ setStatus('err', 'PDF se products nahi mile'); return; }
          productList = collectFromDOM().concat(found);
          render();
          bindImport();
          dirty = true;
          setStatus('ok', '✓ ' + found.length + ' lines imported');
        }).catch(function(err){
          setStatus('err', 'PDF error: ' + (err.message || ''));
        });
    };
    reader.readAsArrayBuffer(file);
  }
})();
