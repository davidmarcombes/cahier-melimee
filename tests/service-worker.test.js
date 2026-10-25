import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';

describe('generated service worker media requests', () => {
  let siteDir;

  beforeEach(() => {
    siteDir = mkdtempSync(path.join(tmpdir(), 'melimee-sw-'));
    mkdirSync(path.join(siteDir, 'assets', 'js'), { recursive: true });
    execFileSync(process.execPath, ['scripts/generate-sw.js'], {
      env: { ...process.env, SITE_OUT: siteDir },
      stdio: 'ignore',
    });
  });

  afterEach(() => {
    rmSync(siteDir, { recursive: true, force: true });
  });

  it('fetches range requests from network and removes any cached partial response', async () => {
    const handlers = {};
    const cache = {
      delete: vi.fn(async () => true),
      match: vi.fn(async () => new Response('partial cached data', { status: 206 })),
    };
    const caches = { open: vi.fn(async () => cache) };
    const fetch = vi.fn(async () => new Response('partial network data', { status: 206 }));
    const self = {
      location: { origin: 'http://localhost' },
      addEventListener: (type, handler) => {
        handlers[type] = handler;
      },
    };
    const source = readFileSync(path.join(siteDir, 'sw.js'), 'utf8');

    vm.runInNewContext(source, {
      self,
      caches,
      fetch,
      URL,
      Response,
      Headers,
      CompressionStream,
      DecompressionStream,
    });

    let responsePromise;
    handlers.fetch({
      request: new Request('http://localhost/assets/audio/voice-pilot/sample.ogg', {
        headers: { Range: 'bytes=0-' },
      }),
      respondWith: (promise) => {
        responsePromise = promise;
      },
      waitUntil: vi.fn(),
    });

    const response = await responsePromise;
    expect(response.status).toBe(206);
    expect(await response.text()).toBe('partial network data');
    expect(cache.delete).toHaveBeenCalledWith('/assets/audio/voice-pilot/sample.ogg');
    expect(cache.match).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledOnce();
  });
});
