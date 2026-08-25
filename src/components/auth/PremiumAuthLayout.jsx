import PropTypes from "prop-types";
import { useEffect, useRef } from "react";
import { ArrowLeft, Zap } from "lucide-react";

const images = {
  login:
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1600&q=85",
  register:
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1600&q=85",
  recover:
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1600&q=85",
};

function PremiumAuthLayout({
  variant = "login",
  title,
  subtitle,
  children,
  footer,
  onBack,
}) {
  const layoutRef = useRef(null);
  const image = images[variant] || images.login;

  useEffect(() => {
    const viewport = window.visualViewport;
    Object.values(images)
      .filter((url) => url !== image)
      .forEach((url) => {
        const asset = new window.Image();
        asset.src = url;
      });
    const updateViewportHeight = () => {
      const height = Math.round(viewport?.height || window.innerHeight);
      layoutRef.current?.style.setProperty("--auth-height", `${height}px`);
    };
    updateViewportHeight();
    viewport?.addEventListener("resize", updateViewportHeight);
    window.addEventListener("resize", updateViewportHeight);
    return () => {
      viewport?.removeEventListener("resize", updateViewportHeight);
      window.removeEventListener("resize", updateViewportHeight);
    };
  }, [image]);

  return (
    <main
      ref={layoutRef}
      style={{ "--auth-height": "100dvh" }}
      className="auth-shell min-h-[var(--auth-height)] w-full overflow-x-hidden bg-[color:var(--auth-bg)] text-[color:var(--auth-text)]"
    >
      <section className="mx-auto flex min-h-[var(--auth-height)] w-full flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(480px,42vw)] xl:grid-cols-[minmax(0,1fr)_38rem] 2xl:grid-cols-[minmax(0,1fr)_42rem]">
        <div className="relative h-[13rem] shrink-0 overflow-hidden sm:h-[16rem] lg:sticky lg:top-0 lg:h-[var(--auth-height)]">
          <img
            src={image}
            alt=""
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-black/45" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[color:var(--auth-bg)] to-transparent lg:h-64 lg:from-black/80" />

          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 pt-[calc(1.25rem+env(safe-area-inset-top))] sm:px-8 lg:px-12 lg:pt-10 2xl:px-16">
            <div className="inline-flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-control bg-[color:var(--auth-accent)] text-[color:var(--auth-accent-contrast)] shadow-floating">
                <Zap className="h-5 w-5 fill-current" />
              </span>
              <div>
                <p className="font-display text-sm font-bold uppercase text-white">
                  Apex Performance
                </p>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
                  Training system
                </p>
              </div>
            </div>
          </div>

          <div className="absolute bottom-12 left-12 hidden max-w-2xl lg:block 2xl:bottom-16 2xl:left-16">
            <span className="mb-5 block h-1 w-14 bg-[color:var(--auth-accent)]" />
            <h1 className="font-display text-5xl font-bold leading-[1.06] text-white 2xl:text-6xl">
              {title}
            </h1>
            <p className="mt-5 max-w-lg text-lg font-medium leading-8 text-white/72 2xl:text-xl">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex min-h-[calc(var(--auth-height)-13rem)] flex-1 flex-col bg-[color:var(--auth-bg)] px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:min-h-[calc(var(--auth-height)-16rem)] sm:px-8 lg:h-[var(--auth-height)] lg:min-h-0 lg:overflow-y-auto lg:px-10 lg:pb-8 2xl:px-14">
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-7 sm:py-9 lg:my-auto lg:flex-none lg:py-10">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="mb-7 inline-flex h-11 w-fit items-center gap-2 rounded-control border border-[color:var(--auth-border)] px-3 font-sans text-sm font-semibold text-[color:var(--auth-muted)] transition hover:bg-[color:var(--auth-surface-hover)] hover:text-[color:var(--auth-text)] focus-visible:ring-[color:var(--auth-accent)]"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </button>
            ) : null}

            <header className="mb-7 lg:hidden">
              <span className="mb-4 block h-1 w-10 bg-[color:var(--auth-accent)]" />
              <h1 className="font-display text-3xl font-bold leading-tight text-white">
                {title}
              </h1>
              <p className="mt-2 text-sm font-medium leading-6 text-white/60">
                {subtitle}
              </p>
            </header>

            <div>{children}</div>

            {footer ? (
              <div className="mt-7 border-t border-white/10 pt-6">{footer}</div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}

PremiumAuthLayout.propTypes = {
  variant: PropTypes.oneOf(["login", "register", "recover"]),
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  footer: PropTypes.node,
  onBack: PropTypes.func,
};

export default PremiumAuthLayout;
