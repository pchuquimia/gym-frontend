import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { Trash2 } from "lucide-react";

const KNOB_SIZE = 48;
const TRACK_PADDING = 4;

function SlideToConfirm({
  label = "Desliza para confirmar",
  ariaLabel = "Deslizar para confirmar",
  onConfirm,
  disabled = false,
}) {
  const trackRef = useRef(null);
  const confirmedRef = useRef(false);
  const x = useMotionValue(0);
  const [maxDrag, setMaxDrag] = useState(0);
  const fillWidth = useTransform(x, [0, Math.max(maxDrag, 1)], ["0%", "100%"]);
  const labelOpacity = useTransform(
    x,
    [0, Math.max(maxDrag * 0.72, 1)],
    [1, 0.35],
  );

  useEffect(() => {
    const updateBounds = () => {
      const width = trackRef.current?.getBoundingClientRect().width || 0;
      setMaxDrag(Math.max(0, width - KNOB_SIZE - TRACK_PADDING * 2));
    };

    updateBounds();
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateBounds)
        : null;
    if (observer && trackRef.current) observer.observe(trackRef.current);
    window.addEventListener("resize", updateBounds);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateBounds);
    };
  }, []);

  const handleDragEnd = () => {
    if (disabled || confirmedRef.current) return;
    const current = x.get();
    if (maxDrag > 0 && current >= maxDrag * 0.86) {
      confirmedRef.current = true;
      animate(x, maxDrag, { type: "spring", stiffness: 420, damping: 34 });
      onConfirm?.();
      return;
    }
    animate(x, 0, { type: "spring", stiffness: 520, damping: 36 });
  };

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round((x.get() / Math.max(maxDrag, 1)) * 100)}
      tabIndex={0}
      className={`relative h-14 overflow-hidden rounded-2xl border border-red-500/20 bg-red-500/10 ${
        disabled ? "opacity-60" : ""
      }`}
      style={{
        touchAction: "pan-y",
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
    >
      <motion.div
        className="absolute inset-y-0 left-0 bg-red-600/20"
        style={{ width: fillWidth }}
      />
      <motion.div
        className="absolute inset-0 grid place-items-center px-14 text-xs font-black uppercase tracking-wide text-red-700 dark:text-red-300"
        style={{ opacity: labelOpacity }}
      >
        {label}
      </motion.div>
      <motion.div
        drag={disabled ? false : "x"}
        dragConstraints={{ left: 0, right: maxDrag }}
        dragElastic={0}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        className="absolute top-1 grid h-12 w-12 cursor-grab place-items-center rounded-xl bg-red-600 text-white shadow-lg active:cursor-grabbing"
        style={{ x, left: TRACK_PADDING }}
      >
        <Trash2 className="h-5 w-5" />
      </motion.div>
    </div>
  );
}

SlideToConfirm.propTypes = {
  label: PropTypes.string,
  ariaLabel: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default SlideToConfirm;
