const CLOUDINARY_CLOUD_NAME =
  (import.meta?.env && import.meta.env.VITE_CLOUDINARY_CLOUD_NAME) || "dsonnxkhz";
const CLOUDINARY_BASE = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload`;

const buildTransform = ({ width, height, crop = "fill", gravity = "auto", quality = "auto", format = "auto" }) => {
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
  const transform = buildTransform(opts);
  return transform ? `${CLOUDINARY_BASE}/${transform}/${publicId}` : `${CLOUDINARY_BASE}/${publicId}`;
};

export const getExerciseImageUrl = (exercise, opts = {}) => {
  if (!exercise) return "";
  const publicId =
    exercise.imagePublicId ||
    exercise.publicId ||
    exercise.cloudinaryPublicId ||
    extractPublicId(exercise.image);
  if (publicId) return buildCloudinaryUrl(publicId, opts);
  return "";
};
