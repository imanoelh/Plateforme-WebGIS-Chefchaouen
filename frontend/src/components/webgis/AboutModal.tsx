import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Accuracy } from "@/lib/webgisApi";

const FACTS: [string, string][] = [
  ["Study area", "Chefchaouen and Jbel El Kelaa, Rif Mountains, Morocco"],
  ["Period", "2019–2025"],
  ["Satellite imagery", "Sentinel-2 Level-2A"],
  ["Spatial resolution", "10 m"],
  ["Classification method", "Random Forest"],
];

export function AboutModal({
  open,
  onOpenChange,
  section,
  accuracy,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  section: "about" | "methodology";
  accuracy: Accuracy[] | undefined;
}) {
  const facts = [
    ...FACTS,
    ...([2019, 2025] as const).map((year): [string, string] => {
      const value = accuracy?.find((item) => item.year === year)?.overall_accuracy;
      return [
        `${year} overall accuracy`,
        value == null ? "Unavailable" : `${(value * 100).toFixed(1)}%`,
      ];
    }),
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{section === "about" ? "About this project" : "Methodology"}</DialogTitle>
          <DialogDescription>
            Land-cover and forest change monitoring, Chefchaouen 2019–2025.
          </DialogDescription>
        </DialogHeader>
        <dl className="divide-y rounded-md border text-sm">
          {facts.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[10rem_1fr] gap-2 px-3 py-2">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="rounded-md bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
          The accuracy values represent agreement with WorldCover-derived validation labels and do
          not constitute independent field validation. Gross forest change may be affected by
          classification confusion, particularly between forest and shrubland/grassland. This
          application is a demonstration/portfolio product and is not intended for legal or
          management decisions.
        </p>
        <div>
          <h4 className="label-caps mb-2">Authors</h4>
          <div className="grid gap-2 sm:grid-cols-2 text-sm">
            <div>
              <p className="font-semibold">Mohamed Chikh Essbiti</p>
              <p className="text-xs text-muted-foreground">
                Satellite Analysis · Google Earth Engine
              </p>
            </div>
            <div>
              <p className="font-semibold">Imane Elhamri</p>
              <p className="text-xs text-muted-foreground">WebGIS Development</p>
            </div>
          </div>
        </div>
        <div>
          <h4 className="label-caps mb-1">Data credits</h4>
          <p className="text-xs text-muted-foreground">
            Copernicus Sentinel · ESA WorldCover · Google Cloud Score+ · NASA / USGS SRTM
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
