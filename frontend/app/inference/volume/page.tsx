"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { VolumePredictionResponse, VolumeSliceResult } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, Loader2, Cuboid, AlertCircle, Maximize2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function VolumeInferencePage() {
  const [modelId, setModelId] = useState<string>("");
  const [threshold, setThreshold] = useState(0.5);
  const [axis, setAxis] = useState(2);
  const [stride, setStride] = useState(4);
  const [topK, setTopK] = useState(12);
  const [file, setFile] = useState<File | null>(null);
  const [selectedSlice, setSelectedSlice] = useState<VolumeSliceResult | null>(
    null,
  );

  const modelsQuery = useQuery({
    queryKey: ["models"],
    queryFn: ({ signal }) => api.listModels(signal),
  });

  const readyModels = (modelsQuery.data ?? []).filter(
    (m) => m.checkpoint_exists,
  );

  const mutation = useMutation({
    mutationFn: () => {
      if (!file || !modelId)
        throw new Error("Select a model and upload a file");
      return api.predictVolume(file, modelId, {
        threshold,
        axis,
        stride,
        top_k: topK,
      });
    },
  });

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      setFile(f);
      mutation.reset();
    },
    [mutation],
  );

  const result: VolumePredictionResponse | undefined = mutation.data;

  const axisLabels: Record<number, string> = {
    0: "Sagittal",
    1: "Coronal",
    2: "Axial",
  };

  // Chart data for tumor distribution across slices
  const chartData =
    result?.top_slices.map((s) => ({
      name: `#${s.slice_index}`,
      pixels: s.tumor_pixels,
      ratio: +(s.tumor_ratio * 100).toFixed(2),
    })) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Volume Inference (3D)
        </h1>
        <p className="text-muted-foreground text-sm">
          Upload a NIfTI volume and analyze slices for tumor segmentation
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parameters</CardTitle>
            <CardDescription>
              Configure model, slicing axis, stride, and analysis depth
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Model selector */}
            <div className="space-y-2">
              <Label htmlFor="volume-model-select">Model</Label>
              {modelsQuery.isPending ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={modelId} onValueChange={setModelId}>
                  <SelectTrigger id="volume-model-select">
                    <SelectValue placeholder="Select a model..." />
                  </SelectTrigger>
                  <SelectContent>
                    {readyModels.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              m.model_type === "hybrid"
                                ? "default"
                                : "secondary"
                            }
                            className="text-[10px]"
                          >
                            {m.model_type}
                          </Badge>
                          {m.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Threshold */}
            <div className="space-y-2">
              <Label>Threshold: {threshold.toFixed(2)}</Label>
              <Slider
                value={[threshold]}
                onValueChange={([v]) => setThreshold(v)}
                min={0.01}
                max={0.99}
                step={0.01}
              />
            </div>

            {/* Axis */}
            <div className="space-y-2">
              <Label>Slicing Axis</Label>
              <Select
                value={String(axis)}
                onValueChange={(v) => setAxis(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Axis 0 — Sagittal</SelectItem>
                  <SelectItem value="1">Axis 1 — Coronal</SelectItem>
                  <SelectItem value="2">Axis 2 — Axial</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Which anatomical plane to slice the volume along
              </p>
            </div>

            {/* Stride & Top K */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="stride-input">
                  Stride
                  <span className="text-muted-foreground ml-1 text-xs">
                    (skip)
                  </span>
                </Label>
                <Input
                  id="stride-input"
                  type="number"
                  min={1}
                  max={20}
                  value={stride}
                  onChange={(e) => setStride(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="topk-input">
                  Top K
                  <span className="text-muted-foreground ml-1 text-xs">
                    (results)
                  </span>
                </Label>
                <Input
                  id="topk-input"
                  type="number"
                  min={1}
                  max={50}
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                />
              </div>
            </div>

            <Separator />

            {/* File upload */}
            <div className="space-y-2">
              <Label>Upload NIfTI Volume</Label>
              <div className="border-border hover:border-primary/50 relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors">
                <Upload className="text-muted-foreground mb-2 h-8 w-8" />
                <p className="text-muted-foreground text-sm">
                  {file ? file.name : "Click or drag to upload"}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  .nii or .nii.gz files
                </p>
                <input
                  type="file"
                  accept=".nii,.nii.gz"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            <Button
              className="w-full"
              disabled={!file || !modelId || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Volume...
                </>
              ) : (
                <>
                  <Cuboid className="mr-2 h-4 w-4" />
                  Run Volume Analysis
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          {mutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Volume Inference Failed</AlertTitle>
              <AlertDescription>
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : "An unknown error occurred"}
              </AlertDescription>
            </Alert>
          )}

          {mutation.isPending && (
            <div className="space-y-4">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-48 rounded-xl" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-xl" />
                ))}
              </div>
            </div>
          )}

          {result && (
            <>
              {/* Summary */}
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    <SummaryItem label="Model" value={result.model_id} />
                    <SummaryItem
                      label="Slicing Plane"
                      value={axisLabels[result.axis] ?? `Axis ${result.axis}`}
                    />
                    <SummaryItem
                      label="Processed Slices"
                      value={String(result.processed_slices)}
                    />
                    <SummaryItem
                      label="Positive Slices"
                      value={`${result.positive_slice_count} / ${result.processed_slices}`}
                    />
                    <SummaryItem
                      label="Detection Rate"
                      value={
                        result.processed_slices > 0
                          ? `${((result.positive_slice_count / result.processed_slices) * 100).toFixed(1)}%`
                          : "—"
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Tumor distribution chart */}
              {chartData.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Tumor Distribution Across Top Slices
                    </CardTitle>
                    <CardDescription>
                      Tumor pixel count per slice (sorted by area)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-border"
                          />
                          <XAxis
                            dataKey="name"
                            fontSize={10}
                            tick={{ fill: "currentColor" }}
                          />
                          <YAxis
                            fontSize={10}
                            tick={{ fill: "currentColor" }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "var(--popover)",
                              border: "1px solid var(--border)",
                              borderRadius: "var(--radius)",
                              color: "var(--popover-foreground)",
                            }}
                            formatter={(value, name) => [
                              name === "pixels"
                                ? `${Number(value).toLocaleString()} px`
                                : `${value}%`,
                              name === "pixels" ? "Tumor Pixels" : "Tumor %",
                            ]}
                          />
                          <Bar
                            dataKey="pixels"
                            fill="var(--chart-1)"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Top slices grid */}
              <div>
                <h3 className="mb-3 text-sm font-semibold">
                  Top {result.top_slices.length} Slices — Ranked by Tumor Area
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {result.top_slices.map((slice) => (
                    <SliceCard
                      key={slice.slice_index}
                      slice={slice}
                      axisLabel={
                        axisLabels[result.axis] ?? `Axis ${result.axis}`
                      }
                      onExpand={() => setSelectedSlice(slice)}
                    />
                  ))}
                </div>
              </div>

              {/* No positive slices message */}
              {result.positive_slice_count === 0 && (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground text-sm">
                      No tumor-positive slices detected in this volume at
                      threshold {result.threshold.toFixed(2)}.
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Try lowering the threshold or using a different model.
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {!result && !mutation.isPending && !mutation.isError && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Cuboid className="text-muted-foreground mb-3 h-12 w-12" />
                <p className="text-muted-foreground text-sm">
                  Upload a NIfTI volume (.nii/.nii.gz) to analyze
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  The volume will be sliced along the chosen axis, and the top
                  slices with most tumor pixels are returned
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Detail modal for individual slice */}
      <Dialog
        open={!!selectedSlice}
        onOpenChange={(open) => !open && setSelectedSlice(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Slice #{selectedSlice?.slice_index} — Detail View
            </DialogTitle>
          </DialogHeader>
          {selectedSlice && (
            <div className="space-y-4">
              <div className="bg-muted/20 overflow-hidden rounded-lg">
                <MaskVisualization maskBase64={selectedSlice.mask_png_base64} />
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Slice Index</p>
                  <p className="font-mono font-medium">
                    {selectedSlice.slice_index}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Tumor Pixels</p>
                  <p className="font-mono font-medium">
                    {selectedSlice.tumor_pixels.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Tumor Ratio</p>
                  <p className="font-mono font-medium">
                    {(selectedSlice.tumor_ratio * 100).toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-mono text-sm font-semibold">{value}</p>
    </div>
  );
}

function SliceCard({
  slice,
  axisLabel,
  onExpand,
}: {
  slice: VolumeSliceResult;
  axisLabel: string;
  onExpand: () => void;
}) {
  const hasContent = slice.tumor_pixels > 0;

  return (
    <Card
      className={`group overflow-hidden ${!hasContent ? "opacity-60" : ""}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">
            {axisLabel} Slice #{slice.slice_index}
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Badge
              variant={hasContent ? "default" : "outline"}
              className="text-xs"
            >
              {(slice.tumor_ratio * 100).toFixed(1)}%
            </Badge>
            <Button variant="ghost" size="sm" onClick={onExpand}>
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className="cursor-pointer overflow-hidden rounded-lg"
          onClick={onExpand}
        >
          <MaskVisualization maskBase64={slice.mask_png_base64} />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {slice.tumor_pixels.toLocaleString()} tumor px
          </span>
          {hasContent && (
            <Badge variant="outline" className="text-[10px]">
              Tumor detected
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Renders a grayscale mask with tumor regions colorized for better visibility
 */
function MaskVisualization({ maskBase64 }: { maskBase64: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = `data:image/png;base64,${maskBase64}`;
    img.onload = () => {
      const w = img.width;
      const h = img.height;
      canvas.width = w;
      canvas.height = h;

      // Draw original mask
      ctx.drawImage(img, 0, 0);

      // Get pixel data and colorize
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const val = data[i];
        if (val > 128) {
          // Tumor region — colorize with a warm red-orange
          data[i] = 239; // R
          data[i + 1] = 68; // G
          data[i + 2] = 68; // B
          data[i + 3] = 220; // A
        } else {
          // Background — dark gray
          data[i] = 30;
          data[i + 1] = 30;
          data[i + 2] = 30;
          data[i + 3] = 255;
        }
      }

      ctx.putImageData(imageData, 0, 0);
    };
  }, [maskBase64]);

  return (
    <canvas
      ref={canvasRef}
      className="bg-muted/20 w-full rounded-lg object-contain"
    />
  );
}
