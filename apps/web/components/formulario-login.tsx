"use client";

import { Boton, Campo, EstadoError, useI18n, type ContextoI18n } from "@forja/ui";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ErrorApi, solicitarApi } from "../lib/api";
import { rutaInicioPorRol, usarInvalidarSesion, type UsuarioSesion } from "../lib/usar-sesion";
import estilos from "./formulario-login.module.css";

interface RespuestaLogin {
  readonly usuario: UsuarioSesion;
}

function mensajeErrorLogin(error: unknown, t: ContextoI18n["t"]): string {
  if (error instanceof ErrorApi) {
    if (error.codigo === "CREDENCIALES_INVALIDAS") return t("auth.credencialesInvalidas");
    if (error.codigo === "DEMASIADOS_INTENTOS") return t("auth.demasiadosIntentos");
    if (error.codigo === "USUARIO_DESACTIVADO") return t("auth.usuarioDesactivado");
  }
  return t("auth.errorGenerico");
}

export function FormularioLogin() {
  const { t } = useI18n();
  const router = useRouter();
  const invalidarSesion = usarInvalidarSesion();
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");

  const mutacion = useMutation({
    mutationFn: () =>
      solicitarApi<RespuestaLogin>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, contrasena }),
      }),
    onSuccess: (respuesta) => {
      invalidarSesion();
      router.replace(rutaInicioPorRol(respuesta.usuario.rol));
    },
  });

  function alEnviar(evento: FormEvent<HTMLFormElement>): void {
    evento.preventDefault();
    mutacion.mutate();
  }

  return (
    <form onSubmit={alEnviar} className={estilos.formulario}>
      <Campo
        etiqueta={t("auth.emailEtiqueta")}
        type="email"
        value={email}
        onChange={(evento) => setEmail(evento.target.value)}
        autoComplete="username"
        required
      />
      <Campo
        etiqueta={t("auth.contrasenaEtiqueta")}
        type="password"
        value={contrasena}
        onChange={(evento) => setContrasena(evento.target.value)}
        autoComplete="current-password"
        required
      />
      {mutacion.isError ? <EstadoError mensaje={mensajeErrorLogin(mutacion.error, t)} /> : null}
      <Boton type="submit" cargando={mutacion.isPending}>
        {t("auth.entrar")}
      </Boton>
    </form>
  );
}
