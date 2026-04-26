"use client";

import { AppStateProvider } from "@/state/app-state-context";
import { SiteHeader } from "@/components/SiteHeader";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppStateProvider>
      <SiteHeader />
      {children}
    </AppStateProvider>
  );
}
