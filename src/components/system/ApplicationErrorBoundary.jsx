import { Component } from "react";
import PropTypes from "prop-types";
import { reloadForAssetError } from "../../utils/startupRecovery";

const getErrorCode = (error) => {
  const source = `${error?.name || "Error"}:${error?.message || "unknown"}`;
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  return `RIR-${hash.toString(16).toUpperCase().padStart(6, "0").slice(-6)}`;
};

const styles = {
  page: {
    minHeight: "100dvh",
    display: "grid",
    placeItems: "center",
    padding: "24px",
    background: "var(--bg, #faf8f1)",
    color: "var(--text, #171713)",
    fontFamily:
      'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  panel: {
    width: "min(420px, 100%)",
    padding: "28px",
    border: "1px solid var(--border, #ded9cf)",
    borderRadius: "24px",
    background: "var(--card, #fffdf8)",
    boxShadow: "0 18px 50px rgba(20, 18, 14, 0.1)",
    textAlign: "center",
  },
  mark: {
    width: "52px",
    height: "52px",
    margin: "0 auto 18px",
    display: "grid",
    placeItems: "center",
    borderRadius: "16px",
    background: "var(--text, #171713)",
    color: "var(--bg, #faf8f1)",
    fontWeight: 800,
    letterSpacing: "-0.06em",
  },
  title: { margin: 0, fontSize: "22px", lineHeight: 1.15 },
  copy: {
    margin: "10px auto 0",
    color: "var(--text-muted, #6f6a61)",
    fontSize: "14px",
    lineHeight: 1.5,
  },
  button: {
    width: "100%",
    minHeight: "48px",
    marginTop: "22px",
    border: 0,
    borderRadius: "999px",
    background: "var(--text, #171713)",
    color: "var(--bg, #faf8f1)",
    font: "inherit",
    fontWeight: 700,
    cursor: "pointer",
  },
  code: {
    display: "block",
    marginTop: "14px",
    color: "var(--text-muted, #6f6a61)",
    fontSize: "11px",
  },
};

export default class ApplicationErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, recovering: false };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    const recovering = reloadForAssetError(error);
    if (recovering) this.setState({ recovering: true });

    console.error("No se pudo iniciar RIRFIT", error, info);
    try {
      window.localStorage.setItem(
        "last_app_error",
        JSON.stringify({
          code: getErrorCode(error),
          message: error?.message || "Error desconocido",
          occurredAt: new Date().toISOString(),
          recovering,
        }),
      );
    } catch {
      // The recovery screen remains available without persistent storage.
    }
  }

  handleReload = () => window.location.reload();

  render() {
    if (!this.state.error) return this.props.children;

    const errorCode = getErrorCode(this.state.error);
    return (
      <main role="alert" style={styles.page}>
        <section style={styles.panel}>
          <div style={styles.mark} aria-hidden="true">
            RF
          </div>
          <h1 style={styles.title}>
            {this.state.recovering
              ? "Actualizando la aplicación"
              : "No pudimos abrir RIRFIT"}
          </h1>
          <p style={styles.copy}>
            {this.state.recovering
              ? "Detectamos una versión anterior y estamos cargando la más reciente."
              : "Tu información está segura. Recarga para intentar nuevamente."}
          </p>
          {!this.state.recovering ? (
            <button
              type="button"
              onClick={this.handleReload}
              style={styles.button}
            >
              Recargar aplicación
            </button>
          ) : null}
          <small style={styles.code}>Diagnóstico {errorCode}</small>
        </section>
      </main>
    );
  }
}

ApplicationErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
};
