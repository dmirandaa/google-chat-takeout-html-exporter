// Date Formatter module - parses and formats timestamps with timezone support
import moment from 'moment-timezone';

export function parseGoogleChatDate(dateString) {
  // Parse Google Chat format: "Day, Month DD, YYYY at HH:MM:SS AM/PM UTC"
  // Example: "Friday, July 10, 2026 at 2:04:56 PM UTC"
  if (!dateString) return null;

  try {
    // Parse the format: "Friday, July 10, 2026 at 2:04:56 PM UTC"
    // Remove day of week and "UTC" suffix for moment to parse
    const cleaned = dateString
      .replace(/^\w+, /, '')  // Remove "Friday, "
      .replace(' UTC', '');    // Remove " UTC"

    // Parse as UTC timezone
    const parsed = moment.utc(cleaned, 'MMMM DD, YYYY [at] hh:mm:ss A');
    return parsed.isValid() ? parsed.toDate() : null;
  } catch (error) {
    console.warn(`⚠️  Could not parse date: ${dateString}`);
    return null;
  }
}

export function formatDate(dateString, timezone, locale) {
  // Parse Google Chat date format and format with timezone/locale
  if (!dateString) return '';

  try {
    const date = parseGoogleChatDate(dateString);
    if (!date) return dateString;

    return moment(date).tz(timezone).locale(locale).format('llll');
  } catch (error) {
    return dateString;
  }
}

export function formatTime(dateString, timezone, locale) {
  // Format time only (HH:MM)
  if (!dateString) return '';

  try {
    const date = parseGoogleChatDate(dateString);
    if (!date) return dateString;

    return moment(date).tz(timezone).locale(locale).format('LT');
  } catch (error) {
    return dateString;
  }
}

export function formatDateTime(dateString, timezone, locale, format = 'lll') {
  // Format date and time with custom format
  if (!dateString) return '';

  try {
    const date = parseGoogleChatDate(dateString);
    if (!date) return dateString;

    return moment(date).tz(timezone).locale(locale).format(format);
  } catch (error) {
    return dateString;
  }
}

export function getRelativeTime(dateString) {
  // Return relative time (e.g., "2 hours ago")
  if (!dateString) return '';

  try {
    const date = parseGoogleChatDate(dateString);
    if (!date) return dateString;

    return moment(date).fromNow();
  } catch (error) {
    return dateString;
  }
}
