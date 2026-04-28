"use client";

import { LocaleProvider } from "@/i18n/locale-context";
import { AppStateProvider } from "@/state/app-state-context";
import { SiteHeader } from "@/components/SiteHeader";
import { ThemeProvider } from "@/theme/theme-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <AppStateProvider>
        <ThemeProvider>
          <SiteHeader />
          {children}
        </ThemeProvider>
      </AppStateProvider>
    </LocaleProvider>
  );
}
