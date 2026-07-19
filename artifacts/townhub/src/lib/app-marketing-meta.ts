import { appMarketingConfig } from "./app-marketing-config.ts";

const META_MARK = "data-app-marketing-meta";

function upsertMeta(
  selector: string,
  attrs: Record<string, string>,
): HTMLMetaElement {
  let el = document.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    for (const [key, value] of Object.entries(attrs)) {
      if (key === "content") continue;
      el.setAttribute(key, value);
    }
    document.head.appendChild(el);
  }
  if (attrs.content != null) {
    el.setAttribute("content", attrs.content);
  }
  el.setAttribute(META_MARK, "true");
  return el;
}

function upsertLink(rel: string, href: string): HTMLLinkElement {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"][${META_MARK}]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    el.setAttribute(META_MARK, "true");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
  return el;
}

function absoluteUrl(path: string): string {
  if (typeof window === "undefined") return path;
  try {
    return new URL(path, window.location.origin).toString();
  } catch {
    return path;
  }
}

/** Apply page-specific title, description, Open Graph, and Apple Smart Banner. */
export function applyAppMarketingMeta(): () => void {
  const previousTitle = document.title;
  const { pageTitle, metaDescription, ogImagePath, canonicalPath, appStoreId } =
    appMarketingConfig;

  document.title = pageTitle;

  const description = document.querySelector('meta[name="description"]');
  const previousDescription = description?.getAttribute("content") ?? null;
  if (description) {
    description.setAttribute("content", metaDescription);
  }

  upsertMeta('meta[property="og:title"]', {
    property: "og:title",
    content: pageTitle,
  });
  upsertMeta('meta[property="og:description"]', {
    property: "og:description",
    content: metaDescription,
  });
  upsertMeta('meta[property="og:type"]', {
    property: "og:type",
    content: "website",
  });
  upsertMeta('meta[property="og:url"]', {
    property: "og:url",
    content: absoluteUrl(canonicalPath),
  });
  upsertMeta('meta[property="og:image"]', {
    property: "og:image",
    content: absoluteUrl(ogImagePath),
  });
  upsertMeta('meta[name="twitter:card"]', {
    name: "twitter:card",
    content: "summary_large_image",
  });
  upsertMeta('meta[name="twitter:title"]', {
    name: "twitter:title",
    content: pageTitle,
  });
  upsertMeta('meta[name="twitter:description"]', {
    name: "twitter:description",
    content: metaDescription,
  });
  upsertMeta('meta[name="apple-itunes-app"]', {
    name: "apple-itunes-app",
    content: `app-id=${appStoreId}`,
  });
  upsertLink("canonical", absoluteUrl(canonicalPath));

  return () => {
    document.title = previousTitle;
    if (description && previousDescription != null) {
      description.setAttribute("content", previousDescription);
    }
    document
      .querySelectorAll(`[${META_MARK}="true"]`)
      .forEach((node) => node.remove());
  };
}

export function isAppMarketingPath(pathname: string): boolean {
  const path = pathname.split("?")[0]?.split("#")[0] ?? pathname;
  return path === "/app" || path === "/app/";
}
