/**
 * SMS utility using Fast2SMS (India).
 * Set FAST2SMS_API_KEY in .env to enable.
 * Without the key, all calls are silent no-ops.
 */
export async function sendSMS(phone: string, message: string): Promise<void> {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) return;

  // Keep only 10 digits (strip +91 / 0 prefix)
  const digits = phone.replace(/\D/g, '').replace(/^91/, '').slice(-10);
  if (digits.length !== 10) return;

  try {
    await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
        'cache-control': 'no-cache',
      },
      body: JSON.stringify({
        route: 'q',
        message,
        language: 'english',
        numbers: digits,
      }),
    });
  } catch {
    // SMS failure is non-critical — log and continue
    console.warn('[sms] send failed for', digits);
  }
}
