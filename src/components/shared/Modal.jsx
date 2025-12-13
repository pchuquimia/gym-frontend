function Modal({ title, subtitle, children, onClose, footer }) {
  return (
    <div className="fixed inset-0 bg-black/60 grid place-items-center p-4 z-50" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl bg-card border border-border-soft rounded-2xl shadow-soft p-4 max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold">{title}</h3>
            {subtitle && <p className="muted">{subtitle}</p>}
          </div>
          <button type="button" className="ghost-btn" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <div className="my-3 overflow-y-auto pr-1 flex-1">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 pt-2">{footer}</div>}
      </div>
    </div>
  )
}

export default Modal
