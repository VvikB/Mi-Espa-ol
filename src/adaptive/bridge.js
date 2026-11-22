/* R7 additive adapter for existing R6 StateStore progress.
   No automatic conversion of old assessment events; no double counting.
   The extra namespace is preserved by R6 snapshot/backup validation.
*/
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MiAdaptiveBridge = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const KEY = 'miAdaptive7';
  const fresh = () => ({schema:1, events:[], availableMinutes:15, createdAt:Date.now()});
  function read(progress) {
    const raw = progress && progress[KEY];
    if (raw === undefined) return fresh();
    if (!raw || raw.schema !== 1 || !Array.isArray(raw.events) || raw.events.length > 3000 ||
        !Number.isFinite(raw.availableMinutes) || raw.availableMinutes < 0 || raw.availableMinutes > 180)
      throw Error('R7: damaged or unsupported adaptive data; existing progress unchanged');
    const ids = new Set();
    for (const e of raw.events) {
      if (!e || typeof e.id !== 'string' || ids.has(e.id) || !/^\d{4}-\d{2}-\d{2}$/.test(e.day))
        throw Error('R7: invalid or duplicate event');
      ids.add(e.id);
    }
    return {schema:1, events:raw.events.slice(), availableMinutes:raw.availableMinutes, createdAt:raw.createdAt};
  }
  function write(progress, adaptive) {
    const existing = read(progress || {});
    const next = {...existing, ...adaptive};
    // Re-validate the complete dataset before returning a non-mutating copy.
    read({[KEY]:next});
    return {...progress, [KEY]:next};
  }
  function add(progress, event, core) {
    const previous = read(progress), journal = core.addEvent(previous.events,event);
    return write(progress,{events:journal});
  }
  function setMinutes(progress, minutes) {
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 180) throw Error('Minutes must be 0-180');
    return write(progress,{availableMinutes:minutes});
  }
  function dueFromReviews(progress, day) {
    const reviews = progress && progress.miJourney3 && progress.miJourney3.lessonReviews || {};
    const due = [];
    for (const [id, review] of Object.entries(reviews)) {
      if (!review || !Number.isFinite(review.next) || !id) continue;
      const dueDay = new Date(review.next).toISOString().slice(0,10);
      if (dueDay <= day) due.push({id, dueDay, estimatedMinutes:3});
    }
    return due.sort((a,b)=>a.dueDay.localeCompare(b.dueDay)||a.id.localeCompare(b.id));
  }
  return Object.freeze({KEY,read,write,add,setMinutes,dueFromReviews});
});
