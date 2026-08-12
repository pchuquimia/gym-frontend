const WEIGHT_BASES = new Set([
  "legacy",
  "total",
  "per_side",
  "per_implement",
  "machine",
  "additional",
  "assistance",
]);

const normalizeText = (value = "") =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const asArray = (value) =>
  (Array.isArray(value) ? value : value ? [value] : []).filter(Boolean);

export function normalizeWeightBasis(value, fallback = "legacy") {
  return WEIGHT_BASES.has(value) ? value : fallback;
}

export function inferWeightConfig(exercise = {}) {
  const nested = exercise.weightConfig || {};
  const explicit = normalizeWeightBasis(
    nested.basis || exercise.weightBasis,
    "",
  );
  if (explicit && explicit !== "legacy") {
    return {
      weightBasis: explicit,
      barWeightKg: Math.max(
        0,
        Number(nested.barWeightKg ?? exercise.barWeightKg ?? 0),
      ),
      implementCount: Math.min(
        4,
        Math.max(
          1,
          Number(nested.implementCount ?? exercise.implementCount ?? 1),
        ),
      ),
    };
  }
  const loadType = normalizeText(exercise.loadType);
  const text = normalizeText(
    [
      exercise.name,
      exercise.exerciseName,
      ...asArray(exercise.equipment),
    ].join(" "),
  );
  const isMachineMovement =
    /maquina|machine|polea|cable|selector|smith|push ?down|face ?pull|lat pulldown|jalon|pec deck|contractor/.test(
      text,
    ) ||
    (/\bprensa\b/.test(text) && !/prensa francesa/.test(text)) ||
    /exten[cs]ion (de )?(cuadriceps|pierna)|extencion cuadriceps|curl (de )?(pierna|femoral)|leg (extension|curl)/.test(
      text,
    );
  if (loadType === "assisted" || /asistid|assist/.test(text)) {
    return { weightBasis: "assistance", barWeightKg: 0, implementCount: 1 };
  }
  if (loadType === "bodyweight" || /peso corporal|body ?weight/.test(text)) {
    return { weightBasis: "additional", barWeightKg: 0, implementCount: 1 };
  }
  if (isMachineMovement) {
    return { weightBasis: "machine", barWeightKg: 0, implementCount: 1 };
  }
  if (/mancuerna|dumbbell/.test(text)) {
    return {
      weightBasis: "per_implement",
      barWeightKg: 0,
      implementCount: exercise.movementMode === "unilateral" ? 1 : 2,
    };
  }
  if (/kettlebell|pesa rusa/.test(text)) {
    return {
      weightBasis: "per_implement",
      barWeightKg: 0,
      implementCount: /doble|double|two/.test(text) ? 2 : 1,
    };
  }
  return { weightBasis: "total", barWeightKg: 0, implementCount: 1 };
}

export function getEffectiveWeightKg(weight, config = {}) {
  const input = Number(weight || 0);
  if (!Number.isFinite(input) || input <= 0) return 0;
  const basis = normalizeWeightBasis(config.weightBasis);
  if (basis === "per_side") {
    const bar = Math.max(0, Number(config.barWeightKg || 0));
    return input * 2 + bar;
  }
  if (basis === "per_implement") {
    return input * Math.max(1, Number(config.implementCount || 1));
  }
  return input;
}

export function getWeightBasisLabel(config = {}) {
  const basis = normalizeWeightBasis(config.weightBasis);
  if (basis === "per_side") {
    return `Por lado + barra de ${Number(config.barWeightKg || 0)} kg`;
  }
  if (basis === "per_implement") {
    const count = Math.max(1, Number(config.implementCount || 1));
    return `Por implemento · ${count} ${count === 1 ? "unidad" : "unidades"}`;
  }
  if (basis === "machine") return "Valor indicado por la máquina";
  if (basis === "additional") return "Carga adicional";
  if (basis === "assistance") return "Asistencia indicada";
  if (basis === "legacy") return "Registro histórico";
  return "Peso total · incluye barra";
}

export function getWeightUnitLabel(config = {}) {
  const basis = normalizeWeightBasis(config.weightBasis);
  if (basis === "per_side") return "kg/l";
  if (basis === "per_implement") return "kg/u";
  if (basis === "additional") return "kg+";
  return "kg";
}
