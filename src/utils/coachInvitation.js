export const COACH_INVITATION_STORAGE_KEY = "rirfit_pending_coach_invitation";

export const normalizeCoachInvitationToken = (value) => {
  const token = String(value || "").trim();
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : "";
};

export const invitationTokenFromPath = (pathname = "") => {
  const match = String(pathname).match(/^\/invitacion\/([^/]+)\/?$/);
  if (!match) return "";
  try {
    return normalizeCoachInvitationToken(decodeURIComponent(match[1]));
  } catch {
    return "";
  }
};

export const storeCoachInvitation = (token) => {
  const normalized = normalizeCoachInvitationToken(token);
  if (!normalized || typeof window === "undefined") return "";
  window.localStorage.setItem(COACH_INVITATION_STORAGE_KEY, normalized);
  return normalized;
};

export const readCoachInvitation = () => {
  if (typeof window === "undefined") return "";
  return normalizeCoachInvitationToken(
    window.localStorage.getItem(COACH_INVITATION_STORAGE_KEY),
  );
};

export const clearCoachInvitation = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(COACH_INVITATION_STORAGE_KEY);
};
