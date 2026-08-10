const CLOUDINARY_CLOUD_NAME =
  (import.meta?.env && import.meta.env.VITE_CLOUDINARY_CLOUD_NAME) ||
  "dsonnxkhz";
const CLOUDINARY_BASE = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload`;

export const EXERCISE_IMAGE_PRESETS = Object.freeze({
  thumbnail: { width: 240, height: 240, crop: "fill", gravity: "auto" },
  card: { width: 480, height: 480, crop: "fill", gravity: "auto" },
  detail: { width: 1280, height: 720, crop: "fill", gravity: "auto" },
});

const buildTransform = ({
  width,
  height,
  crop = "fill",
  gravity = "auto",
  quality = "auto",
  format = "auto",
}) => {
  const parts = [];
  if (crop) parts.push(`c_${crop}`);
  if (gravity) parts.push(`g_${gravity}`);
  if (width) parts.push(`w_${width}`);
  if (height) parts.push(`h_${height}`);
  if (format) parts.push(`f_${format}`);
  if (quality) parts.push(`q_${quality}`);
  return parts.join(",");
};

const extractPublicId = (url) => {
  if (!url || typeof url !== "string") return "";
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("res.cloudinary.com")) return "";
    const parts = parsed.pathname.split("/").filter(Boolean);
    const uploadIndex = parts.indexOf("upload");
    if (uploadIndex === -1 || uploadIndex + 1 >= parts.length) return "";
    let rest = parts.slice(uploadIndex + 1);
    if (rest[0]?.startsWith("v") && /^\d+$/.test(rest[0].slice(1))) {
      rest = rest.slice(1);
    }
    if (rest[0] && rest[0].includes(",")) {
      rest = rest.slice(1);
    }
    const filename = rest.join("/");
    return filename.replace(/\.[^.]+$/, "");
  } catch {
    return "";
  }
};

export const buildCloudinaryUrl = (publicId, opts = {}) => {
  if (!publicId) return "";
  const { version, ...transformOptions } = opts;
  const transform = buildTransform(transformOptions);
  const versionPath = Number(version) > 0 ? `/v${Number(version)}` : "";
  return transform
    ? `${CLOUDINARY_BASE}/${transform}${versionPath}/${publicId}`
    : `${CLOUDINARY_BASE}${versionPath}/${publicId}`;
};

export const getExerciseImageUrl = (exercise, opts = {}) => {
  if (!exercise) return "";
  const { preset, ...requestedOptions } = opts;
  const transformOptions = {
    ...(preset ? EXERCISE_IMAGE_PRESETS[preset] : {}),
    ...requestedOptions,
  };
  const imageAsset = exercise.media?.image;
  const publicId =
    imageAsset?.publicId ||
    exercise.imagePublicId ||
    exercise.publicId ||
    exercise.cloudinaryPublicId ||
    extractPublicId(exercise.media?.image?.url || exercise.image);
  if (publicId) {
    return buildCloudinaryUrl(publicId, {
      ...transformOptions,
      version: imageAsset?.version || transformOptions.version,
    });
  }
  return imageAsset?.url || exercise.image || "";
};

export const getExerciseAnimationUrl = (exercise) => {
  if (!exercise) return "";
  const animation = exercise.media?.animation;
  if (animation?.publicId) return buildCloudinaryUrl(animation.publicId);
  return animation?.url || "";
};
