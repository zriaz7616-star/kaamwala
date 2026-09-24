(function(){
  'use strict';

  var OWNER_KEY = 'kw_invoices_owner_uid';

  function getUser(){
    try { return window.KWAuth && window.KWAuth.auth && window.KWAuth.auth.currentUser; }
    catch(e){ return null; }
  }

  function ensureReady(){
    if (!window.KWAuth || !window.KWAuth.ready) throw new Error('Firebase not ready');
    return window.KWAuth;
  }

  function getProfile(){
    try { return JSON.parse(localStorage.getItem('kw_profile') || 'null'); }
    catch(e){ return null; }
  }

  function getOwner(){
    try { return localStorage.getItem(OWNER_KEY) || ''; }
    catch(e){ return ''; }
  }
  function setOwner(uid){
    try { localStorage.setItem(OWNER_KEY, uid || ''); } catch(e){}
  }

  function loadLocal(){
    try {
      var v = JSON.parse(localStorage.getItem('kw_invoices') || '[]');
      return Array.isArray(v) ? v : [];
    } catch(e){ return []; }
  }
  function saveLocal(list){
    try { localStorage.setItem('kw_invoices', JSON.stringify(list)); } catch(e){}
  }
  function clearLocalInvoices(){
    try { localStorage.removeItem('kw_invoices'); } catch(e){}
  }

  function stripHeavy(inv){
    var c = JSON.parse(JSON.stringify(inv));
    if (c.from) c.from.logo = '';
    if (c.payment) c.payment.qrImage = '';
    return c;
  }
  function attachHeavy(inv, profile){
    if (!profile) return inv;
    if (inv.from) inv.from.logo = profile.logo || '';
    if (inv.payment) inv.payment.qrImage = profile.qrImage || '';
    return inv;
  }

  function push(inv){
    var user = getUser();
    if (!user || !inv || !inv.id) return Promise.resolve(false);
    var A = ensureReady();
    var clean = stripHeavy(inv);
    return A.db.collection('users').doc(user.uid)
      .collection('invoices').doc(inv.id)
      .set(clean)
      .then(function(){ return true; })
      .catch(function(err){ console.error('Push failed:', err); return false; });
  }

  function remove(id){
    var user = getUser();
    if (!user || !id) return Promise.resolve(false);
    var A = ensureReady();
    return A.db.collection('users').doc(user.uid)
      .collection('invoices').doc(id)
      .delete()
      .then(function(){ return true; })
      .catch(function(err){ console.error('Remove failed:', err); return false; });
  }

  function fetchAll(){
    var user = getUser();
    if (!user) return Promise.resolve([]);
    var A = ensureReady();
    var profile = getProfile();
    return A.db.collection('users').doc(user.uid)
      .collection('invoices').get()
      .then(function(snap){
        var out = [];
        snap.forEach(function(doc){
          var d = doc.data() || {};
          d.id = doc.id;
          attachHeavy(d, profile);
          out.push(d);
        });
        return out;
      });
  }

  function merge(local, cloud){
    var byId = {};
    local.forEach(function(x){ if (x && x.id) byId[x.id] = x; });
    cloud.forEach(function(x){
      if (!x || !x.id) return;
      var ex = byId[x.id];
      if (!ex){ byId[x.id] = x; return; }
      if (String(x.savedAt || '') > String(ex.savedAt || '')) byId[x.id] = x;
    });
    var arr = Object.keys(byId).map(function(k){ return byId[k]; });
    arr.sort(function(a, b){
      return String(b.savedAt || '').localeCompare(String(a.savedAt || ''));
    });
    return arr;
  }

  function syncOnLogin(){
    var user = getUser();
    if (!user) return Promise.resolve(false);

    var prevOwner = getOwner();
    var isSameUser = prevOwner === user.uid;
    var local;

    if (isSameUser){
      // Same user re-login — keep local cache
      local = loadLocal();
      console.log('[KWInvoices] Same user re-login — local preserved');
    } else {
      // Different user OR first-time — wipe local to prevent cross-contamination
      clearLocalInvoices();
      local = [];
      console.log('[KWInvoices] New/different user — local wiped');
    }

    setOwner(user.uid);

    return fetchAll().then(function(cloud){
      var merged = merge(local, cloud);
      saveLocal(merged);

      // Push local-only invoices (only same-user cached ones)
      var cloudIds = {};
      cloud.forEach(function(x){ if (x.id) cloudIds[x.id] = true; });
      var toPush = local.filter(function(x){ return x.id && !cloudIds[x.id]; });

      if (toPush.length){
        return Promise.all(toPush.map(push)).then(function(){ return true; });
      }
      return true;
    }).catch(function(err){
      console.error('Sync failed:', err);
      return false;
    });
  }

  function onLogout(){
    // IMPORTANT: Do NOT clear owner or local data.
    // This way, next login detects user change and wipes local for new users.
    // Same user logging back in will still see their local cache.
    console.log('[KWInvoices] Logout — local cache preserved for owner detection');
  }

  window.KWInvoices = {
    push: push,
    remove: remove,
    fetchAll: fetchAll,
    merge: merge,
    syncOnLogin: syncOnLogin,
    onLogout: onLogout,
    hasUser: function(){ return !!getUser(); }
  };
})();
