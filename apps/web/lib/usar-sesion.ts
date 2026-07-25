"use client";

import type { Rol } from "@forja/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface UsuarioSesion {
  readonly id: string;
  readonly email: string;
  readonly nombre: string;
  readonly rol: Rol;
}

const CLAVE_SESION = ["sesion-actual"];

async function obtenerSesionActual(): Promise<UsuarioSesion | null> {
  const respuesta = await fetch("/api/auth/me", { credentials: "include" });
  if (respuesta.status === 401) return null;
  if (!respuesta.ok) throw new Error("No se pudo obtener la sesión");
  const cuerpo = (await respuesta.json()) as { usuario: UsuarioSesion };
  return cuerpo.usuario;
}

export function usarSesion() {
  return useQuery({
    queryKey: CLAVE_SESION,
    queryFn: obtenerSesionActual,
    retry: false,
    staleTime: 60_000,
  });
}

export function usarInvalidarSesion(): () => void {
  const cliente = useQueryClient();
  return () => {
    void cliente.invalidateQueries({ queryKey: CLAVE_SESION });
  };
}

/** Ruta de aterrizaje tras iniciar sesión, según spec 02-interfaz (caso de uso: cada rol aterriza en un lugar distinto). */
export function rutaInicioPorRol(rol: Rol): string {
  switch (rol) {
    case "operador":
      return "/chat";
    case "supervisor":
      return "/bandeja";
    case "admin":
      return "/documentos";
  }
}
