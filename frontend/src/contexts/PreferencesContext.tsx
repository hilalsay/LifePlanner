import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface PreferencesValue {
  // Hide finished (completed) tasks/priorities from the assistant attachment picker.
  hideCompleted: boolean;
  setHideCompleted: (v: boolean) => void;
}

const PreferencesContext = createContext<PreferencesValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [hideCompleted, setHideCompleted] = useState<boolean>(
    () => localStorage.getItem("pref.hideCompleted") === "true"
  );

  useEffect(() => {
    localStorage.setItem("pref.hideCompleted", String(hideCompleted));
  }, [hideCompleted]);

  return (
    <PreferencesContext.Provider value={{ hideCompleted, setHideCompleted }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
}
