import PropTypes from "prop-types";
import { useEffect } from "react";
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
  const lockMobileViewport =
    variant === "login" || variant === "recover" || variant === "register";

  useEffect(() => {
    if (!lockMobileViewport) return undefined;

    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscroll = body.style.overscrollBehavior;
    const previousBodyPosition = body.style.position;
    const previousBodyWidth = body.style.width;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    body.style.position = "fixed";
    body.style.width = "100%";

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscroll;
      body.style.position = previousBodyPosition;
      body.style.width = previousBodyWidth;
    };
  }, [lockMobileViewport]);

  return (
    <main
      className={`bg-[#060b16] text-white sm:min-h-screen sm:px-4 sm:py-4 ${
        lockMobileViewport
          ? "box-border h-dvh touch-none overflow-hidden overscroll-none"
          : "min-h-dvh"
      }`}
    >
      <div
        className="fixed inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(148,163,184,0.35) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
        aria-hidden="true"
      />
      <div
        className={`relative mx-auto flex w-full items-stretch justify-center sm:min-h-[calc(100vh-2rem)] sm:max-w-sm sm:items-center lg:max-w-5xl ${
          lockMobileViewport ? "box-border h-dvh" : "min-h-dvh"
        }`}
      >
        <section
          className={`relative w-full overflow-hidden bg-slate-950 shadow-2xl shadow-black/40 sm:min-h-[680px] sm:rounded-2xl sm:border sm:border-white/15 lg:min-h-[720px] ${
            lockMobileViewport
              ? "box-border h-dvh overscroll-none"
              : "min-h-dvh"
          }`}
        >
          <img
            src={image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-slate-950/72" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/72 to-slate-950" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(59,130,246,0.22),transparent_38%),radial-gradient(circle_at_50%_100%,rgba(79,70,229,0.25),transparent_45%)]" />

          <div
            className={`relative flex flex-col px-5 sm:min-h-[680px] sm:px-4 lg:grid lg:min-h-[720px] lg:grid-cols-[1.05fr_0.95fr] lg:grid-rows-[auto_1fr_auto] lg:px-0 lg:py-0 ${
              lockMobileViewport ? "box-border h-dvh py-3" : "min-h-dvh py-5"
            }`}
          >
            <div className="flex min-h-10 items-center justify-between lg:px-8 lg:pt-8">
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
                <div className="inline-flex items-center gap-2 px-2 text-sm font-black uppercase tracking-tight text-blue-100">
                  <Zap className="h-5 w-5 fill-blue-300 text-blue-300" />
                  Apex Performance
                </div>
              )}
            </div>

            <div
              className={`lg:contents ${
                lockMobileViewport
                  ? "mx-auto flex min-h-0 w-full max-w-sm flex-1 flex-col justify-center gap-4 pb-3"
                  : ""
              }`}
            >
              <div
                className={`text-center lg:flex lg:flex-col lg:justify-center lg:px-10 lg:pb-20 lg:text-left ${
                  hideHeroOnMobile ? "hidden lg:flex" : ""
                } ${
                  lockMobileViewport
                    ? ""
                    : heroCompact
                      ? "mt-8 lg:mt-0"
                      : "mt-10 lg:mt-0"
                }`}
              >
                {eyebrow ? (
                  <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-blue-200 text-blue-950 shadow-lg shadow-blue-500/20 lg:mx-0">
                    <Zap className="h-7 w-7 fill-blue-600 text-blue-600" />
                  </div>
                ) : null}
                {!eyebrow && variant === "register" ? (
                  <Zap className="mx-auto mb-4 h-7 w-7 fill-blue-300 text-blue-300 lg:mx-0" />
                ) : null}
                <h1 className="text-3xl font-black leading-tight tracking-tight text-white drop-shadow max-[700px]:text-2xl lg:max-w-md lg:text-5xl">
                  {title}
                </h1>
                <p className="mx-auto mt-2 max-w-[280px] text-sm font-semibold leading-6 text-blue-50/85 max-[700px]:leading-5 lg:mx-0 lg:mt-4 lg:max-w-sm lg:text-base lg:leading-7">
                  {subtitle}
                </p>
              </div>

              <div
                className={`w-full rounded-2xl border border-white/10 bg-slate-900/55 p-4 shadow-xl shadow-black/25 backdrop-blur-md max-[700px]:p-3 lg:col-start-2 lg:row-start-1 lg:row-end-3 lg:mx-8 lg:mt-0 lg:self-center lg:p-6 ${
                  lockMobileViewport ? "" : "mt-4"
                }`}
              >
                {children}
              </div>
            </div>

            <div className="mx-auto w-full max-w-sm pt-4 max-[700px]:pt-3 lg:col-start-2 lg:mx-8 lg:max-w-none lg:pb-8">
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
