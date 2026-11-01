/* Voice speed — a setting of the device, chosen on the « La voix du Cahier » page (/fr/voix/).
   The prerecorded clips are played slower at the same pitch (preservesPitch). Unreadable storage
   (private browsing, blocked site data) → normal speed. */
const KEY = 'voiceSpeed';
const SLOW = 0.8; // below ~0.7 the browser's time-stretching starts to sound robotic

export function voiceRate() {
  try {
    return localStorage.getItem(KEY) === 'slow' ? SLOW : 1;
  } catch {
    return 1;
  }
}

// Plays a clip at the chosen speed
export function applyVoiceRate(audio) {
  audio.playbackRate = voiceRate();
  audio.preservesPitch = true;
}

// Alpine component of the voix page: the setting, and its sample clips played at the chosen speed
export function voiceSpeed() {
  return {
    slow: voiceRate() !== 1,
    init() {
      for (const audio of this.$el.querySelectorAll('audio'))
        audio.addEventListener('play', () => applyVoiceRate(audio));
    },
    choose(slow) {
      this.slow = slow;
      try {
        if (slow) localStorage.setItem(KEY, 'slow');
        else localStorage.removeItem(KEY);
      } catch {
        /* not stored: normal speed next time */
      }
    },
  };
}
