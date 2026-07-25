"use client";

import { EstadoVacio, useI18n } from "@forja/ui";

/**
 * Placeholder honesto para destinos de nav que aún no tienen pantalla real
 * (p. ej. Máquinas/Conectores/Rutinas/Workspace en esta iteración de la
 * spec 02-interfaz) — no simula datos, solo indica que falta construirse.
 */
export function PaginaProximamente() {
  const { t } = useI18n();
  return (
    <main style={{ padding: 24 }}>
      <EstadoVacio titulo={t("proximamente.titulo")} descripcion={t("proximamente.descripcion")} />
    </main>
  );
}
