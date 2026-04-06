"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Loader2, ScanLine, AlertCircle, Eye, Layers } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SliceInferencePage() {
  const [modelId, setModelId] = useState<string>("");
  const [threshold, setThreshold] = useState(0.5);
  const [file, setFile] = useState<File | null>(null);
  const [gtFile, setGtFile] = useState<File | null>(null);
  const [gtPreview, setGtPreview] = useState<string | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0.45);

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
      return api.predictSlice(file, modelId, threshold);
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

  const handleGtChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      setGtFile(f);
      const url = URL.createObjectURL(f);
      setGtPreview(url);
    },
    [],
  );

  const result: SlicePredictionResponse | undefined = mutation.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Slice Inference (2D)
        </h1>
        <p className="text-muted-foreground text-sm">
          Upload an MRI slice, run segmentation, and visualize the mask overlay
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parameters</CardTitle>
            <CardDescription>
              Configure the model and threshold, optionally add ground truth
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
              <Label>Upload MRI Slice</Label>
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
            </div>

            <Separator />

            {/* Ground truth upload (optional) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Ground Truth Mask
                <Badge variant="outline" className="text-[10px]">
                  Optional
                </Badge>
              </Label>
              <div className="border-border hover:border-primary/50 relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors">
                <p className="text-muted-foreground text-sm">
                  {gtFile ? gtFile.name : "Upload ground truth mask"}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  PNG, JPG, or any image
                </p>
                <input
                  type="file"
                  accept="image/*,.png,.jpg,.jpeg,.bmp,.tiff,.tif"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={handleGtChange}
                />
              </div>
              {gtPreview && (
                <div className="bg-muted/30 mt-1 overflow-hidden rounded-lg p-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={gtPreview}
                    alt="GT preview"
                    className="mx-auto max-h-24 object-contain"
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

              {/* Visualization tabs */}
              <Tabs defaultValue="overlay">
                <TabsList>
                  <TabsTrigger value="overlay">
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    Mask Overlay
                  </TabsTrigger>
                  <TabsTrigger value="sidebyside">
                    <Layers className="mr-1.5 h-3.5 w-3.5" />
                    Side-by-Side
                  </TabsTrigger>
                  <TabsTrigger value="raw">Raw Outputs</TabsTrigger>
                  {gtPreview && (
                    <TabsTrigger value="gt">
                      Ground Truth Comparison
                    </TabsTrigger>
                  )}
                </TabsList>

                {/* Overlay tab — like op_vis style */}
                <TabsContent value="overlay" className="mt-4 space-y-3">
                  <div className="space-y-2">
                    <Label>
                      Overlay Opacity: {(overlayOpacity * 100).toFixed(0)}%
                    </Label>
                    <Slider
                      value={[overlayOpacity]}
                      onValueChange={([v]) => setOverlayOpacity(v)}
                      min={0}
                      max={1}
                      step={0.05}
                    />
                  </div>
                  <Card>
                    <CardContent className="p-3">
                      <OverlayCanvas
                        inputBase64={result.input_png_base64}
                        maskBase64={result.mask_png_base64}
                        opacity={overlayOpacity}
                        maskColor={[239, 68, 68]}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Side-by-side tab */}
                <TabsContent value="sidebyside" className="mt-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Input</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-muted/20 overflow-hidden rounded-lg">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`data:image/png;base64,${result.input_png_base64}`}
                            alt="Input"
                            className="w-full object-contain"
                          />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">
                          Predicted Mask
                        </CardTitle>
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
                        <CardTitle className="text-sm">
                          Probability Map
                        </CardTitle>
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
                </TabsContent>

                {/* Raw outputs tab */}
                <TabsContent value="raw" className="mt-4">
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
                        <CardTitle className="text-sm">
                          Probability Map
                        </CardTitle>
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
                </TabsContent>

                {/* Ground truth comparison tab */}
                {gtPreview && (
                  <TabsContent value="gt" className="mt-4 space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">
                            Prediction Overlay
                            <Badge variant="default" className="ml-2 text-[10px]">Red</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <OverlayCanvas
                            inputBase64={result.input_png_base64}
                            maskBase64={result.mask_png_base64}
                            opacity={0.5}
                            maskColor={[239, 68, 68]}
                          />
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">
                            Ground Truth Overlay
                            <Badge variant="secondary" className="ml-2 text-[10px]">Green</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <GtOverlayCanvas
                            inputBase64={result.input_png_base64}
                            gtSrc={gtPreview}
                          />
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">
                            Combined
                            <Badge variant="default" className="ml-1 text-[10px]">Pred</Badge>
                            <Badge variant="secondary" className="ml-1 text-[10px]">GT</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <CombinedOverlay
                            inputBase64={result.input_png_base64}
                            maskBase64={result.mask_png_base64}
                            gtSrc={gtPreview}
                          />
                        </CardContent>
                      </Card>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Red = predicted mask overlay · Green = ground truth mask overlay · Compare boundaries and coverage.
                    </p>
                  </TabsContent>
                )}
              </Tabs>
            </>
          )}

          {!result && !mutation.isPending && !mutation.isError && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <ScanLine className="text-muted-foreground mb-3 h-12 w-12" />
                <p className="text-muted-foreground text-sm">
                  Select a model, upload a slice, and run prediction
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Supported formats: PNG, JPG, NPY, NPZ
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Canvas Overlays ── */

/**
 * Overlays the mask (colored) on top of the input image.
 * Both input and mask are base64 PNGs from the backend (same dimensions).
 */
function OverlayCanvas({
  inputBase64,
  maskBase64,
  opacity,
  maskColor,
}: {
  inputBase64: string;
  maskBase64: string;
  opacity: number;
  maskColor: [number, number, number];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const inputImg = new window.Image();
    inputImg.src = `data:image/png;base64,${inputBase64}`;

    inputImg.onload = () => {
      const w = inputImg.width;
      const h = inputImg.height;
      canvas.width = w;
      canvas.height = h;

      // Draw the grayscale input as the base
      ctx.drawImage(inputImg, 0, 0, w, h);

      // Load mask and overlay colored regions
      const maskImg = new window.Image();
      maskImg.src = `data:image/png;base64,${maskBase64}`;
      maskImg.onload = () => {
        // Get mask pixels
        const offscreen = document.createElement("canvas");
        offscreen.width = w;
        offscreen.height = h;
        const offCtx = offscreen.getContext("2d")!;
        offCtx.drawImage(maskImg, 0, 0, w, h);
        const maskData = offCtx.getImageData(0, 0, w, h);

        // Get current canvas pixels
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        const [r, g, b] = maskColor;

        for (let i = 0; i < maskData.data.length; i += 4) {
          if (maskData.data[i] > 128) {
            // Tumor pixel — blend mask color
            data[i] = data[i] * (1 - opacity) + r * opacity;
            data[i + 1] = data[i + 1] * (1 - opacity) + g * opacity;
            data[i + 2] = data[i + 2] * (1 - opacity) + b * opacity;
          }
        }
        ctx.putImageData(imgData, 0, 0);
      };
    };
  }, [inputBase64, maskBase64, opacity, maskColor]);

  return (
    <div className="bg-muted/20 overflow-hidden rounded-lg">
      <canvas ref={canvasRef} className="w-full object-contain" />
    </div>
  );
}

