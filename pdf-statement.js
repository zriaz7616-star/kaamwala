(function(){
  'use strict';

  var CURRENCY_SYMBOLS = {PKR:'Rs.', USD:'$', AED:'AED', GBP:'£'};

  function ensureJsPDF(){
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve();
    return new Promise(function(resolve, reject){
      var s = document.createElement('script');
      s.src = 'jspdf.umd.min.js';
      s.onload = function(){ resolve(); };
      s.onerror = function(){
        s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        s.onload = function(){ resolve(); };
        s.onerror = function(){ reject(new Error('PDF lib failed')); };
        document.head.appendChild(s);
      };
      document.head.appendChild(s);
    });
  }

  function formatMoney(n, cur){
    var sym = CURRENCY_SYMBOLS[cur] || (cur + ' ');
    var v = (Math.round((n||0)*100)/100).toLocaleString('en-US',
      {minimumFractionDigits:2, maximumFractionDigits:2});
    return sym + ' ' + v;
  }

  function formatDate(iso){
    if (!iso) return '—';
    try {
      var d = new Date(iso);
      return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    } catch(e){ return iso; }
  }

  function buildStatement(customer, profile, entries){
    var cur = (profile && profile.currency) || 'PKR';
    var jsPDF = window.jspdf.jsPDF;
    var pdf = new jsPDF({unit:'mm', format:'a4', orientation:'portrait'});
    var M = 18, W = 210, CW = W - 2*M, y = M;
    var TEAL = [15,118,110], DARK = [15,23,42], GRAY = [100,116,139];
    var LIGHT = [226,232,240], SOFT = [248,250,252];
    var RED = [220,38,38], GREEN = [5,150,105];

    /* ---------- LETTERHEAD ---------- */
    var headX = M;
    if (profile && profile.logo){
      try {
        pdf.addImage(profile.logo, 'JPEG', M, y, 20, 20);
        headX = M + 25;
      } catch(e){}
    }
    pdf.setFont('helvetica','bold'); pdf.setFontSize(17);
    pdf.setTextColor(TEAL[0],TEAL[1],TEAL[2]);
    pdf.text((profile && profile.businessName) || 'Business Name', headX, y + 6);

    pdf.setFont('helvetica','normal'); pdf.setFontSize(9);
    pdf.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
    var metaY = y + 12;
    var contact = [profile && profile.phone, profile && profile.email].filter(Boolean).join('  ·  ');
    if (contact){ pdf.text(contact, headX, metaY); metaY += 4; }
    if (profile && profile.address){
      var addrL = pdf.splitTextToSize(profile.address, CW - (headX - M));
      pdf.text(addrL[0], headX, metaY);
    }

    y = Math.max(y + 24, metaY + 6);
    pdf.setDrawColor(TEAL[0],TEAL[1],TEAL[2]); pdf.setLineWidth(0.8);
    pdf.line(M, y, W-M, y);
    y += 8;

    /* ---------- TITLE ---------- */
    pdf.setFont('helvetica','bold'); pdf.setFontSize(15);
    pdf.setTextColor(DARK[0],DARK[1],DARK[2]);
    pdf.text('UDHAAR STATEMENT', M, y);
    pdf.setFont('helvetica','normal'); pdf.setFontSize(9);
    pdf.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
    pdf.text('Generated: ' + formatDate(new Date().toISOString()), W - M, y, {align:'right'});
    y += 8;

    /* ---------- CUSTOMER BOX ---------- */
    var boxH = 22;
    pdf.setFillColor(SOFT[0],SOFT[1],SOFT[2]);
    pdf.rect(M, y, CW, boxH, 'F');
    pdf.setFillColor(TEAL[0],TEAL[1],TEAL[2]);
    pdf.rect(M, y, 1.5, boxH, 'F');

    pdf.setFont('helvetica','bold'); pdf.setFontSize(7);
    pdf.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
    pdf.text('CUSTOMER', M + 5, y + 5);

    pdf.setFontSize(11); pdf.setTextColor(DARK[0],DARK[1],DARK[2]);
    pdf.text(customer.name || 'Customer', M + 5, y + 11);

    pdf.setFont('helvetica','normal'); pdf.setFontSize(9);
    pdf.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
    if (customer.phone) pdf.text(customer.phone, M + 5, y + 16);

    y += boxH + 8;

    /* ---------- SUMMARY ---------- */
    var totalCredit = 0, totalPaid = 0;
    entries.forEach(function(e){
      var amt = parseFloat(e.amount) || 0;
      if (e.type === 'credit') totalCredit += amt;
      else if (e.type === 'payment') totalPaid += amt;
    });
    var balance = totalCredit - totalPaid;

    var summaryY = y;
    var sumW = CW / 3;
    var sumLabels = ['Total Given', 'Total Received', 'Balance'];
    var sumValues = [formatMoney(totalCredit, cur), formatMoney(totalPaid, cur), formatMoney(Math.abs(balance), cur)];
    var sumColors = [RED, GREEN, balance > 0.01 ? RED : (balance < -0.01 ? GREEN : GRAY)];
    var sumSubs = ['Udhaar diya', 'Payment mila', balance > 0.01 ? 'You will get' : (balance < -0.01 ? 'You will give' : 'Clear')];

    for (var i = 0; i < 3; i++){
      var bx = M + i * sumW;
      pdf.setFillColor(SOFT[0],SOFT[1],SOFT[2]);
      pdf.rect(bx + 2, summaryY, sumW - 4, 22, 'F');

      pdf.setFont('helvetica','normal'); pdf.setFontSize(7);
      pdf.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
      pdf.text(sumLabels[i].toUpperCase(), bx + 6, summaryY + 6);

      pdf.setFont('helvetica','bold'); pdf.setFontSize(11);
      pdf.setTextColor(sumColors[i][0],sumColors[i][1],sumColors[i][2]);
      pdf.text(sumValues[i], bx + 6, summaryY + 13);

      pdf.setFont('helvetica','normal'); pdf.setFontSize(7);
      pdf.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
      pdf.text(sumSubs[i], bx + 6, summaryY + 18);
    }
    y = summaryY + 28;

    /* ---------- ENTRIES TABLE ---------- */
    pdf.setFillColor(TEAL[0],TEAL[1],TEAL[2]);
    pdf.rect(M, y, CW, 7, 'F');
    pdf.setFont('helvetica','bold'); pdf.setFontSize(8);
    pdf.setTextColor(255,255,255);
    pdf.text('DATE', M + 3, y + 4.8);
    pdf.text('TYPE', M + 32, y + 4.8);
    pdf.text('NOTE', M + 60, y + 4.8);
    pdf.text('AMOUNT', W - M - 3, y + 4.8, {align:'right'});
    y += 7;

    var sorted = entries.slice().sort(function(a, b){
      return String(a.date || a.createdAt || '').localeCompare(String(b.date || b.createdAt || ''));
    });

    if (sorted.length === 0){
      pdf.setFont('helvetica','normal'); pdf.setFontSize(9);
      pdf.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
      pdf.text('No entries yet', M + 3, y + 7);
      y += 12;
    } else {
      pdf.setFont('helvetica','normal'); pdf.setFontSize(9);
      sorted.forEach(function(e, idx){
        if (y > 265){ pdf.addPage(); y = 20; }

        var isCredit = e.type === 'credit';
        var rowH = 9;

        if (idx % 2 === 1){
          pdf.setFillColor(SOFT[0],SOFT[1],SOFT[2]);
          pdf.rect(M, y, CW, rowH, 'F');
        }

        pdf.setTextColor(DARK[0],DARK[1],DARK[2]);
        pdf.text(formatDate(e.date || e.createdAt), M + 3, y + 6);

        pdf.setFont('helvetica','bold');
        pdf.setTextColor(isCredit ? RED[0] : GREEN[0], isCredit ? RED[1] : GREEN[1], isCredit ? RED[2] : GREEN[2]);
        pdf.text(isCredit ? 'GAVE' : 'TOOK', M + 32, y + 6);

        pdf.setFont('helvetica','normal');
        pdf.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
        var noteText = e.note || '—';
        var noteLines = pdf.splitTextToSize(noteText, CW - 90);
        pdf.text(noteLines[0] || '—', M + 60, y + 6);

        pdf.setFont('helvetica','bold');
        pdf.setTextColor(isCredit ? RED[0] : GREEN[0], isCredit ? RED[1] : GREEN[1], isCredit ? RED[2] : GREEN[2]);
        var sign = isCredit ? '+' : '-';
        pdf.text(sign + ' ' + formatMoney(e.amount, cur).replace('. ', '. '), W - M - 3, y + 6, {align:'right'});

        pdf.setDrawColor(LIGHT[0],LIGHT[1],LIGHT[2]); pdf.setLineWidth(0.15);
        pdf.line(M, y + rowH, W - M, y + rowH);
        y += rowH;
      });
    }

    y += 8;

    /* ---------- FINAL BALANCE ---------- */
    if (y > 250){ pdf.addPage(); y = 20; }
    pdf.setFillColor(TEAL[0],TEAL[1],TEAL[2]);
    pdf.rect(W - M - 80, y, 80, 14, 'F');
    pdf.setFont('helvetica','bold'); pdf.setFontSize(10);
    pdf.setTextColor(255,255,255);
    pdf.text('BALANCE', W - M - 76, y + 6);
    pdf.setFontSize(12);
    pdf.text(formatMoney(Math.abs(balance), cur), W - M - 4, y + 10, {align:'right'});

    y += 20;
    pdf.setFont('helvetica','normal'); pdf.setFontSize(8);
    pdf.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
    pdf.text('This is a computer-generated statement.', W/2, y, {align:'center'});

    y += 5;
    if (!(profile && profile.businessName)){
      pdf.text('Made with KaamWala', W/2, y, {align:'center'});
    } else {
      pdf.text('Thank you for your business.', W/2, y, {align:'center'});
    }

    return pdf;
  }

  function generateCustomerStatement(customer, profile){
    return ensureJsPDF().then(function(){
      var pdf = buildStatement(customer, profile, customer.entries || []);
      var blob = pdf.output('blob');
      function safe(s){ return String(s||'').replace(/[^a-zA-Z0-9\-_]/g,'_').slice(0,24) || 'customer'; }
      var filename = 'Udhaar_' + safe(customer.name) + '_' + new Date().toISOString().slice(0,10) + '.pdf';
      return { blob: blob, filename: filename };
    });
  }

  window.KWStatement = {
    generate: generateCustomerStatement
  };
})();
