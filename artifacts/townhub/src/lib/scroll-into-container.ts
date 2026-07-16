/**
 * Scroll `target` into view inside the nearest scroll container without using
 * `Element.scrollIntoView`, which on iOS Cap can resize the visual viewport and
 * make the native bottom tab bar jump/change size.
 */
export function scrollElementIntoNearestContainer(
  target: HTMLElement,
  options?: { behavior?: ScrollBehavior; offsetPx?: number },
): void {
  const behavior = options?.behavior ?? "smooth";
  const offsetPx = options?.offsetPx ?? 12;

  const scrollRoot =
    (document.querySelector("[data-native-scroll-root='true']") as HTMLElement | null) ??
    findScrollParent(target);

  if (!scrollRoot) {
    // Web fallback: nearest avoids yanking fixed chrome as hard as block:start.
    target.scrollIntoView({ behavior, block: "nearest", inline: "nearest" });
    return;
  }

  const rootRect = scrollRoot.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const delta = targetRect.top - rootRect.top - offsetPx;
  // Skip tiny adjustments — avoids jitter when already roughly in view mid-retry.
  if (Math.abs(delta) < 8) return;

  const nextTop = scrollRoot.scrollTop + delta;
  scrollRoot.scrollTo({ top: Math.max(0, nextTop), behavior });
}

function findScrollParent(el: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = el.parentElement;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    if (
      (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
      node.scrollHeight > node.clientHeight + 1
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}
