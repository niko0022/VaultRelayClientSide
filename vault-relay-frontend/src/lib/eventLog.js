/**
 * Client-side, in-memory-only security event log.
 * Ephemeral by design — clears on page refresh, never persisted or sent to the server.
 * Only stores metadata (timestamps + labels), never key material or tokens.
 */
const events = [];
const listeners = new Set();
const MAX_EVENTS = 50;

export function logEvent(type, message, level = 'info') {
    const entry = { type, message, level, time: new Date() };
    events.push(entry);
    if (events.length > MAX_EVENTS) events.shift();
    listeners.forEach(fn => fn([...events]));
}

export function getEvents() {
    return [...events];
}

export function onEventsChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

export function clearEvents() {
    events.length = 0;
    listeners.forEach(fn => fn([...events]));
}
