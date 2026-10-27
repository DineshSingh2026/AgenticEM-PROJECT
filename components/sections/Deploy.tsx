import { copy } from "@/content/copy";
import { BracketPanel, SectionHeader, StepRing } from "@/components/ui";

/** Logo strip — renders nothing until real operator logos exist in copy.home.proof. */
function ProofStrip() {
  const proof = copy.home.proof;
  if (proof.length === 0) return null;
  return (
    <div className="mt-20 border-t border-line pt-8">
      <p className="t-label text-text-faint">{copy.home.deploy.proofLabel}</p>
      <ul className="mt-6 flex flex-wrap items-center gap-x-12 gap-y-6">
        {proof.map((p) => (
          <li key={p.name}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.logo} alt={p.name} className="h-7 w-auto opacity-70 grayscale" loading="lazy" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 13 // DEPLOYMENT — Convergence (calm) behind; 4-step operator deployment path. */
export function Deploy() {
  const c = copy.home.deploy;
  return (
    <section
      id="deployment"
      data-scene="Convergence"
      data-scene-variant="calm"
      aria-label={c.title}
      className="relative section-pad"
    >
      <p className="sr-only">{c.sceneDescription}</p>

      <div className="container-site relative">
        <SectionHeader eyebrow={c.eyebrow} title={c.title} />
        <BracketPanel className="mt-14 p-6 md:p-10 lg:mt-20">
          <StepRing steps={c.steps.map((s) => ({ ...s }))} orientation="row" />
        </BracketPanel>
        <ProofStrip />
      </div>
    </section>
  );
}
