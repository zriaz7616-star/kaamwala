(function(){
  'use strict';

  var KEY = 'kw_theme';

  function get(){
    try { return localStorage.getItem(KEY) || 'light'; }
    catch(e){ return 'light'; }
  }

  function set(theme){
    if (theme !== 'dark' && theme !== 'light') theme = 'light';
    try { localStorage.setItem(KEY, theme); } catch(e){}
    apply(theme);
  }

  function apply(theme){
    theme = theme || get();
    if (theme === 'dark'){
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0F172A' : '#0F766E');
  }

  function toggle(){
    set(get() === 'dark' ? 'light' : 'dark');
  }

  // Apply immediately to prevent flash
  apply();

  // Apply on DOM ready too
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ apply(); });
  }

  window.KWTheme = {
    get: get,
    set: set,
    toggle: toggle,
    apply: apply
  };
})();
