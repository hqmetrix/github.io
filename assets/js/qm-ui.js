/* UI for the CCDA and QRDA I parser demo pages. File-derived text is only ever set with textContent. */
(function (g) {
  'use strict';
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }
  function add(parent) { for (var i = 1; i < arguments.length; i++) if (arguments[i]) parent.appendChild(arguments[i]); return parent; }
  function table(head, rows, cls) {
    var t = el('table', 'qm-table' + (cls ? ' ' + cls : '')), th = el('thead'), tr = el('tr');
    head.forEach(function (h) { tr.appendChild(el('th', '', h)); });
    th.appendChild(tr); t.appendChild(th);
    var tb = el('tbody');
    rows.forEach(function (r) {
      var row = el('tr', r.cls || '');
      r.cells.forEach(function (c) { row.appendChild(el('td', '', c)); });
      tb.appendChild(row);
    });
    t.appendChild(tb);
    var wrap = el('div', 'qm-scroll'); wrap.appendChild(t); return wrap;
  }
  function pct(x) { return x === null ? 'n/a' : (Math.round(x * 1000) / 10) + '%'; }
  function mark(b) { return b ? 'Yes' : 'No'; }

  function measureCard(m) {
    var card = el('div', 'qm-card tone-' + m.tone);
    var head = el('div', 'qm-card-head');
    add(head, el('div', 'qm-card-id', m.id), el('div', 'qm-card-title', m.title), el('span', 'qm-badge tone-' + m.tone, m.status));
    card.appendChild(head);

    card.appendChild(el('h4', '', 'Step 1. Initial population'));
    card.appendChild(table(['Criterion', 'Met', 'What was found'], m.ipItems.map(function (i) { return { cls: i.pass ? 'pass' : 'fail', cells: [i.label, mark(i.pass), i.detail] }; })));

    card.appendChild(el('h4', '', 'Step 2. Denominator exclusions'));
    if (!m.ip) card.appendChild(el('p', 'qm-note', 'Skipped because the patient is not in the initial population.'));
    else card.appendChild(table(['Exclusion', 'Applies', 'What was found'], m.exclusions.map(function (x) { return { cls: x.hit ? 'fail' : '', cells: [x.label, mark(x.hit), x.detail] }; })));

    card.appendChild(el('h4', '', 'Step 3. Numerator'));
    card.appendChild(el('p', 'qm-rule', m.numeratorRule));
    card.appendChild(el('p', 'qm-note', m.numeratorDetail));
    if (m.evidence.labs) {
      card.appendChild(m.evidence.labs.length ? table(['Date', 'Result', 'Unit', 'Used', 'Note'], m.evidence.labs.map(function (l) { return { cls: l.used ? 'pass' : '', cells: [l.date || 'no date', l.value === null ? 'none' : String(l.value), l.unit || '', l.used ? 'Yes' : '', l.note] }; })) : el('p', 'qm-note', 'No HbA1c or GMI results found in the document.'));
    }
    if (m.evidence.bps) {
      card.appendChild(m.evidence.bps.length ? table(['Date', 'Reading', 'Value', 'Unit', 'Used', 'Note'], m.evidence.bps.map(function (b) { return { cls: b.used ? 'pass' : '', cells: [b.date || 'no date', b.kind === 'sys' ? 'Systolic' : 'Diastolic', b.value === null ? 'none' : String(b.value), b.unit || '', b.used ? 'Yes' : '', b.note] }; })) : el('p', 'qm-note', 'No blood pressure readings found in the document.'));
    }
    var res = el('div', 'qm-result');
    add(res, el('span', '', 'In denominator: ' + mark(m.denom)), el('span', '', 'In numerator: ' + mark(m.numer)));
    card.appendChild(res);
    if (m.inverse) card.appendChild(el('p', 'qm-note', 'CMS122 is an inverse measure. A patient in the numerator has poor control, so a lower rate is better.'));
    return card;
  }

  function patientBlock(r) {
    var p = r.patient, box = el('div', 'qm-patient');
    add(box, el('h3', '', p.name),
      el('p', 'qm-meta', [r.info.type !== 'unknown' ? r.info.type : 'Unrecognized document type', p.gender ? 'Sex ' + p.gender : '', p.birthDate ? 'Born ' + p.birthDate : '', 'Measurement period ' + r.mp.start + ' to ' + r.mp.end].filter(Boolean).join('  |  ')));
    if (r.info.measures.length) box.appendChild(el('p', 'qm-meta', 'Measures named in file: ' + r.info.measures.join(', ')));
    var s = el('div', 'qm-facts');
    add(s, el('span', '', p.conditions.length + ' relevant conditions'), el('span', '', p.encounters.length + ' encounters'), el('span', '', p.labs.length + ' HbA1c results'), el('span', '', p.bps.length + ' blood pressure readings'));
    box.appendChild(s);
    return box;
  }

  function periodFor(text) {
    var mp = g.HQM.MP_DEFAULT;
    try {
      var ex = g.HQM.extract(g.HQM.parseXml(text));
      if (ex.info.reportingPeriod && ex.info.reportingPeriod.start && ex.info.reportingPeriod.end) mp = ex.info.reportingPeriod;
    } catch (e) { /* run() reports the error */ }
    return mp;
  }
  function errorBox(msg) { return el('div', 'qm-error', msg); }

  /* ---- CCDA page ---- */
  function initCcda() {
    var ta = document.getElementById('qm-xml'), out = document.getElementById('qm-out');
    var file = document.getElementById('qm-file'), go = document.getElementById('qm-run'), sample = document.getElementById('qm-sample');
    function load() { ta.value = g.HQM_SAMPLES.ccda; }
    function calc() {
      out.textContent = '';
      try {
        var r = g.HQM.run(ta.value, g.HQM.MP_DEFAULT);
        if (r.info.type === 'QRDA I') out.appendChild(el('p', 'qm-note', 'This looks like a QRDA I file. It was calculated anyway. The QRDA I Parser page is built for those.'));
        out.appendChild(patientBlock(r));
        out.appendChild(measureCard(r.measures.cms122));
        out.appendChild(measureCard(r.measures.cms165));
      } catch (e) { out.appendChild(errorBox(e.message)); }
      out.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    load();
    sample.addEventListener('click', function () { load(); calc(); });
    go.addEventListener('click', calc);
    file.addEventListener('change', function () {
      var f = file.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () { ta.value = String(rd.result); calc(); };
      rd.readAsText(f);
    });
  }

  /* ---- QRDA I page ---- */
  var runs = [];
  function renderQrda() {
    var out = document.getElementById('qm-out'); out.textContent = '';
    if (!runs.length) return;
    var ok = runs.filter(function (r) { return r.result; }).map(function (r) { return r.result; });
    var bad = runs.filter(function (r) { return r.error; });
    if (ok.length) {
      var agg = g.HQM.aggregate(ok);
      out.appendChild(el('h3', '', 'Summary across ' + ok.length + ' patient file' + (ok.length === 1 ? '' : 's')));
      out.appendChild(table(['Measure', 'Patients', 'Not in population', 'Excluded', 'Denominator', 'Numerator', 'Rate'], [
        { cells: ['CMS122v14 Glycemic Status > 9% (lower is better)', agg.cms122.patients, agg.cms122.notIp, agg.cms122.excluded, agg.cms122.denom, agg.cms122.numer, pct(agg.cms122.rate)] },
        { cells: ['CMS165v14 Controlling High Blood Pressure', agg.cms165.patients, agg.cms165.notIp, agg.cms165.excluded, agg.cms165.denom, agg.cms165.numer, pct(agg.cms165.rate)] }
      ]));
      out.appendChild(el('h3', '', 'By patient'));
      out.appendChild(table(['Patient', 'CMS122v14', 'CMS165v14'], ok.map(function (r) { return { cells: [r.patient.name, r.measures.cms122.status, r.measures.cms165.status] }; })));
    }
    bad.forEach(function (b) { out.appendChild(errorBox(b.name + ': ' + b.error)); });
    ok.forEach(function (r) {
      var d = el('details', 'qm-details'), s = el('summary', '', 'Show the calculation for ' + r.patient.name);
      d.appendChild(s); d.appendChild(patientBlock(r)); d.appendChild(measureCard(r.measures.cms122)); d.appendChild(measureCard(r.measures.cms165));
      out.appendChild(d);
    });
  }
  function addXml(name, text) {
    var rec = { name: name };
    try { rec.result = g.HQM.run(text, periodFor(text)); } catch (e) { rec.error = e.message; }
    runs.push(rec);
  }
  function initQrda() {
    var file = document.getElementById('qm-file'), sample = document.getElementById('qm-sample'), clear = document.getElementById('qm-clear');
    var drop = document.getElementById('qm-drop');
    function readFiles(list) {
      var files = Array.prototype.slice.call(list), n = files.length;
      if (!n) return;
      files.forEach(function (f) {
        var rd = new FileReader();
        rd.onload = function () { addXml(f.name, String(rd.result)); if (--n === 0) renderQrda(); };
        rd.onerror = function () { runs.push({ name: f.name, error: 'The file could not be read.' }); if (--n === 0) renderQrda(); };
        rd.readAsText(f);
      });
    }
    file.addEventListener('change', function () { readFiles(file.files); file.value = ''; });
    sample.addEventListener('click', function () { runs = []; g.HQM_SAMPLES.qrda.forEach(function (s) { addXml(s.file, s.xml); }); renderQrda(); });
    clear.addEventListener('click', function () { runs = []; renderQrda(); });
    ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function (e) { readFiles(e.dataTransfer.files); });
  }

  g.HQM_UI = { initCcda: initCcda, initQrda: initQrda };
})(window);
