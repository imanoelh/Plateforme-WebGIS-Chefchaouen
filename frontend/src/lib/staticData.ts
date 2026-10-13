import type { DashboardSummary, LegendEntry, StudyArea, Transition } from "@/lib/webgisApi";

export interface StaticDataBundle {
  summary: DashboardSummary;
  transitions: Transition[];
  legend: LegendEntry[];
  studyArea: StudyArea;
}

let bundlePromise: Promise<StaticDataBundle> | undefined;

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Static resource ${path}: HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

function loadBundle(): Promise<StaticDataBundle> {
  if (!bundlePromise) {
    bundlePromise = Promise.all([
      getJson<DashboardSummary>("/static-data/statistics/summary.json"),
      getJson<Transition[]>("/static-data/statistics/transitions.json"),
      getJson<LegendEntry[]>("/static-data/statistics/legend.json"),
      getJson<DashboardSummary["accuracy"]>("/static-data/statistics/accuracy.json"),
      getJson<StudyArea>("/static-data/study_area.geojson"),
    ]).then(([summary, transitions, legend, accuracy, studyArea]) => ({
      summary: { ...summary, accuracy },
      transitions,
      legend,
      studyArea,
    }));
  }
  return bundlePromise;
}

export const staticDataApi = {
  summary: () => loadBundle().then((bundle) => bundle.summary),
  transitions: () => loadBundle().then((bundle) => bundle.transitions),
  legend: () => loadBundle().then((bundle) => bundle.legend),
  studyArea: () => loadBundle().then((bundle) => bundle.studyArea),
};
