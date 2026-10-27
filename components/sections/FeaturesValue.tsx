import { copy } from "@/content/copy";
import { BracketPanel, FeatureValueTable, SectionHeader } from "@/components/ui";
import featuresData from "@/content/data/features.json";

type FeatureRow = { feature: string; benefit: string; detail: string; chart: number[] };

/** features.json is written by the Sim agent; accept either a bare array or { rows: [...] }. */
function toRows(data: unknown): FeatureRow[] {
  const list = Array.isArray(data) ? data : (data as { rows?: unknown } | null)?.rows;
  if (!Array.isArray(list) || list.length === 0) {
    // Fallback: spec copy without detail/chart, so the section never renders empty.
    return copy.home.features.rows.map((r) => ({ feature: r.feature, benefit: r.benefit, detail: "", chart: [] }));
  }
  return list.map((r) => {
    const row = r as Partial<FeatureRow>;
    return {
      feature: String(row.feature ?? ""),
      benefit: String(row.benefit ?? ""),
      detail: String(row.detail ?? ""),
      chart: Array.isArray(row.chart) ? row.chart.map(Number) : [],
    };
  });
}

const rows = toRows(featuresData as unknown);

/** 10 // PLATFORM_VALUE — Convergence (calm) behind; feature → business value accordion. */
export function FeaturesValue() {
  const c = copy.home.features;
  return (
    <section
      id="platform-value"
      data-scene="Convergence"
      data-scene-variant="calm"
      aria-label={c.title}
      className="relative section-pad"
    >
      <p className="sr-only">{c.sceneDescription}</p>

      <div className="container-site relative grid gap-12 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-32">
            <SectionHeader eyebrow={c.eyebrow} title={c.title} />
          </div>
        </div>

        <div className="lg:col-span-8">
          <BracketPanel className="px-2 py-2 sm:px-4 sm:py-4">
            <FeatureValueTable rows={rows} className="border-t-0" />
          </BracketPanel>
        </div>
      </div>
    </section>
  );
}
