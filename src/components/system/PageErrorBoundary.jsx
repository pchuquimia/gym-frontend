import { Component } from "react";
import PropTypes from "prop-types";
import { AlertTriangle, House, RotateCcw } from "lucide-react";

const getErrorCode = (error) => {
  const source = `${error?.name || "Error"}:${error?.message || "unknown"}`;
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  return `APX-${hash.toString(16).toUpperCase().padStart(6, "0").slice(-6)}`;
};

export default class PageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("No se pudo mostrar la pagina activa", error, info);
    try {
      window.localStorage.setItem(
        "last_page_error",
        JSON.stringify({
          code: getErrorCode(error),
          message: error?.message || "Error desconocido",
          page: this.props.resetKey,
          occurredAt: new Date().toISOString(),
          userAgent: window.navigator.userAgent,
        }),
      );
    } catch {
      // The fallback remains usable when browser storage is unavailable.
    }
  }

  componentDidUpdate(previousProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  handleRetry = () => {
    this.setState({ error: null });
    window.dispatchEvent(new Event("app-page-retry"));
  };

  render() {
    if (!this.state.error) return this.props.children;
    const errorCode = getErrorCode(this.state.error);

    return (
      <section
        role="alert"
        className="mx-auto grid min-h-[55dvh] w-full max-w-md place-items-center px-3 py-10 text-center"
      >
        <div className="w-full border border-[color:var(--border)] bg-[color:var(--card)] p-6 shadow-sm dark:shadow-none">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[color:var(--accent)] text-[color:var(--accent-contrast)]">
            <AlertTriangle className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-xl font-black uppercase">
            No pudimos mostrar esta pagina
          </h1>
          <p className="mt-2 text-sm font-semibold text-[color:var(--text-muted)]">
            Tus datos siguen guardados. Reintenta la carga o vuelve a Inicio.
          </p>
          <details className="mt-4 border border-[color:var(--border)] px-3 py-2 text-left">
            <summary className="cursor-pointer text-xs font-black uppercase text-[color:var(--text-muted)]">
              Diagnostico {errorCode}
            </summary>
            <p className="mt-2 break-words text-xs font-semibold text-[color:var(--text-muted)]">
              {this.state.error?.message || "Error desconocido"}
            </p>
          </details>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={this.props.onGoHome}
              className="inline-flex h-11 items-center justify-center gap-2 border border-[color:var(--border)] px-3 text-xs font-black uppercase"
            >
              <House className="h-4 w-4" />
              Inicio
            </button>
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex h-11 items-center justify-center gap-2 bg-[#ff5722] px-3 text-xs font-black uppercase text-white dark:bg-[#e2ff00] dark:text-black"
            >
              <RotateCcw className="h-4 w-4" />
              Reintentar
            </button>
          </div>
        </div>
      </section>
    );
  }
}

PageErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  onGoHome: PropTypes.func.isRequired,
  resetKey: PropTypes.string.isRequired,
};
