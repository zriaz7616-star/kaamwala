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
        var u = cred.user;
        // Send verification email
        var sendPromise = u.sendEmailVerification().catch(function(err){
          console.error('Verification email failed:', err);
        });
        return sendPromise.then(function(){
          return A.db.collection('users').doc(u.uid).set({
            email: email,
            uid: u.uid,
            premium: false,
            plan: 'free',
            emailVerified: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }).then(function(){ return u; });
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

  /* ---------- EMAIL VERIFICATION ---------- */
  function sendVerificationEmail(){
    var A = ensureReady();
    var u = A.auth.currentUser;
    if (!u) return Promise.reject(new Error('Not signed in'));
    return u.sendEmailVerification();
  }

  function reloadUser(){
    var A = ensureReady();
    var u = A.auth.currentUser;
    if (!u) return Promise.resolve(null);
    return u.reload().then(function(){ return A.auth.currentUser; });
  }

  function isVerified(){
    var A = ensureReady();
    var u = A.auth.currentUser;
    return !!(u && u.emailVerified);
  }

  /* ---------- PASSWORD RESET ---------- */
  function sendPasswordReset(email){
    var A = ensureReady();
    if (!email) return Promise.reject(new Error('Email required'));
    return A.auth.sendPasswordResetEmail(email);
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
      'auth/network-request-failed': 'Internet connection check karein.',
      'auth/missing-email': 'Email address daalein.',
      'auth/user-disabled': 'Ye account disable hai.'
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
    sendVerificationEmail: sendVerificationEmail,
    reloadUser: reloadUser,
    isVerified: isVerified,
    sendPasswordReset: sendPasswordReset,
    friendlyError: friendlyError
  };
})();
