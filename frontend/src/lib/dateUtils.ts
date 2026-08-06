/**
 * dateUtils.ts — Central IST (Asia/Kolkata, UTC+5:30) date/time helpers.
 *
 * All display timestamps in the app MUST go through these helpers so that
 * times are always shown in Indian Standard Time regardless of the browser's
 * local timezone setting.
 *
 * The IANA timezone "Asia/Kolkata" is supported by every modern browser via
 * the native Intl.DateTimeFormat API — no third-party library is required.
 */

const IST = 'Asia/Kolkata';

/** Convert any ISO string / Date to a JS Date safely. Returns null on failure. */
function toDate(raw: string | Date): Date | null {
  if (!raw) return null;
  const d = raw instanceof Date ? raw : new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format a time in IST as "HH:MM AM/PM" (e.g. "01:31 PM").
 * Used in session list labels and dashboard.
 */
export function formatTimeIST(raw: string | Date): string {
  const d = toDate(raw);
  if (!d) return '';
  return d.toLocaleTimeString('en-IN', {
    timeZone: IST,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format a time in IST as "HH:MM:SS AM/PM" (e.g. "01:31:45 PM").
 * Used in transcript bubbles and tool timeline events.
 */
export function formatTimeISTWithSeconds(raw: string | Date): string {
  const d = toDate(raw);
  if (!d) return '';
  return d.toLocaleTimeString('en-IN', {
    timeZone: IST,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/**
 * Format a date in IST as "Aug 5" style.
 * Used for dates older than a week in relative labels.
 */
export function formatDateIST(raw: string | Date): string {
  const d = toDate(raw);
  if (!d) return '';
  return d.toLocaleDateString('en-IN', {
    timeZone: IST,
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Returns "YYYY-MM-DD" for today in IST.
 * Used for Today/Yesterday grouping in SessionsSidebar.
 */
export function todayInIST(): string {
  // 'en-CA' locale reliably returns YYYY-MM-DD format
  return new Date().toLocaleDateString('en-CA', { timeZone: IST });
}

/**
 * Returns "YYYY-MM-DD" for yesterday in IST.
 */
export function yesterdayInIST(): string {
  const d = new Date(Date.now() - 86_400_000);
  return d.toLocaleDateString('en-CA', { timeZone: IST });
}

/**
 * Returns the current hour (0-23) in IST.
 * Used by the Dashboard greeting helper.
 */
export function getISTHour(): number {
  return parseInt(
    new Date().toLocaleString('en-IN', { timeZone: IST, hour: 'numeric', hour12: false }),
    10,
  );
}

/**
 * Relative date label in IST — matches the existing app label style:
 *   - Same calendar day in IST  → "Today 01:31 PM"
 *   - Previous calendar day     → "Yesterday"
 *   - 2–6 days ago              → "3d ago"
 *   - 7+ days ago               → "Aug 5"
 *
 * @param raw  ISO string, a bare "YYYY-MM-DD" date string, or a Date object.
 */
export function relativeDateIST(raw: string | Date | undefined | null): string {
  if (!raw) return '';
  const d = toDate(raw as string | Date);
  if (!d) return String(raw);

  const todayStr = todayInIST();
  const sessionDateStr = d.toLocaleDateString('en-CA', { timeZone: IST });

  const diffDays = Math.floor(
    (new Date(todayStr).getTime() - new Date(sessionDateStr).getTime()) / 86_400_000,
  );

  if (diffDays === 0) return `Today ${formatTimeIST(d)}`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDateIST(d);
}
