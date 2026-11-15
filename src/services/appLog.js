import { sdk } from '@/services/sdk';

const MAX_MESSAGE_LENGTH = 2000;
const DEDUPE_WINDOW_MS = 10000;
const recentMessages = new Map();

function isDuplicate(text) {
  const now = Date.now();
  const last = recentMessages.get(text);
  if (last !== undefined && now - last < DEDUPE_WINDOW_MS) return true;
  recentMessages.set(text, now);
  if (recentMessages.size > 100) recentMessages.clear();
  return false;
}

function redact(text) {
  return String(text)
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]')
    .replace(/(?:\+?\d[\d\s-]{8,}\d)/g, '[number]');
}

export async function logPageView(pagePath, durationSeconds) {
  const path = pagePath || '/';
  try {
    const res = await sdk.table('usage_events_c').create({
      Name: path.slice(0, 80),
      page_path_c: path,
      duration_seconds_c: durationSeconds,
    });
    if (!res.data?.length) {
      console.error(`usage_events_c create failed: ${res.messages?.join('; ') || 'no rows committed'}`);
    }
  } catch (err) {
    console.error(`usage_events_c create threw: ${err.message}`);
  }
}

export async function logClientError(message, pagePath) {
  const text = redact(message || 'Unknown error').slice(0, MAX_MESSAGE_LENGTH);
  if (isDuplicate(text)) return;
  try {
    const res = await sdk.table('error_logs_c').create({
      Name: text.slice(0, 80),
      message_c: text,
      page_path_c: pagePath || '/',
    });
    if (!res.data?.length) {
      console.error(`error_logs_c create failed: ${res.messages?.join('; ') || 'no rows committed'}`);
    }
  } catch (err) {
    console.error(`error_logs_c create threw: ${err.message}`);
  }
}

let captureInstalled = false;

export function captureGlobalErrors() {
  if (captureInstalled || typeof window === 'undefined') return () => {};
  captureInstalled = true;
  const onError = (event) => {
    if (!(event instanceof ErrorEvent)) return;
    logClientError(event.error?.message || event.message, window.location.pathname);
  };
  const onRejection = (event) => {
    logClientError(event.reason?.message || String(event.reason), window.location.pathname);
  };
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  return () => {
    captureInstalled = false;
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}
