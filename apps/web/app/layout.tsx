import type { ReactNode } from "react";

export const metadata = {
  title: "Forja",
  description: "Copiloto de IA para piso de planta en manufactura",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-MX">
      <body>{children}</body>
    </html>
  );
}
