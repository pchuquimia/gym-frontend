import { useState } from 'react'
import TopBar from '../components/layout/TopBar'
import { useUserProfile } from '../context/UserContext'

function ProfileSettings() {
  const { profile, updateProfile } = useUserProfile()
  const [localProfile, setLocalProfile] = useState(profile)

  const handleChange = (field, value) => {
    setLocalProfile((prev) => ({ ...prev, [field]: value }))
  }

  const handleNotif = (key, value) => {
    setLocalProfile((prev) => ({ ...prev, notifications: { ...prev.notifications, [key]: value } }))
  }

  const saveSection = (fields) => {
    const payload = {}
    fields.forEach((f) => {
      if (f in localProfile) payload[f] = localProfile[f]
    })
    updateProfile(payload)
  }

  return (
    <>
      <TopBar title="Perfil y Ajustes (Navegación Completa)" subtitle="Configura tus datos y preferencias." />

      <section className="card flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Información Personal</h3>
          <button className="primary-btn text-sm" onClick={() => saveSection(['weight', 'height'])}>
            Guardar Cambios
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p className="label">Peso Corporal</p>
            <input
              type="number"
              className="rounded-full border border-border-soft bg-white/5 px-4 py-3 text-white"
              value={localProfile.weight}
              onChange={(e) => handleChange('weight', Number(e.target.value) || 0)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="label">Estatura</p>
            <input
              type="number"
              className="rounded-full border border-border-soft bg-white/5 px-4 py-3 text-white"
              value={localProfile.height}
              onChange={(e) => handleChange('height', Number(e.target.value) || 0)}
            />
          </div>
        </div>
      </section>

      <section className="card flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Objetivos y Estado Físico</h3>
          <button className="primary-btn text-sm" onClick={() => saveSection(['goal', 'calories'])}>
            Guardar Cambios
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p className="label">Estado Actual</p>
            <select
              className="rounded-full border border-border-soft bg-white/5 px-4 py-3 text-white"
              value={localProfile.goal}
              onChange={(e) => handleChange('goal', e.target.value)}
            >
              <option value="volumen">Volumen</option>
              <option value="mantenimiento">Mantenimiento</option>
              <option value="definicion">Definición</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <p className="label">Cantidad de Calorías Consumidas</p>
            <input
              type="number"
              className="rounded-full border border-border-soft bg-white/5 px-4 py-3 text-white"
              value={localProfile.calories}
              onChange={(e) => handleChange('calories', Number(e.target.value) || 0)}
            />
          </div>
        </div>
      </section>

      <section className="card flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Preferencias de la Aplicación</h3>
          <button className="primary-btn text-sm" onClick={() => saveSection(['units', 'notifications'])}>
            Guardar Cambios
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p className="label">Unidades</p>
            <select
              className="rounded-full border border-border-soft bg-white/5 px-4 py-3 text-white"
              value={localProfile.units}
              onChange={(e) => handleChange('units', e.target.value)}
            >
              <option value="metric">Métrico (kg)</option>
              <option value="imperial">Imperial (lb)</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <p className="label">Notificaciones</p>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={localProfile.notifications.push}
                  onChange={(e) => handleNotif('push', e.target.checked)}
                />
                Push
              </label>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={localProfile.notifications.email}
                  onChange={(e) => handleNotif('email', e.target.checked)}
                />
                Email
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className="card flex flex-col gap-3">
        <h3 className="text-lg font-semibold">Gestión de Cuenta</h3>
        <div className="flex flex-wrap gap-3">
          <button className="ghost-btn">Cambiar Contraseña</button>
          <button className="ghost-btn border-accent-red/60 text-accent-red">Eliminar Cuenta</button>
        </div>
      </section>
    </>
  )
}

export default ProfileSettings
