import PropTypes from "prop-types";
import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

export default function AutoRestCompleteModal({
  reduceMotion = false,
  onContinue,
}) {
  const [leaving, setLeaving] = useState(false);
  const handleContinue = () => {
    if (leaving) return;
    setLeaving(true);
    onContinue();
  };

  return (
    <motion.button
      type="button"
      className={`fixed inset-0 z-[70] grid place-items-center bg-black/30 p-5 backdrop-blur-sm focus:outline-none dark:bg-black/55 ${
        leaving ? "pointer-events-none cursor-default" : "cursor-pointer"
      }`}
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.16 } }}
      onClick={handleContinue}
      aria-label="Descanso terminado. Volver al entrenamiento"
    >
      <motion.span
        className="relative isolate grid min-h-52 w-full max-w-[340px] place-items-center overflow-hidden rounded-[2rem] border border-white/60 bg-[color:var(--card)] px-8 py-8 shadow-[0_28px_80px_rgba(18,18,18,0.26)] dark:border-white/10 dark:shadow-[0_32px_90px_rgba(0,0,0,0.65)]"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.9, y: 18 }}
        animate={
          reduceMotion
            ? { opacity: 1, scale: 1 }
            : { opacity: 1, scale: 1, y: 0 }
        }
        exit={
          reduceMotion
            ? { opacity: 0, transition: { duration: 0.12 } }
            : {
                opacity: 0,
                scale: 0.94,
                y: 12,
                transition: { duration: 0.16, ease: "easeOut" },
              }
        }
        transition={
          reduceMotion
            ? { duration: 0.16 }
            : { type: "spring", stiffness: 300, damping: 26 }
        }
      >
        <motion.span
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 -z-10 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#352018]/10 blur-3xl dark:bg-[#e2ff00]/10"
          animate={
            reduceMotion
              ? { opacity: 0.5 }
              : { scale: [0.8, 1.4], opacity: [0.65, 0] }
          }
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 1.25, ease: "easeOut", repeat: Infinity }
          }
        />
        <span className="grid justify-items-center text-center">
          <motion.span
            className="grid h-14 w-14 place-items-center rounded-full bg-[#352018] text-white shadow-lg dark:bg-[#e2ff00] dark:text-black"
            initial={reduceMotion ? false : { scale: 0.4, rotate: -18 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 420, damping: 20, delay: 0.08 }
            }
          >
            <Check className="h-7 w-7 stroke-[3]" />
          </motion.span>
          <strong className="mt-4 text-2xl font-black tracking-[-0.03em] text-[color:var(--text)]">
            Listo
          </strong>
          <span className="mt-1 text-sm font-medium text-[color:var(--text-muted)]">
            Descanso terminado
          </span>
          <span className="mt-5 text-xs font-semibold text-[#352018] dark:text-[#e2ff00]">
            Toca para continuar
          </span>
        </span>
      </motion.span>
    </motion.button>
  );
}

AutoRestCompleteModal.propTypes = {
  reduceMotion: PropTypes.bool,
  onContinue: PropTypes.func.isRequired,
};
