export const NOMBRE_COOKIE_SESION = "forja_sesion";

export function opcionesCookieSesion(): {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
    path: "/",
  };
}
