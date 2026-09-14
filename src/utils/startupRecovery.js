const ASSET_RELOAD_KEY = "rirfit_asset_reload_attempt";
const ASSET_RELOAD_WINDOW_MS = 60_000;
const RELOAD_QUERY_KEY = "__rirfit_reload";

const RECOVERABLE_ASSET_PATTERNS = [
  /chunkloaderror/i,
  /loading chunk [\d]+ failed/i,
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
  /unable to preload css/i,
];

const getErrorMessage = (error) =>
  [error?.name, error?.message, error?.cause?.message]
    .filter(Boolean)
    .join(": ");

export const isRecoverableAssetError = (error) =>
  RECOVERABLE_ASSET_PATTERNS.some((pattern) =>
    pattern.test(getErrorMessage(error)),
  );

const readReloadAttempt = () => {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.sessionStorage.getItem(ASSET_RELOAD_KEY));
  } catch {
    return null;
  }
};

const writeReloadAttempt = (attempt) => {
  try {
    window.sessionStorage.setItem(ASSET_RELOAD_KEY, JSON.stringify(attempt));
  } catch {
    // Reload recovery also works when session storage is unavailable.
  }
};

const reloadWithCacheBust = () => {
  const url = new URL(window.location.href);
  url.searchParams.set(RELOAD_QUERY_KEY, String(Date.now()));
  window.location.replace(url.toString());
};

export const reloadForAssetError = (error) => {
  if (typeof window === "undefined" || !isRecoverableAssetError(error)) {
    return false;
  }

  const now = Date.now();
  const signature = `${window.location.pathname}:${getErrorMessage(error)}`;
  const previousAttempt = readReloadAttempt();
  const alreadyRetried =
    previousAttempt?.signature === signature &&
    now - Number(previousAttempt?.attemptedAt || 0) < ASSET_RELOAD_WINDOW_MS;

  if (alreadyRetried) return false;

  writeReloadAttempt({ signature, attemptedAt: now });
  window.setTimeout(reloadWithCacheBust, 0);
  return true;
};

export const installStartupRecovery = () => {
  if (typeof window === "undefined") return () => {};

  const handlePreloadError = (event) => {
    const error = event?.payload || event?.detail || event;
    if (!reloadForAssetError(error)) return;
    event.preventDefault?.();
  };

  window.addEventListener("vite:preloadError", handlePreloadError);
  return () =>
    window.removeEventListener("vite:preloadError", handlePreloadError);
};

export const markAppBootReady = () => {
  if (typeof window === "undefined") return;
  window.__RIRFIT_BOOT_READY__ = true;
  const url = new URL(window.location.href);
  if (url.searchParams.has(RELOAD_QUERY_KEY)) {
    url.searchParams.delete(RELOAD_QUERY_KEY);
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }
  window.dispatchEvent(new Event("rirfit:boot-ready"));
};
