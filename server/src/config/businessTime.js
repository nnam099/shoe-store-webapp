export const BUSINESS_TIME_ZONE = 'Asia/Ho_Chi_Minh';
export const ORDER_AUTO_COMPLETE_AFTER_MS = 48 * 60 * 60 * 1000;
export const ORDER_AUTO_COMPLETE_INTERVAL_MS = 60 * 1000;

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const offsetFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BUSINESS_TIME_ZONE,
  timeZoneName: 'longOffset',
});

function pad(value) {
  return String(value).padStart(2, '0');
}

function parseOffsetMilliseconds(date) {
  const offsetName = offsetFormatter
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')?.value;
  const match = /^GMT([+-])(\d{2}):(\d{2})$/.exec(offsetName || '');
  if (!match) throw new Error(`Unable to resolve offset for ${BUSINESS_TIME_ZONE}`);
  const direction = match[1] === '+' ? 1 : -1;
  return direction * (Number(match[2]) * 60 + Number(match[3])) * 60 * 1000;
}

export function parseDateOnly(value, field) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TypeError(`${field} must use YYYY-MM-DD format`);
  }
  const [year, month, day] = value.split('-').map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year
    || check.getUTCMonth() !== month - 1
    || check.getUTCDate() !== day
  ) throw new TypeError(`${field} is not a valid calendar date`);
  return { year, month, day, text: `${year}-${pad(month)}-${pad(day)}` };
}

export function formatBusinessDate(date = new Date()) {
  return dateFormatter.format(date);
}

export function businessDateToUtc(value) {
  const { year, month, day } = typeof value === 'string' ? parseDateOnly(value, 'date') : value;
  const utcGuess = new Date(Date.UTC(year, month - 1, day));
  let result = new Date(utcGuess.getTime() - parseOffsetMilliseconds(utcGuess));
  const correctedOffset = parseOffsetMilliseconds(result);
  result = new Date(utcGuess.getTime() - correctedOffset);
  return result;
}

export function addCalendarDays(value, amount) {
  const parsed = typeof value === 'string' ? parseDateOnly(value, 'date') : value;
  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + amount));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    text: `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`,
  };
}

export function businessDateRange(value) {
  const parsed = typeof value === 'string' ? parseDateOnly(value, 'date') : value;
  return {
    start: businessDateToUtc(parsed),
    end: businessDateToUtc(addCalendarDays(parsed, 1)),
  };
}
