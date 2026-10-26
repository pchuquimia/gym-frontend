import { toast as sonnerToast } from "sonner";

const FEEDBACK_ID = "rirfit-feedback";
const replaceFeedback =
  (notify) =>
  (message, options = {}) => {
    const previous = sonnerToast
      .getHistory?.()
      ?.find((item) => item.id === FEEDBACK_ID);
    const clearedOptions = Object.fromEntries(
      Object.keys(previous || {}).map((key) => [key, undefined]),
    );
    return notify(message, { ...clearedOptions, ...options, id: FEEDBACK_ID });
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
