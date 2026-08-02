import PropTypes from "prop-types";
import { ChevronLeft, Zap } from "lucide-react";

const images = {
  login:
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80",
  register:
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80",
  recover:
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80",
};

function PremiumAuthLayout({
  variant = "login",
  title,
  subtitle,
  eyebrow,
  children,
  footer,
  onBack,
  heroCompact = false,
  hideHeroOnMobile = false,
}) {
  const image = images[variant] || images.login;

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#060b16] text-white lg:p-4 2xl:p-6">
      <div
        className="fixed inset-0 pointer-events-none opacity-35"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(148,163,184,0.35) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
        aria-hidden="true"
      />
      <div className="relative mx-auto flex min-h-dvh w-full items-stretch justify-center lg:min-h-[calc(100dvh-2rem)] lg:max-w-[1440px] 2xl:min-h-[calc(100dvh-3rem)] 2xl:max-w-[1680px] 2xl:items-center">
        <section className="relative min-h-dvh w-full overflow-hidden bg-slate-950 shadow-2xl shadow-black/40 lg:min-h-[max(670px,calc(100dvh-2rem))] lg:rounded-lg lg:border lg:border-white/15 2xl:min-h-[900px]">
          <img
            src={image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-slate-950/72" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/72 to-slate-950" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(59,130,246,0.22),transparent_38%),radial-gradient(circle_at_50%_100%,rgba(79,70,229,0.25),transparent_45%)]" />

          <div className="relative flex min-h-dvh flex-col px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] sm:px-6 lg:grid lg:min-h-[max(670px,calc(100dvh-2rem))] lg:grid-cols-[minmax(0,1.15fr)_minmax(400px,0.85fr)] lg:grid-rows-[auto_minmax(0,1fr)_auto] lg:px-0 lg:py-0 2xl:min-h-[900px] 2xl:grid-cols-[minmax(0,1.2fr)_minmax(460px,0.8fr)]">
            <div className="flex min-h-10 items-center justify-between lg:px-10 lg:pt-10 2xl:px-12">
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-blue-100 backdrop-blur transition hover:bg-white/15"
                  aria-label="Volver"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              ) : (
                <div className="inline-flex items-center gap-2 px-1 text-sm font-black uppercase text-blue-100">
                  <Zap className="h-5 w-5 fill-blue-300 text-blue-300" />
                  Apex Performance
                </div>
              )}
            </div>

            <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 pb-1 sm:max-w-md lg:contents">
              <div
                className={`text-center lg:flex lg:flex-col lg:justify-center lg:px-12 lg:pb-20 lg:text-left 2xl:px-16 ${
                  hideHeroOnMobile ? "hidden lg:flex" : ""
                } ${heroCompact ? "mt-8 lg:mt-0" : "mt-10 lg:mt-0"}`}
              >
                {eyebrow ? (
                  <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-lg bg-blue-200 text-blue-950 shadow-lg shadow-blue-500/20 lg:mx-0">
                    <Zap className="h-7 w-7 fill-blue-600 text-blue-600" />
                  </div>
                ) : null}
                {!eyebrow && variant === "register" ? (
                  <Zap className="mx-auto mb-4 h-7 w-7 fill-blue-300 text-blue-300 lg:mx-0" />
                ) : null}
                <h1 className="text-3xl font-black leading-tight text-white drop-shadow max-[700px]:text-2xl lg:max-w-xl lg:text-5xl 2xl:text-6xl">
                  {title}
                </h1>
                <p className="mx-auto mt-2 max-w-[280px] text-sm font-semibold leading-6 text-blue-50/85 max-[700px]:leading-5 lg:mx-0 lg:mt-4 lg:max-w-md lg:text-base lg:leading-7 2xl:text-lg">
                  {subtitle}
                </p>
              </div>

              <div className="w-full rounded-lg border border-white/10 bg-slate-900/70 p-4 shadow-xl shadow-black/25 backdrop-blur-md sm:p-5 lg:col-start-2 lg:row-start-1 lg:row-end-3 lg:mx-auto lg:my-16 lg:w-[min(440px,calc(100%-3rem))] lg:self-center lg:p-6 2xl:w-[480px]">
                {children}
              </div>
            </div>

            <div className="mx-auto w-full max-w-sm pt-4 max-[700px]:pt-3 sm:max-w-md lg:col-start-2 lg:mx-auto lg:w-[min(440px,calc(100%-3rem))] lg:max-w-none lg:pb-7 2xl:w-[480px]">
              {footer}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

PremiumAuthLayout.propTypes = {
  variant: PropTypes.oneOf(["login", "register", "recover"]),
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  eyebrow: PropTypes.bool,
  children: PropTypes.node.isRequired,
  footer: PropTypes.node,
  onBack: PropTypes.func,
  heroCompact: PropTypes.bool,
  hideHeroOnMobile: PropTypes.bool,
};

export default PremiumAuthLayout;
