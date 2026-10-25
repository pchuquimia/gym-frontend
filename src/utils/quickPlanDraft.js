// Retain older session drafts while moving new drafts to persistent device storage.
const stores = [() => localStorage, () => sessionStorage];

export const readQuickPlanDraft = (key) => {
  if (!key) return {};
  const drafts = stores.flatMap((getStore) => {
    try {
      const draft = JSON.parse(getStore().getItem(key));
      return draft && typeof draft === "object" && !Array.isArray(draft)
        ? [draft]
        : [];
    } catch {
      return [];
    }
  });
  // A session fallback can be newer if persistent storage ran out of space.
  return drafts.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))[0] || {};
};

export const clearQuickPlanDraft = (key) => {
  if (!key) return;
  stores.forEach((getStore) => {
    try {
      getStore().removeItem(key);
    } catch {
      /* Storage may be unavailable. */
    }
  });
};

export const saveQuickPlanDraft = (key, draft) => {
  if (!key) return false;
  const value = JSON.stringify({ ...draft, savedAt: Date.now() });
  for (const getStore of stores) {
    try {
      getStore().setItem(key, value);
      return true;
    } catch {
      /* Try the session fallback when persistent storage is unavailable. */
    }
  }
  return false;
};
