/**
 * Format a date/time string to a relative time description
 * @param {string} dateString - ISO date string or timestamp
 * @returns {string} Formatted relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (dateString) => {
  if (!dateString) return "Unknown";

  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? "s" : ""} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? "s" : ""} ago`;
    if (diffWeek < 4) return `${diffWeek} week${diffWeek !== 1 ? "s" : ""} ago`;
    if (diffMonth < 12) return `${diffMonth} month${diffMonth !== 1 ? "s" : ""} ago`;
    return `${diffYear} year${diffYear !== 1 ? "s" : ""} ago`;
  } catch (error) {
    return dateString;
  }
};

/**
 * Format a date/time string to a readable format
 * @param {string} dateString - ISO date string or timestamp
 * @param {boolean} includeTime - Whether to include time (default: true)
 * @returns {string} Formatted date (e.g., "Feb 4, 2026 at 3:45 PM")
 */
export const formatDateTime = (dateString, includeTime = true) => {
  if (!dateString) return "Unknown";

  try {
    const date = new Date(dateString);
    const options = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };

    if (includeTime) {
      options.hour = "numeric";
      options.minute = "2-digit";
      options.hour12 = true;
    }

    return date.toLocaleString("en-US", options);
  } catch (error) {
    return dateString;
  }
};

/**
 * Format a date/time string with both absolute and relative time
 * @param {string} dateString - ISO date string or timestamp
 * @returns {string} Formatted date with relative time (e.g., "Feb 4 at 3:45 PM (2 hours ago)")
 */
export const formatDateTimeWithRelative = (dateString) => {
  if (!dateString) return "Unknown";

  const absolute = formatDateTime(dateString);
  const relative = formatRelativeTime(dateString);

  return `${absolute} (${relative})`;
};
