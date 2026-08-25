import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import { LoaderCircle } from "lucide-react";

function LoadingContent({ compact, description, title }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { y: 16, opacity: 0, scale: 0.98 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { y: 10, opacity: 0, scale: 0.98 }}
      className={`${
        compact
          ? "w-full px-5 py-8"
          : "w-full max-w-sm rounded-modal border border-[color:var(--border)] bg-[color:var(--surface-raised)] px-6 py-8 shadow-overlay"
      } text-center text-[color:var(--text)]`}
    >
      <span
        className={`${compact ? "h-12 w-12" : "h-14 w-14"} theme-accent-soft mx-auto grid place-items-center rounded-full border`}
      >
        <LoaderCircle
          className={`${compact ? "h-6 w-6" : "h-8 w-8"} ${reduceMotion ? "" : "animate-spin"}`}
        />
      </span>
      <h2
        className={`${compact ? "mt-4 text-lg" : "mt-5 text-xl"} font-bold leading-tight`}
      >
        {title}
      </h2>
      {description ? (
        <p className="mx-auto mt-2 max-w-sm font-sans text-sm font-medium text-[color:var(--text-muted)]">
          {description}
        </p>
      ) : null}
      <div
        className={`${compact ? "mt-4" : "mt-6"} flex justify-center gap-2`}
        aria-hidden="true"
      >
        {[0, 1, 2].map((index) => (
          <motion.span
            key={index}
            className={`${compact ? "w-8" : "w-10"} theme-accent-solid h-1.5 border-0`}
            animate={
              reduceMotion
                ? { opacity: 0.8 }
                : { opacity: [0.25, 1, 0.25], scaleX: [0.75, 1, 0.75] }
            }
            transition={
              reduceMotion
                ? undefined
                : { duration: 1.2, repeat: Infinity, delay: index * 0.18 }
            }
          />
        ))}
      </div>
    </motion.div>
  );
}

LoadingContent.propTypes = {
  compact: PropTypes.bool,
  description: PropTypes.string,
  title: PropTypes.string.isRequired,
};

export default function OperationLoader({
  active,
  delayMs = 400,
  description = "",
  mode = "overlay",
  title,
}) {
  const [visible, setVisible] = useState(active && delayMs === 0);

  useEffect(() => {
    if (!active) {
      const timeoutId = window.setTimeout(() => setVisible(false), 0);
      return () => window.clearTimeout(timeoutId);
    }
    const timeoutId = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(timeoutId);
  }, [active, delayMs]);

  const shouldShow = active && visible;

  useEffect(() => {
    if (mode !== "overlay" || !shouldShow) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mode, shouldShow]);

  if (mode === "inline") {
    if (!shouldShow) return null;
    return (
      <div role="status" aria-live="polite" aria-busy="true">
        <LoadingContent compact description={description} title={title} />
      </div>
    );
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {shouldShow ? (
        <motion.div
          className="fixed inset-0 z-[120] grid place-items-center bg-[color:var(--overlay)] px-6 backdrop-blur-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <LoadingContent description={description} title={title} />
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

OperationLoader.propTypes = {
  active: PropTypes.bool.isRequired,
  delayMs: PropTypes.number,
  description: PropTypes.string,
  mode: PropTypes.oneOf(["inline", "overlay"]),
  title: PropTypes.string.isRequired,
};
