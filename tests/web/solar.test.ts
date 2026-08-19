import { describe, expect, it } from 'vitest';
import {
  dayWindow,
  isAfterDark,
  msUntilNextChange,
  sunTimes,
  FALLBACK_SUNRISE_H,
  FALLBACK_SUNSET_H,
} from '../../apps/web/src/lib/theme/solar';

// Reference times from NOAA, in UTC. The algorithm is accurate to about a
// minute, so allow a few either way rather than pinning exact seconds.
const within = (actual: Date | null, expectedISO: string, minutes = 4) => {
  expect(actual).not.toBeNull();
  const diff = Math.abs((actual as Date).getTime() - new Date(expectedISO).getTime());
  expect(diff / 60000).toBeLessThan(minutes);
};

describe('sunTimes', () => {
  it('matches known sunrise and sunset in London at the solstices', () => {
    const june = sunTimes(new Date('2026-06-21T12:00:00Z'), 51.5074, -0.1278);
    within(june.sunrise, '2026-06-21T03:43:00Z');
    within(june.sunset, '2026-06-21T20:21:00Z');

    const dec = sunTimes(new Date('2026-12-21T12:00:00Z'), 51.5074, -0.1278);
    within(dec.sunrise, '2026-12-21T08:03:00Z');
    within(dec.sunset, '2026-12-21T15:53:00Z');
  });

  it('handles the southern hemisphere, where the solstices swap', () => {
    const syd = sunTimes(new Date('2026-06-21T02:00:00Z'), -33.8688, 151.2093);
    // Sydney's shortest day: about 07:00 to 16:54 local (UTC+10).
    within(syd.sunrise, '2026-06-20T21:00:00Z', 6);
    within(syd.sunset, '2026-06-21T06:54:00Z', 6);
  });

  it('reports polar day and night above the Arctic circle', () => {
    expect(sunTimes(new Date('2026-06-21T12:00:00Z'), 78.2, 15.6).polar).toBe(true);
    expect(sunTimes(new Date('2026-12-21T12:00:00Z'), 78.2, 15.6).polar).toBe(true);
  });

  it('always puts sunrise before sunset', () => {
    for (const lat of [-45, -20, 0, 20, 45, 60]) {
      for (const month of [0, 3, 6, 9]) {
        const t = sunTimes(new Date(Date.UTC(2026, month, 15, 12)), lat, 0);
        if (t.polar) continue;
        expect(t.sunrise!.getTime()).toBeLessThan(t.sunset!.getTime());
      }
    }
  });
});

describe('dayWindow', () => {
  it('falls back to fixed hours with no location', () => {
    const w = dayWindow(new Date('2026-08-19T12:00:00Z'), null);
    expect(w.estimated).toBe(true);
    expect(w.sunrise.getHours()).toBe(FALLBACK_SUNRISE_H);
    expect(w.sunset.getHours()).toBe(FALLBACK_SUNSET_H);
  });

  it('falls back where the sun does not set, rather than returning nothing', () => {
    const w = dayWindow(new Date('2026-06-21T12:00:00Z'), { lat: 78.2, lon: 15.6 });
    expect(w.estimated).toBe(true);
    expect(w.sunrise).toBeInstanceOf(Date);
  });

  it('uses real solar times when it has a location', () => {
    expect(dayWindow(new Date('2026-08-19T12:00:00Z'), { lat: 51.5, lon: -0.13 }).estimated).toBe(false);
  });
});

describe('isAfterDark', () => {
  const london = { lat: 51.5074, lon: -0.1278 };

  it('is light at midday and dark at midnight', () => {
    expect(isAfterDark(new Date('2026-06-21T12:00:00Z'), london)).toBe(false);
    expect(isAfterDark(new Date('2026-06-21T23:30:00Z'), london)).toBe(true);
  });

  it('turns over at sunset, not at a fixed hour', () => {
    // 21:00 UTC in London: after the June sunset (20:21) but well before the
    // 7pm fallback would have called it, which is the whole point of the maths.
    expect(isAfterDark(new Date('2026-06-21T20:00:00Z'), london)).toBe(false);
    expect(isAfterDark(new Date('2026-06-21T21:00:00Z'), london)).toBe(true);
  });

  it('is dark before sunrise, not only after sunset', () => {
    expect(isAfterDark(new Date('2026-12-21T07:00:00Z'), london)).toBe(true);
    expect(isAfterDark(new Date('2026-12-21T12:00:00Z'), london)).toBe(false);
  });
});

describe('msUntilNextChange', () => {
  const london = { lat: 51.5074, lon: -0.1278 };

  it('never schedules in the past and never sleeps more than six hours', () => {
    for (const h of [0, 4, 8, 12, 16, 20, 23]) {
      const ms = msUntilNextChange(new Date(`2026-08-19T${String(h).padStart(2, '0')}:00:00Z`), london);
      expect(ms).toBeGreaterThan(0);
      expect(ms).toBeLessThanOrEqual(6 * 60 * 60 * 1000);
    }
  });

  it('works without a location too', () => {
    const ms = msUntilNextChange(new Date('2026-08-19T12:00:00Z'), null);
    expect(ms).toBeGreaterThan(0);
  });
});
