import { ChevronLeft, ChevronRight } from "lucide-react";
import ProfileAvatar from "../profile/ProfileAvatar";
import "./coachDashboard.css";

export function CoachAthleteRow({
  athlete,
  detail,
  selected = false,
  blocked = false,
  onClick,
}) {
  const attention = ["high", "medium"].includes(athlete.priority);
  return (
    <button
      type="button"
      className={`coach-athlete-row ${selected ? "is-selected" : ""} ${blocked ? "is-blocked" : ""}`}
      onClick={onClick}
      aria-disabled={blocked}
    >
      <ProfileAvatar
        photoId={athlete.profile?.avatarPhotoId}
        avatarId={athlete.profile?.avatarId}
        gender={athlete.profile?.gender}
        name={athlete.name}
        className="coach-athlete-row__avatar"
      />
      <span className="coach-athlete-row__copy">
        <strong title={athlete.name}>{athlete.name}</strong>
        <small title={detail}>{detail}</small>
      </span>
      {attention ? (
        <span
          className={`coach-athlete-row__priority is-${athlete.priority}`}
          role="img"
          aria-label={
            athlete.priority === "high"
              ? "Requiere atención"
              : "Revisar seguimiento"
          }
        />
      ) : (
        <ChevronRight size={16} aria-hidden="true" />
      )}
    </button>
  );
}

export function CoachPagination({ count, page, pageSize, onChange }) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  if (pages <= 1) return null;
  return (
    <nav className="coach-pagination" aria-label="Páginas de alumnos">
      <span aria-live="polite">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, count)} de{" "}
        {count}
      </span>
      <div>
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          aria-label="Página anterior"
        >
          <ChevronLeft size={17} />
        </button>
        <span>
          {page}/{pages}
        </span>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page === pages}
          aria-label="Página siguiente"
        >
          <ChevronRight size={17} />
        </button>
      </div>
    </nav>
  );
}
