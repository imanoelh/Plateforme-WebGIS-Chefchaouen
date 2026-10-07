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

const EXPLORE_ITEMS = [
  "Land Cover 2019",
  "Land Cover 2025",
  "Forest Change 2019–2025",
  "Interactive 2019/2025 comparison",
  "Land-cover statistics",
  "Land-cover transition statistics",
  "Pixel and location information",
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
            {section === "about"
              ? "Chefchaouen Forest Change · Land Cover Monitoring · 2019–2025."
              : "Land-cover and forest change monitoring, Chefchaouen 2019–2025."}
          </DialogDescription>
        </DialogHeader>
        {section === "about" ? (
          <div className="space-y-5 text-sm">
            <section>
              <h4 className="label-caps mb-2">Project overview</h4>
              <p className="leading-relaxed text-muted-foreground">
                This WebGIS application lets users explore and compare land cover and forest change
                across the study area between 2019 and 2025.
              </p>
            </section>
            <section className="rounded-md border bg-muted/40 p-3">
              <h4 className="label-caps mb-1">Study area</h4>
              <p className="font-medium">Chefchaouen and Jbel El Kelaa</p>
              <p className="text-xs text-muted-foreground">Rif Mountains, Morocco</p>
            </section>
            <section>
              <h4 className="label-caps mb-2">What you can explore</h4>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {EXPLORE_ITEMS.map((item) => (
                  <li key={item} className="flex gap-2 text-xs leading-relaxed">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h4 className="label-caps mb-2">Project team</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-md border p-3">
                  <p className="font-semibold">Mohamed Chikh Essbiti</p>
                  <p className="text-xs text-muted-foreground">
                    Satellite Analysis · Google Earth Engine
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="font-semibold">Imane Elhamri</p>
                  <p className="text-xs text-muted-foreground">WebGIS Development</p>
                </div>
              </div>
            </section>
            <section>
              <h4 className="label-caps mb-2">Data sources</h4>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Copernicus Sentinel · ESA WorldCover · Google Cloud Score+ · NASA/USGS SRTM
              </p>
            </section>
          </div>
        ) : (
          <>
            <dl className="divide-y rounded-md border text-sm">
              {facts.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[10rem_1fr] gap-2 px-3 py-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
