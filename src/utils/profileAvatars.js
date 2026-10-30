const ORIGINAL_GENDERS = ["male", "female", "male", "female", "male", "female"];
export const PROFILE_AVATARS = Array.from({ length: 18 }, (_, index) => ({
  id: `gym-${String(index + 1).padStart(2, "0")}`,
  label: `Avatar deportivo ${index + 1}`,
  gender: index < 6 ? ORIGINAL_GENDERS[index] : index < 12 ? "male" : "female",
  image:
    index < 6
      ? "/images/avatars/gym-avatars-v1.png"
      : index < 12
        ? "/images/avatars/gym-men-v1.png"
        : "/images/avatars/gym-women-v1.png",
  position: `${(index % 3) * 50}% ${Math.floor((index % 6) / 3) * 100}%`,
}));

export const resolveProfileAvatar = (avatarId, name = "", gender = "") => {
  const hasGender = ["male", "female"].includes(gender);
  const selected = PROFILE_AVATARS.find((avatar) => avatar.id === avatarId);
  if (selected && (!hasGender || selected.gender === gender)) return selected;
  if (!hasGender) return null;
  const options = PROFILE_AVATARS.filter((avatar) => avatar.gender === gender);
  const seed = String(name || "")
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFC");
  const hash = Array.from(seed).reduce(
    (value, letter) => (Math.imul(value, 31) + letter.codePointAt(0)) >>> 0,
    0,
  );
  return options[hash % options.length];
};
