/* Synthetic, simplified sample documents for the hqMetrix parser demos. No real patients. */
(function (g) {
  'use strict';
  var OID = { snomed: '2.16.840.1.113883.6.96', icd10: '2.16.840.1.113883.6.90', loinc: '2.16.840.1.113883.6.1', cpt: '2.16.840.1.113883.6.12' };
  function d8(iso) { return iso.replace(/-/g, ''); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  function build(p) {
    var qrda = !!p.qrda, x = [];
    x.push('<?xml version="1.0" encoding="UTF-8"?>');
    x.push('<!-- Synthetic sample for demonstration. Simplified; not a conformant production document. -->');
    x.push('<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">');
    if (qrda) {
      x.push('  <templateId root="2.16.840.1.113883.10.20.24.1.1" extension="2017-08-01"/>');
      x.push('  <templateId root="2.16.840.1.113883.10.20.24.1.2" extension="2019-12-01"/>');
      x.push('  <title>QRDA Category I Report (sample)</title>');
    } else {
      x.push('  <templateId root="2.16.840.1.113883.10.20.22.1.1" extension="2015-08-01"/>');
      x.push('  <templateId root="2.16.840.1.113883.10.20.22.1.2" extension="2015-08-01"/>');
      x.push('  <title>Continuity of Care Document (sample)</title>');
    }
    x.push('  <effectiveTime value="20261115"/>');
    x.push('  <recordTarget><patientRole><id root="2.16.840.1.113883.19.5" extension="' + esc(p.id) + '"/>');
    x.push('    <patient><name><given>' + esc(p.given) + '</given><family>' + esc(p.family) + '</family></name>');
    x.push('      <administrativeGenderCode code="' + p.gender + '" codeSystem="2.16.840.1.113883.5.1"/>');
    x.push('      <birthTime value="' + d8(p.dob) + '"/></patient></patientRole></recordTarget>');
    if (qrda) {
      x.push('  <component><structuredBody>');
      x.push('    <component><section><templateId root="2.16.840.1.113883.10.20.24.2.2"/><title>Measure Section</title>');
      ['CMS122v14', 'CMS165v14'].forEach(function (m) {
        x.push('      <entry><organizer classCode="CLUSTER" moodCode="EVN"><templateId root="2.16.840.1.113883.10.20.24.3.98"/>');
        x.push('        <reference typeCode="REFR"><externalDocument classCode="DOC" moodCode="EVN"><text>' + m + '</text></externalDocument></reference></organizer></entry>');
      });
      x.push('    </section></component>');
      x.push('    <component><section><templateId root="2.16.840.1.113883.10.20.17.2.1"/><title>Reporting Parameters</title>');
      x.push('      <entry><act classCode="ACT" moodCode="EVN"><templateId root="2.16.840.1.113883.10.20.17.3.8"/>');
      x.push('        <effectiveTime><low value="20260101"/><high value="20261231"/></effectiveTime></act></entry>');
      x.push('    </section></component>');
      x.push('    <component><section><templateId root="2.16.840.1.113883.10.20.24.2.1"/><title>Patient Data</title>');
    } else {
      x.push('  <component><structuredBody>');
      x.push('    <component><section><title>Clinical data (sample)</title>');
    }
    p.enc.forEach(function (e) {
      x.push('      <entry><encounter classCode="ENC" moodCode="EVN"><code code="' + e.code + '" codeSystem="' + OID.cpt + '" displayName="' + esc(e.name) + '"/>');
      x.push('        <effectiveTime><low value="' + d8(e.date) + '"/><high value="' + d8(e.date) + '"/></effectiveTime></encounter></entry>');
    });
    p.dx.forEach(function (d) {
      x.push('      <entry><observation classCode="OBS" moodCode="EVN"><code code="29308-4" codeSystem="' + OID.loinc + '" displayName="Diagnosis"/>');
      x.push('        <effectiveTime><low value="' + d8(d.start) + '"/>' + (d.end ? '<high value="' + d8(d.end) + '"/>' : '') + '</effectiveTime>');
      x.push('        <value xsi:type="CD" code="' + d.code + '" codeSystem="' + OID[d.sys] + '" displayName="' + esc(d.name) + '"/></observation></entry>');
    });
    p.labs.forEach(function (l) {
      x.push('      <entry><observation classCode="OBS" moodCode="EVN"><code code="4548-4" codeSystem="' + OID.loinc + '" displayName="Hemoglobin A1c"/>');
      x.push('        <effectiveTime value="' + d8(l.date) + '"/><value xsi:type="PQ" value="' + l.v + '" unit="%"/></observation></entry>');
    });
    p.bps.forEach(function (b) {
      x.push('      <entry><organizer classCode="CLUSTER" moodCode="EVN"><effectiveTime value="' + d8(b.date) + '"/>');
      x.push('        <component><observation classCode="OBS" moodCode="EVN"><code code="8480-6" codeSystem="' + OID.loinc + '" displayName="Systolic blood pressure"/>');
      x.push('          <effectiveTime value="' + d8(b.date) + '"/><value xsi:type="PQ" value="' + b.sys + '" unit="mm[Hg]"/></observation></component>');
      x.push('        <component><observation classCode="OBS" moodCode="EVN"><code code="8462-4" codeSystem="' + OID.loinc + '" displayName="Diastolic blood pressure"/>');
      x.push('          <effectiveTime value="' + d8(b.date) + '"/><value xsi:type="PQ" value="' + b.dia + '" unit="mm[Hg]"/></observation></component>');
      x.push('      </organizer></entry>');
    });
    x.push('    </section></component>');
    x.push('  </structuredBody></component>');
    x.push('</ClinicalDocument>');
    return x.join('\n');
  }

  var VISIT = { code: '99214', name: 'Office visit, established patient' };
  var T2 = { sys: 'icd10', code: 'E11.9', name: 'Type 2 diabetes mellitus without complications' };
  var HTN = { sys: 'icd10', code: 'I10', name: 'Essential (primary) hypertension' };

  var PATIENTS = {
    ccda: { id: 'C-1001', given: 'Maria', family: 'Sample', gender: 'F', dob: '1962-04-18', qrda: false,
      enc: [{ code: VISIT.code, name: VISIT.name, date: '2026-03-10' }, { code: VISIT.code, name: VISIT.name, date: '2026-09-05' }],
      dx: [{ sys: T2.sys, code: T2.code, name: T2.name, start: '2019-06-01' }, { sys: HTN.sys, code: HTN.code, name: HTN.name, start: '2018-02-01' }],
      labs: [{ date: '2026-03-10', v: 9.4 }, { date: '2026-09-05', v: 8.2 }],
      bps: [{ date: '2026-03-10', sys: 148, dia: 92 }, { date: '2026-09-05', sys: 132, dia: 84 }] },
    qrda: [
      { id: 'Q-2001', given: 'Ava', family: 'Controlled', gender: 'F', dob: '1968-02-11', qrda: true,
        enc: [{ code: VISIT.code, name: VISIT.name, date: '2026-04-02' }],
        dx: [{ sys: T2.sys, code: T2.code, name: T2.name, start: '2020-01-01' }, { sys: HTN.sys, code: HTN.code, name: HTN.name, start: '2019-01-01' }],
        labs: [{ date: '2026-04-02', v: 7.1 }], bps: [{ date: '2026-04-02', sys: 126, dia: 78 }] },
      { id: 'Q-2002', given: 'Ben', family: 'Uncontrolled', gender: 'M', dob: '1961-09-30', qrda: true,
        enc: [{ code: VISIT.code, name: VISIT.name, date: '2026-05-14' }],
        dx: [{ sys: T2.sys, code: T2.code, name: T2.name, start: '2016-01-01' }, { sys: HTN.sys, code: HTN.code, name: HTN.name, start: '2015-01-01' }],
        labs: [{ date: '2026-05-14', v: 10.2 }], bps: [{ date: '2026-05-14', sys: 152, dia: 94 }] },
      { id: 'Q-2003', given: 'Cara', family: 'Nolab', gender: 'F', dob: '1955-07-22', qrda: true,
        enc: [{ code: VISIT.code, name: VISIT.name, date: '2026-06-20' }],
        dx: [{ sys: T2.sys, code: T2.code, name: T2.name, start: '2014-01-01' }, { sys: HTN.sys, code: HTN.code, name: HTN.name, start: '2012-01-01' }],
        labs: [], bps: [{ date: '2026-06-20', sys: 146, dia: 92 }] }
    ]
  };

  var out = {
    ccda: build(PATIENTS.ccda),
    qrda: PATIENTS.qrda.map(function (p) { return { name: p.given + ' ' + p.family, file: 'qrda-i-sample-' + p.given.toLowerCase() + '.xml', xml: build(p) }; }),
    ccdaFile: 'ccda-sample-maria.xml'
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = out;
  else g.HQM_SAMPLES = out;
})(typeof window !== 'undefined' ? window : globalThis);
