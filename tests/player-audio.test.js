import { afterEach, describe, expect, it, vi } from 'vitest';
import { seriesPlayer } from '../src/assets/js/modules/player.js';

class MockAudio {
  static instances = [];

  constructor(src) {
    this.src = src;
    this.listeners = {};
    MockAudio.instances.push(this);
  }

  addEventListener(name, listener) {
    this.listeners[name] = listener;
  }

  play() {
    return Promise.resolve();
  }

  pause() {}

  emit(name) {
    this.listeners[name]?.();
  }
}

describe('prerecorded player audio', () => {
  afterEach(() => {
    MockAudio.instances = [];
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('adds a short pause between composed audio clips', () => {
    vi.useFakeTimers();
    vi.stubGlobal('window', { __pathPrefix: '/' });
    vi.stubGlobal('Audio', MockAudio);
    const player = seriesPlayer([], '');

    player.speak('un million', ['nombres/1.ogg', 'unites/million.ogg']);
    MockAudio.instances[0].emit('ended');

    expect(MockAudio.instances).toHaveLength(1);
    vi.advanceTimersByTime(179);
    expect(MockAudio.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(MockAudio.instances).toHaveLength(2);
  });

  it('leaves a longer pause between counting and its question', () => {
    vi.useFakeTimers();
    vi.stubGlobal('window', { __pathPrefix: '/' });
    vi.stubGlobal('Audio', MockAudio);
    const player = seriesPlayer(
      [
        {
          say: 'On compte : quatorze, quinze, seize… Quel nombre vient après ?',
          voiceAudio: ['count.ogg', 'question.ogg'],
        },
      ],
      ''
    );

    player.sayCurrent();
    MockAudio.instances[0].emit('ended');

    expect(MockAudio.instances).toHaveLength(1);
    vi.advanceTimersByTime(499);
    expect(MockAudio.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(MockAudio.instances).toHaveLength(2);
  });

  it('plays composed number clips in sequence', () => {
    vi.useFakeTimers();
    vi.stubGlobal('window', { __pathPrefix: '/prefix/' });
    vi.stubGlobal('Audio', MockAudio);
    const player = seriesPlayer([], '');

    player.speak('un million deux cent mille', [
      'nombres/1.ogg',
      'unites/million.ogg',
      'nombres/200.ogg',
      'unites/mille.ogg',
    ]);

    expect(MockAudio.instances.map((audio) => audio.src)).toEqual(['/prefix/assets/audio/voice-pilot/nombres/1.ogg']);
    MockAudio.instances[0].emit('ended');
    vi.advanceTimersByTime(180);
    MockAudio.instances[1].emit('ended');
    vi.advanceTimersByTime(180);
    MockAudio.instances[2].emit('ended');
    vi.advanceTimersByTime(180);
    expect(MockAudio.instances.map((audio) => audio.src)).toEqual([
      '/prefix/assets/audio/voice-pilot/nombres/1.ogg',
      '/prefix/assets/audio/voice-pilot/unites/million.ogg',
      '/prefix/assets/audio/voice-pilot/nombres/200.ogg',
      '/prefix/assets/audio/voice-pilot/unites/mille.ogg',
    ]);
  });

  it('reports missing clips without invoking browser speech synthesis', () => {
    vi.stubGlobal('window', {
      __pathPrefix: '/',
      get speechSynthesis() {
        throw new Error('Browser speech must not be used');
      },
    });
    vi.stubGlobal('Audio', MockAudio);
    const player = seriesPlayer([], '');
    player.speak('bonjour', 'instructions/missing.ogg');
    MockAudio.instances[0].emit('error');

    expect(player.voiceMissing).toBe(true);
  });
});
