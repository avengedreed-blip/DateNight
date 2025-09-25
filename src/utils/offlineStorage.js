const hasWindow = () => typeof window !== "undefined" && window?.localStorage;

export function saveOffline(key, value) {
  if (!key || !hasWindow()) {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to persist offline payload for key "${key}"`, error);
  }
}

export function loadOffline(key, defaultVal) {
  if (!key || !hasWindow()) {
    return defaultVal;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch (error) {
    console.warn(`Failed to read offline payload for key "${key}"`, error);
    return defaultVal;
  }
}
