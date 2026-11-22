/* Mi Español R7: portable learning calculations. No external state mutation.
 * Works in classic browser script and Node; future Expo adapter can import it.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MiAdaptiveCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const skills = ['vocabulary', 'grammar', 'reading', 'listening', 'writing', 'speaking'];
  const isDay = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && !Number.isNaN(Date.parse(x + 'T00:00:00Z'));
  const nonneg = n => Number.isFinite(n) ? Math.max(0, n) : 0;
  const count = n => Math.floor(nonneg(n));
  function normalizeEvent(input) {
    if (!input || !isDay(input.day)) throw new Error('Study event requires YYYY-MM-DD day');
    const type = input.skill || 'vocabulary';
    if (!skills.includes(type)) throw new Error('Unknown skill');
    if (typeof input.id !== 'string' || !input.id.trim()) throw new Error('Event needs a stable id');
    return {
      id: input.id, day: input.day, skill: type,
      minutes: nonneg(input.minutes), words: count(input.words),
      attempted: count(input.attempted), correct: count(input.correct),
      sourceId: typeof input.sourceId === 'string' ? input.sourceId : null,
      objective: input.objective === true,
      // Speaking/writing self-assessment cannot become objective success.
      selfAssessed: input.selfAssessed === true
    };
  }
  function addEvent(journal, value) {
    const entry = normalizeEvent(value), events = Array.isArray(journal) ? journal.slice() : [];
    if (events.some(e => e.id === entry.id)) return events;
    if (entry.correct > entry.attempted) throw new Error('Correct cannot exceed attempted');
    return events.concat([entry]);
  }
  function weekSummary(journal, endDay) {
    if (!isDay(endDay)) throw new Error('Invalid report day');
    const end = Date.parse(endDay + 'T00:00:00Z');
    const start = end - 6 * 86400000;
    const events = (Array.isArray(journal) ? journal : []).filter(e => isDay(e.day) && Date.parse(e.day + 'T00:00:00Z') >= start && Date.parse(e.day + 'T00:00:00Z') <= end);
    const out = {days: new Set(), minutes: 0, wordsPracticed: 0, attempted: 0, correct: 0, bySkill: {}};
    for (const event of events) {
      out.days.add(event.day);
      out.minutes += nonneg(event.minutes);
      out.wordsPracticed += count(event.words); // practice count, NOT unique words mastered
      const objective = event.objective === true && event.selfAssessed !== true;
      if (objective) { out.attempted += count(event.attempted); out.correct += count(event.correct); }
      const key = skills.includes(event.skill) ? event.skill : 'other';
      const stat = out.bySkill[key] || (out.bySkill[key] = {minutes: 0, attempted: 0, correct: 0});
      stat.minutes += nonneg(event.minutes);
      if (objective) { stat.attempted += count(event.attempted); stat.correct += count(event.correct); }
    }
    return {startDay: new Date(start).toISOString().slice(0,10), endDay, activeDays: out.days.size, minutes: out.minutes, wordsPracticed: out.wordsPracticed, attempted: out.attempted, correct: out.correct, bySkill: out.bySkill};
  }
  function dailyPlan(config) {
    const day = config && config.day;
    if (!isDay(day)) throw new Error('Daily plan requires day');
    const available = Math.min(180, nonneg(config.availableMinutes === undefined ? 15 : config.availableMinutes));
    const due = (Array.isArray(config.due) ? config.due : []).filter(x => x && typeof x.id === 'string' && isDay(x.dueDay) && x.dueDay <= day).slice().sort((a,b) => a.dueDay.localeCompare(b.dueDay) || a.id.localeCompare(b.id));
    const assignments = [];
    let remaining = available;
    for (const item of due) {
      if (remaining <= 0) break;
      const duration = Math.max(1, Math.min(5, nonneg(item.estimatedMinutes || 2)));
      if (duration > remaining) break;
      assignments.push({kind: 'review', id: item.id, estimatedMinutes: duration});
      remaining -= duration;
    }
    if (remaining >= 5 && config.nextLessonId) assignments.push({kind:'lesson', id: config.nextLessonId, estimatedMinutes: remaining});
    return {day, availableMinutes: available, assignedMinutes: available - remaining + (remaining >= 5 && config.nextLessonId ? remaining : 0), assignments, deferredReviews: Math.max(0, due.length - assignments.filter(a => a.kind === 'review').length)};
  }

  // Reporting is based on declared work, not inferred mastery. Every day is local YYYY-MM-DD.
  function activityCalendar(journal, endDay, days=28) {
    if (!isDay(endDay) || !Number.isInteger(days) || days<1 || days>90) throw Error('Invalid calendar window');
    const end=Date.parse(endDay+'T00:00:00Z'),aggregated=new Map();
    for (const e of Array.isArray(journal)?journal:[]) {
      if(!isDay(e.day))continue;
      const cell=aggregated.get(e.day)||{minutes:0,wordsPracticed:0,activities:0};
      cell.minutes+=nonneg(e.minutes);cell.wordsPracticed+=count(e.words);cell.activities++;
      aggregated.set(e.day,cell);
    }
    return Array.from({length:days},(_,i)=>{
      const day=new Date(end-(days-1-i)*86400000).toISOString().slice(0,10);
      return {day,...(aggregated.get(day)||{minutes:0,wordsPracticed:0,activities:0})};
    });
  }
  function skillEvidence(journal, endDay) {
    if(!isDay(endDay))throw Error('Invalid report day');
    const min=Date.parse(endDay+'T00:00:00Z')-27*86400000;
    const data=skills.map(id=>({id,minutes:0,attempted:0,correct:0,selfAssessed:0,activeDays:0}));
    const seen=new Map(skills.map(id=>[id,new Set()]));
    for (const e of Array.isArray(journal)?journal:[]) {
      if(!skills.includes(e.skill)||!isDay(e.day))continue;
      const d=Date.parse(e.day+'T00:00:00Z');
      if(d<min||d>Date.parse(endDay+'T00:00:00Z'))continue;
      const x=data[skills.indexOf(e.skill)];x.minutes+=nonneg(e.minutes);
      seen.get(e.skill).add(e.day);
      if(e.selfAssessed)x.selfAssessed++;
      else if(e.objective===true){x.attempted+=count(e.attempted);x.correct+=count(e.correct);}
    }
    return data.map(x=>({...x,activeDays:seen.get(x.id).size,
      recommendation:x.attempted>=5&&x.correct/x.attempted<.7?'repeat_errors':
      x.activeDays===0?'try_practice':'continue'}));
  }
  return Object.freeze({normalizeEvent, addEvent, weekSummary, dailyPlan, activityCalendar, skillEvidence});
});
