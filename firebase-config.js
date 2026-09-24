(function(){
  'use strict';

  var firebaseConfig = {
    apiKey: "AIzaSyAZu3_e50d25aIszwLrREkj9hLk2abBr6Y",
    authDomain: "kaamwala-22ec0.firebaseapp.com",
    projectId: "kaamwala-22ec0",
    storageBucket: "kaamwala-22ec0.firebasestorage.app",
    messagingSenderId: "537865429868",
    appId: "1:537865429868:web:8ce958c0a9d904da0f8949"
  };

  if (typeof firebase === 'undefined'){
    console.error('[KW] Firebase SDK not loaded');
    return;
  }
  if (!firebase.apps || !firebase.apps.length){
    firebase.initializeApp(firebaseConfig);
  }

  window.KWAuth = {
    auth: firebase.auth(),
    db: firebase.firestore(),
    ready: true
  };

  console.log('[KW] Firebase initialized');
})();
