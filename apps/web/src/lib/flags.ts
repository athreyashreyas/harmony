// Feature flags: things that are built but deliberately not switched on yet.
//
// A flag here is a promise to either finish the thing or delete it. Each one
// says what it gates, why it is off, and what is left to do — so the choice can
// be revisited on evidence rather than rediscovered by reading the code.

export const FLAGS = {
  /**
   * Per-person sunrise and sunset from the device's own location.
   *
   * OFF. Harmony's users are in India today, so "Follow the sun" uses India's
   * solar times from a fixed reference point (see INDIA_REFERENCE in
   * theme/solar.ts). Nobody is asked for their location and none is stored,
   * which is the right trade while the audience is one country: a habit app
   * asking for GPS needs to earn it.
   *
   * The geolocation path is written and left intact behind this flag
   * (requestSunLocation in theme/theme.ts, the coords cache, and the coords
   * branch of dayWindow). Turning it on restores per-person times.
   *
   * BEFORE TURNING IT ON, two known gaps need closing:
   *   1. Coordinates are cached once and never refreshed, so someone who moves
   *      or travels keeps their old sunset indefinitely. Needs an expiry, or a
   *      re-request when the device's timezone changes.
   *   2. The preference syncs across devices but the coordinates do not, by
   *      design. A second device therefore has the toggle on and no location,
   *      and silently falls back. It needs to either ask on that device or say
   *      plainly that it is using fallback hours.
   *
   * If per-person times are ever built properly, delete this flag and the code
   * it gates rather than leaving both — a half-wired path is worse than none.
   */
  sunUsesDeviceLocation: false,
} as const;
