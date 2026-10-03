(function(){
  'use strict';

  function ensureReady(){
    if (!window.KWAuth || !window.KWAuth.ready) throw new Error('Firebase not ready');
    return window.KWAuth;
  }
  function uid(){
    try { return ensureReady().auth.currentUser.uid; }
    catch(e){ return null; }
  }
  function col(){
    var u = uid();
    if (!u) throw new Error('Not logged in');
    return ensureReady().db.collection('users').doc(u).collection('udhaar');
  }

  function listAll(){
    return col().get().then(function(snap){
      var arr = [];
      snap.forEach(function(doc){
        var d = doc.data() || {};
        d.id = doc.id;
        arr.push(d);
      });
      arr.sort(function(a, b){
        var ba = computeBalance(a);
        var bb = computeBalance(b);
        return Math.abs(bb) - Math.abs(ba);
      });
      return arr;
    });
  }

  function get(id){
    return col().doc(id).get().then(function(snap){
      if (!snap.exists) return null;
      var d = snap.data() || {};
      d.id = snap.id;
      return d;
    });
  }

  function create(data){
    var now = new Date().toISOString();
    var doc = {
      name: (data.name || '').trim(),
      phone: (data.phone || '').trim(),
      note: (data.note || '').trim(),
      entries: data.entries || [],
      createdAt: now,
      updatedAt: now
    };
    return col().add(doc).then(function(ref){ return ref.id; });
  }

  function update(id, data){
    data.updatedAt = new Date().toISOString();
    return col().doc(id).set(data, {merge:true});
  }

  function remove(id){
    return col().doc(id).delete();
  }

  function addEntry(id, entry){
    return get(id).then(function(doc){
      if (!doc) throw new Error('Customer not found');
      var entries = doc.entries || [];
      entry.id = 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      entry.createdAt = new Date().toISOString();
      entries.push(entry);
      return col().doc(id).set({
        entries: entries,
        updatedAt: new Date().toISOString()
      }, {merge:true}).then(function(){ return entry; });
    });
  }

  function removeEntry(id, entryId){
    return get(id).then(function(doc){
      if (!doc) throw new Error('Customer not found');
      var entries = (doc.entries || []).filter(function(e){ return e.id !== entryId; });
      return col().doc(id).set({
        entries: entries,
        updatedAt: new Date().toISOString()
      }, {merge:true});
    });
  }

  function computeBalance(doc){
    var entries = (doc && doc.entries) || [];
    var totalCredit = 0, totalPaid = 0;
    entries.forEach(function(e){
      var amt = parseFloat(e.amount) || 0;
      if (e.type === 'credit') totalCredit += amt;
      else if (e.type === 'payment') totalPaid += amt;
    });
    return totalCredit - totalPaid;
  }

  function computeTotals(doc){
    var entries = (doc && doc.entries) || [];
    var credit = 0, paid = 0;
    entries.forEach(function(e){
      var amt = parseFloat(e.amount) || 0;
      if (e.type === 'credit') credit += amt;
      else if (e.type === 'payment') paid += amt;
    });
    return { credit: credit, paid: paid, balance: credit - paid };
  }

  window.KWUdhaar = {
    listAll: listAll,
    get: get,
    create: create,
    update: update,
    remove: remove,
    addEntry: addEntry,
    removeEntry: removeEntry,
    computeBalance: computeBalance,
    computeTotals: computeTotals
  };
})();
