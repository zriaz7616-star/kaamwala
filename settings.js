(function(){
  'use strict';

  var currentUser = null;
  var currentProfile = null;

  document.addEventListener('DOMContentLoaded', function(){
    if (!window.FB) return;
    window.FB.waitForAuth().then(function(u){
      if (!u){ location.href = 'auth.html'; return; }
      currentUser = u;
      return window.FB.getProfile();
    }).then(function(p){
      currentProfile = p || {};
      render();
    }).catch(function(err){
      console.error('[KW] settings failed:', err);
      document.getElementById('settingsRoot').innerHTML =
        '<div class="kw-loading">Could not load. <a href="settings.html" style="color:#0F766E">Retry</a></div>';
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
    var theme = window.KWTheme ? window.KWTheme.get() : 'light';
    var lang = window.KWi18n ? window.KWi18n.getLang() : 'en';
    var bizName = (currentProfile && currentProfile.businessName) || 'Your Business';
    var userEmail = (currentUser && currentUser.email) || '';

    var html =
      '<div class="kw-header">' +
        '<div class="kw-header-top">' +
          '<div class="kw-brand"><span class="kw-mark">KW</span><span>' + escapeHtml(t('settings')) + '</span></div>' +
          '<a href="home.html" class="kw-icon-btn" aria-label="Home">🏠</a>' +
        '</div>' +
        '<p class="kw-greeting">' + escapeHtml(t('greeting')) + '</p>' +
        '<h1 class="kw-biz-name">' + escapeHtml(bizName) + '</h1>' +
        '<p class="kw-biz-meta">' + escapeHtml(userEmail) + '</p>' +
      '</div>' +

      '<div class="kw-section">' +
        '<h2 class="kw-section-title">Business</h2>' +
        '<div class="kw-settings-group">' +
          '<a href="profile.html" class="kw-setting-row">' +
            '<span class="kw-setting-icon">🏢</span>' +
            '<div class="kw-setting-body">' +
              '<p class="kw-setting-title">' + escapeHtml(t('business_edit')) + '</p>' +
              '<p class="kw-setting-sub">' + escapeHtml(t('business_edit_sub')) + '</p>' +
            '</div>' +
            '<span class="kw-setting-arrow">›</span>' +
          '</a>' +
          '<a href="products.html" class="kw-setting-row">' +
            '<span class="kw-setting-icon">📦</span>' +
            '<div class="kw-setting-body">' +
              '<p class="kw-setting-title">' + escapeHtml(t('products')) + '</p>' +
              '<p class="kw-setting-sub">Add, edit, delete items</p>' +
            '</div>' +
            '<span class="kw-setting-arrow">›</span>' +
          '</a>' +
          '<a href="history.html" class="kw-setting-row">' +
            '<span class="kw-setting-icon">📋</span>' +
            '<div class="kw-setting-body">' +
              '<p class="kw-setting-title">' + escapeHtml(t('history')) + '</p>' +
              '<p class="kw-setting-sub">' + escapeHtml(t('history_sub')) + '</p>' +
            '</div>' +
            '<span class="kw-setting-arrow">›</span>' +
          '</a>' +
        '</div>' +
      '</div>' +

      '<div class="kw-section">' +
        '<h2 class="kw-section-title">Preferences</h2>' +
        '<div class="kw-settings-group">' +
          '<div class="kw-setting-row">' +
            '<span class="kw-setting-icon">🌐</span>' +
            '<div class="kw-setting-body">' +
              '<p class="kw-setting-title">' + escapeHtml(t('language')) + '</p>' +
              '<p class="kw-setting-sub">' + escapeHtml(t('language_sub')) + '</p>' +
            '</div>' +
            '<div class="kw-segment" id="kwLangSegment">' +
              '<button type="button" class="kw-segment-btn' + (lang === 'en' ? ' active' : '') + '" data-lang="en">EN</button>' +
              '<button type="button" class="kw-segment-btn' + (lang === 'ur' ? ' active' : '') + '" data-lang="ur">اردو</button>' +
            '</div>' +
          '</div>' +
          '<div class="kw-setting-row">' +
            '<span class="kw-setting-icon">🌙</span>' +
            '<div class="kw-setting-body">' +
              '<p class="kw-setting-title">' + escapeHtml(t('theme')) + '</p>' +
              '<p class="kw-setting-sub">' + escapeHtml(t('theme_sub')) + '</p>' +
            '</div>' +
            '<label class="kw-toggle">' +
              '<input type="checkbox" id="kwThemeToggle"' + (theme === 'dark' ? ' checked' : '') + '>' +
              '<span class="kw-toggle-slider"></span>' +
            '</label>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="kw-section">' +
        '<h2 class="kw-section-title">Account</h2>' +
        '<div class="kw-settings-group">' +
          '<a href="privacy.html" class="kw-setting-row">' +
            '<span class="kw-setting-icon">🔒</span>' +
            '<div class="kw-setting-body">' +
              '<p class="kw-setting-title">' + escapeHtml(t('privacy')) + '</p>' +
            '</div>' +
            '<span class="kw-setting-arrow">›</span>' +
          '</a>' +
          '<a href="terms.html" class="kw-setting-row">' +
            '<span class="kw-setting-icon">📄</span>' +
            '<div class="kw-setting-body">' +
              '<p class="kw-setting-title">' + escapeHtml(t('terms')) + '</p>' +
            '</div>' +
            '<span class="kw-setting-arrow">›</span>' +
          '</a>' +
          '<button type="button" class="kw-setting-row" id="kwSignOutBtn">' +
            '<span class="kw-setting-icon danger">🚪</span>' +
            '<div class="kw-setting-body">' +
              '<p class="kw-setting-title" style="color:#DC2626">' + escapeHtml(t('signout')) + '</p>' +
              '<p class="kw-setting-sub">' + escapeHtml(t('signout_sub')) + '</p>' +
            '</div>' +
          '</button>' +
        '</div>' +
      '</div>' +

      '<div style="text-align:center;padding:20px 16px 40px;color:#94A3B8;font-size:.8rem">' +
        '<p style="margin:0 0 4px">KaamWala</p>' +
        '<p style="margin:0">Made in Pakistan 🇵🇰 · v1.0</p>' +
      '</div>';

    $('settingsRoot').innerHTML = html;
    $('bottomNav').style.display = '';

    bindEvents();
  }

  function bindEvents(){
    // Language
    document.querySelectorAll('#kwLangSegment .kw-segment-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        var lang = btn.getAttribute('data-lang');
        if (window.KWi18n){
          window.KWi18n.setLang(lang);
          render();
        }
      });
    });

    // Theme
    var themeToggle = $('kwThemeToggle');
    if (themeToggle){
      themeToggle.addEventListener('change', function(){
        if (window.KWTheme) window.KWTheme.set(this.checked ? 'dark' : 'light');
      });
    }

    // Sign out
    var signoutBtn = $('kwSignOutBtn');
    if (signoutBtn){
      signoutBtn.addEventListener('click', function(){
        if (!confirm('Sign out from this device?')) return;
        window.FB.logout().then(function(){
          location.href = 'auth.html';
        });
      });
    }
  }
})();
