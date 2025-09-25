import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_THEME_ID, THEME_MAP, THEMES } from "../theme/themes";

const BACKGROUND_KEYS = new Set(["--bg1", "--bg2"]);
const OVERLAY_OPACITY_PROP = "--bg-overlay-opacity";

function getRoot() {
  if (typeof document === "undefined") {
    return null;
  }
  return document.documentElement;
}

export function useTheme(initialThemeId = DEFAULT_THEME_ID) {
  const [activeThemeId, setActiveThemeId] = useState(() => {
    return THEME_MAP.get(initialThemeId) ? initialThemeId : DEFAULT_THEME_ID;
  });

  const themeMap = useMemo(() => THEME_MAP, []);
  const rootRef = useRef(null);
  const transitionTimeoutRef = useRef();
  const overlayRafRef = useRef();
  const currentThemeRef = useRef(activeThemeId);

  const applyTokens = useCallback((tokens, options = {}) => {
    const root = rootRef.current ?? getRoot();
    if (!root) {
      return;
    }

    rootRef.current = root;

    const { skipBackground = false, onlyBackground = false } = options;

    Object.entries(tokens).forEach(([name, value]) => {
      const isBackground = BACKGROUND_KEYS.has(name);
      if (skipBackground && isBackground) {
        return;
      }
      if (onlyBackground && !isBackground) {
        return;
      }
      root.style.setProperty(name, value);
    });
  }, []);

  const cancelPendingAnimation = useCallback(() => {
    const root = rootRef.current;
    if (transitionTimeoutRef.current) {
      window.clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = undefined;
    }
    if (overlayRafRef.current) {
      cancelAnimationFrame(overlayRafRef.current);
      overlayRafRef.current = undefined;
    }
    if (root) {
      root.style.setProperty(OVERLAY_OPACITY_PROP, "0");
      delete root.dataset.themeAnimating;
    }
  }, []);

  const finishTransition = useCallback((theme) => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    applyTokens(theme.tokens, { onlyBackground: true });
    root.style.setProperty(OVERLAY_OPACITY_PROP, "0");
    requestAnimationFrame(() => {
      delete root.dataset.themeAnimating;
    });
  }, [applyTokens]);

  const beginTransition = useCallback((theme) => {
    const root = rootRef.current ?? getRoot();
    if (!root) {
      return;
    }

    rootRef.current = root;

    cancelPendingAnimation();

    applyTokens(theme.tokens, { skipBackground: true });

    root.dataset.theme = theme.id;
    root.dataset.themeAnimating = "true";
    root.style.setProperty("--bg-overlay1", theme.tokens["--bg1"]);
    root.style.setProperty("--bg-overlay2", theme.tokens["--bg2"]);
    root.style.setProperty(OVERLAY_OPACITY_PROP, "0");

    overlayRafRef.current = requestAnimationFrame(() => {
      overlayRafRef.current = requestAnimationFrame(() => {
        root.style.setProperty(OVERLAY_OPACITY_PROP, "1");
      });
    });

    const mediumDuration = parseFloat(
      getComputedStyle(root).getPropertyValue("--dur-medium")
    );

    transitionTimeoutRef.current = window.setTimeout(() => {
      finishTransition(theme);
    }, Number.isFinite(mediumDuration) ? mediumDuration : 300);
  }, [applyTokens, cancelPendingAnimation, finishTransition]);

  const setTheme = useCallback((nextThemeId) => {
    const nextTheme = themeMap.get(nextThemeId);
    if (!nextTheme || currentThemeRef.current === nextTheme.id) {
      return;
    }

    currentThemeRef.current = nextTheme.id;
    beginTransition(nextTheme);
    setActiveThemeId(nextTheme.id);
  }, [beginTransition, themeMap]);

  useEffect(() => {
    const root = getRoot();
    if (!root) {
      return undefined;
    }

    rootRef.current = root;

    const fallbackTheme =
      themeMap.get(currentThemeRef.current) ??
      themeMap.values().next().value;

    if (!fallbackTheme) {
      return undefined;
    }

    applyTokens(fallbackTheme.tokens);
    root.dataset.theme = fallbackTheme.id;
    root.style.setProperty("--bg-overlay1", fallbackTheme.tokens["--bg1"]);
    root.style.setProperty("--bg-overlay2", fallbackTheme.tokens["--bg2"]);
    root.style.setProperty(OVERLAY_OPACITY_PROP, "0");
    currentThemeRef.current = fallbackTheme.id;

    return () => {
      cancelPendingAnimation();
    };
  }, [applyTokens, cancelPendingAnimation, themeMap]);

  return useMemo(() => ({
    activeThemeId,
    setTheme,
    themes: THEMES,
  }), [activeThemeId, setTheme]);
}

export default useTheme;
