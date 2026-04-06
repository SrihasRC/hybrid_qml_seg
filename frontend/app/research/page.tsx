"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Download,
  Maximize2,
} from "lucide-react";

export default function ResearchPage() {
  const [expandedImg, setExpandedImg] = useState<{
    name: string;
    url: string;
  } | null>(null);

  const diagramsQuery = useQuery({
    queryKey: ["diagrams"],
    queryFn: ({ signal }) => api.listDiagrams(signal),
  });

  const diagrams = diagramsQuery.data?.items ?? [];

  return (
    <>
      {/* Blog-style scrollable layout */}
      <article className="mx-auto max-w-4xl space-y-16 pb-24">
        {/* Header */}
        <header className="space-y-4 pt-4">
          <Badge variant="outline" className="text-xs">
            Research Report
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight leading-tight sm:text-4xl">
            Hybrid Quantum‑Classical Pipeline for Meningioma Radiotherapy
            Segmentation
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            A comprehensive investigation into augmenting classical deep learning
            architectures with variational quantum circuits for precise meningioma
            delineation in radiotherapy MRI.
          </p>
          <div className="text-muted-foreground flex flex-wrap gap-3 text-sm">
            <Badge variant="secondary">EfficientNetV2-S</Badge>
            <Badge variant="secondary">UNet++</Badge>
            <Badge variant="secondary">8-Qubit VQC</Badge>
            <Badge variant="secondary">BraTS-MEN-RT 2024</Badge>
            <Badge variant="secondary">PennyLane</Badge>
          </div>
        </header>

        <Separator />

        {/* 1. Introduction */}
        <section className="space-y-4">
          <SectionHeading id="introduction" number="1">
            Introduction
          </SectionHeading>
          <Paragraph>
            As classical deep learning architectures approach their theoretical limits in
            parameter scaling and representational efficiency, researchers are investigating
            the potential of <strong>Noisy Intermediate-Scale Quantum (NISQ)</strong> devices to
            augment classical feature extraction. This project explores a novel hybrid
            quantum-classical pipeline whose primary objective is the precise delineation of
            meningioma <strong>Gross Tumor Volumes (GTV)</strong> from MRI scans, specifically
            optimized for radiotherapy planning.
          </Paragraph>
          <Paragraph>
            The architecture fuses a classical <strong>EfficientNetV2-S encoder</strong> and
            a <strong>UNet++ decoder</strong> with an <strong>8-qubit variational quantum
            circuit (VQC)</strong> embedded at the deepest bottleneck feature map. To circumvent
            severe optimization hurdles—most notably the <em>barren plateau</em> phenomenon and
            catastrophic feature disruption—the system implements an advanced
            classical-to-quantum <strong>warm-start training strategy</strong> coupled with a
            <strong> zero-initialized residual injection</strong> mechanism.
          </Paragraph>
          <Callout type="info">
            This exact combination—EfficientNetV2-S + UNet++ + angle-encoded quantum bottleneck
            + zero-initialized warm-start + size-aware sampling on BraTS-MEN-RT—is entirely
            unprecedented in the documented scientific literature.
          </Callout>
        </section>

        <Separator />

        {/* 2. Clinical Context */}
        <section className="space-y-4">
          <SectionHeading id="clinical-context" number="2">
            Clinical &amp; Radiotherapeutic Context
          </SectionHeading>

          <SubHeading>The BraTS-MEN-RT 2024 Dataset</SubHeading>
          <Paragraph>
            The foundational data substrate is derived from the <strong>2024 Brain Tumor
            Segmentation Challenge Meningioma Radiotherapy (BraTS-MEN-RT) dataset</strong>—the
            largest multi-institutional collection of systematically annotated radiotherapy
            planning MRI. Unlike legacy diagnostic datasets that employ aggressive skull-stripping,
            this dataset preserves all extracranial structures (skull, scalp, facial features)
            to support accurate radiation dose modeling.
          </Paragraph>
          <Paragraph>
            The corpus comprises 3D T1-weighted post-contrast images in their native acquisition
            space, with automated defacing for anonymization rather than volumetric skull-stripping.
            This drastically alters the data distribution, embedding tumors within a much more
            complex, heterogeneous background environment.
          </Paragraph>

          <SubHeading>Anatomical Complexity of Meningiomas</SubHeading>
          <Paragraph>
            Meningiomas present uniquely formidable segmentation challenges. Their radiographic
            appearance fluctuates based on histology, anatomical location along the meninges,
            volumetric size, and prior surgical interventions. Annotations follow standardized
            radiotherapy planning protocols, approved by expert neuroradiologists and radiation
            oncologists.
          </Paragraph>

          <SubHeading>2D Adaptation</SubHeading>
          <Paragraph>
            The original 3D volumetric dataset has been systematically transitioned into a
            metadata-driven, <strong>2D NumPy array slice format</strong>. This engineering
            adaptation is a prerequisite for hybrid quantum-classical research, since current
            classical simulators of quantum circuits face exponential memory bottlenecks that
            render full 3D volumetric quantum feature extraction computationally untenable.
          </Paragraph>
        </section>

        <Separator />

        {/* 3. Architecture */}
        <section className="space-y-4">
          <SectionHeading id="architecture" number="3">
            Hybrid Architecture
          </SectionHeading>

          {/* Pipeline flow */}
          <div className="bg-muted/30 rounded-xl p-5 overflow-x-auto">
            <div className="flex items-center gap-2 text-sm font-medium min-w-max">
              <PipelineStep label="2D MRI Slice" />
              <Arrow />
              <PipelineStep label="EfficientNetV2-S Encoder" highlight />
              <Arrow />
              <PipelineStep label="Deep Feature Map" />
              <Arrow />
              <PipelineStep label="8-Qubit VQC Bottleneck" variant="quantum" />
              <Arrow />
              <PipelineStep label="Residual Add" />
              <Arrow />
              <PipelineStep label="UNet++ Decoder" highlight />
              <Arrow />
              <PipelineStep label="Binary Mask" />
            </div>
          </div>

          <SubHeading>EfficientNetV2-S Encoder</SubHeading>
          <Paragraph>
            The encoder utilizes <strong>EfficientNetV2-S</strong>, selected for optimal parameter
            efficiency when coupled with expensive quantum simulations. The key innovation is
            <strong> Fused-MBConv layers</strong>—replacing depthwise convolutions with standard
            dense convolutions in early stages, significantly accelerating training throughput
            while maintaining representation power. Initialized with ImageNet-pretrained weights
            for robust edge and texture detection from the outset.
          </Paragraph>

          <SubHeading>UNet++ Decoder</SubHeading>
          <Paragraph>
            The decoder uses <strong>UNet++</strong> architecture with deeply supervised, nested,
            dense skip pathways that bridge the semantic gap between encoder and decoder feature
            maps. Unlike standard U-Net&apos;s simple skip connections, UNet++ applies dense
            convolution blocks that progressively translate features before fusion, presenting
            the optimizer with a demonstrably easier learning landscape.
          </Paragraph>

          <div className="grid gap-4 sm:grid-cols-2">
            <FeatureBox
              title="Quantum ON Mode"
              description="Deep features pass through the VQC bottleneck before reaching the decoder. Used for main hybrid evaluation."
            />
            <FeatureBox
              title="Quantum OFF Mode"
              description="Decoder uses raw encoder features directly. Same architecture, fair matched-compute classical control."
            />
          </div>
        </section>

        <Separator />

        {/* 4. Quantum Bottleneck */}
        <section className="space-y-4">
          <SectionHeading id="quantum-bottleneck" number="4">
            Quantum Bottleneck Module
          </SectionHeading>
          <Paragraph>
            The defining innovation is the insertion of a <strong>parameterized variational
            quantum circuit</strong> at the deepest feature map, replacing the traditional
            classical bottleneck. Classical CNNs struggle to capture long-range spatial
            dependencies due to localized receptive fields; the quantum bottleneck elegantly
            subverts this by projecting features into a high-dimensional <strong>quantum Hilbert
            space</strong>.
          </Paragraph>

          <SubHeading>Internal Pipeline</SubHeading>
          <div className="space-y-2.5">
            <StepItem n={1} title="Global Average Pooling" desc="Collapse spatial dimensions of the deep feature map" />
            <StepItem n={2} title="Linear Projection (256 → 8)" desc="Compress to an 8-dimensional latent vector via learned linear layer" />
            <StepItem n={3} title="tanh Activation" desc="Bound angles to [-1, 1] for proper Bloch sphere mapping" />
            <StepItem n={4} title="Angle Embedding (RY gates)" desc="Map 8 classical values into 8-qubit quantum superposition states" />
            <StepItem n={5} title="3× Variational Layers" desc="RY/RZ single-qubit rotations + ring-topology CNOT entanglement" />
            <StepItem n={6} title="Pauli-Z Measurement" desc="Extract 8 expectation values, collapsing quantum state to classical" />
            <StepItem n={7} title="Linear Projection (8 → 256)" desc="Map back to encoder dimension — zero-initialized at start" />
            <StepItem n={8} title="Residual Injection" desc="Add quantum output to original deep feature tensor" />
          </div>

          <Callout type="highlight">
            <strong>Why 8 qubits?</strong> An 8-qubit register constructs a complex Hilbert space
            of 2⁸ = 256 dimensions—perfectly mirroring the 256-dimensional classical bottleneck
            with <em>logarithmic</em> rather than quadratic parameter efficiency.
          </Callout>

          <SubHeading>Ring-CNOT Entanglement</SubHeading>
          <Paragraph>
            The entanglement sublayer uses a <strong>ring topology</strong> of CNOT gates where
            qubit <em>i</em> controls qubit <em>i+1</em> (with wrap-around). This propagates
            maximal entanglement across the entire register with the absolute minimum number of
            two-qubit operations—critical since two-qubit gates are the primary source of
            infidelity in physical quantum processors.
          </Paragraph>

          <SubHeading>Zero-Initialized Residual</SubHeading>
          <Paragraph>
            The post-quantum linear projection is <strong>zero-initialized</strong>. At Epoch 0,
            the quantum path outputs exactly zero, making the bottleneck a perfect identity
            function. The model starts as a perfect classical model and learns quantum
            contributions progressively. This is the cornerstone of the warm-start strategy.
          </Paragraph>
        </section>

        <Separator />

        {/* 5. Training Strategy */}
        <section className="space-y-4">
          <SectionHeading id="training" number="5">
            Training Strategy
          </SectionHeading>
          <Paragraph>
            Training deep hybrid networks from random initialization presents catastrophic
            challenges—most lethally the <strong>barren plateau phenomenon</strong>, where
            gradient variance decays exponentially with qubit count and circuit depth. The
            warm-start strategy systematically bypasses this.
          </Paragraph>

          <SubHeading>Zero-Initialized Warm-Start</SubHeading>
          <Paragraph>
            The classical EfficientNetV2-S + UNet++ is first trained to convergence, producing
            an optimized checkpoint. This checkpoint is loaded into the hybrid model. Because
            the quantum projection is zero-initialized, the hybrid network at Epoch 0 possesses
            the <em>exact performance</em> of the classical baseline—the quantum circuit then
            strictly learns perturbative refinements.
          </Paragraph>

          <SubHeading>Three-Phase Schedule</SubHeading>
          <div className="grid gap-4 sm:grid-cols-3">
            <PhaseCard
              phase={1}
              title="Encoder Frozen"
              items={[
                "Train decoder + quantum path only",
                "Encoder weights completely frozen",
                "VQC adapts to stable features",
              ]}
            />
            <PhaseCard
              phase={2}
              title="Full Co-Adaptation"
              items={[
                "Unfreeze encoder end-to-end",
                "Grouped learning rates per component",
                "Quantum params get higher LR",
              ]}
            />
            <PhaseCard
              phase={3}
              title="Fine-Tuning"
              items={[
                "Highly decayed learning rates",
                "Settle into refined local minimum",
                "Final convergence sweep",
              ]}
            />
          </div>

          <SubHeading>Loss Function</SubHeading>
          <Paragraph>
            A weighted combination of <strong>Dice Loss</strong> (optimizes volumetric overlap,
            counteracts extreme class imbalance) and <strong>Binary Cross-Entropy</strong>
            (smooth pixel-level gradients with pos_weight for stabilization):
          </Paragraph>
          <div className="bg-muted/30 rounded-lg p-4 font-mono text-sm text-center">
            L<sub>total</sub> = λ<sub>dice</sub> · L<sub>dice</sub> + λ<sub>bce</sub> · L<sub>bce</sub>
          </div>

          <SubHeading>Adjoint Differentiation</SubHeading>
          <Paragraph>
            The standard parameter-shift rule requires 2 forward passes per quantum parameter—computationally
            unviable within a deep UNet++. Instead, the pipeline uses <strong>adjoint
            differentiation</strong> via PennyLane&apos;s <code>lightning.qubit</code> backend, computing
            exact analytical gradients in a single backward pass at near-classical training speed.
          </Paragraph>
        </section>

        <Separator />

        {/* 6. Lesion-Aware Sampling */}
        <section className="space-y-4">
          <SectionHeading id="sampling" number="6">
            Lesion-Aware Sampling &amp; the Size Trade-Off
          </SectionHeading>
          <Paragraph>
            A pervasive failure mode in neuro-oncology segmentation is reliable detection of
            <strong> small or early-stage lesions</strong>. The global Dice metric harbors massive
            bias toward large lesions: a 500-pixel false negative in a 50,000-pixel tumor barely
            registers, but missing a 500-pixel micro-lesion collapses the score entirely.
          </Paragraph>

          <SubHeading>Run A vs Run B — Ablation Design</SubHeading>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-primary/30">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge>Run A</Badge>
                  <span className="text-sm font-semibold">Sampling ON</span>
                </div>
                <ul className="list-inside list-disc text-sm text-muted-foreground space-y-1">
                  <li>Area quantile threshold: 20th percentile</li>
                  <li>Sampling boost: 1.20×</li>
                  <li>Small-tumor slices appear 20% more often during training</li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Run B</Badge>
                  <span className="text-sm font-semibold">Sampling OFF</span>
                </div>
                <ul className="list-inside list-disc text-sm text-muted-foreground space-y-1">
                  <li>Natural empirical distribution</li>
                  <li>No artificial manipulation</li>
                  <li>Ablation control for fair comparison</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <SubHeading>The See-Saw Effect</SubHeading>
          <Paragraph>
            Pushing a model to hunt for small lesions almost invariably costs large-lesion
            performance. Hyper-sensitivity to localized texture variations loses global continuity,
            manifesting as increased false positives or frayed boundaries on large tumors.
          </Paragraph>
          <Callout type="question">
            <strong>Critical research question:</strong> Can the quantum bottleneck&apos;s global
            information mixing suppress false-positive artifacts and boundary fraying, mitigating
            the HD95 penalty that classical networks suffer?
          </Callout>
        </section>

        <Separator />

        {/* 7. Evaluation */}
        <section className="space-y-4">
          <SectionHeading id="evaluation" number="7">
            Evaluation Protocol
          </SectionHeading>
          <Paragraph>
            Results are reported at three levels to avoid misleading aggregate scores:
          </Paragraph>

          <div className="grid gap-4 sm:grid-cols-2">
            <FeatureBox
              title="Dice Similarity Coefficient (DSC)"
              description="Primary metric measuring volumetric overlap between predicted and ground truth masks: DSC = 2|P ∩ G| / (|P| + |G|). Reported as mean ± std on tumor-containing slices."
            />
            <FeatureBox
              title="95th Hausdorff Distance (HD95)"
              description="Measures maximum spatial boundary deviation at the 95th percentile. Unlike DSC, HD95 heavily penalizes false-positive boundary artifacts induced by aggressive sampling."
            />
          </div>

          <SubHeading>Size-Stratified Reporting</SubHeading>
          <Paragraph>
            Lesions are binned into <strong>small</strong> (bottom quantile),{" "}
            <strong>mid</strong> (middle quantile), and <strong>large</strong> (top quantile)
            categories based on ground truth area. Each bin is reported independently for
            DSC and HD95, preventing the mean from masking disparate behavior across
            scales.
          </Paragraph>
        </section>

        <Separator />

        {/* 8. Scientific Contributions */}
        <section className="space-y-4">
          <SectionHeading id="contributions" number="8">
            Scientific Contributions
          </SectionHeading>

          <SubHeading>Primary Contributions</SubHeading>
          <div className="space-y-3">
            <ContributionItem
              title="Zero-Initialized Warm-Start Quantum Injection"
              description="A scalable, repeatable template for upgrading legacy medical imaging models into the NISQ era. Empirically proves that a zero-initialized, residual quantum bottleneck can be seamlessly hot-swapped into a deeply pre-trained UNet++ without catastrophic forgetting."
            />
            <ContributionItem
              title="Empirical Quantum Response to Distribution Shifts"
              description="First documented evidence of how quantum state-space feature representations respond to classical dataset distribution shifting via size-aware sampling. Tests whether quantum entanglement is more robust to the small/large lesion see-saw than standard dense layers."
            />
          </div>

          <SubHeading>Engineering Adaptations</SubHeading>
          <div className="space-y-3">
            <ContributionItem
              title="3D → 2D Dimensionality Reduction"
              description="Hardware-mandated engineering adaptation. Current classical simulators of quantum circuits encounter exponential memory limitations making full 3D volumetric quantum feature extraction computationally impossible."
            />
            <ContributionItem
              title="Backbone Selection"
              description="EfficientNetV2-S is a pragmatic, efficiency-driven choice designed to maximize classical feature quality while minimizing parameter overhead to support the quantum simulation."
            />
          </div>
        </section>

        <Separator />

        {/* 9. Development Lineage */}
        <section className="space-y-4">
          <SectionHeading id="lineage" number="9">
            Experiment Lineage
          </SectionHeading>
          <div className="space-y-3">
            <LineageRow version="v2 / v3" label="Classical Baseline" desc="EfficientNetV2-S + UNet++ classical training and evaluation" />
            <LineageRow version="p2_v2" label="Initial Hybrid" desc="First angle-encoding quantum bottleneck experiment" />
            <LineageRow version="p2_v3" label="Refined Hybrid" desc="Improved protocol with classical control metrics and comparison CSV" />
            <LineageRow version="p2_v4" label="Stabilized Hybrid" desc="Further protocol improvements and training stability" />
            <LineageRow version="Run A" label="Final (Sampling ON)" desc="Controlled run with lesion-aware small-lesion sampling" highlight />
            <LineageRow version="Run B" label="Final (Sampling OFF)" desc="Controlled ablation run with natural distribution" highlight />
          </div>
        </section>

        <Separator />

        {/* 10. Report Diagrams & Flowcharts */}
        <section className="space-y-4">
          <SectionHeading id="diagrams" number="10">
            Report Diagrams &amp; Flowcharts
          </SectionHeading>
          <Paragraph>
            Visual assets from the research report, including architecture diagrams, training
            pipelines, and evaluation flowcharts.
          </Paragraph>

          {diagramsQuery.isPending && (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-xl" />
              ))}
            </div>
          )}

          {diagramsQuery.isError && (
            <Callout type="warn">
              Failed to load report diagrams. Please ensure the backend is running.
            </Callout>
          )}

          {diagrams.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {diagrams.map((item) => {
                const imgUrl = api.diagramUrl(item.name);
                return (
                  <div
                    key={item.id}
                    className="bg-muted/20 group relative cursor-pointer overflow-hidden rounded-xl border"
                    onClick={() =>
                      setExpandedImg({ name: item.name, url: imgUrl })
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgUrl}
                      alt={item.name}
                      className="w-full object-contain transition-transform group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/15">
                      <Maximize2 className="h-8 w-8 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/60 to-transparent p-3">
                      <p className="text-white text-sm font-medium truncate">
                        {item.name}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!diagramsQuery.isPending &&
            !diagramsQuery.isError &&
            diagrams.length === 0 && (
              <p className="text-muted-foreground text-sm">
                No report diagrams found in the report_docs/diagrams+flowcharts folder.
              </p>
            )}
        </section>

        <Separator />

        {/* 11. References */}
        <section className="space-y-4">
          <SectionHeading id="references" number="11">
            Key References
          </SectionHeading>
          <div className="space-y-1 text-sm">
            <RefLine n={1} text="LaBella et al., Scientific Data (2026) — BraTS-MEN-RT dataset" />
            <RefLine n={2} text="LaBella et al., arXiv (2024) — BraTS Meningioma RT Challenge analysis" />
            <RefLine n={3} text="Zhou et al. (2018) — UNet++ nested skip connections" />
            <RefLine n={4} text="Tan & Le (2021) — EfficientNetV2 architecture" />
            <RefLine n={5} text="Isensee et al. (2021) — nnU-Net baseline framework" />
            <RefLine n={6} text="Benedetti et al. (2019) — Parameterized quantum circuits as ML models" />
            <RefLine n={7} text="Bergholm et al. (2018) — PennyLane autodiff framework for QML" />
            <RefLine n={8} text="Lim et al. (2023) — Quantum bottleneck U-Net for image segmentation" />
            <RefLine n={9} text="Xu et al. (2025) — HiQC hybrid quantum-classical integration" />
            <RefLine n={10} text="Bhuiyan et al. (2025) — QU-Net quantum-enhanced U-Net" />
            <RefLine n={11} text="Wang et al. (2025) — QC-Net hybrid segmentation" />
            <RefLine n={12} text="Zhang et al. (2025) — HQC-TF flexible training framework" />
            <RefLine n={13} text="Bria et al. (2020) — Class imbalance in small lesion detection" />
            <RefLine n={14} text="Zhou et al. (2022) — Oversampling-based augmentation for segmentation" />
            <RefLine n={15} text="Warm-starting patterns in variational quantum algorithms (2024)" />
          </div>
        </section>
      </article>

      {/* Expanded diagram dialog */}
      <Dialog
        open={!!expandedImg}
        onOpenChange={(open) => !open && setExpandedImg(null)}
      >
        <DialogContent className="max-w-[95vw] max-h-[92vh] w-auto overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{expandedImg?.name}</DialogTitle>
          </DialogHeader>
          {expandedImg && (
            <div className="space-y-4">
              <div className="bg-muted/20 overflow-hidden rounded-lg flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={expandedImg.url}
                  alt={expandedImg.name}
                  className="max-w-full max-h-[75vh] object-contain"
                />
              </div>
              <div className="flex justify-end">
                <a href={expandedImg.url} download={expandedImg.name}>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Sub-components ── */

function SectionHeading({
  id,
  number,
  children,
}: {
  id: string;
  number: string | number;
  children: React.ReactNode;
}) {
  return (
    <h2 id={id} className="text-2xl font-bold tracking-tight scroll-mt-16">
      <span className="text-muted-foreground mr-2">{number}.</span>
      {children}
    </h2>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-lg font-semibold tracking-tight pt-2">{children}</h3>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground leading-7 text-[15px]">{children}</p>
  );
}

function Callout({
  type,
  children,
}: {
  type: "info" | "highlight" | "question" | "warn";
  children: React.ReactNode;
}) {
  const styles = {
    info: "border-blue-500/30 bg-blue-500/5 text-blue-900 dark:text-blue-200",
    highlight: "border-primary/30 bg-primary/5",
    question:
      "border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-200",
    warn: "border-destructive/30 bg-destructive/5 text-destructive",
  };

  return (
    <div
      className={`rounded-lg border-l-4 p-4 text-sm leading-relaxed ${styles[type]}`}
    >
      {children}
    </div>
  );
}

function PipelineStep({
  label,
  highlight = false,
  variant = "default",
}: {
  label: string;
  highlight?: boolean;
  variant?: "default" | "quantum";
}) {
  return (
    <span
      className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
        variant === "quantum"
          ? "bg-primary/15 text-primary border border-primary/30"
          : highlight
            ? "bg-muted font-semibold"
            : "bg-muted/60"
      }`}
    >
      {label}
    </span>
  );
}

function Arrow() {
  return <span className="text-muted-foreground text-xs">→</span>;
}

function StepItem({
  n,
  title,
  desc,
}: {
  n: number;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
        {n}
      </span>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted-foreground text-xs">{desc}</p>
      </div>
    </div>
  );
}

function FeatureBox({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="bg-muted/30 rounded-lg p-4 space-y-1">
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-muted-foreground text-xs leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function PhaseCard({
  phase,
  title,
  items,
}: {
  phase: number;
  title: string;
  items: string[];
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <Badge className="text-[10px]">Phase {phase}</Badge>
        <p className="text-sm font-semibold">{title}</p>
        <ul className="space-y-1 text-xs text-muted-foreground">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="mt-1 shrink-0">›</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function ContributionItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="bg-muted/20 rounded-lg p-4 border border-border/50">
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-muted-foreground text-xs leading-relaxed mt-1">
        {description}
      </p>
    </div>
  );
}

function LineageRow({
  version,
  label,
  desc,
  highlight = false,
}: {
  version: string;
  label: string;
  desc: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <Badge
        variant={highlight ? "default" : "outline"}
        className="mt-0.5 shrink-0 text-[10px] min-w-[64px] justify-center"
      >
        {version}
      </Badge>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground text-xs">{desc}</p>
      </div>
    </div>
  );
}

function RefLine({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-border/40 last:border-0">
      <Badge variant="secondary" className="shrink-0 text-[10px] mt-0.5">
        [{n}]
      </Badge>
      <p className="text-muted-foreground text-xs leading-relaxed">{text}</p>
    </div>
  );
}
