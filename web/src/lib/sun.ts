/**
 * When the sun crosses a given altitude, for one day at one place — the standard
 * NOAA/suncalc approximation (±1 min), small enough to run in the browser.
 * Used for "golden hour today" in Bali (footer, Contact).
 */
const rad = Math.PI / 180;
const DAY = 864e5, J1970 = 2440588, J2000 = 2451545, J0 = 0.0009;
const tilt = rad * 23.4397; // obliquity of the ecliptic

const toDays = (d: Date) => d.valueOf() / DAY - 0.5 + J1970 - J2000;
const fromJulian = (j: number) => new Date((j + 0.5 - J1970) * DAY);

/** Rise and set times (as Dates) of the sun passing `altitude` degrees on the day around `date`; null when it never does. */
export function sunCrossing(date: Date, lat: number, lng: number, altitude: number): { rise: Date; set: Date } | null {
  const lw = rad * -lng, phi = rad * lat;
  const n = Math.round(toDays(date) - J0 - lw / (2 * Math.PI));
  const transit = (ht: number) => J0 + (ht + lw) / (2 * Math.PI) + n;
  const ds = transit(0);
  const M = rad * (357.5291 + 0.98560028 * ds);
  const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + rad * 102.9372 + Math.PI;
  const dec = Math.asin(Math.sin(tilt) * Math.sin(L));
  const noon = J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const cosH = (Math.sin(rad * altitude) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
  if (cosH < -1 || cosH > 1) return null;
  const a = transit(Math.acos(cosH));
  const set = J2000 + a + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  return { rise: fromJulian(noon - (set - noon)), set: fromJulian(set) };
}

export type GoldenWindow = { from: Date; to: Date; when: "morning" | "evening" | "tomorrow" };

/**
 * The next golden hour (sun between the horizon and 6° up) still to come or under way at `now`:
 * this morning, this evening, or tomorrow morning. `utcOffset` is the place's offset in hours.
 */
export function nextGoldenHour(now: Date, lat: number, lng: number, utcOffset: number): GoldenWindow | null {
  const local = new Date(now.valueOf() + utcOffset * 36e5);
  const noonOf = (days: number) => new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + days, 12 - utcOffset));
  const windows: GoldenWindow[] = [];
  for (const [day, whenMorning] of [[0, "morning"], [1, "tomorrow"]] as const) {
    const horizon = sunCrossing(noonOf(day), lat, lng, -0.833);
    const six = sunCrossing(noonOf(day), lat, lng, 6);
    if (!horizon || !six) continue;
    windows.push({ from: horizon.rise, to: six.rise, when: whenMorning });
    if (day === 0) windows.push({ from: six.set, to: horizon.set, when: "evening" });
  }
  return windows.find((w) => w.to > now) ?? null;
}
