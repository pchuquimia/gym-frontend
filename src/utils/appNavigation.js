export const APP_NAVIGATION_MARKER = "gym-app-navigation";

const finiteNonNegative = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

export const isAppHistoryState = (state) =>
  state?.navigationMarker === APP_NAVIGATION_MARKER &&
  typeof state?.page === "string";

export const createAppHistoryState = ({
  currentState,
  page,
  index,
  scrollY = 0,
}) => ({
  ...(currentState && typeof currentState === "object" ? currentState : {}),
  navigationMarker: APP_NAVIGATION_MARKER,
  page,
  navigationIndex: finiteNonNegative(index),
  scrollY: finiteNonNegative(scrollY),
});

export const getAppHistoryPage = (state) =>
  isAppHistoryState(state) ? state.page : "";

export const getAppHistoryIndex = (state) =>
  isAppHistoryState(state)
    ? finiteNonNegative(state.navigationIndex)
    : 0;

export const getAppHistoryScroll = (state) =>
  isAppHistoryState(state) ? finiteNonNegative(state.scrollY) : 0;

export const canReturnWithinApp = (state) =>
  isAppHistoryState(state) && getAppHistoryIndex(state) > 0;
