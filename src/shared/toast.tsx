/** Kurze Bestätigungsmeldungen am unteren Bildschirmrand (`role="status"`, Bildschirmleser lesen sie vor). */
import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';

const ToastContext = createContext<(text: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; text: string }[]>([]);

  const zeige = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setItems((alt) => [...alt, { id, text }]);
    setTimeout(() => setItems((alt) => alt.filter((i) => i.id !== id)), 2600);
  }, []);

  return (
    <ToastContext.Provider value={zeige}>
      {children}
      {/* Bildschirmleser lesen Meldungen vor, ohne den Fokus zu verschieben */}
      <div className="toast-wrap" role="status">
        {items.map((i) => (
          <div key={i.id} className="toast">
            {i.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
