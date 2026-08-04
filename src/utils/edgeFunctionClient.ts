/**
 * Helper to call Supabase edge functions directly using the runtime env target.
 * This keeps frontend function invocations aligned with the configured project.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const RETRYABLE_STATUS = new Set([500, 502, 503, 504, 521, 522, 523, 524]);
const MAX_RETRIES = 2;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isHtmlPayload = (text: string) => {
  const normalized = text.trim().toLowerCase();
  return normalized.startsWith('<!doctype html') || normalized.includes('<html');
};

const formatErrorMessage = (status: number, rawText: string) => {
  try {
    const parsed = JSON.parse(rawText);
    if (typeof parsed?.error === 'string') return parsed.error;
  } catch {
    // Ignore parse failure and continue with fallback below.
  }

  if (isHtmlPayload(rawText)) {
    return 'Backend is temporarily unavailable (upstream 5xx). Please retry in a few seconds.';
  }

  return rawText || `Request failed with status ${status}`;
};

export async function invokeEdgeFunction(
  functionName: string,
  body: Record<string, any>,
  authToken?: string
): Promise<{ data: any; error: any }> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      data: null,
      error: {
        message: 'Supabase environment variables are missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
      },
    };
  }

  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const formattedMessage = formatErrorMessage(response.status, errorText);
        const isRetryable = RETRYABLE_STATUS.has(response.status) || isHtmlPayload(errorText);

        if (isRetryable && attempt < MAX_RETRIES) {
          await sleep(400 * (attempt + 1));
          continue;
        }

        return {
          data: null,
          error: { message: formattedMessage, status: response.status },
        };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (err: any) {
      if (attempt < MAX_RETRIES) {
        await sleep(400 * (attempt + 1));
        continue;
      }

      return { data: null, error: { message: err.message || 'Network request failed' } };
    }
  }

  return { data: null, error: { message: 'Request failed after retries' } };
}
