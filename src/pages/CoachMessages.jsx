import { MessageCircle, Search } from "lucide-react";
import ProfileAvatar from "../components/profile/ProfileAvatar";
import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "../context/UserContext";

export default function CoachMessages() {
  const { user } = useAuth();
  const { profile } = useUserProfile();

  return (
    <main className="mx-auto w-full max-w-[920px] pb-24 text-[color:var(--text)] sm:pb-12">
      <header className="flex min-h-16 items-center justify-between gap-3 px-1 sm:px-0">
        <h1 className="text-[30px] font-semibold leading-none tracking-[-0.05em] sm:text-[36px]">
          Mensajes
        </h1>
        <ProfileAvatar
          photoId={profile?.avatarPhotoId || user?.profile?.avatarPhotoId}
          name={user?.name}
          className="h-12 w-12 rounded-full border border-[color:var(--border)] bg-[color:var(--card)] text-sm font-semibold"
        />
      </header>

      <label className="relative mt-7 block">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
        <input
          type="search"
          placeholder="Buscar conversación"
          disabled
          className="h-12 w-full rounded-full border border-[color:var(--border)] bg-[color:var(--card)] pl-11 pr-4 text-sm outline-none disabled:opacity-70"
        />
      </label>

      <section className="mt-4 grid min-h-[360px] place-items-center rounded-[28px] border border-[color:var(--border)] bg-[color:var(--card)] px-6 text-center">
        <div className="max-w-[280px]">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[color:var(--bg)]">
            <MessageCircle className="h-6 w-6" strokeWidth={1.6} />
          </span>
          <h2 className="mt-5 text-xl font-semibold tracking-[-0.035em]">
            Conversaciones con tus alumnos
          </h2>
          <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
            Este espacio está preparado para la mensajería del coach. Tus
            conversaciones aparecerán aquí cuando activemos el servicio.
          </p>
        </div>
      </section>
    </main>
  );
}
