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
      className={`fixed inset-0 z-[70] grid place-items-center bg-black/20 p-5 backdrop-blur-[2px] focus:outline-none dark:bg-black/45 ${
        leaving ? "pointer-events-none cursor-default" : "cursor-pointer"
      }`}
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.16 } }}
      onClick={handleContinue}
      aria-label="Descanso terminado. Volver al entrenamiento"
    >
      <motion.span
        className="relative grid aspect-square w-full max-w-[280px] place-items-center rounded-full bg-[#ff5722] p-[10px] shadow-[0_0_58px_rgba(255,87,34,0.42)] dark:bg-[#e2ff00] dark:shadow-[0_0_64px_rgba(226,255,0,0.38)]"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.86 }}
        animate={
          reduceMotion
            ? { opacity: 1, scale: 1 }
            : { opacity: 1, scale: 1 }
        }
        exit={
          reduceMotion
            ? { opacity: 0, transition: { duration: 0.12 } }
            : {
                opacity: 0,
                scale: 0.94,
                transition: { duration: 0.16, ease: "easeOut" },
              }
        }
        transition={
          reduceMotion
            ? { duration: 0.16 }
            : { duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }
        }
      >
        <span className="grid h-full w-full place-items-center rounded-full border border-white/70 bg-[color:var(--card)]/95 text-center shadow-[inset_0_0_30px_rgba(0,0,0,0.07)] backdrop-blur-xl dark:border-black/20 dark:shadow-[inset_0_0_34px_rgba(0,0,0,0.42)]">
          <span className="grid justify-items-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#ff5722] text-white shadow-lg dark:bg-[#e2ff00] dark:text-black">
              <Check className="h-7 w-7 stroke-[3]" />
            </span>
            <strong className="mt-3 font-condensed text-6xl font-black uppercase leading-none text-[color:var(--text)]">
              Listo
            </strong>
            <span className="mt-2 font-condensed text-sm font-black uppercase text-[color:var(--text-muted)]">
              Descanso terminado
            </span>
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
