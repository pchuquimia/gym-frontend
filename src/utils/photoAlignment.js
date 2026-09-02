const TARGET_WIDTH = 72;
const TARGET_HEIGHT = 90;
const POSE_CANVAS_WIDTH = 800;
const POSE_CANVAS_HEIGHT = 1000;
const MEDIAPIPE_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const POSE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task";

const EMPTY_ALIGNMENT = Object.freeze({
  scale: 1,
  offsetXPercent: 0,
  offsetYPercent: 0,
  rotationDeg: 0,
  afterScale: 1,
  afterOffsetXPercent: 0,
  afterOffsetYPercent: 0,
  afterRotationDeg: 0,
  method: "none",
});

const POSE_POINTS = [
  { index: 0, weight: 0.45 },
  { index: 11, weight: 1.4 },
  { index: 12, weight: 1.4 },
  { index: 23, weight: 1.6 },
  { index: 24, weight: 1.6 },
  { index: 25, weight: 0.75 },
  { index: 26, weight: 0.75 },
  { index: 27, weight: 0.5 },
  { index: 28, weight: 0.5 },
];

let poseLandmarkerPromise;

const getPoseLandmarker = async () => {
  if (!poseLandmarkerPromise) {
    poseLandmarkerPromise = import("@mediapipe/tasks-vision")
      .then(async ({ FilesetResolver, PoseLandmarker }) => {
        const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
        return PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: POSE_MODEL_URL },
          runningMode: "IMAGE",
          numPoses: 1,
          minPoseDetectionConfidence: 0.6,
          minPosePresenceConfidence: 0.6,
          minTrackingConfidence: 0.6,
          outputSegmentationMasks: false,
        });
      })
      .catch((error) => {
        poseLandmarkerPromise = undefined;
        throw error;
      });
  }
  return poseLandmarkerPromise;
};

const mapLandmarkToCover = (landmark, bitmap) => {
  const coverScale = Math.max(
    POSE_CANVAS_WIDTH / bitmap.width,
    POSE_CANVAS_HEIGHT / bitmap.height,
  );
  const renderedWidth = bitmap.width * coverScale;
  const renderedHeight = bitmap.height * coverScale;
  return {
    x: (POSE_CANVAS_WIDTH - renderedWidth) / 2 + landmark.x * renderedWidth,
    y: (POSE_CANVAS_HEIGHT - renderedHeight) / 2 + landmark.y * renderedHeight,
  };
};

const weightedCenter = (pairs, key) => {
  const totalWeight = pairs.reduce((sum, pair) => sum + pair.weight, 0);
  return pairs.reduce(
    (center, pair) => ({
      x: center.x + (pair[key].x * pair.weight) / totalWeight,
      y: center.y + (pair[key].y * pair.weight) / totalWeight,
    }),
    { x: 0, y: 0 },
  );
};

const distanceBetween = (first, second) =>
  Math.hypot(second.x - first.x, second.y - first.y);

const midpoint = (first, second) => ({
  x: (first.x + second.x) / 2,
  y: (first.y + second.y) / 2,
});

const normalizedAngleDifference = (afterAngle, beforeAngle) => {
  let difference = afterAngle - beforeAngle;
  while (difference > Math.PI) difference -= Math.PI * 2;
  while (difference < -Math.PI) difference += Math.PI * 2;
  return difference;
};

