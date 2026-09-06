import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { googleClientId } from "../../config/googleAuth";

const GOOGLE_SCRIPT_ID = "google-identity-services";
const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
let scriptPromise;

const loadGoogleIdentityServices = () => {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_SCRIPT_ID);
    const script = existing || document.createElement("script");
    const handleLoad = () => resolve(window.google);
    const handleError = () => {
      scriptPromise = undefined;
      reject(new Error("No se pudo cargar Google Identity Services."));
    };

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });

    if (!existing) {
      script.id = GOOGLE_SCRIPT_ID;
      script.src = GOOGLE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });

  return scriptPromise;
};

export default function GoogleSignInButton({
  disabled = false,
  onCredential,
  onError,
}) {
  const containerRef = useRef(null);
  const credentialHandlerRef = useRef(onCredential);
  const errorHandlerRef = useRef(onError);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    credentialHandlerRef.current = onCredential;
    errorHandlerRef.current = onError;
  }, [onCredential, onError]);

  useEffect(() => {
    if (!googleClientId) return undefined;
    let active = true;

    loadGoogleIdentityServices()
      .then((google) => {
        if (!active || !containerRef.current || !google?.accounts?.id) return;

        google.accounts.id.initialize({
          client_id: googleClientId,
          callback: ({ credential }) => {
            if (credential) credentialHandlerRef.current(credential);
            else
              errorHandlerRef.current?.(
                new Error("Google no devolvió una credencial válida."),
              );
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        containerRef.current.replaceChildren();
        google.accounts.id.renderButton(containerRef.current, {
          type: "standard",
          theme: "filled_black",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
          locale: "es",
          width: Math.min(400, Math.max(240, containerRef.current.clientWidth)),
        });
        setReady(true);
      })
      .catch((error) => {
        if (active) errorHandlerRef.current?.(error);
      });

    return () => {
      active = false;
    };
  }, []);

  if (!googleClientId) return null;

  return (
    <div
      className={`flex min-h-11 w-full justify-center overflow-hidden rounded-control transition ${
        disabled ? "pointer-events-none opacity-55" : ""
      }`}
      aria-busy={!ready || disabled}
    >
      <div ref={containerRef} className="flex w-full justify-center" />
    </div>
  );
}

GoogleSignInButton.propTypes = {
  disabled: PropTypes.bool,
  onCredential: PropTypes.func.isRequired,
  onError: PropTypes.func,
};
