// Sunrise and sunset from the NOAA solar position algorithm. Pure arithmetic —
// no network call, no dependency, no API key — so following the sun costs
// nothing at runtime and works offline, which matters for a PWA people open
// first thing in the morning and last thing at night.

const RAD = Math.PI / 180;
const OBLIQUITY = 23.4397; // Earth's axial tilt
/** Standard sunrise/sunset: the sun's centre 0.833° below the horizon, which
 *  allows for atmospheric refraction and the sun's own radius. */
const ZENITH_OFFSET = -0.833;
const J2000 = 2451545.0;

const toJulian = (d: Date) => d.valueOf() / 86400000 + 2440587.5;
const fromJulian = (j: number) => new Date((j - 2440587.5) * 86400000);

export interface SunTimes {
  sunrise: Date | null;
  sunset: Date | null;
  /** True where the sun never rises or never sets on this date — inside the
   *  polar circles it happens for weeks at a time, and there is no sunset to
   *  follow. Callers fall back to fixed hours. */
  polar: boolean;
}

export function sunTimes(date: Date, lat: number, lon: number): SunTimes {
  const n = Math.round(toJulian(date) - J2000 - 0.0009 + lon / 360);
  const jStar = J2000 + 0.0009 - lon / 360 + n;
  const M = (357.5291 + 0.98560028 * (jStar - J2000)) % 360;
  const Mr = M * RAD;
  const C = 1.9148 * Math.sin(Mr) + 0.02 * Math.sin(2 * Mr) + 0.0003 * Math.sin(3 * Mr);
  const lambda = ((M + C + 180 + 102.9372) % 360) * RAD;
  const jTransit = jStar + 0.0053 * Math.sin(Mr) - 0.0069 * Math.sin(2 * lambda);
  const decl = Math.asin(Math.sin(lambda) * Math.sin(OBLIQUITY * RAD));
  const cosOmega =
    (Math.sin(ZENITH_OFFSET * RAD) - Math.sin(lat * RAD) * Math.sin(decl)) /
    (Math.cos(lat * RAD) * Math.cos(decl));
  if (cosOmega > 1 || cosOmega < -1) return { sunrise: null, sunset: null, polar: true };
  const omega = Math.acos(cosOmega) / RAD;
  return {
    sunrise: fromJulian(jTransit - omega / 360),
    sunset: fromJulian(jTransit + omega / 360),
    polar: false,
  };
}

/** Fixed hours for when there is no location, or the sun does not set here
 *  today. Deliberately unremarkable: 7am and 7pm. */
export const FALLBACK_SUNRISE_H = 7;
export const FALLBACK_SUNSET_H = 19;

function atHour(date: Date, hour: number): Date {
  const d = new Date(date);
  d.setHours(hour, 0, 0, 0);
  return d;
}

export interface DayWindow {
  sunrise: Date;
  sunset: Date;
  /** Whether these came from the real solar position or the fixed fallback. */
  estimated: boolean;
}

export function dayWindow(now: Date, coords: { lat: number; lon: number } | null): DayWindow {
  if (coords) {
    const t = sunTimes(now, coords.lat, coords.lon);
    if (!t.polar && t.sunrise && t.sunset) {
      return { sunrise: t.sunrise, sunset: t.sunset, estimated: false };
    }
  }
  return {
    sunrise: atHour(now, FALLBACK_SUNRISE_H),
    sunset: atHour(now, FALLBACK_SUNSET_H),
    estimated: true,
  };
}

/** Dark after sunset, light from sunrise until sunset. */
export function isAfterDark(now: Date, coords: { lat: number; lon: number } | null): boolean {
  const { sunrise, sunset } = dayWindow(now, coords);
  return now < sunrise || now >= sunset;
}

/** When the light next changes, so the app can sleep until then rather than
 *  poll. Never further out than six hours, so a device that was suspended
 *  across a transition still catches up promptly. */
export function msUntilNextChange(
  now: Date,
  coords: { lat: number; lon: number } | null,
): number {
  const { sunrise, sunset } = dayWindow(now, coords);
  const next = [sunrise, sunset]
    .map((d) => d.getTime())
    .filter((t) => t > now.getTime())
    .sort((a, b) => a - b)[0];
  const tomorrowSunrise = new Date(sunrise).setDate(sunrise.getDate() + 1);
  const target = next ?? tomorrowSunrise;
  return Math.min(Math.max(target - now.getTime(), 1000), 6 * 60 * 60 * 1000);
}
