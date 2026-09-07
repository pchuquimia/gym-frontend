import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

function LoadingMark({ reduceMotion }) {
  return (
    <div className="operation-loader__mark" aria-hidden="true">
      <span className="operation-loader__glyph">
        {[0, 1, 2].map((index) => (
          <motion.i
            key={index}
            animate={
              reduceMotion
                ? { scaleY: 1, opacity: 1 }
                : { scaleY: [0.48, 1, 0.48], opacity: [0.55, 1, 0.55] }
            }
            transition={
              reduceMotion
                ? undefined
                : {
                    duration: 1.15,
                    repeat: Infinity,
                    delay: index * 0.14,
                    ease: "easeInOut",
                  }
            }
          />
        ))}
      </span>
      <motion.span
        className="operation-loader__orbit"
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={
          reduceMotion
            ? undefined
            : { duration: 1.8, repeat: Infinity, ease: "linear" }
        }
      >
        <i />
      </motion.span>
    </div>
  );
}

LoadingMark.propTypes = {
  reduceMotion: PropTypes.bool.isRequired,
};

function LoadingContent({ description, title, variant }) {
  const reduceMotion = useReducedMotion();
  const isInline = variant === "inline";

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { y: -6, opacity: 0 }}
      transition={{
        duration: reduceMotion ? 0.01 : 0.34,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={`operation-loader__surface operation-loader__surface--${variant}`}
    >
      <LoadingMark reduceMotion={reduceMotion} />
      <div className="operation-loader__copy">
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="operation-loader__progress" aria-hidden="true">
        <motion.span
          initial={reduceMotion ? { x: "0%" } : { x: "-120%" }}
          animate={reduceMotion ? { x: "0%" } : { x: ["-120%", "280%"] }}
          transition={
            reduceMotion
              ? undefined
              : { duration: 1.45, repeat: Infinity, ease: "easeInOut" }
          }
        />
      </div>
      {isInline ? (
        <span className="operation-loader__sr-update">
          Contenido en proceso
        </span>
      ) : null}
    </motion.div>
  );
}

LoadingContent.propTypes = {
  description: PropTypes.string,
  title: PropTypes.string.isRequired,
  variant: PropTypes.oneOf(["inline", "overlay", "screen"]).isRequired,
};

export default function OperationLoader({
  active,
  delayMs = 400,
  description = "",
  mode = "overlay",
  title,
}) {
  const [visible, setVisible] = useState(active && delayMs === 0);
  const reduceMotion = useReducedMotion();

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
    if (mode === "inline" || !shouldShow) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mode, shouldShow]);

  if (mode === "inline") {
    if (!shouldShow) return null;
    return (
      <div
        className="operation-loader__inline"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <LoadingContent
          description={description}
          title={title}
          variant="inline"
        />
      </div>
    );
  }

  if (typeof document === "undefined") return null;
  const layerVariant = mode === "screen" ? "screen" : "overlay";

  return createPortal(
    <AnimatePresence>
      {shouldShow ? (
        <motion.div
          className={`operation-loader__layer operation-loader__layer--${layerVariant}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.01 : 0.22 }}
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <LoadingContent
            description={description}
            title={title}
            variant={layerVariant}
          />
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
  mode: PropTypes.oneOf(["inline", "overlay", "screen"]),
  title: PropTypes.string.isRequired,
};
