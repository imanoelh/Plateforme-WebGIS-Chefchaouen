import { Info, Maximize2, Microscope, Trees } from "lucide-react";

interface Props {
  onAbout: () => void;
  onMethodology: () => void;
  onFullscreen: () => void;
}

export function Header({ onAbout, onMethodology, onFullscreen }: Props) {
  const btn =
    "flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-chrome-muted transition-colors hover:bg-chrome-foreground/10 hover:text-chrome-foreground";
  return (
    <header className="flex h-14 shrink-0 items-center justify-between bg-chrome px-3 text-chrome-foreground sm:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary">
          <Trees className="h-4.5 w-4.5 text-primary-foreground" />
        </div>
        <div className="min-w-0 leading-tight">
          <h1 className="truncate text-sm font-semibold sm:text-base">Chefchaouen Forest Change</h1>
          <p className="truncate text-[11px] text-chrome-muted">
            Land Cover Monitoring · 2019–2025
          </p>
        </div>
      </div>
      <nav className="flex items-center gap-0.5">
        <button className={btn} onClick={onAbout}>
          <Info className="h-4 w-4" />
          <span className="hidden sm:inline">About</span>
        </button>
        <button className={btn} onClick={onMethodology}>
          <Microscope className="h-4 w-4" />
          <span className="hidden sm:inline">Methodology</span>
        </button>
        <button className={btn} onClick={onFullscreen} aria-label="Fullscreen map">
          <Maximize2 className="h-4 w-4" />
        </button>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <p className="text-[10px] leading-snug text-muted-foreground">
      M. Chikh Essbiti · I. Elhamri — Data: Copernicus Sentinel, ESA WorldCover, Google Cloud
      Score+, NASA/USGS SRTM. Demonstration only.
    </p>
  );
}
