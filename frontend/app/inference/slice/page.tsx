"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { SlicePredictionResponse } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { Upload, Loader2, ScanLine, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SliceInferencePage() {
  const [modelId, setModelId] = useState<string>("");
  const [threshold, setThreshold] = useState(0.5);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

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
      return api.predictSlice(file, modelId, threshold);
    },
  });

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      setFile(f);
      mutation.reset();

      // Generate a preview for image files
      if (
        f.type.startsWith("image/") ||
        f.name.endsWith(".png") ||
        f.name.endsWith(".jpg") ||
        f.name.endsWith(".jpeg")
      ) {
        const url = URL.createObjectURL(f);
        setPreview(url);
      } else {
        setPreview(null);
      }
    },
    [mutation],
  );

  const result: SlicePredictionResponse | undefined = mutation.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Slice Inference (2D)
        </h1>
        <p className="text-muted-foreground text-sm">
          Upload a single MRI slice and run segmentation inference
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parameters</CardTitle>
            <CardDescription>
              Configure the model and threshold for prediction
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Model selector */}
            <div className="space-y-2">
              <Label htmlFor="model-select">Model</Label>
              {modelsQuery.isPending ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={modelId} onValueChange={setModelId}>
                  <SelectTrigger id="model-select">
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

            {/* Threshold slider */}
            <div className="space-y-2">
              <Label>Threshold: {threshold.toFixed(2)}</Label>
              <Slider
                value={[threshold]}
                onValueChange={([v]) => setThreshold(v)}
                min={0.01}
                max={0.99}
                step={0.01}
              />
              <p className="text-muted-foreground text-xs">
                Probability threshold for binary mask generation
              </p>
            </div>

            <Separator />

            {/* File upload */}
            <div className="space-y-2">
              <Label>Upload Slice</Label>
              <div className="border-border hover:border-primary/50 relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors">
                <Upload className="text-muted-foreground mb-2 h-8 w-8" />
                <p className="text-muted-foreground text-sm">
                  {file ? file.name : "Click or drag to upload"}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  PNG, JPG, NPY, NPZ
                </p>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.npy,.npz"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={handleFileChange}
                />
              </div>

              {/* Image preview */}
              {preview && (
                <div className="bg-muted/30 mt-2 overflow-hidden rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt="Input preview"
                    className="mx-auto max-h-48 object-contain"
                  />
                </div>
              )}
            </div>

            <Button
              className="w-full"
              disabled={!file || !modelId || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Inference...
                </>
              ) : (
                <>
                  <ScanLine className="mr-2 h-4 w-4" />
                  Run Prediction
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
              <AlertTitle>Inference Failed</AlertTitle>
              <AlertDescription>
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : "An unknown error occurred"}
              </AlertDescription>
            </Alert>
          )}

          {mutation.isPending && (
            <div className="space-y-4">
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          )}

          {result && (
            <>
              {/* Stats */}
              <Card>
                <CardContent className="flex flex-wrap gap-6 p-4">
                  <div>
                    <p className="text-muted-foreground text-xs">Model</p>
                    <p className="font-mono text-sm font-medium">
                      {result.model_id}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Threshold</p>
                    <p className="font-mono text-sm font-medium">
                      {result.threshold.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Input Shape</p>
                    <p className="font-mono text-sm font-medium">
                      {result.input_shape.join("×")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Tumor Pixels
                    </p>
                    <p className="font-mono text-sm font-medium">
                      {result.tumor_pixels.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Tumor Ratio</p>
                    <p className="font-mono text-sm font-medium">
                      {(result.tumor_ratio * 100).toFixed(2)}%
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Images */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Binary Mask</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/20 overflow-hidden rounded-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`data:image/png;base64,${result.mask_png_base64}`}
                        alt="Predicted mask"
                        className="w-full object-contain"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Probability Map</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/20 overflow-hidden rounded-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`data:image/png;base64,${result.prob_png_base64}`}
                        alt="Probability heatmap"
                        className="w-full object-contain"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {!result && !mutation.isPending && !mutation.isError && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <ScanLine className="text-muted-foreground mb-3 h-12 w-12" />
                <p className="text-muted-foreground text-sm">
                  Select a model, upload a slice, and run prediction
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
