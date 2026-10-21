import { useState } from "react";
import { Dumbbell, Moon } from "lucide-react";
import { getExerciseImageUrl } from "../../utils/cloudinary";

const fallbackImage = (routine) => {
  const name = String(routine.name || "").toLocaleLowerCase("es");
  if (/lower|pierna|cuadr|femoral|gl[uú]te/.test(name))
    return "/images/routine-lower-a.webp";
  if (/pull|espalda|tracci[oó]n|b[ií]ceps/.test(name))
    return "/images/routine-pull.webp";
  if (/push|empuje|pecho|tr[ií]ceps/.test(name))
    return "/images/routine-push.webp";
  if (/upper|torso|hombro/.test(name)) return "/images/routine-upper.webp";
  return "/images/dashboard-workout-completed-color.jpg";
};

export default function RoutineThumbnail({ routine }) {
  const [failedSources, setFailedSources] = useState([]);
  if (!routine)
    return (
      <span className="quick-plan__thumbnail is-rest" aria-hidden="true">
        <Moon size={23} />
      </span>
    );
  const exerciseImage = (routine.exercises || [])
    .filter((item) => !item.isExtra)
    .map((item) => getExerciseImageUrl(item, { preset: "thumbnail" }))
    .find(Boolean);
  const source = [exerciseImage, fallbackImage(routine)].find(
    (item) => item && !failedSources.includes(item),
  );
  return (
    <span className="quick-plan__thumbnail" aria-hidden="true">
      {source ? (
        <img
          key={source}
          src={source}
          width={48}
          height={48}
          alt=""
          loading="lazy"
          onError={() => setFailedSources((current) => [...current, source])}
        />
      ) : (
        <Dumbbell size={22} />
      )}
    </span>
  );
}
