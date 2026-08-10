import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
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

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MobileQueryLifecycle />
      <AuthProvider>
        <App />
        <Toaster
          position="top-center"
          richColors
          closeButton
          duration={4000}
          offset={16}
          mobileOffset={{ top: "1rem", left: "0.75rem", right: "0.75rem" }}
        />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
