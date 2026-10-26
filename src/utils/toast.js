import { toast as sonnerToast } from "sonner";

const FEEDBACK_ID = "rirfit-feedback";
let feedbackAnimation = 0;
const replaceFeedback =
  (notify) =>
  (message, options = {}) => {
    const previous = sonnerToast
      .getHistory?.()
      ?.find((item) => item.id === FEEDBACK_ID);
    const clearedOptions = Object.fromEntries(
      Object.keys(previous || {}).map((key) => [key, undefined]),
    );
    const replacing = sonnerToast
      .getToasts?.()
      ?.some((item) => item.id === FEEDBACK_ID);
    const animationClass = replacing
      ? `rirfit-toast--replace-${++feedbackAnimation % 2 ? "a" : "b"}`
      : "";
    return notify(message, {
      ...clearedOptions,
      ...options,
      id: FEEDBACK_ID,
      className:
        [options.className, animationClass].filter(Boolean).join(" ") ||
        undefined,
    });
  };

// Every transient notice updates the same toast, including rapid on/off changes.
export const toast = Object.assign(
  replaceFeedback((...args) => sonnerToast.message(...args)),
  sonnerToast,
  Object.fromEntries(
    [
      "success",
      "info",
      "warning",
      "error",
      "message",
      "loading",
      "custom",
      "promise",
    ].map((method) => [
      method,
      replaceFeedback((...args) => sonnerToast[method](...args)),
    ]),
  ),
);
