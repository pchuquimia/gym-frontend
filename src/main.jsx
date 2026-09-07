import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { Check, Info, LoaderCircle, TriangleAlert, X } from "lucide-react";
import "./index.css";
import App from "./App.jsx";
import MobileQueryLifecycle from "./components/system/MobileQueryLifecycle.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
      staleTime: 60 * 1000,
    },
  },
});

document.documentElement.lang = "es";
document.documentElement.setAttribute("translate", "no");
document.body.classList.add("notranslate");

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MobileQueryLifecycle />
      <AuthProvider>
        <App />
        <Toaster
          position="top-center"
          closeButton
          duration={3600}
          gap={10}
          visibleToasts={3}
          swipeDirections={["left", "right", "top"]}
          offset={{ top: 20 }}
          mobileOffset={{
            top: "calc(env(safe-area-inset-top) + 0.75rem)",
            left: "0.75rem",
            right: "0.75rem",
          }}
          icons={{
            success: <Check aria-hidden="true" />,
            info: <Info aria-hidden="true" />,
            warning: <TriangleAlert aria-hidden="true" />,
            error: <X aria-hidden="true" />,
            loading: (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ),
            close: <X aria-hidden="true" />,
          }}
          toastOptions={{
            unstyled: true,
            classNames: {
              toast: "rirfit-toast",
              content: "rirfit-toast__content",
              title: "rirfit-toast__title",
              description: "rirfit-toast__description",
              icon: "rirfit-toast__icon",
              closeButton: "rirfit-toast__close",
              actionButton: "rirfit-toast__action",
              cancelButton: "rirfit-toast__cancel",
              success: "rirfit-toast--success",
              info: "rirfit-toast--info",
              warning: "rirfit-toast--warning",
              error: "rirfit-toast--error",
              loading: "rirfit-toast--loading",
              default: "rirfit-toast--default",
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
