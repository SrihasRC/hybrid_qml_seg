"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ModelImage } from "@/lib/types";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Download,
  FlaskConical,
  Maximize2,
  TrendingUp,
  FileImage,
  Atom,
} from "lucide-react";

/** Categorize images into groups */
function categorize(
  images: ModelImage[],
): Record<string, ModelImage[]> {
  const categories: Record<string, ModelImage[]> = {};
  for (const img of images) {
    const name = img.name.toLowerCase();
    let cat: string;
    if (name.includes("training_curve") || name.includes("phase2_training")) {
      cat = "Training Curves";
    } else if (name.includes("op_vis") || name.includes("predictions")) {
      cat = "Output Visualizations";
    } else if (name.includes("quantum_diagnostics")) {
      cat = "Quantum Diagnostics";
    } else {
      cat = "Other";
    }
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(img);
  }
  return categories;
}

function getCategoryIcon(cat: string) {
  switch (cat) {
    case "Training Curves":
      return <TrendingUp className="mr-1.5 h-3.5 w-3.5" />;
    case "Output Visualizations":
      return <FileImage className="mr-1.5 h-3.5 w-3.5" />;
    case "Quantum Diagnostics":
      return <Atom className="mr-1.5 h-3.5 w-3.5" />;
    default:
      return null;
  }
}

const MODEL_DISPLAY: Record<string, { label: string; type: string }> = {
  classical_v2: { label: "Classical v2", type: "classical" },
  classical_v3: { label: "Classical v3", type: "classical" },
  hybrid_v2: { label: "Hybrid v2", type: "hybrid" },
  hybrid_v3: { label: "Hybrid v3", type: "hybrid" },
  hybrid_v4: { label: "Hybrid v4", type: "hybrid" },
  hybrid_final_runA: { label: "Final Run A", type: "hybrid" },
  hybrid_final_runB: { label: "Final Run B", type: "hybrid" },
};

const MODEL_IDS = Object.keys(MODEL_DISPLAY);

export default function VisualizationsPage() {
  const [selectedModel, setSelectedModel] = useState(MODEL_IDS[0]);
  const [expanded, setExpanded] = useState<{
    name: string;
    url: string;
  } | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Training Visualizations
        </h1>
        <p className="text-muted-foreground text-sm">
          Training curves, output predictions, and quantum diagnostics per model
        </p>
      </div>

      <Tabs
        value={selectedModel}
        onValueChange={setSelectedModel}
        className="w-full"
      >
        <TabsList className="flex flex-wrap h-auto gap-1">
          {MODEL_IDS.map((id) => {
            const display = MODEL_DISPLAY[id];
            return (
              <TabsTrigger
                key={id}
                value={id}
                className="flex items-center gap-1.5"
              >
                <Badge
                  variant={
                    display.type === "hybrid" ? "default" : "secondary"
                  }
                  className="text-[9px] px-2"
                >
                  {display.type[0].toUpperCase()}
                </Badge>
                {display.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {MODEL_IDS.map((id) => (
          <TabsContent key={id} value={id} className="mt-4">
            <ModelVisualizationGrid
              modelId={id}
              onExpand={(name, url) => setExpanded({ name, url })}
            />
          </TabsContent>
        ))}
      </Tabs>

      <Dialog
        open={!!expanded}
        onOpenChange={(open) => !open && setExpanded(null)}
      >
        <DialogContent className="max-w-[95vw] max-h-[92vh] w-auto overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{expanded?.name}</DialogTitle>
          </DialogHeader>
          {expanded && (
            <div className="space-y-4">
              <div className="bg-muted/20 overflow-hidden rounded-lg flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={expanded.url}
                  alt={expanded.name}
                  className="max-w-full max-h-[75vh] object-contain"
                />
              </div>
              <div className="flex justify-end">
                <a href={expanded.url} download={expanded.name}>
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
    </div>
  );
}

function ModelVisualizationGrid({
  modelId,
  onExpand,
}: {
  modelId: string;
  onExpand: (name: string, url: string) => void;
}) {
  const { data, isPending, isError } = useQuery({
    queryKey: ["model-images", modelId],
    queryFn: ({ signal }) => api.listModelImages(modelId, signal),
  });

  if (isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="p-4">
          <p className="text-destructive text-sm">
            Failed to load images for this model.
          </p>
        </CardContent>
      </Card>
    );
  }

  const items = data?.items ?? [];

  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <FlaskConical className="text-muted-foreground mb-3 h-10 w-10" />
          <p className="text-muted-foreground text-sm">
            No visualization images found for this model
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            This model folder may not contain training curves or output
            visualizations
          </p>
        </CardContent>
      </Card>
    );
  }

  const categories = categorize(items);

  return (
    <div className="space-y-6">
      {Object.entries(categories).map(([cat, catItems]) => (
        <div key={cat}>
          <h3 className="mb-3 flex items-center text-sm font-semibold">
            {getCategoryIcon(cat)}
            {cat}
            <Badge variant="outline" className="ml-2 text-[10px]">
              {catItems.length}
            </Badge>
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {catItems.map((item) => {
              const imgUrl = api.modelImageUrl(modelId, item.name);
              return (
                <Card key={item.id} className="group overflow-hidden">
                  <div
                    className="bg-muted/20 relative aspect-video cursor-pointer overflow-hidden"
                    onClick={() => onExpand(item.name, imgUrl)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgUrl}
                      alt={item.name}
                      className="h-full w-full object-contain transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                      <Maximize2 className="h-8 w-8 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </div>
                  <CardContent className="flex items-center justify-between p-3">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <a href={imgUrl} download={item.name}>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
