import PropTypes from "prop-types";
import { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { BrandMark, BrandWordmark } from "../brand/BrandIdentity";

function PremiumAuthLayout({
  variant = "login",
  title,
  subtitle,
  heroTitle,
  heroSubtitle,
  children,
  footer,
  onBack,
}) {
  const layoutRef = useRef(null);
  const heroImage =
    variant === "register"
      ? "/images/rirfit-auth-register.webp"
      : "/images/rirfit-auth-gym.webp";

  useEffect(() => {
    const viewport = window.visualViewport;
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
  }, []);

  return (
    <main
      ref={layoutRef}
      style={{ "--auth-height": "100dvh" }}
      className="auth-shell min-h-[var(--auth-height)] w-full bg-[color:var(--auth-bg)] text-[color:var(--auth-text)]"
    >
      <section className="mx-auto flex min-h-[var(--auth-height)] w-full flex-col lg:grid lg:grid-cols-[44%_56%]">
        <aside
          className={`auth-hero auth-hero-${variant} relative flex min-h-[21rem] shrink-0 flex-col overflow-hidden px-7 pb-8 pt-[calc(2rem+env(safe-area-inset-top))] sm:px-12 lg:sticky lg:top-0 lg:h-[var(--auth-height)] lg:min-h-0 lg:px-14 lg:py-14 2xl:px-20 2xl:py-16`}
        >
          <img
            src={heroImage}
            alt=""
            aria-hidden="true"
            className="auth-hero-image absolute inset-0 h-full w-full object-cover"
          />
          <div className="auth-hero-overlay absolute inset-0" aria-hidden="true" />

          <div className="relative flex items-center justify-between gap-5">
            <p className="font-display text-xl font-semibold tracking-tight text-[color:var(--auth-hero-text)] lg:text-2xl">
              {heroTitle || "¡Bienvenido!"}
            </p>
            <span className="flex shrink-0 items-center gap-2">
              <BrandWordmark
                className="text-xl text-white sm:text-2xl"
                accentClassName="text-[color:var(--auth-accent)]"
              />
              <span className="auth-hero-mark grid h-9 w-9 place-items-center rounded-full bg-[color:var(--auth-accent)] text-[#171815] sm:h-10 sm:w-10">
                <BrandMark className="h-5 w-5" />
              </span>
            </span>
          </div>

          <div className="min-h-24 flex-1" aria-hidden="true" />

          <div className="relative">
            {heroSubtitle ? (
              <p className="mb-3 max-w-sm text-sm font-medium leading-6 text-[color:var(--auth-hero-muted)]">
                {heroSubtitle}
              </p>
            ) : null}
            {footer}
          </div>
        </aside>

        <section className="auth-content-panel flex min-h-[calc(var(--auth-height)-21rem)] flex-1 flex-col px-7 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-11 sm:px-12 lg:h-[var(--auth-height)] lg:min-h-0 lg:overflow-y-auto lg:px-16 lg:py-14 2xl:px-24">
          <div className="mx-auto flex w-full max-w-[25rem] flex-1 flex-col lg:my-auto lg:flex-none lg:justify-center lg:py-8">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="mb-8 inline-flex w-fit items-center gap-2 text-sm font-semibold text-[color:var(--auth-muted)] transition hover:text-[color:var(--auth-text)] focus-visible:ring-[color:var(--auth-accent)]"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </button>
            ) : null}

            <header className="mb-8">
              <h1 className="font-display text-[22px] font-medium tracking-tight text-[color:var(--auth-text)] lg:text-2xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-2 max-w-sm text-sm font-normal leading-6 text-[color:var(--auth-muted)]">
                  {subtitle}
                </p>
              ) : null}
            </header>

            <div>{children}</div>
          </div>
        </section>
      </section>
    </main>
  );
}

PremiumAuthLayout.propTypes = {
  variant: PropTypes.oneOf(["login", "register", "recover"]),
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  heroTitle: PropTypes.string,
  heroSubtitle: PropTypes.string,
  children: PropTypes.node.isRequired,
  footer: PropTypes.node,
  onBack: PropTypes.func,
};

export default PremiumAuthLayout;
