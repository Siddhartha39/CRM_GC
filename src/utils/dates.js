import { format, parseISO, addDays, addMonths, isBefore, isAfter, isToday as isDateToday, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';
export { formatINR } from './validation';

export const TIMEZONE = 'Asia/Kolkata';

/**
 * Returns today's calendar date string in YYYY-MM-DD formatted for Asia/Kolkata.
 */
export function getKolkataTodayString() {
  const now = new Date();
  // Format in Asia/Kolkata timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now); // en-CA gives YYYY-MM-DD
}

/**
 * Returns current timestamp or ISO string in Asia/Kolkata.
 */
export function getKolkataNow() {
  return new Date();
}

/**
 * Formats a Firestore Timestamp, Date, or ISO string to readable date.
 */
export function formatKolkataDate(dateValue, formatStr = 'dd MMM yyyy') {
  if (!dateValue) return '—';
  try {
    let dateObj;
    if (dateValue && typeof dateValue.toDate === 'function') {
      dateObj = dateValue.toDate();
    } else if (dateValue instanceof Date) {
      dateObj = dateValue;
    } else if (typeof dateValue === 'string') {
      // If it's a YYYY-MM-DD string, parse safely with time
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        const [y, m, d] = dateValue.split('-').map(Number);
        dateObj = new Date(y, m - 1, d);
      } else {
        dateObj = parseISO(dateValue);
      }
    } else if (typeof dateValue === 'number') {
      dateObj = new Date(dateValue);
    } else {
      return '—';
    }

    if (isNaN(dateObj.getTime())) return '—';
    return format(dateObj, formatStr);
  } catch (err) {
    console.error('Error formatting date:', err);
    return '—';
  }
}

/**
 * Formats a Firestore Timestamp, Date, or ISO string to readable date & time.
 */
export function formatKolkataDateTime(dateValue, formatStr = 'dd MMM yyyy, hh:mm a') {
  return formatKolkataDate(dateValue, formatStr);
}

/**
 * Calculate quick scheduling dates based on option name.
 * Options: 'tomorrow', '3days', '7days', '15days', '30days', '3months', '6months'
 */
export function getQuickScheduleDate(option) {
  const todayStr = getKolkataTodayString();
  const [y, m, d] = todayStr.split('-').map(Number);
  const baseDate = new Date(y, m - 1, d);

  let targetDate = baseDate;
  switch (option) {
    case 'tomorrow':
      targetDate = addDays(baseDate, 1);
      break;
    case '3days':
      targetDate = addDays(baseDate, 3);
      break;
    case '7days':
      targetDate = addDays(baseDate, 7);
      break;
    case '15days':
      targetDate = addDays(baseDate, 15);
      break;
    case '30days':
      targetDate = addDays(baseDate, 30);
      break;
    case '3months':
      targetDate = addMonths(baseDate, 3);
      break;
    case '6months':
      targetDate = addMonths(baseDate, 6);
      break;
    default:
      targetDate = addDays(baseDate, 1);
  }

  return format(targetDate, 'yyyy-MM-dd');
}

/**
 * Check if a YYYY-MM-DD due date is strictly before today in Kolkata.
 */
export function isOverdueDate(dueDateStr) {
  if (!dueDateStr) return false;
  const todayStr = getKolkataTodayString();
  return dueDateStr < todayStr;
}

/**
 * Check if a YYYY-MM-DD due date is today in Kolkata.
 */
export function isTodayDate(dueDateStr) {
  if (!dueDateStr) return false;
  const todayStr = getKolkataTodayString();
  return dueDateStr === todayStr;
}

/**
 * Check if a YYYY-MM-DD due date is in the upcoming days (inclusive).
 */
export function isUpcomingDate(dueDateStr, daysAhead = 7) {
  if (!dueDateStr) return false;
  const todayStr = getKolkataTodayString();
  const [y, m, d] = todayStr.split('-').map(Number);
  const maxDate = format(addDays(new Date(y, m - 1, d), daysAhead), 'yyyy-MM-dd');
  return dueDateStr > todayStr && dueDateStr <= maxDate;
}

/**
 * Generates days grid for a calendar month view.
 */
export function getCalendarGrid(year, month) {
  const firstDayOfMonth = new Date(year, month, 1);
  const start = startOfWeek(startOfMonth(firstDayOfMonth), { weekStartsOn: 1 }); // Monday start
  const end = endOfWeek(endOfMonth(firstDayOfMonth), { weekStartsOn: 1 });

  return eachDayOfInterval({ start, end }).map((day) => ({
    date: day,
    dateString: format(day, 'yyyy-MM-dd'),
    dayNumber: format(day, 'd'),
    isCurrentMonth: day.getMonth() === month,
    isToday: format(day, 'yyyy-MM-dd') === getKolkataTodayString(),
  }));
}
