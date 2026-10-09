import crypto from 'crypto';

/**
 * Generates an order code in format: SL-YYMMDD-XXXXXX
 * - SL: StepLab prefix
 * - YYMMDD: Current server date (2-digit year, 2-digit month, 2-digit day)
 * - XXXXXX: 6 cryptographically secure random digits
 */
export function generateOrderCode(date = new Date()) {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const datePart = `${yy}${mm}${dd}`;

  const randomInt = crypto.randomInt(0, 1000000);
  const randomPart = String(randomInt).padStart(6, '0');

  return `SL-${datePart}-${randomPart}`;
}
