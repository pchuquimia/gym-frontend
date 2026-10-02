import { describe, expect, it } from "vitest";
import { solveTorsoAlignment } from "./photoAlignment";

const bitmap = { width: 800, height: 1000 };
const landmarks = ({ shoulderHalfWidth, hipHalfWidth, centerX = 400 }) => {
  const points = Array(33).fill(null);
  const point = (x, y) => ({ x: x / 800, y: y / 1000, visibility: 0.99, presence: 0.99 });
  points[11] = point(centerX - shoulderHalfWidth, 300);
  points[12] = point(centerX + shoulderHalfWidth, 300);
  points[23] = point(centerX - hipHalfWidth, 650);
  points[24] = point(centerX + hipHalfWidth, 650);
  return points;
};

describe("solveTorsoAlignment", () => {
  const before = landmarks({ shoulderHalfWidth: 100, hipHalfWidth: 70 });
  const widerLens = landmarks({ shoulderHalfWidth: 125, hipHalfWidth: 88 });

  it("compensa de forma limitada la diferencia horizontal entre lentes frontales", () => {
    const alignment = solveTorsoAlignment(before, widerLens, bitmap, bitmap, { view: "front" });
    expect(alignment).toMatchObject({ method: "pose-torso", scale: 1, scaleX: 1.1, scaleY: 1 });
    expect(alignment.offsetXPercent).toBeCloseTo(0, 2);
  });

  it("evita modificar el ancho corporal en una vista lateral", () => {
    const alignment = solveTorsoAlignment(before, widerLens, bitmap, bitmap, { view: "side" });
    expect(alignment.method).toBe("pose-torso");
    expect(alignment.scale).toBeCloseTo(1, 2);
    expect(alignment.scaleX).toBeUndefined();
  });

  it("desplaza el cuerpo cuando el encuadre cambia de posición", () => {
    const shifted = landmarks({ shoulderHalfWidth: 100, hipHalfWidth: 70, centerX: 430 });
    const alignment = solveTorsoAlignment(before, shifted, bitmap, bitmap, { view: "front" });
    expect(alignment.offsetXPercent).toBeCloseTo(3.75, 2);
  });

  it("descarta posturas del torso que no se pueden superponer con fiabilidad", () => {
    const tilted = landmarks({ shoulderHalfWidth: 100, hipHalfWidth: 70 });
    tilted[11] = { ...tilted[11], x: tilted[11].x + 0.2 };
    tilted[12] = { ...tilted[12], x: tilted[12].x + 0.2 };
    expect(solveTorsoAlignment(before, tilted, bitmap, bitmap)).toBeNull();
  });
});
