(function(){
  'use strict';
  var currentProfile = null;
  var productList = [];

  document.addEventListener('DOMContentLoaded', function(){
    if (!window.FB) return;
    window.FB.waitForAuth().then(function(u){
      if (!u){ location.href = 'auth.html'; return; }
      return window.FB.getProfile();
    }).then(function(p){
      if (!p) p = {};
      currentProfile = p;
      productList = (p.products || []).slice();
      if (productList.length === 0) productList.push({ name:'', rate:'', stock:'', batch:'', expiry:'' });
      render();
      bindImport();
    }).catch(function(err){
      document.getElementById('productsRoot').innerHTML = '<div class="kw-loading">Error: ' + err.message + '</div>';
    });
  });

  function $(id){ return document.getElementById(id); }
  function escapeHtml(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

  function render(){
    var t = window.KWi18n ? window.KWi18n.t : function(k){ return k; };
    var count = productList.filter(function(p){ return p && p.name && p.name.trim(); }).length;

    var rows = productList.map(function(p, idx){
      return (
        '<div class="kw-prod-row" data-idx="' + idx + '">' +
          '<input type="text" class="kw-prod-name" placeholder="Product Name" value="' + escapeHtml(p.name || '') + '">' +
          '<button type="button" class="kw-prod-del" data-idx="' + idx + '">×</button>' +
          '<div class="kw-prod-grid">' +
            '<label><span>Rate</span><input type="number" class="kw-prod-rate" placeholder="0" value="' + (p.rate != null ? p.rate : '') + '"></label>' +
            '<label><span>Stock</span><input type="number" class="kw-prod-stock" placeholder="0" value="' + (p.stock != null ? p.stock : '') + '"></label>' +
            '<label><span>Batch</span><input type="text" class="kw-prod-batch" placeholder="B-101" value="' + (p.batch || '') + '"></label>' +
            '<label><span>Expiry</span><input type="text" class="kw-prod-expiry" placeholder="MM/YY" value="' + (p.expiry || '') + '"></label>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    var html =
      '<div class="kw-header"><div class="kw-header-top"><div class="kw-brand"><span class="kw-mark">KW</span><span>' + t('products') + '</span></div><a href="home.html" class="kw-icon-btn">🏠</a></div>' +
        '<p class="kw-greeting">' + count + ' items in inventory</p><h1 class="kw-biz-name">' + t('products') + '</h1></div>' +

      '<div class="kw-section"><h2 class="kw-section-title">Inventory List</h2>' +
        '<div id="kwProductList">' + rows + '</div>' +
        '<button type="button" id="kwAddProductBtn" class="kw-btn-primary" style="width:100%;margin-top:10px">+ ' + t('add_product') + '</button>' +
      '</div>' +
      '<div style="padding:16px;max-width:640px;margin:0 auto"><button type="button" id="kwSaveBtn" class="kw-btn-primary" style="width:100%;">💾 Save Inventory</button></div>';

    $('productsRoot').innerHTML = html;
    $('bottomNav').style.display = '';
    bindEvents();
  }

  function collectFromDOM(){
    var rows = document.querySelectorAll('.kw-prod-row');
    var out = [];
    rows.forEach(function(row){
      var name = row.querySelector('.kw-prod-name').value.trim();
      if (!name) return;
      var rate = parseFloat(row.querySelector('.kw-prod-rate').value) || 0;
      var stock = parseFloat(row.querySelector('.kw-prod-stock').value) || 0;
      var batch = row.querySelector('.kw-prod-batch').value.trim();
      var expiry = row.querySelector('.kw-prod-expiry').value.trim();
      out.push({ name: name, rate: rate, stock: stock, batch: batch, expiry: expiry });
    });
    return out;
  }

  function bindEvents(){
    var listWrap = $('kwProductList');
    if (listWrap){
      listWrap.addEventListener('click', function(e){
        if (e.target.classList.contains('kw-prod-del')){
          productList = collectFromDOM();
          productList.splice(parseInt(e.target.getAttribute('data-idx'), 10), 1);
          if (productList.length === 0) productList.push({ name:'', rate:'', stock:'', batch:'', expiry:'' });
          render();
        }
      });
    }

    if ($('kwAddProductBtn')){
      $('kwAddProductBtn').onclick = function(){
        productList = collectFromDOM();
        productList.push({ name:'', rate:'', stock:'', batch:'', expiry:'' });
        render();
      };
    }

    if ($('kwSaveBtn')){
      $('kwSaveBtn').onclick = function(){
        var list = collectFromDOM();
        var btn = this; btn.disabled = true; btn.textContent = 'Saving…';
        var updated = Object.assign({}, currentProfile, { products: list, savedAt: new Date().toISOString() });
        window.FB.saveProfile(updated).then(function(){
          currentProfile = updated;
          btn.textContent = '✓ Saved'; setTimeout(function(){ btn.textContent = '💾 Save Inventory'; btn.disabled = false; }, 1500);
        }).catch(function(err){ alert('Save failed: ' + err.message); btn.disabled = false; btn.textContent = '💾 Save Inventory'; });
      };
    }
  }

  function bindImport(){ /* Simplified for now */ }
})();
