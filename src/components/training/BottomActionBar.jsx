import PropTypes from "prop-types";
import { motion } from "framer-motion";

export default function BottomActionBar({ onFinish, onCancel, disabled = false, durationSeconds }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-[color:var(--border)] bg-[color:var(--card)]/95 backdrop-blur shadow-lg px-4 py-3">
      <div className="max-w-md mx-auto flex items-center gap-3">
        <div className="flex-1 flex gap-2">
          {onCancel && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={onCancel}
              className="w-1/2 rounded-full py-3 text-sm font-semibold border border-[color:var(--border)] text-[color:var(--text)] bg-[color:var(--card)] shadow-sm hover:bg-[color:var(--bg)] transition-colors"
            >
              Cancelar
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={onFinish}
            disabled={disabled}
            className={`flex-1 rounded-full py-3 text-sm font-semibold text-white shadow-sm ${
              disabled ? "bg-slate-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            Finalizar Entrenamiento
          </motion.button>
        </div>
        <div className="text-[11px] text-[color:var(--text-muted)] font-semibold text-right leading-tight">
          <p>Duración</p>
          <p className="text-sm text-[color:var(--text)]">
            {String(Math.floor(durationSeconds / 60)).padStart(2, "0")}:
            {String(durationSeconds % 60).padStart(2, "0")}
          </p>
        </div>
      </div>
    </div>
  );
}

BottomActionBar.propTypes = {
  onFinish: PropTypes.func.isRequired,
  onCancel: PropTypes.func,
  disabled: PropTypes.bool,
  durationSeconds: PropTypes.number.isRequired,
};
