import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import StatusModal from "../components/modals/StatusModal.jsx";
import ToastStack from "../components/modals/ToastStack.jsx";

/**
 * Global modal & toast altyapısı.
 *
 * - `confirm({ variant, title, description, confirmLabel, cancelLabel })`
 *   → Promise<boolean> döner.
 * - `toast({ variant, title, description, duration })` — küçük bildirim.
 *
 * Tüm proje native alert/confirm yerine bu kanalı kullanır.
 */
const ModalContext = createContext(null);

let toastCounter = 0;

export function ModalProvider({ children }) {
  const [confirmState, setConfirmState] = useState(null);
  const [toasts, setToasts] = useState([]);
  const resolverRef = useRef(null);
  const timersRef = useRef(new Map());

  const closeConfirm = useCallback((result) => {
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
    setConfirmState(null);
  }, []);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setConfirmState({
        variant: "info",
        title: "Onaylayın",
        description: "",
        confirmLabel: undefined,
        cancelLabel: "İptal",
        hideCancel: false,
        ...options
      });
    });
  }, []);

  const dismissToast = useCallback((id) => {
    const handle = timersRef.current.get(id);
    if (handle) {
      clearTimeout(handle);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (options = {}) => {
      const id = `toast-${++toastCounter}`;
      const item = {
        id,
        variant: "info",
        title: "",
        description: "",
        duration: 3500,
        ...options
      };
      setToasts((prev) => [item, ...prev].slice(0, 5));
      const handle = setTimeout(() => dismissToast(id), item.duration);
      timersRef.current.set(id, handle);
      return id;
    },
    [dismissToast]
  );

  useEffect(
    () => () => {
      timersRef.current.forEach((handle) => clearTimeout(handle));
      timersRef.current.clear();
    },
    []
  );

  const api = useMemo(
    () => ({
      confirm,
      toast,
      success: (title, description) =>
        toast({ variant: "success", title, description }),
      error: (title, description) =>
        toast({ variant: "error", title, description }),
      info: (title, description) =>
        toast({ variant: "info", title, description }),
      warning: (title, description) =>
        toast({ variant: "warning", title, description })
    }),
    [confirm, toast]
  );

  return (
    <ModalContext.Provider value={api}>
      {children}
      <StatusModal
        open={Boolean(confirmState)}
        variant={confirmState?.variant}
        title={confirmState?.title}
        description={confirmState?.description}
        confirmLabel={confirmState?.confirmLabel}
        cancelLabel={confirmState?.cancelLabel}
        hideCancel={confirmState?.hideCancel}
        onConfirm={() => closeConfirm(true)}
        onCancel={() => closeConfirm(false)}
      />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </ModalContext.Provider>
  );
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx)
    throw new Error("useModal yalnızca ModalProvider içinde çağrılabilir.");
  return ctx;
}

export function useConfirm() {
  return useModal().confirm;
}

export function useToast() {
  const { toast, success, error, info, warning } = useModal();
  return { toast, success, error, info, warning };
}