const solveTorsoAlignment = (
  beforeLandmarks,
  afterLandmarks,
  beforeBitmap,
  afterBitmap,
) => {
  const mapped = (landmarks, index, bitmap) => {
    const landmark = landmarks[index];
    const confidence = Math.min(
      landmark?.visibility ?? 1,
      landmark?.presence ?? 1,
    );
    return landmark && confidence >= 0.52
      ? mapLandmarkToCover(landmark, bitmap)
      : null;
  };
  const beforeShoulders = [
    mapped(beforeLandmarks, 11, beforeBitmap),
    mapped(beforeLandmarks, 12, beforeBitmap),
  ];
  const beforeHips = [
    mapped(beforeLandmarks, 23, beforeBitmap),
    mapped(beforeLandmarks, 24, beforeBitmap),
  ];
  const afterShoulders = [
    mapped(afterLandmarks, 11, afterBitmap),
    mapped(afterLandmarks, 12, afterBitmap),
  ];
  const afterHips = [
    mapped(afterLandmarks, 23, afterBitmap),
    mapped(afterLandmarks, 24, afterBitmap),
  ];
  if (
    [...beforeShoulders, ...beforeHips, ...afterShoulders, ...afterHips].some(
      (point) => !point,
    )
  ) {
    return null;
  }

  const beforeShoulderCenter = midpoint(...beforeShoulders);
  const beforeHipCenter = midpoint(...beforeHips);
  const afterShoulderCenter = midpoint(...afterShoulders);
  const afterHipCenter = midpoint(...afterHips);
  const beforeLengths = [
    distanceBetween(beforeShoulderCenter, beforeHipCenter),
    distanceBetween(beforeShoulders[0], beforeHips[0]),
    distanceBetween(beforeShoulders[1], beforeHips[1]),
  ];
  const afterLengths = [
    distanceBetween(afterShoulderCenter, afterHipCenter),
    distanceBetween(afterShoulders[0], afterHips[0]),
    distanceBetween(afterShoulders[1], afterHips[1]),
  ];
  if (
    beforeLengths.some((length) => length < 55) ||
    afterLengths.some((length) => length < 55)
  ) {
    return null;
  }

  const ratios = beforeLengths.map(
    (beforeLength, index) => afterLengths[index] / beforeLength,
  );
  const rawScale = Math.exp(
    (Math.log(ratios[0]) * 2 + Math.log(ratios[1]) + Math.log(ratios[2])) / 4,
  );
  if (rawScale < 0.36 || rawScale > 1.82) return null;

  const beforeTorsoAngle = Math.atan2(
    beforeHipCenter.y - beforeShoulderCenter.y,
    beforeHipCenter.x - beforeShoulderCenter.x,
  );
  const afterTorsoAngle = Math.atan2(
    afterHipCenter.y - afterShoulderCenter.y,
    afterHipCenter.x - afterShoulderCenter.x,
  );
  const rawRotationDeg =
    (normalizedAngleDifference(afterTorsoAngle, beforeTorsoAngle) * 180) /
    Math.PI;
  const rotationDeg =
    Math.abs(rawRotationDeg) <= 10
      ? Math.max(-3, Math.min(3, rawRotationDeg))
      : 0;
  const scale = Math.max(0.38, Math.min(1.72, rawScale));
  const beforeCenter = midpoint(beforeShoulderCenter, beforeHipCenter);
  const afterCenter = midpoint(afterShoulderCenter, afterHipCenter);
  const rotation = (rotationDeg * Math.PI) / 180;
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  const transformPoint = (point) => ({
    x: scale * (cosine * point.x - sine * point.y),
    y: scale * (sine * point.x + cosine * point.y),
  });
  const transformedBeforeCenter = transformPoint(beforeCenter);
  const translation = {
    x: afterCenter.x - transformedBeforeCenter.x,
    y: afterCenter.y - transformedBeforeCenter.y,
  };
  const viewportCenter = {
    x: POSE_CANVAS_WIDTH / 2,
    y: POSE_CANVAS_HEIGHT / 2,
  };
  const transformedViewportCenter = transformPoint(viewportCenter);
  const cssTranslation = {
    x: translation.x + transformedViewportCenter.x - viewportCenter.x,
    y: translation.y + transformedViewportCenter.y - viewportCenter.y,
  };
  const offsetXPercent = (cssTranslation.x / POSE_CANVAS_WIDTH) * 100;
  const offsetYPercent = (cssTranslation.y / POSE_CANVAS_HEIGHT) * 100;
  if (Math.abs(offsetXPercent) > 34 || Math.abs(offsetYPercent) > 34) {
    return null;
  }

  return {
    scale: Number(scale.toFixed(4)),
    offsetXPercent: Number(offsetXPercent.toFixed(3)),
    offsetYPercent: Number(offsetYPercent.toFixed(3)),
    rotationDeg: Number(rotationDeg.toFixed(3)),
    method: "pose-torso",
  };
};

