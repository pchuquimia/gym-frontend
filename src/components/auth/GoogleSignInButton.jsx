import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { googleClientId } from "../../config/googleAuth";
import { API_URL } from "../../services/axiosConfig";

const GOOGLE_SCRIPT_ID = "google-identity-services";
const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
let scriptPromise;

const requiresRedirectMode = () => {
  if (typeof navigator === "undefined") return false;
  const userAgent = navigator.userAgent || "";
  return (
    /iPad|iPhone|iPod/i.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
};

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
  remember = false,
  text = "signin",
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
    let resizeObserver;
    let animationFrame = 0;
    let renderedWidth = 0;

    loadGoogleIdentityServices()
      .then(async (google) => {
        if (!active || !containerRef.current || !google?.accounts?.id) return;

        const useRedirect = requiresRedirectMode();
        let redirectState = "";
        if (useRedirect) {
          const response = await fetch(
            `${API_URL}/api/auth/google/prepare?remember=${remember ? "1" : "0"}`,
            {
              credentials: "include",
              headers: { Accept: "application/json" },
            },
          );
          if (!response.ok) {
            throw new Error("No pudimos preparar el acceso con Google.");
          }
          const data = await response.json();
          redirectState = String(data?.state || "");
          if (!redirectState) {
            throw new Error("Google no recibió un estado de acceso válido.");
          }
        }

        const googleConfig = {
          client_id: googleClientId,
          ux_mode: useRedirect ? "redirect" : "popup",
          auto_select: false,
          cancel_on_tap_outside: true,
        };

        if (useRedirect) {
          googleConfig.login_uri = `${API_URL}/api/auth/google/callback`;
        } else {
          googleConfig.callback = ({ credential }) => {
            if (credential) credentialHandlerRef.current(credential);
            else
              errorHandlerRef.current?.(
                new Error("Google no devolvió una credencial válida."),
              );
          };
        }

        google.accounts.id.initialize(googleConfig);

        const renderButton = () => {
          const container = containerRef.current;
          if (!active || !container) return;
          const nextWidth = Math.min(400, Math.floor(container.clientWidth));
          if (nextWidth < 100 || Math.abs(nextWidth - renderedWidth) < 2) {
            return;
          }

          renderedWidth = nextWidth;
          container.replaceChildren();
          google.accounts.id.renderButton(container, {
            type: "standard",
            theme: "outline",
            size: "large",
            text,
            shape: "pill",
            logo_alignment: "left",
            locale: "es",
            width: String(nextWidth),
            state: useRedirect ? redirectState : undefined,
          });
          setReady(true);
        };

        const scheduleRender = () => {
          window.cancelAnimationFrame(animationFrame);
          animationFrame = window.requestAnimationFrame(renderButton);
        };

        scheduleRender();
        resizeObserver = new ResizeObserver(scheduleRender);
        resizeObserver.observe(containerRef.current);
      })
      .catch((error) => {
        if (active) errorHandlerRef.current?.(error);
      });

    return () => {
      active = false;
      resizeObserver?.disconnect();
      window.cancelAnimationFrame(animationFrame);
    };
  }, [remember, text]);

  if (!googleClientId) return null;

  return (
    <div
      className={`google-sign-in-button relative flex min-w-0 w-full items-center justify-center transition ${
        disabled ? "pointer-events-none opacity-55" : ""
      }`}
      aria-busy={!ready || disabled}
    >
      <div ref={containerRef} className="flex min-w-0 w-full justify-center" />
    </div>
  );
}

GoogleSignInButton.propTypes = {
  disabled: PropTypes.bool,
  remember: PropTypes.bool,
  text: PropTypes.oneOf([
    "signin_with",
    "signup_with",
    "continue_with",
    "signin",
  ]),
  onCredential: PropTypes.func.isRequired,
  onError: PropTypes.func,
};
