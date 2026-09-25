(function(){
  'use strict';

  var ADMIN_UID = 'HnQU7Br5hwYcAr6eVwY6YJte6LM2';
  var allUsers = [];
  var currentFilter = 'all';

  document.addEventListener('DOMContentLoaded', function(){
    if (!window.KWAuth){ alert('Firebase not loaded'); return; }
    bindLogin();
    checkAuth();
  });

  function $(id){ return document.getElementById(id); }

  function showStatus(elId, kind, text){
    var el = $(elId);
    if (!el) return;
    el.className = 'status show ' + kind;
    el.textContent = text;
  }
  function hideStatus(elId){
    var el = $(elId);
    if (el) el.className = 'status';
  }

  function bindLogin(){
    $('loginBtn').addEventListener('click', function(){
      var email = $('loginEmail').value.trim();
      var pass = $('loginPass').value;
      if (!email || !pass){ showStatus('loginStatus', 'err', 'Email and password required'); return; }
      $('loginBtn').disabled = true;
      showStatus('loginStatus', 'info', 'Signing in…');
      window.KWAuth.auth.signInWithEmailAndPassword(email, pass)
        .then(function(){ hideStatus('loginStatus'); })
        .catch(function(err){
          $('loginBtn').disabled = false;
          showStatus('loginStatus', 'err', err.message || 'Sign in failed');
        });
    });
    $('logoutBtn').addEventListener('click', function(e){
      e.preventDefault();
      window.KWAuth.auth.signOut();
    });
  }

  function checkAuth(){
    window.KWAuth.auth.onAuthStateChanged(function(user){
      if (!user){
        $('view-login').style.display = 'block';
        $('view-dashboard').style.display = 'none';
        $('loginBtn').disabled = false;
        return;
      }
      if (user.uid !== ADMIN_UID){
        showStatus('loginStatus', 'err', 'This account is not admin.');
        window.KWAuth.auth.signOut();
        return;
      }
      $('adminEmail').textContent = user.email;
      $('view-login').style.display = 'none';
      $('view-dashboard').style.display = 'block';
      loadUsers();
      bindDashboard();
    });
  }

  var dashboardBound = false;
  function bindDashboard(){
    if (dashboardBound) return;
    dashboardBound = true;

    $('approveByEmailBtn').addEventListener('click', function(){ actOnEmail(true); });
    $('revokeByEmailBtn').addEventListener('click', function(){ actOnEmail(false); });

    document.querySelectorAll('.filter-btn').forEach(function(b){
      b.addEventListener('click', function(){
        document.querySelectorAll('.filter-btn').forEach(function(x){ x.classList.remove('active'); });
        b.classList.add('active');
        currentFilter = b.getAttribute('data-filter');
        renderUsers();
      });
    });
  }

  function loadUsers(){
    $('usersList').innerHTML = '<div class="loading">Loading users…</div>';
    window.KWAuth.db.collection('users').get().then(function(snap){
      allUsers = [];
      snap.forEach(function(doc){
        var d = doc.data() || {};
        allUsers.push({
          uid: doc.id,
          email: d.email || '(no email)',
          premium: !!d.premium,
          plan: d.plan || 'free',
          expiresAt: d.expiresAt || null,
          createdAt: d.createdAt && d.createdAt.toDate ? d.createdAt.toDate() : null
        });
      });
      allUsers.sort(function(a, b){
        var ta = a.createdAt ? a.createdAt.getTime() : 0;
        var tb = b.createdAt ? b.createdAt.getTime() : 0;
        return tb - ta;
      });
      updateStats();
      renderUsers();
    }).catch(function(err){
      $('usersList').innerHTML = '<div class="empty">Could not load: ' + (err.message || '') + '</div>';
    });
  }

  function isActivePremium(u){
    if (!u.premium) return false;
    if (!u.expiresAt) return true;
    var expTime = new Date(u.expiresAt).getTime();
    if (!expTime) return true;
    return expTime > Date.now();
  }

  function updateStats(){
    var total = allUsers.length;
    var active = allUsers.filter(isActivePremium).length;
    $('statTotal').textContent = total;
    $('statPremium').textContent = active;
  }

  function renderUsers(){
    var list = $('usersList');
    var filtered = allUsers.filter(function(u){
      var active = isActivePremium(u);
      if (currentFilter === 'premium') return active;
      if (currentFilter === 'free') return !active;
      return true;
    });
    if (filtered.length === 0){
      list.innerHTML = '<div class="empty">No users here yet.</div>';
      return;
    }
    var html = '';
    filtered.forEach(function(u){
      var active = isActivePremium(u);
      var expiredButWasPremium = u.premium && u.expiresAt && !active;

      var badge;
      if (active) badge = '<span class="user-badge badge-prem">PREMIUM</span>';
      else if (expiredButWasPremium) badge = '<span class="user-badge badge-expired">EXPIRED</span>';
      else badge = '<span class="user-badge badge-free">FREE</span>';

      var dateStr = u.createdAt ? u.createdAt.toLocaleDateString('en-GB',
        {day:'2-digit', month:'short', year:'numeric'}) : '—';

      var expiryHtml = '';
      if (u.expiresAt){
        var exp = new Date(u.expiresAt);
        var expDateStr = exp.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
        var daysLeft = Math.ceil((exp.getTime() - Date.now()) / (1000*60*60*24));
        if (daysLeft > 7){
          expiryHtml = '<p class="user-expiry active">✓ Active until ' + expDateStr + ' (' + daysLeft + ' days)</p>';
        } else if (daysLeft > 0){
          expiryHtml = '<p class="user-expiry expiring">⚠ Expires in ' + daysLeft + ' day' + (daysLeft===1?'':'s') + ' — ' + expDateStr + '</p>';
        } else {
          expiryHtml = '<p class="user-expiry expired">✗ Expired ' + expDateStr + '</p>';
        }
      }

      var actionBtn = active
        ? '<button class="user-btn revoke" data-uid="' + escapeHtml(u.uid) + '" data-action="revoke">Revoke</button>'
        : '<button class="user-btn approve" data-uid="' + escapeHtml(u.uid) + '" data-action="approve">Approve</button>';

      html +=
        '<div class="user-row">' +
          '<div class="user-info">' +
            '<p class="user-email">' + escapeHtml(u.email) + '</p>' +
            '<p class="user-meta">Joined ' + dateStr + '</p>' +
            badge +
            expiryHtml +
          '</div>' +
          actionBtn +
        '</div>';
    });
    list.innerHTML = html;

    list.querySelectorAll('.user-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        var uid = btn.getAttribute('data-uid');
        var action = btn.getAttribute('data-action');
        if (action === 'approve'){
          var duration = parseInt($('approveDuration').value, 10);
          if (isNaN(duration)) duration = 30;
          setPremium(uid, true, duration, btn);
        } else {
          setPremium(uid, false, 0, btn);
        }
      });
    });
  }

  function setPremium(uid, makePremium, durationDays, btn){
    if (btn) btn.disabled = true;
    var now = new Date();
    var expiresAt = null;
    if (makePremium && durationDays > 0){
      expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    }
    var update = {
      premium: makePremium,
      plan: makePremium ? (durationDays >= 365 ? 'yearly' : (durationDays === 0 ? 'lifetime' : 'monthly')) : 'free',
      expiresAt: expiresAt,
      approvedAt: makePremium ? now.toISOString() : null,
      approvedBy: makePremium ? ADMIN_UID : null
    };
    window.KWAuth.db.collection('users').doc(uid).set(update, {merge:true})
      .then(function(){
        for (var i = 0; i < allUsers.length; i++){
          if (allUsers[i].uid === uid){
            allUsers[i].premium = makePremium;
            allUsers[i].plan = update.plan;
            allUsers[i].expiresAt = expiresAt;
            break;
          }
        }
        updateStats();
        renderUsers();
      })
      .catch(function(err){
        alert('Update failed: ' + (err.message || ''));
        if (btn) btn.disabled = false;
      });
  }

  function actOnEmail(makePremium){
    var email = $('approveEmail').value.trim().toLowerCase();
    if (!email){ showStatus('approveStatus', 'err', 'Please enter an email or UID'); return; }
    var found = null;
    for (var i = 0; i < allUsers.length; i++){
      var uE = String(allUsers[i].email || '').toLowerCase();
      var uUid = String(allUsers[i].uid || '').toLowerCase();
      if (uE === email || uUid === email){ found = allUsers[i]; break; }
    }
    if (!found){
      showStatus('approveStatus', 'err', 'No user with this email/UID. They must sign up first.');
      return;
    }
    var duration = parseInt($('approveDuration').value, 10);
    if (isNaN(duration)) duration = 30;
    showStatus('approveStatus', 'info', 'Updating…');

    var now = new Date();
    var expiresAt = null;
    if (makePremium && duration > 0){
      expiresAt = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000).toISOString();
    }
    var update = {
      premium: makePremium,
      plan: makePremium ? (duration >= 365 ? 'yearly' : (duration === 0 ? 'lifetime' : 'monthly')) : 'free',
      expiresAt: expiresAt,
      approvedAt: makePremium ? now.toISOString() : null,
      approvedBy: makePremium ? ADMIN_UID : null
    };
    window.KWAuth.db.collection('users').doc(found.uid).set(update, {merge:true})
      .then(function(){
        found.premium = makePremium;
        found.plan = update.plan;
        found.expiresAt = expiresAt;
        updateStats();
        renderUsers();
        $('approveEmail').value = '';
        var msg = makePremium
          ? '✓ Premium activated for ' + email + (duration === 0 ? ' (lifetime)' : ' (' + duration + ' days)')
          : '✓ Premium revoked for ' + email;
        showStatus('approveStatus', 'ok', msg);
      })
      .catch(function(err){
        showStatus('approveStatus', 'err', 'Error: ' + (err.message || ''));
      });
  }

  function escapeHtml(s){
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
})();
