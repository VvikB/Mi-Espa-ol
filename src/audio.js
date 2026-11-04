/* New restoration module R1. Device audio availability is not CEFR evidence. */
const AudioService = (() => {
  const listeners = new Set();
  let sequence = 0;
  function publish(type, text, detail = '') {
    const event = {type, text, detail};
    listeners.forEach(listener => listener(event));
    const messages = {queued:'Запускаю испанский голос…',started:'Воспроизведение…',ended:'Прослушивание завершено',cancelled:'Воспроизведение остановлено',unavailable:'Испанский голос недоступен. Установите голос на устройстве или продолжите без звука.',error:'Не удалось воспроизвести звук. Проверьте громкость и испанский голос устройства.'};
    document.querySelectorAll('#speech-status, #recovery-audio-status').forEach(el => { el.textContent = messages[type] || detail; });
  }
  function voices() {
    try { return window.speechSynthesis?.getVoices?.().filter(v => /^es(?:-|$)/i.test(v.lang)) || []; }
    catch (_) { return []; }
  }
  function cancel() {
    sequence++;
    try { window.speechSynthesis?.cancel(); } catch (_) {}
    publish('cancelled', '');
  }
  function speak(text, rate = .85) {
    text = String(text ?? '').trim();
    if (!text) return false;
    const available = voices();
    if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance !== 'function' || !available.length) {
      publish('unavailable', text); return false;
    }
    const request = ++sequence;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = available.find(v => v.lang.toLowerCase() === 'es-es') || available[0];
      utterance.lang = utterance.voice.lang;
      utterance.rate = Math.max(.6, Math.min(1.35, Number(rate) || .85));
      for (const type of ['start', 'end', 'error']) utterance['on' + type] = e => {
        if (request !== sequence) return;
        publish(({start:'started',end:'ended',error:'error'})[type], text, e?.error || '');
      };
      publish('queued', text);
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (error) { publish('error', text, error.message); return false; }
  }
  window.speechSynthesis?.addEventListener?.('voiceschanged', () => publish('voiceAvailable', '', String(voices().length)));
  return {speak, cancel, voices, subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }};
})();
