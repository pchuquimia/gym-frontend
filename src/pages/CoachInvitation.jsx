import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  ArrowRight,
  Check,
  Dumbbell,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import {
  clearCoachInvitation,
  storeCoachInvitation,
} from "../utils/coachInvitation";
import { needsOnboarding } from "../utils/userFlow";

const initials = (name = "") =>
  String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "C";

export default function CoachInvitation({ token, onNavigate = () => {} }) {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");
  const [transferRequired, setTransferRequired] = useState(false);
  const coachInitials = useMemo(
    () => initials(invitation?.coach?.name),
    [invitation?.coach?.name],
  );

  useEffect(() => {
    let active = true;
    storeCoachInvitation(token);
    setLoading(true);
    api
      .getCoachInvitation(token)
      .then((data) => {
        if (active) setInvitation(data);
      })
      .catch((requestError) => {
        if (active) {
          if ([404, 410].includes(requestError.status)) {
            clearCoachInvitation();
          }
          setError(
            requestError.message || "Esta invitación no está disponible.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const continueTo = (page) => {
    storeCoachInvitation(token);
    onNavigate(page);
  };

  const acceptInvitation = async (confirmTransfer = false) => {
    if (accepting) return;
    setAccepting(true);
    setError("");
    try {
      const result = await api.acceptCoachInvitation(token, confirmTransfer);
      clearCoachInvitation();
      const refreshedUser = await refreshUser({ force: true });
      const nextUser = refreshedUser || result?.user || user;
      onNavigate(needsOnboarding(nextUser) ? "onboarding" : "dashboard", {
        replace: true,
      });
    } catch (requestError) {
      if (requestError.code === "COACH_TRANSFER_CONFIRMATION_REQUIRED") {
        setTransferRequired(true);
      } else {
        setError(requestError.message || "No pudimos aceptar la invitación.");
      }
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-[#f4f1e9] px-6 text-[#171816]">
        <div className="text-center">
          <span className="mx-auto block h-12 w-12 animate-pulse rounded-full bg-black/10" />
          <p className="mt-5 text-sm font-medium text-black/55">
            Preparando tu invitación…
          </p>
        </div>
      </main>
    );
  }

  if (error && !invitation) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-[#f4f1e9] px-6 text-[#171816]">
        <section className="w-full max-w-md rounded-[28px] border border-black/10 bg-white/75 p-7 text-center shadow-[0_24px_70px_rgba(20,20,18,0.08)]">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-black text-white">
            <Dumbbell className="h-6 w-6" />
          </span>
          <h1 className="mt-6 text-3xl font-bold tracking-[-0.045em]">
            Invitación no disponible
          </h1>
          <p className="mt-3 text-sm leading-6 text-black/55">{error}</p>
          <button
            type="button"
            onClick={() => onNavigate("login")}
            className="mt-7 h-12 w-full rounded-full bg-[#191a19] text-sm font-semibold text-white"
          >
            Ir a Rirfit
          </button>
        </section>
      </main>
    );
  }

  const coachName = invitation?.coach?.name || "Tu coach";
  const isAthlete = user?.role === "Cliente";

  return (
    <main className="min-h-[100dvh] bg-[#f4f1e9] px-5 py-[max(1.5rem,env(safe-area-inset-top))] text-[#171816] sm:grid sm:place-items-center sm:px-8">
      <section className="mx-auto w-full max-w-[460px] overflow-hidden rounded-[32px] border border-black/10 bg-[#fbfaf6] shadow-[0_30px_90px_rgba(25,25,20,0.09)]">
        <div className="px-6 pb-7 pt-8 text-center sm:px-9 sm:pt-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/45">
            Invitación privada
          </p>
          <div className="relative mx-auto mt-7 grid h-24 w-24 place-items-center rounded-full bg-[#191a19] text-2xl font-bold text-white shadow-[0_16px_38px_rgba(10,10,10,0.18)]">
            {coachInitials}
            <span className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border-4 border-[#fbfaf6] bg-[#d9ef65] text-black">
              <Check className="h-4 w-4" strokeWidth={3} />
            </span>
          </div>
          <h1 className="mt-7 text-[34px] font-bold leading-[1.02] tracking-[-0.055em]">
            {coachName} te invita a entrenar
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-[15px] leading-6 text-black/58">
            Crea tu cuenta y tu perfil quedará conectado automáticamente con tu
            coach.
          </p>

          <div className="mt-7 grid grid-cols-2 gap-2.5 text-left">
            <div className="rounded-[18px] bg-black/[0.045] p-4">
              <UserRound className="h-5 w-5" strokeWidth={1.8} />
              <p className="mt-3 text-sm font-semibold">Seguimiento personal</p>
            </div>
            <div className="rounded-[18px] bg-black/[0.045] p-4">
              <ShieldCheck className="h-5 w-5" strokeWidth={1.8} />
              <p className="mt-3 text-sm font-semibold">Acceso privado</p>
            </div>
          </div>

          {transferRequired ? (
            <div className="mt-6 rounded-[20px] border border-amber-300 bg-amber-50 p-4 text-left">
              <p className="text-sm font-semibold">Ya tienes otro coach</p>
              <p className="mt-1 text-xs leading-5 text-black/60">
                Confirma únicamente si deseas cambiar tu seguimiento a{" "}
                {coachName}.
              </p>
              <button
                type="button"
                onClick={() => acceptInvitation(true)}
                disabled={accepting}
                className="mt-4 h-11 w-full rounded-full bg-[#191a19] text-sm font-semibold text-white disabled:opacity-50"
              >
                {accepting ? "Conectando…" : "Confirmar cambio de coach"}
              </button>
            </div>
          ) : null}

          {error ? (
            <p className="mt-5 text-sm font-medium text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          {!isAuthenticated ? (
            <div className="mt-7 space-y-3">
              <button
                type="button"
                onClick={() => continueTo("register")}
                className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#191a19] px-5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
              >
                Crear mi cuenta <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => continueTo("login")}
                className="h-12 w-full rounded-full border border-black/15 bg-transparent text-sm font-semibold"
              >
                Ya tengo una cuenta
              </button>
            </div>
          ) : isAthlete && !transferRequired ? (
            <button
              type="button"
              onClick={() => acceptInvitation(false)}
              disabled={accepting}
              className="mt-7 flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#191a19] px-5 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              {accepting ? "Conectando…" : "Aceptar invitación"}
              {!accepting ? <ArrowRight className="h-4 w-4" /> : null}
            </button>
          ) : !isAthlete ? (
            <p className="mt-7 rounded-[18px] bg-black/[0.045] px-4 py-3 text-sm leading-5 text-black/60">
              Abre este enlace con una cuenta de alumno para aceptar la
              invitación.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

CoachInvitation.propTypes = {
  token: PropTypes.string.isRequired,
  onNavigate: PropTypes.func,
};
