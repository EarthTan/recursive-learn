"use client";

import Link from "next/link";
import { useAppState } from "@/state/app-state-context";

export function SiteHeader() {
  const { rehydrated, state } = useAppState();
  if (!rehydrated) {
    return null;
  }
  const mapHref = state ? `/maps/${state.activeTopicId}` : "/";

  return (
    <header className="site-header">
      <Link href="/" className="site-header__logo">
        MapLearn
      </Link>
      <nav className="site-header__nav" aria-label="Primary">
        <Link href={mapHref}>Learning map</Link>
        <Link href="/knowledge-base">Knowledge base</Link>
        <Link href="/search">Search</Link>
        <span className="site-header__placeholder">Account</span>
      </nav>
    </header>
  );
}
