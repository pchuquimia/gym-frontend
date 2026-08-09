import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";

const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";

export default function ProfileAvatar({
  photoId,
  name,
  className = "",
  imageClassName = "h-full w-full object-cover",
  fallbackClassName = "",
}) {
  const [objectUrl, setObjectUrl] = useState("");
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

  return (
    <div className={`overflow-hidden ${className}`}>
      {objectUrl ? (
        <img
          src={objectUrl}
          alt={`Foto de ${name || "perfil"}`}
          className={imageClassName}
        />
      ) : (
        <span
          aria-label={`Iniciales de ${name || "usuario"}`}
          className={`grid h-full w-full place-items-center ${fallbackClassName}`}
        >
          {getInitials(name)}
        </span>
      )}
    </div>
  );
}
