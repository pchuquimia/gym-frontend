import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";
import { resolveProfileAvatar } from "../../utils/profileAvatars";
import { UserRound } from "lucide-react";

function AvatarFallback({
  name,
  avatarId,
  gender,
  className = "",
  fallbackClassName = "",
}) {
  const avatar = resolveProfileAvatar(avatarId, name, gender);
  return (
    <div className={`overflow-hidden ${className}`}>
      <span
        role="img"
        aria-label={
          avatar
            ? `Avatar deportivo de ${name || "usuario"}`
            : `Perfil de ${name || "usuario"}`
        }
        data-avatar-id={avatar?.id}
        data-avatar-gender={avatar?.gender}
        className={`grid h-full w-full place-items-center bg-[color:var(--surface-subtle)] text-[color:var(--text-muted)] ${fallbackClassName}`}
        style={
          avatar
            ? {
                backgroundImage: `url("${avatar.image}")`,
                backgroundSize: "300% 200%",
                backgroundPosition: avatar.position,
                backgroundRepeat: "no-repeat",
              }
            : undefined
        }
      >
        {!avatar && <UserRound className="h-1/2 w-1/2" aria-hidden="true" />}
      </span>
    </div>
  );
}

function PhotoAvatar({
  photoId,
  avatarId,
  gender,
  name,
  className = "",
  imageClassName = "h-full w-full object-cover",
  fallbackClassName = "",
}) {
  const [objectUrl, setObjectUrl] = useState("");
  const [failedPhoto, setFailedPhoto] = useState(null);
  const avatarQuery = useQuery({
    queryKey: ["profile-avatar", String(photoId || "")],
    queryFn: () =>
      api.getPhotoContent(`/api/photos/${photoId}/content`, {
        width: 240,
        height: 240,
      }),
    enabled: Boolean(photoId),
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    let active = true;
    if (!avatarQuery.data) {
      Promise.resolve().then(() => {
        if (active) setObjectUrl("");
      });
      return () => {
        active = false;
      };
    }
    const nextUrl = URL.createObjectURL(avatarQuery.data);
    Promise.resolve().then(() => {
      if (active) setObjectUrl(nextUrl);
    });
    return () => {
      active = false;
      URL.revokeObjectURL(nextUrl);
    };
  }, [avatarQuery.data]);

  if (!objectUrl || failedPhoto === objectUrl)
    return (
      <AvatarFallback
        name={name}
        avatarId={avatarId}
        gender={gender}
        className={className}
        fallbackClassName={fallbackClassName}
      />
    );
  return (
    <div className={`overflow-hidden ${className}`}>
      <img
        src={objectUrl}
        alt={`Foto de ${name || "perfil"}`}
        className={imageClassName}
        onError={() => setFailedPhoto(objectUrl)}
      />
    </div>
  );
}

export default function ProfileAvatar(props) {
  return props.photoId ? (
    <PhotoAvatar key={props.photoId} {...props} />
  ) : (
    <AvatarFallback {...props} />
  );
}
