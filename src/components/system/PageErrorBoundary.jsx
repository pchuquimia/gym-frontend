import { Component } from "react";
import PropTypes from "prop-types";
import { AlertTriangle, House, RotateCcw } from "lucide-react";

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
  }

  componentDidUpdate(previousProps) {
    if (
      previousProps.resetKey !== this.props.resetKey &&
      this.state.error
    ) {
      this.setState({ error: null });
    }
  }

  handleRetry = () => {
    this.setState({ error: null });
    window.dispatchEvent(new Event("app-page-retry"));
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <section
        role="alert"
        className="mx-auto grid min-h-[55dvh] w-full max-w-md place-items-center px-3 py-10 text-center"
      >
        <div className="w-full border border-[color:var(--border)] bg-[color:var(--card)] p-6 shadow-sm dark:shadow-none">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#fff0eb] text-[#ff5722] dark:bg-[#e2ff00]/10 dark:text-[#e2ff00]">
            <AlertTriangle className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-xl font-black uppercase">
            No pudimos mostrar esta pagina
          </h1>
          <p className="mt-2 text-sm font-semibold text-[color:var(--text-muted)]">
            Tus datos siguen guardados. Reintenta la carga o vuelve a Inicio.
          </p>
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
