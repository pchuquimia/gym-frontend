import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.jsx";
import AppToaster from "./components/system/AppToaster.jsx";
import MobileQueryLifecycle from "./components/system/MobileQueryLifecycle.jsx";
import ApplicationErrorBoundary from "./components/system/ApplicationErrorBoundary.jsx";
import OperationLoader from "./components/system/OperationLoader.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import {
  installStartupRecovery,
  markAppBootReady,
} from "./utils/startupRecovery";

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

installStartupRecovery();

document.documentElement.lang = "es";
document.documentElement.setAttribute("translate", "no");
document.body.classList.add("notranslate");

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ApplicationErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MobileQueryLifecycle />
        <AuthProvider>
          <Suspense
            fallback={
              <OperationLoader
                active
                delayMs={0}
                mode="screen"
                title="Preparando RIRFIT"
              />
            }
          >
            <App />
          </Suspense>
          <AppToaster />
        </AuthProvider>
      </QueryClientProvider>
    </ApplicationErrorBoundary>
  </StrictMode>,
);

markAppBootReady();
