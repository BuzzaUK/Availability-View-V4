/**
 * Time formatting utilities for consistent HH:MM:SS display
 */

/**
 * Converts milliseconds to HH:MM:SS format
 * @param {number} milliseconds - Time in milliseconds
 * @returns {string} Time in HH:MM:SS format
 */
function formatMillisecondsToHMS(milliseconds) {
  if (!milliseconds || milliseconds < 0) return '00:00:00';
  
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Converts minutes to HH:MM:SS format
 * @param {number} minutes - Time in minutes
 * @returns {string} Time in HH:MM:SS format
 */
function formatMinutesToHMS(minutes) {
  if (!minutes || minutes < 0) return '00:00:00';
  
  const totalMinutes = Math.floor(minutes);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const seconds = Math.floor((minutes - totalMinutes) * 60);
  
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Formats a timestamp to HH:MM:SS format
 * @param {Date|string|number} timestamp - Timestamp to format
 * @returns {string} Time in HH:MM:SS format
 */
function formatTimestampToHMS(timestamp) {
  if (!timestamp) return '00:00:00';
  
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '00:00:00';
  
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Formats duration with appropriate unit and HH:MM:SS when applicable
 * @param {number} milliseconds - Duration in milliseconds
 * @returns {string} Formatted duration string
 */
function formatDuration(milliseconds) {
  if (!milliseconds || milliseconds < 0) return '00:00:00';
  
  // For durations less than 1 minute, show seconds
  if (milliseconds < 60000) {
    const seconds = Math.floor(milliseconds / 1000);
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
  
  // For durations 1 minute or more, show HH:MM:SS
  return formatMillisecondsToHMS(milliseconds);
}

/**
 * Formats duration for narrative text (more readable)
 * @param {number} milliseconds - Duration in milliseconds
 * @returns {string} Human-readable duration string
 */
function formatDurationNarrative(milliseconds) {
  if (!milliseconds || milliseconds < 0) return 'instant';
  
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const parts = [];
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  if (seconds > 0 && hours === 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
  
  if (parts.length === 0) return 'instant';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

module.exports = {
  formatMillisecondsToHMS,
  formatMinutesToHMS,
  formatTimestampToHMS,
  formatDuration,
  formatDurationNarrative
};