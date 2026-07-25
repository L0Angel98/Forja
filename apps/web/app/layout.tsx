import type { ReactNode } from "react";
import { Providers } from "./providers";
import "@forja/ui/src/base.css";

export const metadata = {
  title: "Forja",
  description: "Copiloto de IA para piso de planta en manufactura",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-MX">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
