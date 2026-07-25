import type { Page } from "@playwright/test";

/** Usuarios de desarrollo sembrados por packages/db/src/seed.ts. */
export const USUARIOS = {
  operador: { email: "operador@forja.local", contrasena: "Forja123!" },
  supervisor: { email: "supervisor@forja.local", contrasena: "Forja123!" },
  admin: { email: "admin@forja.local", contrasena: "Forja123!" },
} as const;

export async function iniciarSesion(page: Page, rol: keyof typeof USUARIOS): Promise<void> {
  const { email, contrasena } = USUARIOS[rol];
  await page.goto("/iniciar-sesion");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(contrasena);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForLoadState("networkidle");
}
