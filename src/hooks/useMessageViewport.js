import { useEffect } from "react";

// Mobile keyboards can resize only the visual viewport, leaving dvh unchanged.
export default function useMessageViewport(pageRef, enabled) {
  useEffect(() => {
    const page = pageRef.current;
    if (!enabled || !page) return;
    const viewport = window.visualViewport;
    const mobile = window.matchMedia("(max-width: 1023px)");
    let expandedHeight = Math.max(window.innerHeight, viewport?.height || 0);
    let keyboardOpen = false;
    let frame;
    const reset = () => {
      delete page.dataset.keyboardOpen;
      for (const property of ["height", "top", "left", "width"])
        page.style.removeProperty(`--messages-viewport-${property}`);
    };
    const update = () => {
      const height = viewport?.height || window.innerHeight;
      expandedHeight = Math.max(expandedHeight, window.innerHeight, height);
      const focused = document.activeElement;
      const editing =
        page.contains(focused) && focused?.matches("textarea, input");
      keyboardOpen = Boolean(
        mobile.matches &&
        Math.abs((viewport?.scale || 1) - 1) < 0.05 &&
        expandedHeight - height > Math.max(100, expandedHeight * 0.15) &&
        (editing || keyboardOpen),
      );
      if (!keyboardOpen) {
        reset();
        return;
      }
      page.dataset.keyboardOpen = "true";
      page.style.setProperty("--messages-viewport-height", `${height}px`);
      page.style.setProperty(
        "--messages-viewport-top",
        `${viewport?.offsetTop || 0}px`,
      );
      page.style.setProperty(
        "--messages-viewport-left",
        `${viewport?.offsetLeft || 0}px`,
      );
      page.style.setProperty(
        "--messages-viewport-width",
        `${viewport?.width || window.innerWidth}px`,
      );
    };
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(update);
    };
    const rotate = () => {
      expandedHeight = Math.max(window.innerHeight, viewport?.height || 0);
      schedule();
    };
    update();
    viewport?.addEventListener("resize", schedule);
    viewport?.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", rotate);
    mobile.addEventListener("change", schedule);
    page.addEventListener("focusin", schedule);
    page.addEventListener("focusout", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", schedule);
      viewport?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", rotate);
      mobile.removeEventListener("change", schedule);
      page.removeEventListener("focusin", schedule);
      page.removeEventListener("focusout", schedule);
      reset();
    };
  }, [pageRef, enabled]);
}
