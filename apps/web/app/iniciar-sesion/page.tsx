"use client";

import { useI18n } from "@forja/ui";
import { FormularioLogin } from "../../components/formulario-login";
import estilos from "../../components/formulario-login.module.css";

export default function PaginaIniciarSesion() {
  const { t } = useI18n();

  return (
    <main className={estilos.pantalla}>
      <div>
        <h1 className={estilos.titulo}>{t("auth.nombreProducto")}</h1>
        <FormularioLogin />
      </div>
    </main>
  );
}
