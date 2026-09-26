const fs = require('fs');
let s = fs.readFileSync('app.js', 'utf8');

// 1) In readData function — add status field
if (s.indexOf("status: getPaymentStatus()") < 0){
  s = s.replace(
    /invoice: \{ number: \$?\('invNumber'\)\.value\.trim\(\), date: \$?\('invDate'\)\.value,/,
    `invoice: { number: $('invNumber').value.trim(), date: $('invDate').value,`
  );
  // Add status to the data object after invoice: { ... }
  s = s.replace(
    /(invoice: \{ number: \$?\('invNumber'\)\.value\.trim\(\),[^}]*\},)/,
    `$1\n      status: getPaymentStatus(),`
  );
}

// 2) Add helper functions
if (s.indexOf('function getPaymentStatus') < 0){
  s = s.replace(
    /(function readData\(\)\{)/,
    `function getPaymentStatus(){
    var el = document.querySelector('input[name="payStatus"]:checked');
    return el ? el.value : 'unpaid';
  }

  function setPaymentStatus(status){
    var els = document.querySelectorAll('input[name="payStatus"]');
    els.forEach(function(el){
      el.checked = (el.value === (status || 'unpaid'));
    });
    updateStatusHint();
  }

  function updateStatusHint(){
    var hint = document.getElementById('statusHint');
    if (!hint) return;
    var el = document.querySelector('input[name="payStatus"]:checked');
    var val = el ? el.value : 'unpaid';
    if (val === 'paid'){
      hint.textContent = 'Payment received — marked as paid ✓';
      hint.style.color = '#059669';
    } else {
      hint.textContent = "Customer hasn't paid yet — amount due.";
      hint.style.color = '#94A3B8';
    }
  }

  function bindPaymentStatus(){
    var els = document.querySelectorAll('input[name="payStatus"]');
    els.forEach(function(el){
      el.addEventListener('change', updateStatusHint);
    });
    updateStatusHint();
  }

  $1`
  );
}

// 3) In bootUI / init — call bindPaymentStatus
if (s.indexOf('bindPaymentStatus();') < 0){
  s = s.replace(
    /(bindActions\(\);)/,
    `$1\n    bindPaymentStatus();`
  );
}

// 4) In handlePendingLoad — set status from loaded data
if (s.indexOf('setPaymentStatus(d.status)') < 0 && s.indexOf('setPaymentStatus') >= 0){
  s = s.replace(
    /(setVal\('invNotes', d\.invoice && d\.invoice\.notes\);)/,
    `$1\n      setPaymentStatus(d.status || 'unpaid');`
  );
}

fs.writeFileSync('app.js', s);
console.log('OK - status logic added');
