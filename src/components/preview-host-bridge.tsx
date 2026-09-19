import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  collectRoutePathsFromTree,
  installPreviewHostBridge,
} from "@/lib/preview-host-bridge";

function stripGrokChrome() {
  if (typeof document === "undefined") return () => {};
  const isBannerText = (value: string) => {
    const t = value.replace(/\s+/g, " ").trim();
    return (
      /created with grok/i.test(t) ||
      /powered by grok/i.test(t) ||
      /^remix$/i.test(t) ||
      /^grok$/i.test(t)
    );
  };
  const sweep = () => {
    document.querySelectorAll('script[src*="grok-app-builder/extensions.js"]').forEach((node) => node.remove());
    document.querySelectorAll("a, button, div, header, span, p").forEach((el) => {
      const label = el.getAttribute("aria-label") ?? "";
      const text = el.childElementCount <= 3 ? (el.textContent ?? "") : "";
      if (!isBannerText(label) && !isBannerText(text)) return;
      const host = el.closest("header, [data-grok-banner], [class*='grok']") ?? el;
      if (host instanceof HTMLElement) host.remove();
    });
  };
  sweep();
  const observer = new MutationObserver(sweep);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  return () => observer.disconnect();
}

export function PreviewHostBridge() {
  const router = useRouter();
  useEffect(() => {
    return installPreviewHostBridge({
      navigate: (path) => {
        router.history.push(path);
      },
      getRoutePaths: () => collectRoutePathsFromTree(router.routeTree),
    });
  }, [router]);
  useEffect(() => stripGrokChrome(), []);
  return null;
}
