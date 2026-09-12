/* ---------------------------------------------------------------
   ETAGE 17 — Speicherschicht
   Hält den Zustand der Etage fest. Drei Ebenen, in dieser Reihenfolge:
     1. Artefakt-Datenbank der Laufzeit (geteilt, überdauert Sitzungen)
     2. Speicher des Browsers (nur dieses Gerät)
     3. gar nichts — die Seite läuft trotzdem
   --------------------------------------------------------------- */
window.E17 = window.E17 || {};
(function (F) {
'use strict';

const DOC_STATE = 'etage/zustand';      /* gerade Segmentzahl = Dokument */
const DOC_LEASE = 'etage/fuehrung';     /* Schreibrecht, per Kurzzeitsperre */
const LOCAL_KEY = 'etage17.zustand';
const WAIT_MS = 3500;                   /* so lange warten wir auf die Laufzeit */
const LEASE_MS = 90000;

let db = null;
let kind = 'none';
const holder = 'tab-' + Math.random().toString(36).slice(2, 10);

/* Die Laufzeit meldet sich erst später und manchmal gar nicht. */
function reachDb() {
  return new Promise(function (done) {
    let fertig = false;
    const schluss = function (v) { if (!fertig) { fertig = true; done(v); } };
    setTimeout(function () { schluss(null); }, WAIT_MS);
    try {
      if (!window.claude || typeof window.claude.use !== 'function') return schluss(null);
      window.claude.use('db').then(schluss, function () { schluss(null); });
    } catch (e) { schluss(null); }
  });
}

function localOk() {
  try {
    localStorage.setItem('etage17.probe', '1');
    localStorage.removeItem('etage17.probe');
    return true;
  } catch (e) { return false; }
}

F.store = {
  kind: function () { return kind; },

  label: function () {
    return kind === 'db' ? 'Artefakt-Datenbank'
         : kind === 'local' ? 'Browser-Speicher'
         : 'kein Speicher';
  },

  init: function () {
    return reachDb().then(function (handle) {
      db = handle;
      kind = db ? 'db' : (localOk() ? 'local' : 'none');
      return kind;
    });
  },

  load: function () {
    if (kind === 'db') {
      return db.doc(DOC_STATE).get().then(function (snap) {
        return snap.exists ? snap.data() : null;
      }, function () { return null; });
    }
    if (kind === 'local') {
      try {
        const raw = localStorage.getItem(LOCAL_KEY);
        return Promise.resolve(raw ? JSON.parse(raw) : null);
      } catch (e) { return Promise.resolve(null); }
    }
    return Promise.resolve(null);
  },

  save: function (doc) {
    if (kind === 'db') {
      return db.doc(DOC_STATE).set(doc).then(function () { return true; }, function (e) {
        /* Endgültige Absagen (kein Zugriff, Recht entzogen) — auf den Browser ausweichen,
           damit der Stand nicht still verloren geht. Vorübergehende Fehler ignorieren. */
        const endgueltig = e && (e.code === 'not_granted' || e.code === 'capability_disabled' ||
                                 e.code === 'capability_removed' || e.code === 'revoked' ||
                                 e.code === 'invalid_argument');
        if (endgueltig && localOk()) { db = null; kind = 'local'; return F.store.save(doc); }
        return false;
      });
    }
    if (kind === 'local') {
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(doc)); return Promise.resolve(true); }
      catch (e) { return Promise.resolve(false); }
    }
    return Promise.resolve(false);
  },

  clear: function () {
    if (kind === 'db') return db.doc(DOC_STATE).delete().then(function () { return true; },
                                                             function () { return false; });
    if (kind === 'local') { try { localStorage.removeItem(LOCAL_KEY); } catch (e) {} }
    return Promise.resolve(true);
  },

  /* Nur ein Tab schreibt. Ohne Datenbank schreibt immer der eigene. */
  claim: function () {
    if (kind !== 'db') return Promise.resolve(kind === 'local');
    return db.doc(DOC_LEASE).acquire({ holder: holder, ttlMs: LEASE_MS }).then(
      function (r) { return !!r.acquired; },
      function () { return false; });
  }
};

})(window.E17);
