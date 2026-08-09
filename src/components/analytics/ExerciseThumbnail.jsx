import { useState } from "react";
import PropTypes from "prop-types";
import { Dumbbell } from "lucide-react";

export default function ExerciseThumbnail({
  src,
  alt = "",
  fallback = "",
  className = "h-20 w-[76px]",
}) {
  const [failedSrc, setFailedSrc] = useState("");

  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden bg-[color:var(--bg)] text-[color:var(--text-muted)] ${className}`}
    >
      {src && failedSrc !== src ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        fallback || <Dumbbell className="h-5 w-5" aria-hidden="true" />
      )}
    </span>
  );
}

ExerciseThumbnail.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string,
  fallback: PropTypes.node,
  className: PropTypes.string,
};
