// preview/fixtures/time.ts — dates relative to "now" so live/tonight states show.
export function at(dayOffset: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/** Hours from now (can be negative). */
export function inHours(h: number): string {
  return new Date(Date.now() + h * 3600_000).toISOString();
}
