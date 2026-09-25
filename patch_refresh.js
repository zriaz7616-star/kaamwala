const fs = require('fs');
let s = fs.readFileSync('app.js', 'utf8');

const oldBoot = `function bootUI(){
    bindAccount();
    bindTabs();
    bindFields();
    bindItems();
    bindActions();
    setDefaults();
    renderBizCard();
    renderPremiumBanner();
    populateProductsDatalist();
    renderItems();
    renderPreview();
    setDebug('Ready. Prebuilding PDF…');
    setTimeout(schedulePrebuild, 300);
    setTimeout(handlePendingLoad, 200);
  }`;

const newBoot = `function bootUI(){
    bindAccount();
    bindTabs();
    bindFields();
    bindItems();
    bindActions();
    setDefaults();
    renderBizCard();
    renderPremiumBanner();
    populateProductsDatalist();
    renderItems();
    renderPreview();
    setDebug('Ready. Prebuilding PDF…');
    setTimeout(schedulePrebuild, 300);
    setTimeout(handlePendingLoad, 200);
    setupPremiumRefresh();
  }

  function setupPremiumRefresh(){
    document.addEventListener('visibilitychange', function(){
      if (!document.hidden && currentUser) checkPremiumRefresh();
    });
    setInterval(function(){
      if (!document.hidden && currentUser) checkPremiumRefresh();
    }, 60000);
  }

  function checkPremiumRefresh(){
    window.FB.getPremiumStatus().then(function(s){
      var wasPremium = cloudPremium;
      cloudPremium = !!(s && s.premium);
      if (wasPremium !== cloudPremium){
        refreshUI();
        if (cloudPremium) toast('⭐ Premium activated!');
        else toast('Premium expired');
      }
    }).catch(function(){});
  }`;

if (s.indexOf(oldBoot) < 0){ console.error('Marker not found'); process.exit(1); }
s = s.replace(oldBoot, newBoot);
fs.writeFileSync('app.js', s);
console.log('OK - app.js updated');
