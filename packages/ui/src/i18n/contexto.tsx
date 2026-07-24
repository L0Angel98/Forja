"use client";

import {
  crearT,
  diccionarios,
  IDIOMA_POR_DEFECTO,
  type DiccionarioEsMX,
  type Idioma,
  type RutaDiccionario,
} from "@forja/shared";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const CLAVE_ALMACENAMIENTO = "forja:idioma";

export interface ContextoI18n {
  readonly idioma: Idioma;
  readonly establecerIdioma: (idioma: Idioma) => void;
  readonly t: (clave: RutaDiccionario<DiccionarioEsMX>) => string;
}

const ContextoI18nReact = createContext<ContextoI18n | null>(null);

function esIdioma(valor: string): valor is Idioma {
  return valor in diccionarios;
}

function leerIdiomaGuardado(): Idioma {
  if (typeof window === "undefined") return IDIOMA_POR_DEFECTO;
  const guardado = window.localStorage.getItem(CLAVE_ALMACENAMIENTO);
  return guardado !== null && esIdioma(guardado) ? guardado : IDIOMA_POR_DEFECTO;
}

/**
 * Persiste el idioma elegido en localStorage (spec 02-interfaz: "cambio de
 * idioma persiste entre sesiones"). El componente React vive en
 * @forja/ui (no en @forja/shared, que también consumen paquetes de
 * backend sin React) — el diccionario en sí sí vive en @forja/shared/i18n,
 * como pide la spec. Por ahora solo existe es-MX como base; el mecanismo
 * ya queda listo para más locales sin cambios estructurales.
 */
export function ProveedorI18n({ children }: { children: ReactNode }): ReactNode {
  const [idioma, setIdioma] = useState<Idioma>(IDIOMA_POR_DEFECTO);

  useEffect(() => {
    // localStorage solo existe en cliente: el estado inicial (servidor e
    // hidratación) es siempre IDIOMA_POR_DEFECTO a propósito, para no
    // desincronizar el HTML renderizado en servidor del primer render en
    // cliente; el idioma persistido se aplica recién después del montaje.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIdioma(leerIdiomaGuardado());
  }, []);

  const establecerIdioma = useCallback((nuevo: Idioma) => {
    setIdioma(nuevo);
    window.localStorage.setItem(CLAVE_ALMACENAMIENTO, nuevo);
  }, []);

  const t = useMemo(() => crearT(diccionarios[idioma]), [idioma]);
  const valor = useMemo<ContextoI18n>(() => ({ idioma, establecerIdioma, t }), [idioma, establecerIdioma, t]);

  return <ContextoI18nReact.Provider value={valor}>{children}</ContextoI18nReact.Provider>;
}

export function useI18n(): ContextoI18n {
  const contexto = useContext(ContextoI18nReact);
  if (!contexto) throw new Error("useI18n debe usarse dentro de <ProveedorI18n>.");
  return contexto;
}
