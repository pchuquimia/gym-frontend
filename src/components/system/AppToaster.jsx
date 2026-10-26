import { Toaster } from "sonner";
import { Check, Info, LoaderCircle, TriangleAlert, X } from "lucide-react";

export default function AppToaster() {
  return (
    <Toaster
      position="top-center"
      closeButton
      duration={3600}
      gap={10}
      visibleToasts={1}
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
        loading: <LoaderCircle className="animate-spin" aria-hidden="true" />,
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
  );
}
