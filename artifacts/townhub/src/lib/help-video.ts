import type { HelpVideoSource } from "./help-content";

export function parseYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "");
      return id || null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/embed/")) {
        return parsed.pathname.split("/")[2] ?? null;
      }
      return parsed.searchParams.get("v");
    }
  } catch {
    return null;
  }
  return null;
}

export function parseVimeoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("vimeo.com")) return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    const id = parts[parts.length - 1];
    return id && /^\d+$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function resolveVideoEmbed(source: HelpVideoSource): {
  kind: "iframe" | "video";
  src: string;
  title: string;
} | null {
  if (source.type === "upload") {
    return { kind: "video", src: source.url, title: "Help video" };
  }

  if (source.type === "youtube") {
    const id = parseYouTubeId(source.url);
    if (!id) return null;
    return {
      kind: "iframe",
      src: `https://www.youtube-nocookie.com/embed/${id}`,
      title: "YouTube video",
    };
  }

  if (source.type === "vimeo") {
    const id = parseVimeoId(source.url);
    if (!id) return null;
    return {
      kind: "iframe",
      src: `https://player.vimeo.com/video/${id}`,
      title: "Vimeo video",
    };
  }

  return null;
}