/**
 * Overlays a user-uploaded ground truth mask (green) on the backend input image.
 */
function GtOverlayCanvas({
  inputBase64,
  gtSrc,
}: {
  inputBase64: string;
  gtSrc: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const inputImg = new window.Image();
    inputImg.src = `data:image/png;base64,${inputBase64}`;

    inputImg.onload = () => {
      const w = inputImg.width;
      const h = inputImg.height;
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(inputImg, 0, 0, w, h);

      const gtImg = new window.Image();
      gtImg.crossOrigin = "anonymous";
      gtImg.src = gtSrc;
      gtImg.onload = () => {
        const offscreen = document.createElement("canvas");
        offscreen.width = w;
        offscreen.height = h;
        const offCtx = offscreen.getContext("2d")!;
        offCtx.drawImage(gtImg, 0, 0, w, h);
        const gtData = offCtx.getImageData(0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        for (let i = 0; i < gtData.data.length; i += 4) {
          if (gtData.data[i] > 128) {
            data[i] = data[i] * 0.5 + 34 * 0.5;
            data[i + 1] = data[i + 1] * 0.5 + 197 * 0.5;
            data[i + 2] = data[i + 2] * 0.5 + 94 * 0.5;
          }
        }
        ctx.putImageData(imgData, 0, 0);
      };
    };
  }, [inputBase64, gtSrc]);

  return (
    <div className="bg-muted/20 overflow-hidden rounded-lg">
      <canvas ref={canvasRef} className="w-full object-contain" />
    </div>
  );
}

