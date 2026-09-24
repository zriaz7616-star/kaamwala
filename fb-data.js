(function(){
  'use strict';

  function auth(){ return window.KWAuth && window.KWAuth.auth; }
  function db(){ return window.KWAuth && window.KWAuth.db; }
  function user(){ try { return auth().currentUser; } catch(e){ return null; } }
  function uid(){ var u = user(); return u ? u.uid : ''; }

  /* ---------- CACHE (UID-scoped, optional) ---------- */
  function ck(base){ return base + '__' + uid(); }
  function cacheGet(base, fallback){
    try {
      var raw = localStorage.getItem(ck(base));
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch(e){ return fallback; }
  }
  function cacheSet(base, val){
    try { localStorage.setItem(ck(base), JSON.stringify(val)); } catch(e){}
  }

  /* ---------- AUTH ---------- */
  function onReady(cb){
    if (!auth()) { cb(null); return; }
    auth().onAuthStateChanged(cb);
  }

  function waitForAuth(){
    return new Promise(function(resolve){
      if (!auth()) { resolve(null); return; }
      var unsub = auth().onAuthStateChanged(function(u){
        unsub();
        resolve(u);
      });
    });
  }

  function logout(){
    if (!auth()) return Promise.resolve();
    return auth().signOut();
  }

  function requireLogin(redirectTo){
    return waitForAuth().then(function(u){
      if (!u) {
        location.href = redirectTo || 'auth.html';
        return null;
      }
      return u;
    });
  }

  /* ---------- PROFILE ---------- */
  function getProfile(){
    var u = user();
    if (!u) return Promise.resolve(null);
    return db().collection('users').doc(u.uid).get()
      .then(function(snap){
        if (snap.exists && snap.data().profile){
          cacheSet('kw_profile', snap.data().profile);
          return snap.data().profile;
        }
        // fallback to cache
        return cacheGet('kw_profile', null);
      })
      .catch(function(){ return cacheGet('kw_profile', null); });
  }

  function saveProfile(profile){
    var u = user();
    if (!u) return Promise.reject(new Error('Not logged in'));
    cacheSet('kw_profile', profile);
    return db().collection('users').doc(u.uid).set({
      profile: profile,
      profileUpdatedAt: new Date().toISOString()
    }, {merge:true});
  }

  function clearProfile(){
    var u = user();
    if (!u) return Promise.resolve();
    try { localStorage.removeItem(ck('kw_profile')); } catch(e){}
    return db().collection('users').doc(u.uid).set({
      profile: null,
      profileUpdatedAt: new Date().toISOString()
    }, {merge:true});
  }

  /* ---------- INVOICES ---------- */
  function getInvoices(){
    var u = user();
    if (!u) return Promise.resolve(cacheGet('kw_invoices', []));
    return db().collection('users').doc(u.uid).collection('invoices').get()
      .then(function(snap){
        var arr = [];
        snap.forEach(function(doc){
          var d = doc.data() || {};
          d.id = doc.id;
          arr.push(d);
        });
        arr.sort(function(a, b){
          return String(b.savedAt || '').localeCompare(String(a.savedAt || ''));
        });
        cacheSet('kw_invoices', arr);
        return arr;
      })
      .catch(function(){ return cacheGet('kw_invoices', []); });
  }

  function saveInvoice(inv){
    var u = user();
    if (!u) return Promise.reject(new Error('Not logged in'));
    if (!inv || !inv.id) return Promise.reject(new Error('No invoice id'));
    var clean = JSON.parse(JSON.stringify(inv));
    // strip heavy blobs (logo/qr stored in profile, re-attached on read)
    if (clean.from) clean.from.logo = '';
    if (clean.payment) clean.payment.qrImage = '';
    return db().collection('users').doc(u.uid).collection('invoices').doc(inv.id)
      .set(clean)
      .then(function(){
        // update cache
        var arr = cacheGet('kw_invoices', []) || [];
        var found = false;
        for (var i = 0; i < arr.length; i++){
          if (arr[i].id === inv.id){ arr[i] = inv; found = true; break; }
        }
        if (!found) arr.unshift(inv);
        arr.sort(function(a, b){
          return String(b.savedAt || '').localeCompare(String(a.savedAt || ''));
        });
        cacheSet('kw_invoices', arr);
      });
  }

  function deleteInvoice(id){
    var u = user();
    if (!u) return Promise.reject(new Error('Not logged in'));
    return db().collection('users').doc(u.uid).collection('invoices').doc(id)
      .delete()
      .then(function(){
        var arr = cacheGet('kw_invoices', []) || [];
        arr = arr.filter(function(x){ return x.id !== id; });
        cacheSet('kw_invoices', arr);
      });
  }

  /* ---------- PREMIUM ---------- */
  function getPremiumStatus(){
    var u = user();
    if (!u) return Promise.resolve({premium:false, plan:'free'});
    return db().collection('users').doc(u.uid).get()
      .then(function(snap){
        var d = snap.exists ? snap.data() : {};
        return {
          premium: !!d.premium,
          plan: d.plan || 'free',
          approvedAt: d.approvedAt || null
        };
      })
      .catch(function(){ return {premium:false, plan:'free'}; });
  }

  /* ---------- BOOTSTRAP ---------- */
  // Fetches everything from Firebase and caches it locally.
  // Call after login to ensure fresh data.
  function bootstrap(){
    return waitForAuth().then(function(u){
      if (!u) return null;
      return Promise.all([getProfile(), getInvoices()]).then(function(res){
        return { user: u, profile: res[0], invoices: res[1] };
      });
    });
  }

  window.FB = {
    auth: auth,
    db: db,
    user: user,
    uid: uid,
    onReady: onReady,
    waitForAuth: waitForAuth,
    logout: logout,
    requireLogin: requireLogin,
    getProfile: getProfile,
    saveProfile: saveProfile,
    clearProfile: clearProfile,
    getInvoices: getInvoices,
    saveInvoice: saveInvoice,
    deleteInvoice: deleteInvoice,
    getPremiumStatus: getPremiumStatus,
    bootstrap: bootstrap,
    // sync cache helpers (for pages that can render instantly)
    peekProfile: function(){ return cacheGet('kw_profile', null); },
    peekInvoices: function(){ return cacheGet('kw_invoices', []); }
  };
})();
