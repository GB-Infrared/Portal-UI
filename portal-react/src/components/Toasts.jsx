import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(() => {});

/** `const toast = useToast(); toast('Filters applied')` */
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const seq = useRef(0);

  const push = useCallback(message => {
    const id = ++seq.current;
    setItems(list => [...list, { id, message }]);
    setTimeout(() => setItems(list => list.filter(t => t.id !== id)), 2600);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div id="toasts">
        {items.map(t => <div className="toast" key={t.id}>{t.message}</div>)}
      </div>
    </ToastContext.Provider>
  );
}
