"use client";

import { useEffect, useState } from "react";

export function usarEnLinea(): boolean {
  const [enLinea, setEnLinea] = useState(true);

  useEffect(() => {
    setEnLinea(navigator.onLine);

    function actualizar(): void {
      setEnLinea(navigator.onLine);
    }

    window.addEventListener("online", actualizar);
    window.addEventListener("offline", actualizar);
    return () => {
      window.removeEventListener("online", actualizar);
      window.removeEventListener("offline", actualizar);
    };
  }, []);

  return enLinea;
}
