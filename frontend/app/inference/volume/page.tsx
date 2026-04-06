"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { VolumePredictionResponse } from "@/lib/types";
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
import { Upload, Loader2, Cuboid, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function VolumeInferencePage() {
  const [modelId, setModelId] = useState<string>("");
  const [threshold, setThreshold] = useState(0.5);
  const [axis, setAxis] = useState(2);
  const [stride, setStride] = useState(4);
  const [topK, setTopK] = useState(12);
  const [file, setFile] = useState<File | null>(null);

  const modelsQuery = useQuery({
    queryKey: ["models"],
    queryFn: ({ signal }) => api.listModels(signal),
  });

  const readyModels = (modelsQuery.data ?? []).filter(
    (m) => m.checkpoint_exists,
  );

  const mutation = useMutation({
    mutationFn: () => {
      if (!file || !modelId) throw new Error("Select a model and upload a file");
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
              Configure model, axis, stride, and other options
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
              <Label>Axis</Label>
              <Select
                value={String(axis)}
                onValueChange={(v) => setAxis(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Axis 0 (Sagittal)</SelectItem>
                  <SelectItem value="1">Axis 1 (Coronal)</SelectItem>
                  <SelectItem value="2">Axis 2 (Axial)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Stride & Top K */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="stride-input">Stride</Label>
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
                <Label htmlFor="topk-input">Top K</Label>
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
                  .nii or .nii.gz
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
                <CardContent className="flex flex-wrap gap-6 p-4">
                  <div>
                    <p className="text-muted-foreground text-xs">Model</p>
                    <p className="font-mono text-sm font-medium">
                      {result.model_id}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Processed Slices
                    </p>
                    <p className="font-mono text-sm font-medium">
                      {result.processed_slices}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Positive Slices
                    </p>
                    <p className="font-mono text-sm font-medium">
                      {result.positive_slice_count}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Axis</p>
                    <p className="font-mono text-sm font-medium">
                      {result.axis}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Stride</p>
                    <p className="font-mono text-sm font-medium">
                      {result.stride}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Top slices grid */}
              <div>
                <h3 className="mb-3 text-sm font-semibold">
                  Top {result.top_slices.length} Slices (by tumor area)
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {result.top_slices.map((slice) => (
                    <Card key={slice.slice_index}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">
                            Slice #{slice.slice_index}
                          </CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {(slice.tumor_ratio * 100).toFixed(1)}%
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-muted/20 overflow-hidden rounded-lg">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`data:image/png;base64,${slice.mask_png_base64}`}
                            alt={`Mask for slice ${slice.slice_index}`}
                            className="w-full object-contain"
                          />
                        </div>
                        <p className="text-muted-foreground mt-2 text-xs">
                          {slice.tumor_pixels.toLocaleString()} tumor pixels
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}

          {!result && !mutation.isPending && !mutation.isError && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Cuboid className="text-muted-foreground mb-3 h-12 w-12" />
                <p className="text-muted-foreground text-sm">
                  Select a model, upload a NIfTI volume, and run analysis
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