/**
 * Combined overlay: prediction (red) + ground truth (green) on the input image.
 */
function CombinedOverlay({
  inputBase64,
  maskBase64,
  gtSrc,
}: {
  inputBase64: string;
  maskBase64: string;
  gtSrc: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const inputImg = new window.Image();
    inputImg.src = `data:image/png;base64,${inputBase64}`;

    inputImg.onload = () => {
      const w = inputImg.width;
      const h = inputImg.height;
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(inputImg, 0, 0, w, h);

      // Load both mask and GT
      const maskImg = new window.Image();
      maskImg.src = `data:image/png;base64,${maskBase64}`;

      const gtImg = new window.Image();
      gtImg.crossOrigin = "anonymous";
      gtImg.src = gtSrc;

      let maskLoaded = false;
      let gtLoaded = false;
      let maskPx: ImageData | null = null;
      let gtPx: ImageData | null = null;

      const blend = () => {
        if (!maskLoaded || !gtLoaded || !maskPx || !gtPx) return;
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
          const hasPred = maskPx.data[i] > 128;
          const hasGt = gtPx.data[i] > 128;

          if (hasPred && hasGt) {
            // Overlap → yellow
            data[i] = data[i] * 0.4 + 250 * 0.6;
            data[i + 1] = data[i + 1] * 0.4 + 204 * 0.6;
            data[i + 2] = data[i + 2] * 0.4 + 21 * 0.6;
          } else if (hasPred) {
            // Prediction only → red
            data[i] = data[i] * 0.5 + 239 * 0.5;
            data[i + 1] = data[i + 1] * 0.5 + 68 * 0.5;
            data[i + 2] = data[i + 2] * 0.5 + 68 * 0.5;
          } else if (hasGt) {
            // GT only → green
            data[i] = data[i] * 0.5 + 34 * 0.5;
            data[i + 1] = data[i + 1] * 0.5 + 197 * 0.5;
            data[i + 2] = data[i + 2] * 0.5 + 94 * 0.5;
          }
        }
        ctx.putImageData(imgData, 0, 0);
      };

      maskImg.onload = () => {
        const off = document.createElement("canvas");
        off.width = w;
        off.height = h;
        const c = off.getContext("2d")!;
        c.drawImage(maskImg, 0, 0, w, h);
        maskPx = c.getImageData(0, 0, w, h);
        maskLoaded = true;
        blend();
      };

      gtImg.onload = () => {
        const off = document.createElement("canvas");
        off.width = w;
        off.height = h;
        const c = off.getContext("2d")!;
        c.drawImage(gtImg, 0, 0, w, h);
        gtPx = c.getImageData(0, 0, w, h);
        gtLoaded = true;
        blend();
      };
    };
  }, [inputBase64, maskBase64, gtSrc]);

  return (
    <div className="bg-muted/20 overflow-hidden rounded-lg">
      <canvas ref={canvasRef} className="w-full object-contain" />
      <div className="flex items-center justify-center gap-4 p-2 text-xs">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-500" />
          Prediction only
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-500" />
          GT only
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-yellow-500" />
          Overlap
        </span>
      </div>
    </div>
  );
}
