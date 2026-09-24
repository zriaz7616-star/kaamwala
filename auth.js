(function(){
  'use strict';

  function ensureReady(){
    if (!window.KWAuth || !window.KWAuth.ready){
      throw new Error('Firebase not ready');
    }
    return window.KWAuth;
  }

  function signUp(email, password){
    var A = ensureReady();
    return A.auth.createUserWithEmailAndPassword(email, password)
      .then(function(cred){
        // Create user doc in Firestore
        return A.db.collection('users').doc(cred.user.uid).set({
          email: email,
          premium: false,
          plan: 'free',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function(){
          return cred.user;
        });
      });
  }

  function signIn(email, password){
    var A = ensureReady();
    return A.auth.signInWithEmailAndPassword(email, password)
      .then(function(cred){ return cred.user; });
  }

  function signOut(){
    var A = ensureReady();
    return A.auth.signOut();
  }

  function onUser(callback){
    var A = ensureReady();
    return A.auth.onAuthStateChanged(callback);
  }

  function getUserDoc(uid){
    var A = ensureReady();
    return A.db.collection('users').doc(uid).get().then(function(snap){
      return snap.exists ? snap.data() : null;
    });
  }

  function updateUserDoc(uid, data){
    var A = ensureReady();
    return A.db.collection('users').doc(uid).set(data, {merge:true});
  }

  function friendlyError(err){
    if (!err) return 'Unknown error';
    var code = err.code || '';
    var map = {
      'auth/email-already-in-use': 'Ye email pehle se register hai. Login karein.',
      'auth/invalid-email': 'Email sahi nahi hai.',
      'auth/weak-password': 'Password kam se kam 6 characters ka hona chahiye.',
      'auth/user-not-found': 'Is email se koi account nahi mila.',
      'auth/wrong-password': 'Password galat hai.',
      'auth/invalid-credential': 'Email ya password galat hai.',
      'auth/too-many-requests': 'Bohat zyada koshishein. Kuch der baad try karein.',
      'auth/network-request-failed': 'Internet connection check karein.'
    };
    return map[code] || (err.message || 'Error aaya');
  }

  window.KWAuthHelpers = {
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    onUser: onUser,
    getUserDoc: getUserDoc,
    updateUserDoc: updateUserDoc,
    friendlyError: friendlyError
  };
})();
