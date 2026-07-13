import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import {
  isKitchenDisplayRoute,
  readKitchenDisplayModePreference,
  writeKitchenDisplayModePreference,
} from "@/lib/kitchen-display-mode";

type KitchenDisplayModeContextValue = {
  /** User preference persisted in localStorage. */
  preferred: boolean;
  /** True when preference is on and the active route is the kitchen display. */
  active: boolean;
  setPreferred: (enabled: boolean) => void;
  toggle: () => void;
};

const KitchenDisplayModeContext =
  createContext<KitchenDisplayModeContextValue | null>(null);

export function KitchenDisplayModeProvider({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [preferred, setPreferredState] = useState(() =>
    readKitchenDisplayModePreference(),
  );

  const setPreferred = useCallback((enabled: boolean) => {
    setPreferredState(enabled);
    writeKitchenDisplayModePreference(enabled);
  }, []);

  const toggle = useCallback(() => {
    setPreferred(!preferred);
  }, [preferred, setPreferred]);

  const active = preferred && isKitchenDisplayRoute(location);

  useEffect(() => {
    document.documentElement.classList.toggle("kitchen-mode-active", active);
    return () => {
      document.documentElement.classList.remove("kitchen-mode-active");
    };
  }, [active]);

  const value = useMemo(
    () => ({ preferred, active, setPreferred, toggle }),
    [preferred, active, setPreferred, toggle],
  );

  return (
    <KitchenDisplayModeContext.Provider value={value}>
      {children}
    </KitchenDisplayModeContext.Provider>
  );
}

export function useKitchenDisplayMode(): KitchenDisplayModeContextValue {
  const ctx = useContext(KitchenDisplayModeContext);
  if (!ctx) {
    return {
      preferred: false,
      active: false,
      setPreferred: () => undefined,
      toggle: () => undefined,
    };
  }
  return ctx;
}
