export const MAX_TRAINING_PHOTO_BYTES = 5 * 1024 * 1024;

const UPLOADABLE_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const IMAGE_FILE_EXTENSION = /\.(avif|heic|heif|jpe?g|png|webp)$/i;
const MAX_PHOTO_EDGE = 2048;

const isImageFile = (file) =>
  Boolean(
    file &&
      (String(file.type || "").startsWith("image/") ||
        IMAGE_FILE_EXTENSION.test(String(file.name || ""))),
  );

const loadPhotoImage = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(
        new Error(
          "No se pudo leer esta foto. Prueba seleccionando una imagen JPG, PNG o WebP.",
        ),
      );
    };
    image.src = objectUrl;
  });

const canvasToJpeg = (canvas, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("No se pudo preparar la foto para subirla."));
      },
      "image/jpeg",
      quality,
    );
  });

const getJpegName = (name = "foto") => {
  const base = String(name).replace(/\.[^.]+$/, "") || "foto";
  return `${base}.jpg`;
};

export const prepareTrainingPhoto = async (file) => {
  if (!isImageFile(file)) {
    throw new Error("Selecciona una imagen desde la cámara o la galería.");
  }

  if (
    UPLOADABLE_PHOTO_TYPES.has(file.type) &&
    file.size <= MAX_TRAINING_PHOTO_BYTES
  ) {
    return file;
  }

  const image = await loadPhotoImage(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) {
    throw new Error("La foto seleccionada no tiene un tamaño válido.");
  }

  const scale = Math.min(
    1,
    MAX_PHOTO_EDGE / Math.max(sourceWidth, sourceHeight),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Este navegador no pudo preparar la foto.");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  let blob = await canvasToJpeg(canvas, 0.84);
  if (blob.size > MAX_TRAINING_PHOTO_BYTES) {
    blob = await canvasToJpeg(canvas, 0.68);
  }
  if (blob.size > MAX_TRAINING_PHOTO_BYTES) {
    throw new Error("La foto sigue siendo demasiado grande. Prueba con otra imagen.");
  }

  return new File([blob], getJpegName(file.name), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
};
