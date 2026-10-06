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

const PROCESSING_STEPS = [
  {
    title: "Data preparation",
    text: "Sentinel-2 Level-2A harmonized surface reflectance was processed in Google Earth Engine. A median composite was created from June to September for each year, with Cloud Score+ masking cloudy observations (cs_cdf ≥ 0.60).",
  },
  {
    title: "Predictor variables",
    text: "Ten spectral bands (B2–B8A, B11 and B12), NDVI, NBR and MNDWI were combined with 30 m SRTM elevation and slope.",
  },
  {
    title: "Classification",
    text: "Stratified samples were drawn from areas where ESA WorldCover 2020 and 2021 agree. The documented split is 70% training and 30% validation; a 300-tree Random Forest was trained for each year.",
  },
  {
    title: "Post-processing",
    text: "A 3 × 3 majority filter was applied to each classified map.",
  },
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
  const accuracyText = ([2019, 2025] as const)
    .map((year) => {
      const item = accuracy?.find((entry) => entry.year === year);
      return item
        ? `${year}: ${(item.overall_accuracy * 100).toFixed(1)}% Overall Accuracy, κ ${item.kappa.toFixed(2)}`
        : null;
    })
    .filter((value): value is string => value !== null)
    .join("; ");
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
        {section === "methodology" && (
          <section>
            <h4 className="label-caps mb-2">Processing workflow</h4>
            <ol className="space-y-2">
              {PROCESSING_STEPS.map((step, index) => (
                <li key={step.title} className="rounded-md border bg-muted/40 p-3 text-sm">
                  <div className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold">{step.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.text}</p>
                    </div>
                  </div>
                </li>
              ))}
              <li className="rounded-md border bg-muted/40 p-3 text-sm">
                <div className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                    5
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold">Accuracy assessment</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      Accuracy was assessed with 577 validation points per year. {accuracyText || "Accuracy values are unavailable."} The validation labels are derived from WorldCover and are not independent field observations.
                    </p>
                  </div>
                </div>
              </li>
            </ol>
          </section>
        )}
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
