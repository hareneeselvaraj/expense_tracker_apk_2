import { useState, useCallback } from "react";

export function useConfirm() {
  const [state, setState] = useState(null); // { title, message, onConfirm }

  const confirm = useCallback((title, message, onConfirm) => {
    setState({ title, message, onConfirm });
  }, []);

  const close = useCallback(() => {
    setState(null);
  }, []);

  const handleConfirm = useCallback(() => {
    if (state?.onConfirm) state.onConfirm();
    setState(null);
  }, [state]);

  return { state, confirm, close, handleConfirm };
}
