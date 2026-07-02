import { describe, expect, it } from 'vitest';
import { isNewerVersion } from '../../apps/web/src/lib/whatsNew';

describe('isNewerVersion', () => {
  it('treats a missing seen-version as older than anything', () => {
    expect(isNewerVersion('1.0.0', null)).toBe(true);
    expect(isNewerVersion('1.0.0', '')).toBe(true);
  });

  it('compares patch, minor, and major components', () => {
    expect(isNewerVersion('1.0.1', '1.0.0')).toBe(true);
    expect(isNewerVersion('1.1.0', '1.0.9')).toBe(true);
    expect(isNewerVersion('2.0.0', '1.9.9')).toBe(true);
  });

  it('is false for equal or older versions', () => {
    expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false);
    expect(isNewerVersion('1.0.0', '1.0.1')).toBe(false);
    expect(isNewerVersion('1.2.3', '2.0.0')).toBe(false);
  });

  it('handles differing component counts', () => {
    expect(isNewerVersion('1.0.1', '1.0')).toBe(true);
    expect(isNewerVersion('1.0', '1.0.0')).toBe(false);
  });

  it('treats non-numeric components as zero', () => {
    expect(isNewerVersion('1.0.0', '1.0.x')).toBe(false); // x -> 0, so equal
    expect(isNewerVersion('1.0.1', '1.0.x')).toBe(true);
  });
});
