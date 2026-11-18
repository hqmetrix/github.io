/* hqMetrix quality measure demo engine.
 * Parses C-CDA and QRDA Category I XML in the browser and calculates two measures:
 *   CMS122v14 Diabetes: Glycemic Status Assessment Greater Than 9%   (inverse measure: lower is better)
 *   CMS165v14 Controlling High Blood Pressure
 * Specs: ecqi.healthit.gov/ecqm/ec/2026/cms0122v14 and /cms0165v14 (2026 performance period).
 * IMPORTANT: this is an illustration. It uses representative code lists, not the full VSAC value sets,
 * and it is not a certified eCQM engine. Nothing leaves the browser.
 */
(function (g) {
  'use strict';

  /* ---------- code systems ---------- */
  var SYS = {
    '2.16.840.1.113883.6.96': 'snomed',
    '2.16.840.1.113883.6.90': 'icd10',
    '2.16.840.1.113883.6.3': 'icd10',
    '2.16.840.1.113883.6.1': 'loinc',
    '2.16.840.1.113883.6.12': 'cpt',
    '2.16.840.1.113883.6.285': 'hcpcs',
    '2.16.840.1.113883.5.4': 'actcode'
  };
  function sysKey(oid, name) {
    if (oid && SYS[oid]) return SYS[oid];
    var n = (name || '').toLowerCase();
    if (/snomed/.test(n)) return 'snomed';
    if (/icd/.test(n)) return 'icd10';
    if (/loinc/.test(n)) return 'loinc';
    if (/cpt/.test(n)) return 'cpt';
    if (/hcpcs/.test(n)) return 'hcpcs';
    if (/actcode/.test(n)) return 'actcode';
    return '';
  }
  function norm(code) { return String(code || '').replace(/\./g, '').toUpperCase(); }

  /* ---------- representative code sets (NOT the full value sets) ---------- */
  function inRange(code, lo, hi) { var n = parseInt(code, 10); return /^\d{5}$/.test(code) && n >= lo && n <= hi; }
  function startsAny(c, list) { for (var i = 0; i < list.length; i++) if (c.indexOf(list[i]) === 0) return true; return false; }
  function has(list, c) { return list.indexOf(c) >= 0; }

  var SETS = {
    diabetes: function (s, c) {
      return (s === 'icd10' && startsAny(norm(c), ['E10', 'E11', 'E13'])) ||
        (s === 'snomed' && has(['44054006', '46635009', '73211009'], c));
    },
    hypertension: function (s, c) {
      return (s === 'icd10' && norm(c) === 'I10') || (s === 'snomed' && has(['59621000', '1201005'], c));
    },
    hospice: function (s, c) { return s === 'snomed' && c === '385763009'; },
    palliative: function (s, c) { return (s === 'icd10' && norm(c) === 'Z515') || (s === 'snomed' && c === '103735009'); },
    esrd: function (s, c) {
      var n = norm(c);
      return (s === 'icd10' && has(['N186', 'N185', 'Z992', 'Z940'], n)) ||
        (s === 'snomed' && has(['46177005', '433146000'], c)) ||
        (s === 'cpt' && has(['90935', '90937', '90945', '90947', '50360', '50365'], c));
    },
    pregnancy: function (s, c) {
      var n = norm(c);
      return (s === 'icd10' && (n.charAt(0) === 'O' || startsAny(n, ['Z331', 'Z34']))) || (s === 'snomed' && c === '77386006');
    },
    frailty: function (s, c) {
      var n = norm(c);
      return (s === 'icd10' && (has(['R54', 'Z7401', 'Z993', 'Z9181'], n) || startsAny(n, ['W19']))) || (s === 'snomed' && c === '248279007');
    },
    advancedIllness: function (s, c) {
      return s === 'icd10' && startsAny(norm(c), ['F01', 'F02', 'F03', 'G30', 'G310', 'I50', 'C77', 'C78', 'C79']);
    },
    nursingHome: function (s, c) { return s === 'snomed' && c === '160734000'; }
  };
  var COND_SETS = ['diabetes', 'hypertension', 'hospice', 'palliative', 'esrd', 'pregnancy', 'frailty', 'advancedIllness', 'nursingHome'];

  var HBA1C = ['4548-4', '17856-6', '59261-8', '62388-4', '71875-9', '41995-2', '17855-8', '4549-2', '97506-0'];
  var LOINC_SYS = '8480-6', LOINC_DIA = '8462-4';

  function isQualifyingEncounter(s, c) {
    if (s !== 'cpt' && s !== 'hcpcs') return false;
    return inRange(c, 99202, 99205) || inRange(c, 99212, 99215) || inRange(c, 99341, 99350) ||
      inRange(c, 99385, 99387) || inRange(c, 99395, 99397) || inRange(c, 99441, 99443) || inRange(c, 98000, 98015) ||
      c === 'G0438' || c === 'G0439';
  }
  function encounterSetting(codes) {
    for (var i = 0; i < codes.length; i++) {
      var s = codes[i].system, c = codes[i].code;
      if (s === 'cpt' && inRange(c, 99281, 99285)) return 'ed';
      if (s === 'actcode' && c === 'EMER') return 'ed';
      if (s === 'snomed' && c === '4525004') return 'ed';
    }
    for (var j = 0; j < codes.length; j++) {
      var s2 = codes[j].system, c2 = codes[j].code;
      if (s2 === 'cpt' && (inRange(c2, 99221, 99223) || inRange(c2, 99231, 99239) || inRange(c2, 99234, 99236))) return 'inpatient';
      if (s2 === 'actcode' && (c2 === 'IMP' || c2 === 'ACUTE' || c2 === 'NONAC')) return 'inpatient';
      if (s2 === 'snomed' && (c2 === '32485007' || c2 === '183452005')) return 'inpatient';
    }
    return 'outpatient';
  }

  /* ---------- XML helpers ---------- */
  var XSI = 'http://www.w3.org/2001/XMLSchema-instance';
  function kids(el, name) {
    var out = [];
    for (var i = 0; i < el.children.length; i++) if (el.children[i].localName === name) out.push(el.children[i]);
    return out;
  }
  function first(el, name) { var k = kids(el, name); return k.length ? k[0] : null; }
  function xsiType(el) { return el.getAttribute('xsi:type') || el.getAttributeNS(XSI, 'type') || ''; }

  function isoDate(v) {
    if (!v) return null;
    var m = /^(\d{4})-?(\d{2})?-?(\d{2})?/.exec(String(v));
    if (!m) return null;
    return m[1] + '-' + (m[2] || '01') + '-' + (m[3] || '01');
  }
  function codesOf(el) {
    var out = [];
    if (!el) return out;
    function add(n) {
      var c = n.getAttribute('code');
      if (c) out.push({ code: c, system: sysKey(n.getAttribute('codeSystem'), n.getAttribute('codeSystemName')), display: n.getAttribute('displayName') || '' });
    }
    add(el);
    kids(el, 'translation').forEach(add);
    return out;
  }
  function effOwn(el) {
    var et = first(el, 'effectiveTime');
    if (!et) return null;
    var v = isoDate(et.getAttribute('value'));
    var lo = first(et, 'low'), hi = first(et, 'high'), ce = first(et, 'center');
    var start = lo ? isoDate(lo.getAttribute('value')) : null;
    var end = hi ? isoDate(hi.getAttribute('value')) : null;
    var c = ce ? isoDate(ce.getAttribute('value')) : null;
    if (v) return { start: v, end: v };
    if (c) return { start: c, end: c };
    if (start || end) return { start: start, end: end };
    return null;
  }
  function effDates(el) {
    var own = effOwn(el);
    if (own) return own;
    var desc = el.getElementsByTagName('effectiveTime');
    for (var i = 0; i < desc.length; i++) {
      var d = effOwn(desc[i].parentElement);
      if (d) return d;
    }
    var p = el.parentElement, hops = 0;
    while (p && hops < 4 && p.localName !== 'section') {
      var u = effOwn(p);
      if (u) return u;
      p = p.parentElement; hops++;
    }
    return { start: null, end: null };
  }
  function pqOf(el) {
    function fromValue(v) {
      var t = xsiType(v);
      if ((t === 'PQ' || v.hasAttribute('unit')) && v.hasAttribute('value')) {
        var n = parseFloat(v.getAttribute('value'));
        return { value: isNaN(n) ? null : n, unit: v.getAttribute('unit') || '' };
      }
      return null;
    }
    var own = kids(el, 'value');
    for (var i = 0; i < own.length; i++) { var r = fromValue(own[i]); if (r) return r; }
    var all = el.getElementsByTagName('value');
    for (var j = 0; j < all.length; j++) { var r2 = fromValue(all[j]); if (r2) return r2; }
    return null;
  }
  function textOf(el) { return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : ''; }

  /* ---------- extraction ---------- */
  function parseXml(text) {
    var doc = new DOMParser().parseFromString(String(text || '').trim(), 'application/xml');
    if (!doc.documentElement || doc.getElementsByTagName('parsererror').length) {
      throw new Error('This is not well-formed XML. Check that the whole file was pasted or uploaded.');
    }
    if (doc.documentElement.localName !== 'ClinicalDocument') {
      throw new Error('The root element is "' + doc.documentElement.localName + '", not ClinicalDocument. This does not look like a C-CDA or QRDA file.');
    }
    return doc;
  }

  function extract(doc) {
    var root = doc.documentElement;
    var tpl = kids(root, 'templateId').map(function (t) { return t.getAttribute('root') || ''; });
    var type = 'unknown';
    if (tpl.some(function (r) { return r.indexOf('2.16.840.1.113883.10.20.24.1.') === 0; })) type = 'QRDA I';
    else if (tpl.some(function (r) { return r.indexOf('2.16.840.1.113883.10.20.22.1.') === 0; })) type = 'C-CDA';

    var info = { type: type, title: textOf(first(root, 'title')), measures: [], reportingPeriod: null };

    var pr = first(root, 'recordTarget');
    var role = pr && first(pr, 'patientRole');
    var pat = role && first(role, 'patient');
    var name = '', gender = '', dob = null;
    if (pat) {
      var nm = first(pat, 'name');
      if (nm) name = (kids(nm, 'given').map(textOf).join(' ') + ' ' + textOf(first(nm, 'family'))).trim();
      var gc = first(pat, 'administrativeGenderCode');
      gender = gc ? (gc.getAttribute('code') || '') : '';
      var bt = first(pat, 'birthTime');
      dob = bt ? isoDate(bt.getAttribute('value')) : null;
    }
    var patient = {
      name: name || 'Unnamed patient', gender: gender, birthDate: dob,
      conditions: [], encounters: [], labs: [], bps: [], notes: []
    };

    // QRDA measure references and reporting period
    var ext = doc.getElementsByTagName('externalDocument');
    for (var e = 0; e < ext.length; e++) {
      var tx = textOf(first(ext[e], 'text')) || textOf(ext[e]);
      var m = /CMS\s*0?(\d+)\s*v(\d+)/i.exec(tx);
      var label = m ? 'CMS' + m[1] + 'v' + m[2] : tx;
      if (label && info.measures.indexOf(label) < 0) info.measures.push(label);
    }
    var acts = doc.getElementsByTagName('act');
    for (var a = 0; a < acts.length; a++) {
      var ts = kids(acts[a], 'templateId');
      if (ts.some(function (t) { return t.getAttribute('root') === '2.16.840.1.113883.10.20.17.3.8'; })) {
        var d = effOwn(acts[a]);
        if (d && d.start && d.end) info.reportingPeriod = d;
      }
    }

    var seen = {};
    function once(key) { if (seen[key]) return false; seen[key] = 1; return true; }

    var all = doc.getElementsByTagName('*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i], ln = el.localName;
      if (ln !== 'observation' && ln !== 'encounter' && ln !== 'procedure' && ln !== 'act') continue;
      var negated = el.getAttribute('negationInd') === 'true';

      var codes = codesOf(first(el, 'code'));
      kids(el, 'value').forEach(function (v) { codes = codes.concat(codesOf(v)); });
      if (!codes.length) continue;
      var dt = effDates(el);

      if (ln === 'encounter') {
        var setting = encounterSetting(codes);
        var qual = codes.some(function (c) { return isQualifyingEncounter(c.system, c.code); });
        var k = 'enc|' + codes.map(function (c) { return c.code; }).join(',') + '|' + dt.start + '|' + dt.end;
        if (once(k)) patient.encounters.push({ date: dt.start, end: dt.end, codes: codes, setting: setting, qualifying: qual, negated: negated });
      }

      if (ln === 'observation' && !negated) {
        var own = codesOf(first(el, 'code'));
        var isA1c = own.some(function (c) { return c.system === 'loinc' && HBA1C.indexOf(c.code) >= 0; });
        var isSys = own.some(function (c) { return c.system === 'loinc' && c.code === LOINC_SYS; });
        var isDia = own.some(function (c) { return c.system === 'loinc' && c.code === LOINC_DIA; });
        if (isA1c || isSys || isDia) {
          var pq = pqOf(el);
          var rec = { date: dt.start || dt.end, value: pq ? pq.value : null, unit: pq ? pq.unit : '' };
          if (isA1c) {
            var ka = 'lab|' + rec.date + '|' + rec.value + '|' + rec.unit;
            if (once(ka)) patient.labs.push(rec);
          } else {
            rec.kind = isSys ? 'sys' : 'dia';
            var kb = 'bp|' + rec.kind + '|' + rec.date + '|' + rec.value;
            if (once(kb)) patient.bps.push(rec);
          }
        }
      }

      if (!negated) {
        for (var s = 0; s < COND_SETS.length; s++) {
          var sn = COND_SETS[s];
          for (var cI = 0; cI < codes.length; cI++) {
            if (SETS[sn](codes[cI].system, codes[cI].code)) {
              var kc = 'cond|' + sn + '|' + codes[cI].code + '|' + dt.start + '|' + dt.end;
              if (once(kc)) patient.conditions.push({ set: sn, code: codes[cI].code, system: codes[cI].system, display: codes[cI].display, start: dt.start, end: dt.end });
              break;
            }
          }
        }
      }
    }
    return { info: info, patient: patient };
  }

  /* ---------- date helpers ---------- */
  function ageAt(dob, on) {
    if (!dob || !on) return null;
    var b = dob.split('-').map(Number), o = on.split('-').map(Number);
    var age = o[0] - b[0];
    if (o[1] < b[1] || (o[1] === b[1] && o[2] < b[2])) age--;
    return age;
  }
  function inRangeDate(d, s, e) { return !!d && d >= s && d <= e; }
  function overlaps(start, end, s, e) {
    var st = start || '0000-01-01', en = end || '9999-12-31';
    return st <= e && en >= s;
  }
  function addMonths(iso, n) {
    var p = iso.split('-').map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1 + n, p[2]));
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  function minusYear(iso) { var p = iso.split('-'); return (Number(p[0]) - 1) + '-' + p[1] + '-' + p[2]; }
  function fmt(d) { return d || 'no date'; }

  /* ---------- measure calculation ---------- */
  function condsIn(p, set, s, e) {
    return p.conditions.filter(function (c) { return c.set === set && overlaps(c.start, c.end, s, e); });
  }
  function listCodes(arr) { return arr.map(function (c) { return c.code + (c.start ? ' (' + c.start + ')' : ''); }).join(', '); }

  function sharedExclusions(p, mp, age) {
    var out = [];
    var hos = condsIn(p, 'hospice', mp.start, mp.end);
    out.push({ key: 'hospice', label: 'Hospice care during the measurement period', hit: hos.length > 0, detail: hos.length ? listCodes(hos) : 'None found' });
    var pal = condsIn(p, 'palliative', mp.start, mp.end);
    out.push({ key: 'palliative', label: 'Palliative care during the measurement period', hit: pal.length > 0, detail: pal.length ? listCodes(pal) : 'None found' });
    var fr = condsIn(p, 'frailty', mp.start, mp.end);
    var ai = condsIn(p, 'advancedIllness', minusYear(mp.start), mp.end);
    var frail66 = age !== null && age >= 66 && age <= 80 && fr.length > 0 && ai.length > 0;
    out.push({
      key: 'frail66', label: 'Age 66 to 80 with frailty and advanced illness',
      hit: frail66,
      detail: age !== null && age >= 66 && age <= 80 ? ('Frailty: ' + (fr.length ? listCodes(fr) : 'none') + '. Advanced illness (this year or prior): ' + (ai.length ? listCodes(ai) : 'none')) : 'Not in age band 66 to 80'
    });
    var frail81 = age !== null && age >= 81 && fr.length > 0;
    out.push({ key: 'frail81', label: 'Age 81 or older with frailty', hit: frail81, detail: age !== null && age >= 81 ? ('Frailty: ' + (fr.length ? listCodes(fr) : 'none')) : 'Not age 81 or older' });
    var nh = p.conditions.filter(function (c) { return c.set === 'nursingHome' && (!c.start || c.start <= mp.end); });
    out.push({ key: 'nh', label: 'Age 66 or older living long term in a nursing home', hit: age !== null && age >= 66 && nh.length > 0, detail: age !== null && age >= 66 ? (nh.length ? listCodes(nh) : 'None found') : 'Not age 66 or older' });
    return out;
  }

  function calcCMS122(p, mp) {
    var age = ageAt(p.birthDate, mp.end);
    var dm = condsIn(p, 'diabetes', mp.start, mp.end);
    var enc = p.encounters.filter(function (e) { return e.qualifying && !e.negated && inRangeDate(e.date, mp.start, mp.end); });
    var ipItems = [
      { label: 'Age 18 to 75 at end of measurement period', pass: age !== null && age >= 18 && age <= 75, detail: age === null ? 'No birth date found' : 'Age ' + age },
      { label: 'Diabetes diagnosis overlapping the measurement period', pass: dm.length > 0, detail: dm.length ? listCodes(dm) : 'No diabetes diagnosis found' },
      { label: 'Qualifying visit during the measurement period', pass: enc.length > 0, detail: enc.length ? enc.map(function (e) { return e.codes[0].code + ' on ' + e.date; }).join(', ') : 'No qualifying visit found' }
    ];
    var ip = ipItems.every(function (i) { return i.pass; });
    var excl = sharedExclusions(p, mp, age);
    var excluded = ip && excl.some(function (x) { return x.hit; });

    // numerator: most recent glycemic assessment in the period, lowest result on that day
    var usable = [], ignored = [];
    p.labs.forEach(function (l) {
      if (!inRangeDate(l.date, mp.start, mp.end)) { ignored.push({ lab: l, why: 'Outside the measurement period' }); return; }
      if (l.value !== null && l.unit && l.unit !== '%') { ignored.push({ lab: l, why: 'Unit is "' + l.unit + '", the measure requires percent (%)' }); return; }
      usable.push(l);
    });
    var latestDate = usable.reduce(function (m, l) { return !m || l.date > m ? l.date : m; }, null);
    var sameDay = usable.filter(function (l) { return l.date === latestDate; });
    var nums = sameDay.filter(function (l) { return l.value !== null; }).map(function (l) { return l.value; });
    var chosen = null, why;
    if (!usable.length) why = 'No HbA1c or GMI result in the measurement period, so the patient counts as poor control (in the numerator).';
    else if (!nums.length) why = 'The most recent assessment (' + latestDate + ') has no numeric result, so it counts as poor control (in the numerator).';
    else {
      chosen = Math.min.apply(null, nums);
      why = 'Most recent assessment ' + latestDate + (sameDay.length > 1 ? ', lowest of ' + sameDay.length + ' same-day results' : '') + ': ' + chosen + '%.';
    }
    var numer = !usable.length || !nums.length || chosen > 9.0;
    return {
      id: 'CMS122v14', title: 'Diabetes: Glycemic Status Assessment Greater Than 9%', inverse: true,
      ipItems: ipItems, ip: ip, exclusions: excl, excluded: excluded,
      denom: ip && !excluded, numer: ip && !excluded && numer,
      numeratorRule: 'Most recent HbA1c or GMI above 9.0%, missing, or not done in the period (lower rate is better).',
      numeratorDetail: why,
      status: !ip ? 'Not in the measure population' : excluded ? 'Excluded from the denominator' : numer ? 'In numerator: poor control or no result' : 'Not in numerator: HbA1c at or below 9%',
      tone: !ip || excluded ? 'muted' : numer ? 'bad' : 'ok',
      evidence: { labs: p.labs.map(function (l) {
        var isChosen = l.date === latestDate && usable.indexOf(l) >= 0 && (chosen === null || l.value === chosen);
        var ig = ignored.filter(function (x) { return x.lab === l; })[0];
        return { date: l.date, value: l.value, unit: l.unit, used: isChosen && !ig, note: ig ? ig.why : (isChosen ? 'Used for the numerator' : 'Earlier result') };
      }) }
    };
  }

  function calcCMS165(p, mp) {
    var age = ageAt(p.birthDate, mp.end);
    var firstHalfEnd = addMonths(mp.start, 6);
    var htn = condsIn(p, 'hypertension', mp.start, firstHalfEnd);
    var enc = p.encounters.filter(function (e) { return e.qualifying && !e.negated && inRangeDate(e.date, mp.start, mp.end); });
    var ipItems = [
      { label: 'Age 18 to 85 at end of measurement period', pass: age !== null && age >= 18 && age <= 85, detail: age === null ? 'No birth date found' : 'Age ' + age },
      { label: 'Essential hypertension starting before, and continuing into, or starting during the first six months of the period', pass: htn.length > 0, detail: htn.length ? listCodes(htn) : 'No essential hypertension diagnosis found overlapping ' + mp.start + ' to ' + firstHalfEnd },
      { label: 'Qualifying visit during the measurement period', pass: enc.length > 0, detail: enc.length ? enc.map(function (e) { return e.codes[0].code + ' on ' + e.date; }).join(', ') : 'No qualifying visit found' }
    ];
    var ip = ipItems.every(function (i) { return i.pass; });
    var excl = sharedExclusions(p, mp, age);
    var es = condsIn(p, 'esrd', '0000-01-01', mp.end);
    excl.splice(2, 0, { key: 'esrd', label: 'End stage renal disease, dialysis or kidney transplant', hit: es.length > 0, detail: es.length ? listCodes(es) : 'None found' });
    var pg = condsIn(p, 'pregnancy', mp.start, mp.end);
    excl.splice(3, 0, { key: 'preg', label: 'Pregnancy during the measurement period', hit: pg.length > 0, detail: pg.length ? listCodes(pg) : 'None found' });
    var excluded = ip && excl.some(function (x) { return x.hit; });

    // group readings by day; a day needs both systolic and diastolic
    var days = {}, ignored = [];
    var blocked = p.encounters.filter(function (e) { return (e.setting === 'ed' || e.setting === 'inpatient') && !e.negated; });
    function onBlockedDay(d) {
      return blocked.filter(function (e) { return e.date && d >= e.date && d <= (e.end || e.date); });
    }
    p.bps.forEach(function (r) {
      if (!inRangeDate(r.date, mp.start, mp.end)) { ignored.push({ r: r, why: 'Outside the measurement period' }); return; }
      if (r.value === null) { ignored.push({ r: r, why: 'No numeric result' }); return; }
      if (r.unit && !/^mm\s?\[?hg\]?$/i.test(r.unit)) { ignored.push({ r: r, why: 'Unit is "' + r.unit + '", expected mm[Hg]' }); return; }
      var b = onBlockedDay(r.date);
      if (b.length) { ignored.push({ r: r, why: 'Taken on the day of an ' + (b[0].setting === 'ed' ? 'emergency department visit' : 'inpatient stay') + ', not eligible' }); return; }
      var d = days[r.date] || (days[r.date] = { sys: [], dia: [] });
      d[r.kind].push(r.value);
    });
    var elig = Object.keys(days).filter(function (d) { return days[d].sys.length && days[d].dia.length; }).sort();
    var latest = elig.length ? elig[elig.length - 1] : null;
    var sys = null, dia = null, controlled = false, why;
    if (!latest) why = 'No eligible blood pressure day (needs a systolic and a diastolic on the same day, outside ED and inpatient care). The patient counts as not controlled.';
    else {
      sys = Math.min.apply(null, days[latest].sys); dia = Math.min.apply(null, days[latest].dia);
      controlled = sys < 140 && dia < 90;
      why = 'Most recent eligible day ' + latest + ': lowest systolic ' + sys + ', lowest diastolic ' + dia + (controlled ? ', both under the 140/90 thresholds.' : ', at or above 140/90.');
    }
    var rows = [];
    p.bps.forEach(function (r) {
      var ig = ignored.filter(function (x) { return x.r === r; })[0];
      rows.push({ date: r.date, kind: r.kind, value: r.value, unit: r.unit, used: !ig && r.date === latest && ((r.kind === 'sys' && r.value === sys) || (r.kind === 'dia' && r.value === dia)), note: ig ? ig.why : (r.date === latest ? 'Used (lowest of the day)' : 'Earlier day') });
    });
    return {
      id: 'CMS165v14', title: 'Controlling High Blood Pressure', inverse: false,
      ipItems: ipItems, ip: ip, exclusions: excl, excluded: excluded,
      denom: ip && !excluded, numer: ip && !excluded && controlled,
      numeratorRule: 'Most recent eligible blood pressure under 140 systolic and under 90 diastolic.',
      numeratorDetail: why,
      status: !ip ? 'Not in the measure population' : excluded ? 'Excluded from the denominator' : controlled ? 'In numerator: blood pressure controlled' : 'Not in numerator: not controlled or no reading',
      tone: !ip || excluded ? 'muted' : controlled ? 'ok' : 'bad',
      evidence: { bps: rows }
    };
  }

  function run(text, mp) {
    var doc = parseXml(text);
    var ex = extract(doc);
    var period = mp;
    return {
      info: ex.info, patient: ex.patient, mp: period,
      measures: { cms122: calcCMS122(ex.patient, period), cms165: calcCMS165(ex.patient, period) }
    };
  }

  function aggregate(runs) {
    var out = {};
    ['cms122', 'cms165'].forEach(function (k) {
      var a = { patients: runs.length, notIp: 0, excluded: 0, denom: 0, numer: 0, rate: null };
      runs.forEach(function (r) {
        var m = r.measures[k];
        if (!m.ip) a.notIp++; else if (m.excluded) a.excluded++;
        if (m.denom) a.denom++;
        if (m.numer) a.numer++;
      });
      a.rate = a.denom ? a.numer / a.denom : null;
      out[k] = a;
    });
    return out;
  }

  g.HQM = { run: run, aggregate: aggregate, parseXml: parseXml, extract: extract, MP_DEFAULT: { start: '2026-01-01', end: '2026-12-31' } };
})(window);