const solvePoseAlignment = (
  beforeLandmarks,
  afterLandmarks,
  beforeBitmap,
  afterBitmap,
) => {
  const torsoAlignment = solveTorsoAlignment(
    beforeLandmarks,
    afterLandmarks,
    beforeBitmap,
    afterBitmap,
  );
  if (torsoAlignment) return torsoAlignment;

  const pairs = POSE_POINTS.flatMap(({ index, weight }) => {
    const before = beforeLandmarks[index];
    const after = afterLandmarks[index];
    const confidence = Math.min(
      before?.visibility ?? 1,
      before?.presence ?? 1,
      after?.visibility ?? 1,
      after?.presence ?? 1,
    );
    if (!before || !after || confidence < 0.58) return [];
    return [
      {
        before: mapLandmarkToCover(before, beforeBitmap),
        after: mapLandmarkToCover(after, afterBitmap),
        weight: weight * confidence,
      },
    ];
  });

  if (pairs.length < 4) return null;

  const beforeCenter = weightedCenter(pairs, "before");
  const afterCenter = weightedCenter(pairs, "after");
  let dot = 0;
  let cross = 0;
  let beforeEnergy = 0;

  for (const pair of pairs) {
    const beforeX = pair.before.x - beforeCenter.x;
    const beforeY = pair.before.y - beforeCenter.y;
    const afterX = pair.after.x - afterCenter.x;
    const afterY = pair.after.y - afterCenter.y;
    dot += pair.weight * (beforeX * afterX + beforeY * afterY);
    cross += pair.weight * (beforeX * afterY - beforeY * afterX);
    beforeEnergy += pair.weight * (beforeX ** 2 + beforeY ** 2);
  }

  if (beforeEnergy < 1) return null;
  const rawScale = Math.hypot(dot, cross) / beforeEnergy;
  const rawRotation = Math.atan2(cross, dot);
  const rawRotationDeg = (rawRotation * 180) / Math.PI;
  if (rawScale < 0.72 || rawScale > 1.38 || Math.abs(rawRotationDeg) > 12) {
    return null;
  }

  const scale = Math.max(0.8, Math.min(1.25, rawScale));
  const rotationDeg = Math.max(-4, Math.min(4, rawRotationDeg));
  const rotation = (rotationDeg * Math.PI) / 180;
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  const transformPoint = (point) => ({
    x: scale * (cosine * point.x - sine * point.y),
    y: scale * (sine * point.x + cosine * point.y),
  });
  const transformedBeforeCenter = transformPoint(beforeCenter);
  const translation = {
    x: afterCenter.x - transformedBeforeCenter.x,
    y: afterCenter.y - transformedBeforeCenter.y,
  };

  const viewportCenter = {
    x: POSE_CANVAS_WIDTH / 2,
    y: POSE_CANVAS_HEIGHT / 2,
  };
  const transformedViewportCenter = transformPoint(viewportCenter);
  const cssTranslation = {
    x: translation.x + transformedViewportCenter.x - viewportCenter.x,
    y: translation.y + transformedViewportCenter.y - viewportCenter.y,
  };

  let weightedError = 0;
  let totalWeight = 0;
  for (const pair of pairs) {
    const transformed = transformPoint(pair.before);
    const differenceX = transformed.x + translation.x - pair.after.x;
    const differenceY = transformed.y + translation.y - pair.after.y;
    weightedError +=
      pair.weight * (differenceX * differenceX + differenceY * differenceY);
    totalWeight += pair.weight;
  }
  const rootMeanSquareError = Math.sqrt(weightedError / totalWeight);
  if (rootMeanSquareError > 105) return null;

  const offsetXPercent = (cssTranslation.x / POSE_CANVAS_WIDTH) * 100;
  const offsetYPercent = (cssTranslation.y / POSE_CANVAS_HEIGHT) * 100;
  if (Math.abs(offsetXPercent) > 18 || Math.abs(offsetYPercent) > 18) {
    return null;
  }

  return {
    scale: Number(scale.toFixed(4)),
    offsetXPercent: Number(offsetXPercent.toFixed(3)),
    offsetYPercent: Number(offsetYPercent.toFixed(3)),
    rotationDeg: Number(rotationDeg.toFixed(3)),
    method: "pose",
  };
};

