import { useRef } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import useMessageViewport from "./useMessageViewport";

let viewport;
let mobile;
function Chat({ enabled = true }) {
  const ref = useRef(null);
  useMessageViewport(ref, enabled);
  return (
    <main ref={ref} data-testid="chat">
      <textarea aria-label="Mensaje" />
    </main>
  );
}
beforeEach(() => {
  viewport = Object.assign(new EventTarget(), {
    height: 800,
    width: 390,
    offsetTop: 0,
    offsetLeft: 0,
    scale: 1,
  });
  mobile = Object.assign(new EventTarget(), { matches: true });
  vi.stubGlobal("visualViewport", viewport);
  vi.stubGlobal("innerHeight", 800);
  vi.spyOn(window, "matchMedia").mockReturnValue(mobile);
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    callback();
    return 1;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const resize = (values) =>
  act(() => {
    Object.assign(viewport, values);
    viewport.dispatchEvent(new Event("resize"));
  });

it("fits above an overlay keyboard and follows viewport panning until it closes", () => {
  render(<Chat />);
  const chat = screen.getByTestId("chat");
  screen.getByLabelText("Mensaje").focus();
  resize({ height: 460, offsetTop: 38 });
  expect(chat).toHaveAttribute("data-keyboard-open", "true");
  expect(chat.style.getPropertyValue("--messages-viewport-height")).toBe(
    "460px",
  );
  expect(chat.style.getPropertyValue("--messages-viewport-top")).toBe("38px");
  act(() => {
    viewport.offsetTop = 52;
    viewport.dispatchEvent(new Event("scroll"));
  });
  expect(chat.style.getPropertyValue("--messages-viewport-top")).toBe("52px");
  // Focus may briefly leave the textarea while the keyboard is still closing.
  screen.getByLabelText("Mensaje").blur();
  expect(chat).toHaveAttribute("data-keyboard-open", "true");
  resize({ height: 800, offsetTop: 0 });
  expect(chat).not.toHaveAttribute("data-keyboard-open");
  expect(chat.style.getPropertyValue("--messages-viewport-height")).toBe("");
});

it("also handles keyboards that shrink the layout viewport", () => {
  render(<Chat />);
  screen.getByLabelText("Mensaje").focus();
  vi.stubGlobal("innerHeight", 440);
  resize({ height: 440 });
  expect(screen.getByTestId("chat")).toHaveAttribute(
    "data-keyboard-open",
    "true",
  );
  vi.stubGlobal("innerHeight", 800);
  resize({ height: 800 });
  expect(screen.getByTestId("chat")).not.toHaveAttribute("data-keyboard-open");
});

it("leaves browser chrome changes, zoom and desktop resizing in the normal layout", () => {
  render(<Chat />);
  const chat = screen.getByTestId("chat");
  screen.getByLabelText("Mensaje").focus();
  resize({ height: 735 });
  expect(chat).not.toHaveAttribute("data-keyboard-open");
  resize({ height: 400, scale: 2 });
  expect(chat).not.toHaveAttribute("data-keyboard-open");
  mobile.matches = false;
  resize({ height: 400, scale: 1 });
  expect(chat).not.toHaveAttribute("data-keyboard-open");
});

it("restores the page when leaving a chat with the keyboard open", () => {
  const { rerender, unmount } = render(<Chat />);
  const chat = screen.getByTestId("chat");
  fireEvent.focusIn(screen.getByLabelText("Mensaje"));
  screen.getByLabelText("Mensaje").focus();
  resize({ height: 450 });
  expect(chat).toHaveAttribute("data-keyboard-open", "true");
  rerender(<Chat enabled={false} />);
  expect(chat).not.toHaveAttribute("data-keyboard-open");
  resize({ height: 420 });
  expect(chat.style.length).toBe(0);
  unmount();
});
