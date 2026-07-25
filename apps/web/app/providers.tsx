"use client";

import { ProveedorI18n } from "@forja/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [cliente] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }));

  return (
    <QueryClientProvider client={cliente}>
      <ProveedorI18n>{children}</ProveedorI18n>
    </QueryClientProvider>
  );
}
