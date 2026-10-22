/* Voice: which French voice speaks, and the reader's opt-ins.
   - A voice installed on the device first. An online voice (« Google français »… — the browser sends the
     text to its provider) only if the cahier opted in on /fr/voix/ (setting `onlineVoice`).
   - Header toggle: read exercise statements aloud automatically (off by default). GS pages and voice
     exercises (dictées) speak regardless; the 🔊 next to a title always works. */
import { localStore } from './store.js';

const KEY = 'voice';

const onlineVoiceAllowed = () => localStore.getSettings().onlineVoice === true;

/** The French voice to use, or null: installed first, online only when allowed */
export function frenchVoice(allowOnline = onlineVoiceAllowed()) {
  const synth = window.speechSynthesis;
  const fr = (synth ? synth.getVoices() : []).filter((v) => /^fr\b/i.test(v.lang));
  const best = (list) => list.find((v) => /^fr[-_]fr$/i.test(v.lang)) || list[0] || null;
  return best(fr.filter((v) => v.localService)) || (allowOnline ? best(fr.filter((v) => !v.localService)) : null);
}

export function readVoicePref() {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false; // storage blocked (private mode): off
  }
}

export function voiceToggle() {
  return {
    on: readVoicePref(),
    toggle() {
      this.on = !this.on;
      try {
        localStorage.setItem(KEY, this.on ? 'on' : 'off');
      } catch {
        // storage blocked: the choice lasts for this page only
      }
      window.dispatchEvent(new CustomEvent('voice-pref', { detail: this.on }));
    },
  };
}

/* /fr/voix/ — the French voices found on this device + a test button (voice-status.njk), and the online
   opt-in kept in the cahier (voix-en-ligne.njk) */
export function voiceSettings() {
  return {
    voices: [],
    online: onlineVoiceAllowed(),
    cahier: localStore.getUser(),
    init() {
      const synth = window.speechSynthesis;
      const list = () => {
        this.voices = (synth ? synth.getVoices() : [])
          .filter((v) => /^fr\b/i.test(v.lang))
          .map((v) => ({ name: v.name, local: v.localService }));
      };
      list();
      if (synth && synth.addEventListener) synth.addEventListener('voiceschanged', list);
    },
    get hasLocal() {
      return this.voices.some((v) => v.local);
    },
    get hasOnline() {
      return this.voices.some((v) => !v.local);
    },
    save() {
      localStore.setSetting('onlineVoice', this.online);
      window.dispatchEvent(new CustomEvent('online-voice', { detail: this.online })); // the status box above
    },
    // The voice the exercises would use now
    get current() {
      const v = this.voices.find((x) => x.local) || (this.online ? this.voices.find((x) => !x.local) : null);
      return v ? v.name + (v.local ? ' (installée)' : ' (en ligne)') : '';
    },
    test() {
      const voice = frenchVoice(this.online);
      if (!voice) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance('Bonjour ! Je suis la voix du Cahier de Mélimée. Quatre-vingt-dix-sept.');
      u.voice = voice;
      u.lang = voice.lang;
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    },
  };
}