const findPoseAlignment = async (beforeBitmap, afterBitmap) => {
  const poseLandmarker = await getPoseLandmarker();
  const beforeResult = poseLandmarker.detect(beforeBitmap);
  const afterResult = poseLandmarker.detect(afterBitmap);
  const beforeLandmarks = beforeResult.landmarks?.[0];
  const afterLandmarks = afterResult.landmarks?.[0];
  if (!beforeLandmarks || !afterLandmarks) return null;
  return solvePoseAlignment(
    beforeLandmarks,
    afterLandmarks,
    beforeBitmap,
    afterBitmap,
  );
};

const drawObjectCover = (bitmap, zoom = 1) => {
  const canvas = document.createElement("canvas");
  canvas.width = TARGET_WIDTH;
  canvas.height = TARGET_HEIGHT;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  const coverScale = Math.max(
    TARGET_WIDTH / bitmap.width,
    TARGET_HEIGHT / bitmap.height,
  );
  const drawWidth = bitmap.width * coverScale * zoom;
  const drawHeight = bitmap.height * coverScale * zoom;
  context.drawImage(
    bitmap,
    (TARGET_WIDTH - drawWidth) / 2,
    (TARGET_HEIGHT - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
  return context.getImageData(0, 0, TARGET_WIDTH, TARGET_HEIGHT).data;
};

const edgeMap = (rgba) => {
  const luma = new Float32Array(TARGET_WIDTH * TARGET_HEIGHT);
  const edges = new Float32Array(luma.length);
  for (let index = 0; index < luma.length; index += 1) {
    const offset = index * 4;
    luma[index] =
      rgba[offset] * 0.299 +
      rgba[offset + 1] * 0.587 +
      rgba[offset + 2] * 0.114;
  }
  for (let y = 1; y < TARGET_HEIGHT - 1; y += 1) {
    for (let x = 1; x < TARGET_WIDTH - 1; x += 1) {
      const index = y * TARGET_WIDTH + x;
      const horizontal = luma[index + 1] - luma[index - 1];
      const vertical = luma[index + TARGET_WIDTH] - luma[index - TARGET_WIDTH];
      edges[index] = Math.min(255, Math.abs(horizontal) + Math.abs(vertical));
    }
  }
  return edges;
};

const correlation = (reference, candidate, offsetX, offsetY) => {
  const startX = 9;
  const endX = TARGET_WIDTH - 9;
  const startY = 7;
  const endY = TARGET_HEIGHT - 7;
  let count = 0;
  let sumReference = 0;
  let sumCandidate = 0;
  let sumReferenceSquared = 0;
  let sumCandidateSquared = 0;
  let sumCombined = 0;

  for (let y = startY; y < endY; y += 1) {
    const sourceY = y - offsetY;
    if (sourceY < 1 || sourceY >= TARGET_HEIGHT - 1) continue;
    for (let x = startX; x < endX; x += 1) {
      const sourceX = x - offsetX;
      if (sourceX < 1 || sourceX >= TARGET_WIDTH - 1) continue;
      const referenceValue = reference[y * TARGET_WIDTH + x];
      const candidateValue = candidate[sourceY * TARGET_WIDTH + sourceX];
      sumReference += referenceValue;
      sumCandidate += candidateValue;
      sumReferenceSquared += referenceValue * referenceValue;
      sumCandidateSquared += candidateValue * candidateValue;
      sumCombined += referenceValue * candidateValue;
      count += 1;
    }
  }

  if (count < 100) return -1;
  const covariance = sumCombined - (sumReference * sumCandidate) / count;
  const referenceVariance =
    sumReferenceSquared - (sumReference * sumReference) / count;
  const candidateVariance =
    sumCandidateSquared - (sumCandidate * sumCandidate) / count;
  const denominator = Math.sqrt(referenceVariance * candidateVariance);
  return denominator > 0 ? covariance / denominator : -1;
};

const candidateScore = (correlationValue, scale, offsetX, offsetY) =>
  correlationValue -
  Math.abs(Math.log(scale)) * 0.018 -
  (Math.abs(offsetX) / TARGET_WIDTH + Math.abs(offsetY) / TARGET_HEIGHT) *
    0.008;

const findEdgeAlignment = (beforeBitmap, afterBitmap) => {
  const reference = edgeMap(drawObjectCover(afterBitmap, 1));
  const edgeCache = new Map();
  const getEdges = (scale) => {
    const key = scale.toFixed(3);
    if (!edgeCache.has(key)) {
      edgeCache.set(key, edgeMap(drawObjectCover(beforeBitmap, scale)));
    }
    return edgeCache.get(key);
  };

  const baselineCorrelation = correlation(reference, getEdges(1), 0, 0);
  let best = {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    correlation: baselineCorrelation,
    score: baselineCorrelation,
  };

  const inspect = (scales, centerX, centerY, radius, offsetStep) => {
    for (const scale of scales) {
      const candidate = getEdges(scale);
      for (
        let offsetY = centerY - radius;
        offsetY <= centerY + radius;
        offsetY += offsetStep
      ) {
        for (
          let offsetX = centerX - radius;
          offsetX <= centerX + radius;
          offsetX += offsetStep
        ) {
          const similarity = correlation(
            reference,
            candidate,
            offsetX,
            offsetY,
          );
          const score = candidateScore(similarity, scale, offsetX, offsetY);
          if (score > best.score) {
            best = {
              scale,
              offsetX,
              offsetY,
              correlation: similarity,
              score,
            };
          }
        }
      }
    }
  };

  inspect(
    [0.84, 0.88, 0.92, 0.96, 1, 1.04, 1.08, 1.12, 1.16, 1.2],
    0,
    0,
    10,
    2,
  );
  const refinedScales = Array.from({ length: 9 }, (_, index) =>
    Math.max(0.82, Math.min(1.22, best.scale - 0.04 + index * 0.01)),
  );
  inspect(refinedScales, best.offsetX, best.offsetY, 2, 1);

  if (best.score < baselineCorrelation + 0.008) {
    return EMPTY_ALIGNMENT;
  }
  return {
    scale: Number(best.scale.toFixed(3)),
    offsetXPercent: Number(((best.offsetX / TARGET_WIDTH) * 100).toFixed(3)),
    offsetYPercent: Number(((best.offsetY / TARGET_HEIGHT) * 100).toFixed(3)),
    rotationDeg: 0,
    method: "edges",
  };
};

const keepImagesCovered = (alignment) => {
  if (!alignment || alignment.scale >= 1) {
    return {
      ...EMPTY_ALIGNMENT,
      ...alignment,
      afterScale: 1,
      afterOffsetXPercent: 0,
      afterOffsetYPercent: 0,
      afterRotationDeg: 0,
    };
  }

  const rotation = ((alignment.rotationDeg || 0) * Math.PI) / 180;
  const inverseScale = 1 / alignment.scale;
  const translationX = (alignment.offsetXPercent / 100) * POSE_CANVAS_WIDTH;
  const translationY = (alignment.offsetYPercent / 100) * POSE_CANVAS_HEIGHT;
  const cosine = Math.cos(-rotation);
  const sine = Math.sin(-rotation);
  const inverseTranslationX =
    -inverseScale * (cosine * translationX - sine * translationY);
  const inverseTranslationY =
    -inverseScale * (sine * translationX + cosine * translationY);

  return {
    ...alignment,
    scale: 1,
    offsetXPercent: 0,
    offsetYPercent: 0,
    rotationDeg: 0,
    afterScale: Number(inverseScale.toFixed(4)),
    afterOffsetXPercent: Number(
      ((inverseTranslationX / POSE_CANVAS_WIDTH) * 100).toFixed(3),
    ),
    afterOffsetYPercent: Number(
      ((inverseTranslationY / POSE_CANVAS_HEIGHT) * 100).toFixed(3),
    ),
    afterRotationDeg: Number(((-rotation * 180) / Math.PI).toFixed(3)),
  };
};

export const computePhotoAlignment = async (beforeBlob, afterBlob) => {
  if (!beforeBlob || !afterBlob || typeof createImageBitmap !== "function") {
    return EMPTY_ALIGNMENT;
  }
  const [beforeBitmap, afterBitmap] = await Promise.all([
    createImageBitmap(beforeBlob),
    createImageBitmap(afterBlob),
  ]);
  try {
    try {
      const poseAlignment = await findPoseAlignment(beforeBitmap, afterBitmap);
      if (poseAlignment) return keepImagesCovered(poseAlignment);
    } catch {
      // Keep the local edge matcher as an offline and low-confidence fallback.
    }
    return keepImagesCovered(findEdgeAlignment(beforeBitmap, afterBitmap));
  } finally {
    beforeBitmap.close?.();
    afterBitmap.close?.();
  }
};
