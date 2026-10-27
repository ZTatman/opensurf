import type { ReactNode } from "react";

type SiteHeaderProps = {
  // Status message announced to screen readers and shown under the toolbar when set.
  notice: string;
  children: ReactNode;
};

export default function SiteHeader({ notice, children }: SiteHeaderProps) {
  return (
    <>
      <a
        className="sr-only fixed left-4 top-3 z-50 bg-surface p-3 focus:not-sr-only"
        href="#camera-library"
      >
        Skip to cameras
      </a>
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-4 sm:gap-8 sm:px-8">
          <a className="text-xl font-bold tracking-tight" href="./" aria-label="OpenSurf home">
            OpenSurf
          </a>
          {children}
        </div>
        <p
          className={`mx-auto max-w-7xl px-4 text-sm text-foreground sm:px-8 ${notice ? "pb-3" : "sr-only"}`}
          role="status"
        >
          {notice}
        </p>
      </header>
    </>
  );
}
