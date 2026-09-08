import React from 'react';
import { AVATAR_PALETTES } from "../constants/colours";
import { getMediaUrl } from "../api/client";

export function Avatar({ name, image, src, user, size = 36, className = '', style = {} }) {
    const rawUrl = image || src || user?.profile_picture?.img || user?.profile_picture?.url || (typeof user?.profile_picture === 'string' ? user.profile_picture : null) || user?.avatar_url || user?.avatar;
    const avatarUrl = rawUrl ? getMediaUrl(rawUrl) : null;
    if (avatarUrl) {
        return (
            <div 
                className={className}
                style={{
                    width: size, height: size, borderRadius: "50%",
                    backgroundImage: `url(${avatarUrl})`, backgroundSize: "cover", backgroundPosition: "center",
                    flexShrink: 0,
                    ...style
                }} 
            />
        );
    }
    const resolvedName = name || user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username || user?.email || "";
    const initials = resolvedName
        ? resolvedName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
        : "?";
    const palette = AVATAR_PALETTES[initials.charCodeAt(0) % AVATAR_PALETTES.length];
    return (
        <div 
            className={className}
            style={{
                width: size, height: size, borderRadius: "50%",
                background: palette.bg, color: palette.text,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: Math.max(10, Math.round(size * 0.36)), fontWeight: 600, flexShrink: 0,
                ...style
            }}
        >
            {initials}
        </div>
    );
}

export default Avatar;
