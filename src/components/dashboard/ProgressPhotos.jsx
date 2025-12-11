function ProgressPhotos({ photos }) {
  const data = (photos || []).slice(0, 6)
  if (!data.length) {
    return (
      <section className="card" id="fotos">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-lg font-semibold">Widget de Fotos de Progreso</h4>
          <span className="text-accent font-semibold">Ver Galería Completa</span>
        </div>
        <p className="text-sm text-muted">Aún no hay fotos de progreso registradas.</p>
      </section>
    )
  }

  return (
    <section className="card" id="fotos">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-lg font-semibold">Widget de Fotos de Progreso</h4>
        <a className="text-accent font-semibold" href="#galeria">
          Ver Galería Completa
        </a>
      </div>
      <div className="grid gap-3 grid-cols-3">
        {data.map((photo) => (
          <div key={photo.id} className="relative overflow-hidden rounded-lg border border-border-soft">
            <img src={photo.url || photo.src} alt={photo.label || 'Foto de progreso'} loading="lazy" className="w-full h-28 object-cover" />
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[10px] text-white px-2 py-1 flex justify-between">
              <span>{photo.label}</span>
              <span>{photo.type === 'home' ? 'Privada' : 'Gym'}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default ProgressPhotos
