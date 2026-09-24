(function(){
  'use strict';

  var CURRENCY_SYMBOLS = {PKR:'Rs', USD:'$', AED:'AED', GBP:'GBP'};
  var pdfCache = { signature: null, blob: null, file: null, filename: null };
  var prebuildTimer = null;

  // Global state for current user + premium
  var currentUser = null;
  var cloudPremium = false;

  document.addEventListener('DOMContentLoaded', init);

  function init(){
    setDefaults();
    bindAccount();
    initAuth();
    renderBizCard();
    renderPremiumBanner();
    populateProductsDatalist();
    bindTabs();
    bindFields();
    bindItems();
    bindActions();
    renderItems();
    renderPreview();
    setDebug('Ready. Prebuilding PDF…');
    setTimeout(schedulePrebuild, 300);
  }

  function $(id){ return document.getElementById(id); }
  function setDebug(msg){ var el = $('debug'); if (el) el.textContent = msg; }
  function logDebug(msg){ try { console.log('[KW] ' + msg); } catch(e){} }
  function escapeHtml(s){
    return String(s==null?'':s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  /* ---------- AUTH ---------- */
  function bindAccount(){
    var btn = $('accountBtn');
    if (btn){
      btn.addEventListener('click', function(e){
        e.preventDefault();
        if (currentUser) openAccountMenu();
        else location.href = 'auth.html';
      });
    }
  }

  function initAuth(){
    if (!window.KWAuthHelpers || !window.KWAuth || !window.KWAuth.ready){
      renderAccountBar();
      return;
    }
    window.KWAuthHelpers.onUser(function(user){
      currentUser = user || null;
      if (user){
        // Fetch premium status from Firestore
        window.KWAuthHelpers.getUserDoc(user.uid).then(function(doc){
          cloudPremium = !!(doc && doc.premium);
          refreshAfterAuth();
        }).catch(function(){
          cloudPremium = false;
          refreshAfterAuth();
        });
      } else {
        cloudPremium = false;
        refreshAfterAuth();
      }
      renderAccountBar();
    });
  }

  function refreshAfterAuth(){
    renderBizCard();
    renderPremiumBanner();
    renderPreview();
    pdfCache = { signature:null, blob:null, file:null, filename:null };
    schedulePrebuild();
  }

  function renderAccountBar(){
    var wrap = $('accountBar');
    if (!wrap) return;
    wrap.innerHTML = '';
  }

  function openAccountMenu(){
    var existing = document.querySelector('.kw-overlay');
    if (existing) existing.parentNode.removeChild(existing);

    var overlay = document.createElement('div');
    overlay.className = 'kw-overlay';
    overlay.innerHTML =
      '<div class="kw-modal">' +
        '<h3>👤 Your Account</h3>' +
        '<p style="margin-bottom:10px">Signed in as<br><strong style="color:#0F172A">' + escapeHtml(currentUser.email) + '</strong></p>' +
        (cloudPremium ? '<div style="background:#ECFDF5;color:#065F46;padding:10px 12px;border-radius:10px;font-size:.85rem;margin-bottom:12px;font-weight:700;text-align:center">⭐ Premium Active</div>' : '') +
        '<button class="kw-primary" id="kwLogout">Sign Out</button>' +
        '<button class="kw-secondary" id="kwCloseAcc">Close</button>' +
      '</div>';
    document.body.appendChild(overlay);
    function close(){ if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    overlay.addEventListener('click', function(e){ if (e.target === overlay) close(); });
    $('kwCloseAcc').addEventListener('click', close);
    $('kwLogout').addEventListener('click', function(){
      window.KWAuthHelpers.signOut().then(function(){
        close();
        location.reload();
      });
    });
  }

  /* ---------- PREMIUM ---------- */
  function isPremium(){
    // Cloud premium (if logged in) takes priority
    if (currentUser && cloudPremium) return true;
    // Fallback to local code (for offline users)
    return window.KW && window.KW.isPremium && window.KW.isPremium();
  }

  function getProfile(){
    try { return JSON.parse(localStorage.getItem('kw_profile') || 'null'); }
    catch(e){ return null; }
  }

  /* ---------- BUSINESS CARD ---------- */
  function renderBizCard(){
    var p = getProfile();
    var wrap = $('bizCardWrap');
    if (!wrap) return;
    if (!p || !p.businessName){
      wrap.innerHTML =
        '<div class="biz-card biz-card-empty">' +
          '<div class="biz-card-empty-icon">🏢</div>' +
          '<div class="biz-card-empty-body">' +
            '<h3>Setup your business</h3>' +
            '<p>Add name, logo, contact & payment — har invoice par automatic aayengi.</p>' +
          '</div>' +
          '<a href="profile.html" class="biz-card-setup-btn">Set up →</a>' +
        '</div>';
      return;
    }
    var metaParts = [];
    if (p.ownerName && p.ownerName !== p.businessName) metaParts.push(p.ownerName);
    if (p.license) metaParts.push(p.license);
    var contactParts = [p.phone, p.email].filter(Boolean);
    var logoSrc = p.logo
      ? '<img src="' + p.logo + '" alt="logo" class="biz-card-logo-img">'
      : '<div class="biz-card-logo-ph">' + escapeHtml((p.businessName || 'B').charAt(0).toUpperCase()) + '</div>';
    var premiumBadge = isPremium() ? '<span class="premium-badge">Premium</span>' : '';

    wrap.innerHTML =
      '<div class="biz-card">' +
        '<div class="biz-card-logo">' + logoSrc + '</div>' +
        '<div class="biz-card-info">' +
          '<h3>' + escapeHtml(p.businessName) + premiumBadge + '</h3>' +
          (metaParts.length ? '<p class="biz-card-meta">' + escapeHtml(metaParts.join(' • ')) + '</p>' : '') +
          (contactParts.length ? '<p class="biz-card-contact">' + escapeHtml(contactParts.join('  |  ')) + '</p>' : '') +
        '</div>' +
        '<a href="profile.html" class="biz-card-edit" aria-label="Edit business">✏️</a>' +
      '</div>';
  }

  function renderPremiumBanner(){
    var wrap = $('premiumBanner');
    if (!wrap) return;
    if (isPremium()){ wrap.innerHTML = ''; return; }
    var used = window.KW ? window.KW.invoiceCount() : 0;
    var limit = window.KW ? window.KW.FREE_LIMIT : 3;
    var remaining = Math.max(0, limit - used);

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
        '<label class="kw-price-opt">' +
          '<input type="radio" name="kwPlan" value="monthly" checked>' +
          '<span class="kw-price-box">' +
            '<span class="per">Monthly</span>' +
            '<span class="amt">Rs 499</span>' +
            '<span class="note">per month</span>' +
          '</span>' +
        '</label>' +
        '<label class="kw-price-opt">' +
          '<input type="radio" name="kwPlan" value="yearly">' +
          '<span class="kw-price-box">' +
            '<span class="per">Yearly</span>' +
            '<span class="amt">Rs 3,999</span>' +
            '<span class="note">save 33%</span>' +
          '</span>' +
        '</label>' +
      '</div>' +
      '<div class="kw-section-title">How to pay</div>' +
      '<div class="kw-cta-row">' +
        '<strong>1.</strong> Send <strong id="kwPayAmount">Rs 499</strong> (<span id="kwPayPlan">Monthly</span>) to:<br>' +
        '📱 <strong>Easypaisa:</strong> 0342 5681324<br>' +
        '📱 <strong>Raast ID:</strong> 0300 7552962<br>' +
        '<strong>2.</strong> WhatsApp your payment screenshot to <strong>0342 5681324</strong><br>' +
        '<strong>3.</strong> You\'ll receive a code — enter it below.' +
      '</div>' +
      '<div class="kw-section-title">Enter your code</div>' +
      '<input type="text" id="kwCodeInput" placeholder="KW-XXXXXX-XXXXXXXX" autocomplete="off" spellcheck="false" autocapitalize="characters">' +
      '<div class="kw-msg" id="kwMsg" style="display:none"></div>' +
      '<button class="kw-primary" id="kwActivate">Unlock Premium</button>' +
      '<button class="kw-secondary" id="kwClose">Close</button>' +
    '</div>';
  document.body.appendChild(overlay);

  function close(){ if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
  overlay.addEventListener('click', function(e){ if (e.target === overlay) close(); });
  $('kwClose').addEventListener('click', close);

  function updatePay(plan){
    var amt = $('kwPayAmount');
    var lbl = $('kwPayPlan');
    if (!amt || !lbl) return;
    if (plan === 'yearly'){ amt.textContent = 'Rs 3,999'; lbl.textContent = 'Yearly'; }
    else { amt.textContent = 'Rs 499'; lbl.textContent = 'Monthly'; }
  }

  var radios = overlay.querySelectorAll('input[name="kwPlan"]');
  for (var i = 0; i < radios.length; i++){
    radios[i].addEventListener('change', function(){
      updatePay(this.value);
    });
  }

  $('kwActivate').addEventListener('click', function(){
    var code = ($('kwCodeInput').value || '').trim();
    var msg = $('kwMsg');
    if (!code){
      msg.style.display = 'block';
      msg.className = 'kw-msg kw-msg-err';
      msg.textContent = 'Please enter a code';
      return;
    }
    var res = window.KW ? window.KW.activate(code) : {ok:false, reason:'Not available'};
    if (res.ok){
      msg.style.display = 'block';
      msg.className = 'kw-msg kw-msg-ok';
      msg.textContent = '✓ Premium unlocked!';
      setTimeout(function(){ close(); refreshAfterAuth(); }, 1200);
    } else {
      msg.style.display = 'block';
      msg.className = 'kw-msg kw-msg-err';
      msg.textContent = '✗ ' + (res.reason || 'Invalid code');
    }
  });
}

  function refreshAfterAuth(){
    renderBizCard();
    renderPremiumBanner();
    renderPreview();
    pdfCache = { signature:null, blob:null, file:null, filename:null };
    schedulePrebuild();
  }

  function renderAccountBar(){
    var wrap = $('accountBar');
    if (!wrap) return;
    wrap.innerHTML = '';
  }

  function openAccountMenu(){
    var existing = document.querySelector('.kw-overlay');
    if (existing) existing.parentNode.removeChild(existing);

    var overlay = document.createElement('div');
    overlay.className = 'kw-overlay';
    overlay.innerHTML =
      '<div class="kw-modal">' +
        '<h3>👤 Your Account</h3>' +
        '<p style="margin-bottom:10px">Signed in as<br><strong style="color:#0F172A">' + escapeHtml(currentUser.email) + '</strong></p>' +
        (cloudPremium ? '<div style="background:#ECFDF5;color:#065F46;padding:10px 12px;border-radius:10px;font-size:.85rem;margin-bottom:12px;font-weight:700;text-align:center">⭐ Premium Active</div>' : '') +
        '<button class="kw-primary" id="kwLogout">Sign Out</button>' +
        '<button class="kw-secondary" id="kwCloseAcc">Close</button>' +
      '</div>';
    document.body.appendChild(overlay);
    function close(){ if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    overlay.addEventListener('click', function(e){ if (e.target === overlay) close(); });
    $('kwCloseAcc').addEventListener('click', close);
    $('kwLogout').addEventListener('click', function(){
      window.KWAuthHelpers.signOut().then(function(){
        close();
        location.reload();
      });
    });
  }

  /* ---------- PREMIUM ---------- */
  function isPremium(){
    // Cloud premium (if logged in) takes priority
    if (currentUser && cloudPremium) return true;
    // Fallback to local code (for offline users)
    return window.KW && window.KW.isPremium && window.KW.isPremium();
  }

  function getProfile(){
    try { return JSON.parse(localStorage.getItem('kw_profile') || 'null'); }
    catch(e){ return null; }
  }

  /* ---------- BUSINESS CARD ---------- */
  function renderBizCard(){
    var p = getProfile();
    var wrap = $('bizCardWrap');
    if (!wrap) return;
    if (!p || !p.businessName){
      wrap.innerHTML =
        '<div class="biz-card biz-card-empty">' +
          '<div class="biz-card-empty-icon">🏢</div>' +
          '<div class="biz-card-empty-body">' +
            '<h3>Setup your business</h3>' +
            '<p>Add name, logo, contact & payment — har invoice par automatic aayengi.</p>' +
          '</div>' +
          '<a href="profile.html" class="biz-card-setup-btn">Set up →</a>' +
        '</div>';
      return;
    }
    var metaParts = [];
    if (p.ownerName && p.ownerName !== p.businessName) metaParts.push(p.ownerName);
    if (p.license) metaParts.push(p.license);
    var contactParts = [p.phone, p.email].filter(Boolean);
    var logoSrc = p.logo
      ? '<img src="' + p.logo + '" alt="logo" class="biz-card-logo-img">'
      : '<div class="biz-card-logo-ph">' + escapeHtml((p.businessName || 'B').charAt(0).toUpperCase()) + '</div>';
    var premiumBadge = isPremium() ? '<span class="premium-badge">Premium</span>' : '';

    wrap.innerHTML =
      '<div class="biz-card">' +
        '<div class="biz-card-logo">' + logoSrc + '</div>' +
        '<div class="biz-card-info">' +
          '<h3>' + escapeHtml(p.businessName) + premiumBadge + '</h3>' +
          (metaParts.length ? '<p class="biz-card-meta">' + escapeHtml(metaParts.join(' • ')) + '</p>' : '') +
          (contactParts.length ? '<p class="biz-card-contact">' + escapeHtml(contactParts.join('  |  ')) + '</p>' : '') +
        '</div>' +
        '<a href="profile.html" class="biz-card-edit" aria-label="Edit business">✏️</a>' +
      '</div>';
  }

  function renderPremiumBanner(){
    var wrap = $('premiumBanner');
    if (!wrap) return;
    if (isPremium()){ wrap.innerHTML = ''; return; }
    var used = window.KW ? window.KW.invoiceCount() : 0;
    var limit = window.KW ? window.KW.FREE_LIMIT : 3;
    var remaining = Math.max(0, limit - used);

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

  function openUpgradeModal(){
    var existing = document.querySelector('.kw-overlay');
    if (existing) existing.parentNode.removeChild(existing);

    var selectedPlan = 'monthly';
    var plans = {
      monthly: { label: 'Monthly', amount: 'Rs 499' },
      yearly:  { label: 'Yearly',  amount: 'Rs 3,999' }
    };

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
          '<strong>3.</strong> You\'ll receive a code — enter it below.' +
        '</div>' +
        '<div class="kw-section-title">Enter your code</div>' +
        '<input type="text" id="kwCodeInput" placeholder="KW-XXXXXX-XXXXXXXX" autocomplete="off" spellcheck="false" autocapitalize="characters" inputmode="text">' +
        '<div class="kw-msg" id="kwMsg" style="display:none"></div>' +
        '<button class="kw-primary" id="kwActivate">Unlock Premium</button>' +
        '<button class="kw-secondary" id="kwClose">Close</button>' +
      '</div>';
    document.body.appendChild(overlay);

    function close(){ if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    overlay.addEventListener('click', function(e){ if (e.target === overlay) close(); });
    $('kwClose').addEventListener('click', close);

    function selectPlan(plan){
      selectedPlan = plan;
      var boxes = overlay.querySelectorAll('.kw-price-box');
      for (var i = 0; i < boxes.length; i++){
        boxes[i].classList.toggle('is-selected', boxes[i].getAttribute('data-plan') === plan);
      }
      var p = plans[plan];
      var amtEl = $('kwPayAmount');
      var plEl = $('kwPayPlan');
      if (amtEl) amtEl.textContent = p.amount;
      if (plEl) plEl.textContent = p.label;
    }

    var planBoxes = overlay.querySelectorAll('.kw-price-box');
    for (var i = 0; i < planBoxes.length; i++){
      (function(box){
        var plan = box.getAttribute('data-plan');
        box.onclick = function(ev){
          ev.preventDefault();
          ev.stopPropagation();
          selectPlan(plan);
        };
        box.ontouchend = function(ev){
          ev.preventDefault();
          ev.stopPropagation();
          selectPlan(plan);
        };
      })(planBoxes[i]);
    }

    $('kwActivate').addEventListener('click', function(){
      var code = ($('kwCodeInput').value || '').trim();
      var msg = $('kwMsg');
      if (!code){
        msg.style.display = 'block';
        msg.className = 'kw-msg kw-msg-err';
        msg.textContent = 'Please enter a code';
        return;
      }
      var res = window.KW ? window.KW.activate(code) : {ok:false, reason:'Not available'};
      if (res.ok){
        msg.style.display = 'block';
        msg.className = 'kw-msg kw-msg-ok';
        msg.textContent = '✓ Premium unlocked!';
        setTimeout(function(){ close(); refreshAfterAuth(); }, 1200);
      } else {
        msg.style.display = 'block';
        msg.className = 'kw-msg kw-msg-err';
        msg.textContent = '✗ ' + (res.reason || 'Invalid code');
      }
    });
  }

  function refreshAfterAuth(){
    renderBizCard();
    renderPremiumBanner();
    renderPreview();
    pdfCache = { signature:null, blob:null, file:null, filename:null };
    schedulePrebuild();
  }

  function renderAccountBar(){
    var wrap = $('accountBar');
    if (!wrap) return;
    wrap.innerHTML = '';
  }

  function openAccountMenu(){
    var existing = document.querySelector('.kw-overlay');
    if (existing) existing.parentNode.removeChild(existing);

    var overlay = document.createElement('div');
    overlay.className = 'kw-overlay';
    overlay.innerHTML =
      '<div class="kw-modal">' +
        '<h3>👤 Your Account</h3>' +
        '<p style="margin-bottom:10px">Signed in as<br><strong style="color:#0F172A">' + escapeHtml(currentUser.email) + '</strong></p>' +
        (cloudPremium ? '<div style="background:#ECFDF5;color:#065F46;padding:10px 12px;border-radius:10px;font-size:.85rem;margin-bottom:12px;font-weight:700;text-align:center">⭐ Premium Active</div>' : '') +
        '<button class="kw-primary" id="kwLogout">Sign Out</button>' +
        '<button class="kw-secondary" id="kwCloseAcc">Close</button>' +
      '</div>';
    document.body.appendChild(overlay);
    function close(){ if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    overlay.addEventListener('click', function(e){ if (e.target === overlay) close(); });
    $('kwCloseAcc').addEventListener('click', close);
    $('kwLogout').addEventListener('click', function(){
      window.KWAuthHelpers.signOut().then(function(){
        close();
        location.reload();
      });
    });
  }

  /* ---------- PREMIUM ---------- */
  function isPremium(){
    // Cloud premium (if logged in) takes priority
    if (currentUser && cloudPremium) return true;
    // Fallback to local code (for offline users)
    return window.KW && window.KW.isPremium && window.KW.isPremium();
  }

  function getProfile(){
    try { return JSON.parse(localStorage.getItem('kw_profile') || 'null'); }
    catch(e){ return null; }
  }

  /* ---------- BUSINESS CARD ---------- */
  function renderBizCard(){
    var p = getProfile();
    var wrap = $('bizCardWrap');
    if (!wrap) return;
    if (!p || !p.businessName){
      wrap.innerHTML =
        '<div class="biz-card biz-card-empty">' +
          '<div class="biz-card-empty-icon">🏢</div>' +
          '<div class="biz-card-empty-body">' +
            '<h3>Setup your business</h3>' +
            '<p>Add name, logo, contact & payment — har invoice par automatic aayengi.</p>' +
          '</div>' +
          '<a href="profile.html" class="biz-card-setup-btn">Set up →</a>' +
        '</div>';
      return;
    }
    var metaParts = [];
    if (p.ownerName && p.ownerName !== p.businessName) metaParts.push(p.ownerName);
    if (p.license) metaParts.push(p.license);
    var contactParts = [p.phone, p.email].filter(Boolean);
    var logoSrc = p.logo
      ? '<img src="' + p.logo + '" alt="logo" class="biz-card-logo-img">'
      : '<div class="biz-card-logo-ph">' + escapeHtml((p.businessName || 'B').charAt(0).toUpperCase()) + '</div>';
    var premiumBadge = isPremium() ? '<span class="premium-badge">Premium</span>' : '';

    wrap.innerHTML =
      '<div class="biz-card">' +
        '<div class="biz-card-logo">' + logoSrc + '</div>' +
        '<div class="biz-card-info">' +
          '<h3>' + escapeHtml(p.businessName) + premiumBadge + '</h3>' +
          (metaParts.length ? '<p class="biz-card-meta">' + escapeHtml(metaParts.join(' • ')) + '</p>' : '') +
          (contactParts.length ? '<p class="biz-card-contact">' + escapeHtml(contactParts.join('  |  ')) + '</p>' : '') +
        '</div>' +
        '<a href="profile.html" class="biz-card-edit" aria-label="Edit business">✏️</a>' +
      '</div>';
  }

  function renderPremiumBanner(){
    var wrap = $('premiumBanner');
    if (!wrap) return;
    if (isPremium()){ wrap.innerHTML = ''; return; }
    var used = window.KW ? window.KW.invoiceCount() : 0;
    var limit = window.KW ? window.KW.FREE_LIMIT : 3;
    var remaining = Math.max(0, limit - used);

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

  function openUpgradeModal(){
    var existing = document.querySelector('.kw-overlay');
    if (existing) existing.parentNode.removeChild(existing);

    var overlay = document.createElement('div');
    overlay.className = 'kw-overlay';
    overlay.innerHTML =
      '<div class="kw-modal" id="kwUpgradeModal">' +
        '<h3>⭐ Upgrade to Premium</h3>' +
        '<p>Unlock unlimited invoices & remove the "Made with KaamWala" watermark.</p>' +
        '<div class="kw-price-grid">' +
          '<div class="kw-price-box featured">' +
            '<div class="per">Monthly</div>' +
            '<div class="amt">Rs 499</div>' +
            '<div class="note">per month</div>' +
          '</div>' +
          '<div class="kw-price-box">' +
            '<div class="per">Yearly</div>' +
            '<div class="amt">Rs 3,999</div>' +
            '<div class="note">save 33%</div>' +
          '</div>' +
        '</div>' +
        '<div class="kw-section-title">How to pay</div>' +
        '<div class="kw-cta-row">' +
          '<strong>1.</strong> Send Rs 499 (or Rs 3,999) to:<br>' +
          '📱 <strong>Easypaisa:</strong> 0342 5681324<br>' +
          '📱 <strong>Raast ID:</strong> 0300 7552962<br>' +
          '<strong>2.</strong> WhatsApp your payment screenshot to <strong>0342 5681324</strong><br>' +
          '<strong>3.</strong> You\'ll receive a code — enter it below.' +
        '</div>' +
        '<div class="kw-section-title">Enter your code</div>' +
        '<input type="text" id="kwCodeInput" placeholder="KW-XXXXXX-XXXXXXXX" autocomplete="off" spellcheck="false">' +
        '<div class="kw-msg" id="kwMsg" style="display:none"></div>' +
        '<button class="kw-primary" id="kwActivate">Unlock Premium</button>' +
        '<button class="kw-secondary" id="kwClose">Close</button>' +
      '</div>';
    document.body.appendChild(overlay);

    function close(){ if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    overlay.addEventListener('click', function(e){ if (e.target === overlay) close(); });
    $('kwClose').addEventListener('click', close);

    $('kwActivate').addEventListener('click', function(){
      var code = ($('kwCodeInput').value || '').trim();
      var msg = $('kwMsg');
      if (!code){
        msg.style.display = 'block';
        msg.className = 'kw-msg kw-msg-err';
        msg.textContent = 'Please enter a code';
        return;
      }
      var res = window.KW ? window.KW.activate(code) : {ok:false, reason:'Not available'};
      if (res.ok){
        msg.style.display = 'block';
        msg.className = 'kw-msg kw-msg-ok';
        msg.textContent = '✓ Premium unlocked!';
        setTimeout(function(){ close(); refreshAfterAuth(); }, 1200);
      } else {
        msg.style.display = 'block';
        msg.className = 'kw-msg kw-msg-err';
        msg.textContent = '✗ ' + (res.reason || 'Invalid code');
      }
    });
  }

  /* ---------- PRODUCTS ---------- */
  function populateProductsDatalist(){
    var p = getProfile();
    var dl = $('kwProducts');
    if (!dl) return;
    dl.innerHTML = '';
    if (!p || !p.products || !p.products.length) return;
    p.products.forEach(function(prod){
      if (!prod.name) return;
      var opt = document.createElement('option');
      opt.value = prod.name;
      dl.appendChild(opt);
    });
  }

  function findProduct(name){
    var p = getProfile();
    if (!p || !p.products) return null;
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
    var p = getProfile();
    var prefix = (p && p.prefix) ? p.prefix : 'INV';
    if (!$('invNumber').value){
      $('invNumber').value = prefix + '-' + String(Date.now()).slice(-5);
    }
    if (p && p.currency && $('invCurrency')) $('invCurrency').value = p.currency;
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
      if (t.matches('.item-desc,.item-qty,.item-rate')) {
        updateAmounts();
        renderPreview();
        schedulePrebuild();
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
          schedulePrebuild();
        }
      }
    });
  }

  function bindActions(){
    $('saveBtn').addEventListener('click', saveInvoice);
    $('shareBtn').addEventListener('click', shareInvoice);
    $('pdfBtn').addEventListener('click', downloadPDF);
    var printBtn = $('printBtn');
    if (printBtn) printBtn.addEventListener('click', printInvoice);
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
    desc.placeholder = 'Type product or service name';
    desc.value = item.desc || '';
    desc.setAttribute('list', 'kwProducts');
    desc.setAttribute('autocomplete', 'off');

    var grid = document.createElement('div');
    grid.className = 'item-grid';

    function numField(cls, labelText, value){
      var label = document.createElement('label');
      var span = document.createElement('span'); span.textContent = labelText;
      var inp = document.createElement('input');
      inp.type = 'number'; inp.className = cls; inp.inputMode = 'decimal';
      inp.min = '0'; inp.step = '0.01'; inp.value = value;
      label.appendChild(span); label.appendChild(inp);
      return label;
    }

    grid.appendChild(numField('item-qty','Qty', item.qty != null ? item.qty : 1));
    grid.appendChild(numField('item-rate','Rate', item.rate != null ? item.rate : 0));

    var amtLabel = document.createElement('label');
    var amtSpan = document.createElement('span'); amtSpan.textContent = 'Amount';
    var amt = document.createElement('input');
    amt.type = 'text'; amt.className = 'item-amount'; amt.readOnly = true; amt.value = '0.00';
    amtLabel.appendChild(amtSpan); amtLabel.appendChild(amt);
    grid.appendChild(amtLabel);

    var rm = document.createElement('button');
    rm.type = 'button'; rm.className = 'remove-btn'; rm.textContent = '×';
    rm.setAttribute('aria-label','Remove item');
    grid.appendChild(rm);

    desc.addEventListener('change', function(){
      var prod = findProduct(desc.value);
      if (!prod) return;
      var rateInput = row.querySelector('.item-rate');
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

  function readData(){
    var p = getProfile();
    var data = {
      from: {
        name: p ? p.businessName : '',
        ownerName: p ? p.ownerName : '',
        license: p ? p.license : '',
        email: p ? p.email : '',
        phone: p ? p.phone : '',
        address: p ? p.address : '',
        logo: p ? (p.logo || '') : ''
      },
      to: { name: $('toName').value.trim(), email: $('toEmail').value.trim(),
            phone: $('toPhone').value.trim(), address: $('toAddress').value.trim() },
      invoice: { number: $('invNumber').value.trim(), date: $('invDate').value,
                 due: $('invDue').value, currency: $('invCurrency').value,
                 notes: $('invNotes').value.trim() },
      payment: {
        jazzcash: p ? (p.jazzcash || '') : '',
        easypaisa: p ? (p.easypaisa || '') : '',
        bank: p ? (p.bank || '') : '',
        qrImage: p ? (p.qrImage || '') : ''
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
    document.querySelectorAll('.item-row').forEach(function(row){
      var qty = parseFloat(row.querySelector('.item-qty').value) || 0;
      var rate = parseFloat(row.querySelector('.item-rate').value) || 0;
      row.querySelector('.item-amount').value = (qty * rate).toFixed(2);
    });
    return calcTotals(readData().items);
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

    var logoHtml = d.from.logo ? '<img src="' + d.from.logo + '" class="inv-logo" alt="logo">' : '';
    var metaParts = [];
    if (d.from.ownerName && d.from.ownerName !== d.from.name) metaParts.push(d.from.ownerName);
    if (d.from.license) metaParts.push(d.from.license);
    var contactParts = [d.from.phone, d.from.email].filter(Boolean);

    var letterhead =
      '<div class="inv-letterhead">' + logoHtml +
        '<h1 class="inv-biz-name">' + (escapeHtml(d.from.name) || 'Your Business') + '</h1>' +
        (metaParts.length ? '<p class="inv-biz-meta">' + escapeHtml(metaParts.join(' • ')) + '</p>' : '') +
        (contactParts.length ? '<p class="inv-biz-contact">' + escapeHtml(contactParts.join('  |  ')) + '</p>' : '') +
        (d.from.address ? '<p class="inv-biz-address">' + escapeHtml(d.from.address) + '</p>' : '') +
      '</div>';

    var toLines = [d.to.email, d.to.phone, d.to.address]
      .filter(Boolean).map(function(l){ return '<p class="inv-party-line">'+escapeHtml(l)+'</p>'; }).join('');

    var clientBlock =
      '<div class="inv-client-block">' +
        '<div class="inv-label">BILL TO</div>' +
        '<p class="inv-party-name">' + (escapeHtml(d.to.name) || 'Client') + '</p>' +
        toLines +
      '</div>';

    var payLines = [];
    if (d.payment.jazzcash) payLines.push('<div><strong>JazzCash:</strong> ' + escapeHtml(d.payment.jazzcash) + '</div>');
    if (d.payment.easypaisa) payLines.push('<div><strong>Easypaisa:</strong> ' + escapeHtml(d.payment.easypaisa) + '</div>');
    if (d.payment.bank) payLines.push('<div><strong>Bank:</strong> ' + escapeHtml(d.payment.bank) + '</div>');

    var payHtml = '';
    if (payLines.length || d.payment.qrImage){
      payHtml = '<div class="inv-payment">' +
        (d.payment.qrImage ? '<div class="inv-payment-qr"><img src="' + d.payment.qrImage + '" alt="QR"></div>' : '') +
        '<div class="inv-payment-info">' +
          '<div class="inv-payment-title">💳 Payment Details</div>' +
          payLines.join('') +
        '</div>' +
      '</div>';
    }

    var footerHtml = isPremium() ? '' : '<div class="inv-footer">Made with KaamWala</div>';

    el.innerHTML =
      letterhead +
      '<div class="inv-inv-row">' +
        '<div><div class="inv-label">INVOICE</div>' +
        '<div class="inv-inv-num">' + escapeHtml(d.invoice.number || '—') + '</div></div>' +
        '<div class="inv-inv-dates">' +
          '<div><span class="inv-label">DATE</span> ' + formatDate(d.invoice.date) + '</div>' +
          '<div><span class="inv-label">DUE</span> ' + formatDate(d.invoice.due) + '</div>' +
        '</div>' +
      '</div>' +
      clientBlock +
      '<table class="inv-table"><thead><tr><th>Description</th><th class="num">Qty</th>' +
      '<th class="num">Rate</th><th class="num">Amount</th></tr></thead><tbody>' +
      itemsHtml + '</tbody></table>' +
      '<div class="inv-total"><div class="k">Subtotal</div><div class="v">' +
      formatMoney(totals.subtotal, cur) + '</div><div class="k grand">Total</div>' +
      '<div class="v grand">' + formatMoney(totals.total, cur) + '</div></div>' +
      payHtml +
      (d.invoice.notes ? '<div class="inv-notes">' + escapeHtml(d.invoice.notes) + '</div>' : '') +
      footerHtml;
  }

  function saveInvoice(){
    try {
      var data = readData();
      if (!data.to.name) { toast('Please add a client name'); return; }
      if (!data.items.some(function(it){ return it.desc; })) {
        toast('Please add at least one item'); return;
      }
      var key = 'kw_invoices';
      var all = [];
      try { all = JSON.parse(localStorage.getItem(key) || '[]'); } catch(e){ all = []; }
      if (!Array.isArray(all)) all = [];
      var editingId = $('editingId') ? $('editingId').value : '';
      data.savedAt = new Date().toISOString();
      if (editingId){
        var found = false;
        for (var i = 0; i < all.length; i++){
          if (all[i].id === editingId){
            data.id = editingId;
            data.createdAt = all[i].createdAt || all[i].savedAt || data.savedAt;
            all[i] = data; found = true; break;
          }
        }
        if (!found){
          data.id = editingId; data.createdAt = data.savedAt; all.unshift(data);
        }
        localStorage.setItem(key, JSON.stringify(all));
        toast('✓ Invoice updated');
        renderPremiumBanner();
      } else {
        if (!isPremium() && window.KW && !window.KW.canSaveNew()){
          toast('Free limit reached — upgrade for unlimited');
          setTimeout(openUpgradeModal, 800);
          return;
        }
        data.id = 'inv_' + Date.now();
        data.createdAt = data.savedAt;
        all.unshift(data);
        if (isPremium()){
          if (all.length > 500) all = all.slice(0, 500);
        } else {
          if (all.length > 50) all = all.slice(0, 50);
        }
        localStorage.setItem(key, JSON.stringify(all));
        if ($('editingId')) $('editingId').value = data.id;
        if ($('topbarTitle')) $('topbarTitle').textContent = 'Editing Invoice';
        toast('✓ Invoice saved');
        renderPremiumBanner();
      }
    } catch (err) {
      toast('Save failed: ' + err.message);
    }
  }

  /* ---------- PRINT ---------- */
  function printInvoice(){
    if (!validateForShare()) return;
    var previewView = $('view-preview');
    var wasHidden = previewView.classList.contains('is-hidden');
    if (wasHidden){
      document.querySelectorAll('.tab').forEach(function(x){ x.classList.remove('is-active'); });
      var previewTab = document.querySelector('.tab[data-tab="preview"]');
      if (previewTab) previewTab.classList.add('is-active');
      $('view-edit').classList.add('is-hidden');
      previewView.classList.remove('is-hidden');
      renderPreview();
    }
    toast('Opening print…');
    setTimeout(function(){
      try { window.print(); }
      catch(e){ toast('Print not supported'); }
    }, 250);
  }

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
      var M = 15, W = 210, CW = W - 2*M, y = 15;
      var TEAL = [15,118,110], DARK = [15,23,42], GRAY = [100,116,139];
      var LIGHT = [226,232,240], BG = [248,250,252];
      var cur = d.invoice.currency;

      if (d.from.logo) {
        try {
          var logoH = 18, logoW = 18;
          pdf.addImage(d.from.logo, 'JPEG', W/2 - logoW/2, y, logoW, logoH);
          y += logoH + 2;
        } catch(e){}
      }
      pdf.setFont('helvetica','bold'); pdf.setFontSize(18);
      pdf.setTextColor(TEAL[0],TEAL[1],TEAL[2]);
      pdf.text(d.from.name || 'Business Name', W/2, y + 3, {align:'center'});
      y += 9;

      pdf.setFont('helvetica','normal'); pdf.setFontSize(8);
      pdf.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
      var metaParts = [];
      if (d.from.ownerName && d.from.ownerName !== d.from.name) metaParts.push(d.from.ownerName);
      if (d.from.license) metaParts.push('License: ' + d.from.license);
      if (metaParts.length){
        pdf.text(metaParts.join('  •  '), W/2, y, {align:'center'});
        y += 4;
      }
      var contactParts = [d.from.phone, d.from.email].filter(Boolean);
      if (contactParts.length){
        pdf.text(contactParts.join('  |  '), W/2, y, {align:'center'});
        y += 4;
      }
      if (d.from.address){
        var addrL = pdf.splitTextToSize(d.from.address, CW - 40);
        addrL.forEach(function(line, i){ pdf.text(line, W/2, y + i*4, {align:'center'}); });
        y += addrL.length * 4;
      }
      y += 2;
      pdf.setDrawColor(TEAL[0],TEAL[1],TEAL[2]); pdf.setLineWidth(0.6);
      pdf.line(M, y, W-M, y);
      y += 8;

      pdf.setFont('helvetica','bold'); pdf.setFontSize(13);
      pdf.setTextColor(DARK[0],DARK[1],DARK[2]);
      pdf.text('INVOICE', M, y);
      pdf.text(d.invoice.number || '', W - M, y, {align:'right'});
      y += 6;
      pdf.setFont('helvetica','normal'); pdf.setFontSize(9);
      pdf.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
      pdf.text('Date: ' + formatDate(d.invoice.date), M, y);
      pdf.text('Due: ' + formatDate(d.invoice.due), W - M, y, {align:'right'});
      y += 4;
      pdf.setDrawColor(LIGHT[0],LIGHT[1],LIGHT[2]);
      pdf.line(M, y, W-M, y);
      y += 8;

      pdf.setFont('helvetica','bold'); pdf.setFontSize(7.5);
      pdf.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
      pdf.text('BILL TO', M, y);
      y += 5;
      pdf.setFontSize(11); pdf.setTextColor(DARK[0],DARK[1],DARK[2]);
      pdf.text(d.to.name || 'Client', M, y);
      y += 5;
      pdf.setFont('helvetica','normal'); pdf.setFontSize(9);
      pdf.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
      if (d.to.email){ pdf.text(d.to.email, M, y); y += 4; }
      if (d.to.phone){ pdf.text(d.to.phone, M, y); y += 4; }
      if (d.to.address){
        var tal = pdf.splitTextToSize(d.to.address, CW);
        tal.forEach(function(line, i){ pdf.text(line, M, y + i*4); });
        y += tal.length * 4;
      }
      y += 6;

      var descX = M, qtyX = M + CW - 68, rateX = M + CW - 38, amtX = W - M;
      pdf.setFont('helvetica','bold'); pdf.setFontSize(7.5);
      pdf.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
      pdf.text('DESCRIPTION', descX, y);
      pdf.text('QTY', qtyX + 10, y, {align:'right'});
      pdf.text('RATE', rateX + 15, y, {align:'right'});
      pdf.text('AMOUNT', amtX, y, {align:'right'});
      y += 2.5;
      pdf.setDrawColor(DARK[0],DARK[1],DARK[2]); pdf.setLineWidth(0.4);
      pdf.line(M, y, W - M, y); pdf.setLineWidth(0.2); y += 6;

      pdf.setFont('helvetica','normal'); pdf.setFontSize(9.5);
      pdf.setTextColor(DARK[0],DARK[1],DARK[2]);
      var renderedItems = d.items.filter(function(it){ return it.desc || it.amount; });
      if (renderedItems.length === 0){
        pdf.setTextColor(GRAY[0],GRAY[1],GRAY[2]); pdf.text('No items', M, y); y += 8;
      } else {
        renderedItems.forEach(function(it){
          if (y > 240){ pdf.addPage(); y = 20; }
          var descLines = pdf.splitTextToSize(it.desc || '—', CW - 78);
          var rowH = Math.max(6, descLines.length * 4.5);
          descLines.forEach(function(line, idx){ pdf.text(line, descX, y + idx * 4.5); });
          pdf.text(String(it.qty), qtyX + 10, y, {align:'right'});
          pdf.text(formatMoneyPlain(it.rate, cur), rateX + 15, y, {align:'right'});
          pdf.text(formatMoneyPlain(it.amount, cur), amtX, y, {align:'right'});
          y += rowH + 2;
          pdf.setDrawColor(LIGHT[0],LIGHT[1],LIGHT[2]);
          pdf.line(M, y, W - M, y); y += 5;
        });
      }
      if (y > 230){ pdf.addPage(); y = 20; }
      y += 5;
      pdf.setFont('helvetica','normal'); pdf.setFontSize(10);
      pdf.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
      pdf.text('Subtotal', amtX - 55, y);
      pdf.setTextColor(DARK[0],DARK[1],DARK[2]);
      pdf.text(formatMoneyPlain(totals.subtotal, cur), amtX, y, {align:'right'});
      y += 4;
      pdf.setDrawColor(TEAL[0],TEAL[1],TEAL[2]); pdf.setLineWidth(0.5);
      pdf.line(amtX - 70, y, amtX, y); pdf.setLineWidth(0.2);
      y += 7;
      pdf.setFont('helvetica','bold'); pdf.setFontSize(12);
      pdf.setTextColor(TEAL[0],TEAL[1],TEAL[2]);
      pdf.text('Total', amtX - 55, y);
      pdf.text(formatMoneyPlain(totals.total, cur), amtX, y, {align:'right'});
      y += 12;

      var payLines = [];
      if (d.payment.jazzcash) payLines.push('JazzCash: ' + d.payment.jazzcash);
      if (d.payment.easypaisa) payLines.push('Easypaisa: ' + d.payment.easypaisa);
      if (d.payment.bank) payLines.push('Bank: ' + d.payment.bank);

      if (payLines.length || d.payment.qrImage){
        if (y > 220){ pdf.addPage(); y = 20; }
        var hasQr = !!d.payment.qrImage;
        var qrSize = 30;
        var infoW = hasQr ? CW - qrSize - 8 : CW;
        var boxH = Math.max(hasQr ? qrSize + 8 : 0, payLines.length * 4.5 + 12);
        pdf.setFillColor(BG[0],BG[1],BG[2]);
        pdf.rect(M, y, CW, boxH, 'F');
        pdf.setFont('helvetica','bold'); pdf.setFontSize(9);
        pdf.setTextColor(TEAL[0],TEAL[1],TEAL[2]);
        pdf.text('PAYMENT DETAILS', M + 4, y + 6);
        pdf.setFont('helvetica','normal'); pdf.setFontSize(8.5);
        pdf.setTextColor(71,85,105);
        payLines.forEach(function(line, i){
          var ll = pdf.splitTextToSize(line, infoW - 8);
          pdf.text(ll[0], M + 4, y + 12 + i * 4.5);
        });
        if (hasQr){
          try {
            var qx = M + CW - qrSize - 4;
            var qy = y + 4;
            pdf.addImage(d.payment.qrImage, 'JPEG', qx, qy, qrSize, qrSize);
            pdf.setFont('helvetica','normal'); pdf.setFontSize(6.5);
            pdf.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
            pdf.text('Scan to pay', qx + qrSize/2, qy + qrSize + 3, {align:'center'});
          } catch(e){}
        }
        y += boxH + 6;
      }

      if (d.invoice.notes){
        if (y > 240){ pdf.addPage(); y = 20; }
        var notesLines = pdf.splitTextToSize(d.invoice.notes, CW - 10);
        var notesH = notesLines.length * 4.5 + 8;
        pdf.setFillColor(BG[0],BG[1],BG[2]);
        pdf.rect(M, y, CW, notesH, 'F'); y += 5.5;
        pdf.setFont('helvetica','normal'); pdf.setFontSize(9);
        pdf.setTextColor(71,85,105);
        notesLines.forEach(function(line, idx){ pdf.text(line, M + 5, y + idx * 4.5); });
        y += notesH;
      }

      if (!isPremium()){
        y += 10;
        pdf.setFont('helvetica','normal'); pdf.setFontSize(8);
        pdf.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
        pdf.text('Made with KaamWala', W/2, y, {align:'center'});
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
    if (!d.to.name) { toast('Add a client name first'); return false; }
    if (!d.items.some(function(it){ return it.desc; })) {
      toast('Add at least one item first'); return false;
    }
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
        text: 'Invoice from ' + (d.from.name || 'KaamWala')
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
    if (pdfCache.signature === sig && pdfCache.file && canShareFile(pdfCache.file)) {
      var d = readData();
      navigator.share({
        files: [pdfCache.file],
        title: 'Invoice ' + (d.invoice.number || ''),
        text: 'Invoice from ' + (d.from.name || 'KaamWala')
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
        if (canShareFile(cache.file)) { openShareModal(cache); }
        else {
          downloadBlob(cache.blob, cache.filename);
          toast('✓ PDF saved to Downloads');
        }
      })
      .catch(function(err){
        btn.disabled = false;
        setDebug('[Share] ERROR: ' + err.message);
        toast('Share failed');
      });
  }

  var toastTimer = null;
  function toast(msg){
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('is-on');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ t.classList.remove('is-on'); }, 3200);
  }
})();
