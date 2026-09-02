const dateValue = (photo) => {
  const value = new Date(`${String(photo?.date || "").slice(0, 10)}T00:00:00`);
  return Number.isNaN(value.getTime()) ? 0 : value.getTime();
};

export const orderComparisonPhotos = (photos = []) =>
  [...photos].sort((left, right) => dateValue(left) - dateValue(right));

export const canComparePhoto = (selectedPhotos = [], candidate) => {
  if (!candidate || !selectedPhotos.length) return true;
  return selectedPhotos.every(
    (photo) => (photo.view || "front") === (candidate.view || "front"),
  );
};

export const comparisonDayGap = (photos = []) => {
  const ordered = orderComparisonPhotos(photos);
  if (ordered.length !== 2) return 0;
  return Math.max(
    0,
    Math.round((dateValue(ordered[1]) - dateValue(ordered[0])) / 86_400_000),
  );
};
