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
import {
  Upload,
  Loader2,
  ScanLine,
  AlertCircle,
  Eye,
  Layers,
  FolderOpen,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/* ── Page ── */
export default function SliceInferencePage() {
  const [modelId, setModelId] = useState<string>("");
  const [threshold, setThreshold] = useState(0.5);
  const [file, setFile] = useState<File | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0.45);

  // GT mask: stored as base64 PNG (decoded by backend for NPZ support)
  const [gtBase64, setGtBase64] = useState<string | null>(null);
  const [gtFileName, setGtFileName] = useState<string | null>(null);
  const [gtDecoding, setGtDecoding] = useState(false);

  const modelsQuery = useQuery({
    queryKey: ["models"],
    queryFn: ({ signal }) => api.listModels(signal),
  });

  const demoQuery = useQuery({
    queryKey: ["demo-samples"],
    queryFn: ({ signal }) => api.listDemoSamples(signal),
  });

  const readyModels = (modelsQuery.data ?? []).filter(
    (m) => m.checkpoint_exists,
  );
  const demoSamples = demoQuery.data?.items ?? [];

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

  // GT mask upload → decode via backend (handles NPZ, NPY, PNG etc.)
  const handleGtChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      setGtFileName(f.name);
      setGtDecoding(true);
      try {
        const decoded = await api.decodeMask(f);
        setGtBase64(decoded.gt_mask_png_base64);
      } catch {
        setGtBase64(null);
      } finally {
        setGtDecoding(false);
      }
    },
    [],
  );

  // Load a demo sample (image + GT mask) from the backend
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const loadDemo = useCallback(
    async (name: string) => {
      setDemoLoading(name);
      try {
        // Fetch the raw NPZ as a File-like blob to use with the inference API
        const imgResp = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000"}/demo-samples/images/${encodeURIComponent(name)}`,
        );
        // We also need the actual .npz file for inference, so we'll construct a File
        // from the demo_samples folder. But the predict/slice endpoint expects a file upload.
        // Simplest approach: fetch the NPZ file directly and wrap as a File.
        const BASE =
          process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

        // Get the pre-decoded image for preview (not needed for inference — we send the raw npz)
        // For actual inference we need the raw npz bytes, which we serve through a new endpoint
        // Actually, let's serve the raw file. We'll add that. For now, let's use the demo-samples/raw endpoint.
        // Instead, let's just download the npz from the file-serving endpoint.
        // Better approach: add a raw file serving endpoint.

        // Actually simplest: convert the base64 image back... no.
        // Let's add a raw file serving endpoint.
        // For now, the cleanest approach: serve the raw npz file as-is.

        void imgResp; // we'll use a different approach

        const rawRes = await fetch(`${BASE}/demo-samples/raw/${encodeURIComponent(name)}`);
        if (!rawRes.ok) throw new Error("Failed to fetch demo file");
        const blob = await rawRes.blob();
        const demoFile = new File([blob], name, {
          type: "application/octet-stream",
        });
        setFile(demoFile);

        // Also load GT mask
        const maskData = await api.getDemoMask(name);
        setGtBase64(maskData.mask_png_base64);
        setGtFileName(name);

        mutation.reset();
      } catch (err) {
        console.error("Failed to load demo:", err);
      } finally {
        setDemoLoading(null);
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
          Upload an MRI slice, run segmentation, and visualize the mask overlay
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        {/* Controls */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Parameters</CardTitle>
              <CardDescription>
                Configure the model and threshold
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
              </div>

              <Separator />

              {/* File upload */}
              <div className="space-y-2">
                <Label>Upload MRI Slice</Label>
                <div className="border-border hover:border-primary/50 relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-5 transition-colors">
                  <Upload className="text-muted-foreground mb-2 h-7 w-7" />
                  <p className="text-muted-foreground text-sm">
                    {file ? file.name : "Click to upload"}
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
                  {gtDecoding ? (
                    <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      {gtFileName ?? "Upload GT mask (NPZ, NPY, PNG)"}
                    </p>
                  )}
                  <input
                    type="file"
                    accept=".npz,.npy,.png,.jpg,.jpeg,.bmp,.tiff,.tif"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={handleGtChange}
                  />
                </div>
                {gtBase64 && (
                  <div className="bg-muted/30 mt-1 overflow-hidden rounded-lg p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:image/png;base64,${gtBase64}`}
                      alt="GT preview"
                      className="mx-auto max-h-20 object-contain"
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

          {/* Demo samples picker */}
          {demoSamples.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Demo Samples
                </CardTitle>
                <CardDescription className="text-xs">
                  Pre-selected slices with GT masks for quick demo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {demoSamples.map((s) => (
                  <Button
                    key={s.name}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs font-mono h-8"
                    disabled={demoLoading === s.name}
                    onClick={() => loadDemo(s.name)}
                  >
                    {demoLoading === s.name ? (
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    ) : null}
                    {s.name.replace('.npz', '').replace('BraTS-MEN-RT-', '')}
                    {s.has_mask && (
                      <Badge
                        variant="outline"
                        className="ml-auto text-[9px]"
                      >
                        +GT
                      </Badge>
                    )}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

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
                  <Stat label="Model" value={result.model_id} />
                  <Stat
                    label="Threshold"
                    value={result.threshold.toFixed(2)}
                  />
                  <Stat
                    label="Input Shape"
                    value={result.input_shape.join("×")}
                  />
                  <Stat
                    label="Tumor Pixels"
                    value={result.tumor_pixels.toLocaleString()}
                  />
                  <Stat
                    label="Tumor Ratio"
                    value={`${(result.tumor_ratio * 100).toFixed(2)}%`}
                  />
                </CardContent>
              </Card>

              {/* Visualization tabs */}
              <Tabs defaultValue="overlay">
                <TabsList>
                  <TabsTrigger value="overlay">
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    Overlay
                  </TabsTrigger>
                  <TabsTrigger value="sidebyside">
                    <Layers className="mr-1.5 h-3.5 w-3.5" />
                    Side-by-Side
                  </TabsTrigger>
                  <TabsTrigger value="raw">Raw</TabsTrigger>
                  {gtBase64 && (
                    <TabsTrigger value="gt">GT Comparison</TabsTrigger>
                  )}
                </TabsList>

                {/* Overlay tab */}
                <TabsContent value="overlay" className="mt-4 space-y-3">
                  <div className="flex items-center gap-4">
                    <Label className="whitespace-nowrap text-sm">
                      Opacity: {(overlayOpacity * 100).toFixed(0)}%
                    </Label>
                    <Slider
                      value={[overlayOpacity]}
                      onValueChange={([v]) => setOverlayOpacity(v)}
                      min={0}
                      max={1}
                      step={0.05}
                      className="max-w-xs"
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
                    <ImgCard
                      title="Input"
                      base64={result.input_png_base64}
                    />
                    <ImgCard
                      title="Predicted Mask"
                      base64={result.mask_png_base64}
                    />
                    <ImgCard
                      title="Probability Map"
                      base64={result.prob_png_base64}
                    />
                  </div>
                </TabsContent>

                {/* Raw outputs tab */}
                <TabsContent value="raw" className="mt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <ImgCard
                      title="Binary Mask"
                      base64={result.mask_png_base64}
                    />
                    <ImgCard
                      title="Probability Map"
                      base64={result.prob_png_base64}
                    />
                  </div>
                </TabsContent>

                {/* Ground truth comparison tab */}
                {gtBase64 && (
                  <TabsContent value="gt" className="mt-4 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      {/* Input */}
                      <ImgCard
                        title="Input"
                        base64={result.input_png_base64}
                      />
                      {/* GT overlay (green) */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            Ground Truth
                            <Badge
                              className="text-[10px] bg-green-600"
                            >
                              Green
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <OverlayCanvas
                            inputBase64={result.input_png_base64}
                            maskBase64={gtBase64}
                            opacity={0.5}
                            maskColor={[34, 197, 94]}
                          />
                        </CardContent>
                      </Card>
                      {/* Prediction overlay (red) */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            Prediction
                            <Badge
                              variant="destructive"
                              className="text-[10px]"
                            >
                              Red
                            </Badge>
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
                      {/* Combined overlay */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Combined</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <CombinedOverlay
                            inputBase64={result.input_png_base64}
                            predBase64={result.mask_png_base64}
                            gtBase64={gtBase64}
                          />
                        </CardContent>
                      </Card>
                    </div>
                    <div className="flex items-center justify-center gap-5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-3 w-3 rounded-sm bg-green-500" />
                        Ground Truth only
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-3 w-3 rounded-sm bg-red-500" />
                        Prediction only
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-3 w-3 rounded-sm bg-yellow-400" />
                        Overlap (Agreement)
                      </span>
                    </div>
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
                  Supported: PNG, JPG, NPY, NPZ — or use a demo sample
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Small components ── */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-mono text-sm font-medium">{value}</p>
    </div>
  );
}

function ImgCard({ title, base64 }: { title: string; base64: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-muted/20 overflow-hidden rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${base64}`}
            alt={title}
            className="w-full object-contain"
          />
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Canvas Overlays ── */

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
      ctx.drawImage(inputImg, 0, 0, w, h);

      const maskImg = new window.Image();
      maskImg.src = `data:image/png;base64,${maskBase64}`;
      maskImg.onload = () => {
        const off = document.createElement("canvas");
        off.width = w;
        off.height = h;
        const offCtx = off.getContext("2d")!;
        offCtx.drawImage(maskImg, 0, 0, w, h);
        const maskData = offCtx.getImageData(0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        const px = imgData.data;
        const [r, g, b] = maskColor;

        for (let i = 0; i < maskData.data.length; i += 4) {
          if (maskData.data[i] > 128) {
            px[i] = px[i] * (1 - opacity) + r * opacity;
            px[i + 1] = px[i + 1] * (1 - opacity) + g * opacity;
            px[i + 2] = px[i + 2] * (1 - opacity) + b * opacity;
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

function CombinedOverlay({
  inputBase64,
  predBase64,
  gtBase64,
}: {
  inputBase64: string;
  predBase64: string;
  gtBase64: string;
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

      const predImg = new window.Image();
      predImg.src = `data:image/png;base64,${predBase64}`;

      const gtImg = new window.Image();
      gtImg.src = `data:image/png;base64,${gtBase64}`;

      let predLoaded = false;
      let gtLoaded = false;
      let predPx: ImageData | null = null;
      let gtPx: ImageData | null = null;

      const blend = () => {
        if (!predLoaded || !gtLoaded || !predPx || !gtPx) return;
        const imgData = ctx.getImageData(0, 0, w, h);
        const px = imgData.data;
        const a = 0.55; // overlay opacity

        for (let i = 0; i < px.length; i += 4) {
          const hasPred = predPx.data[i] > 128;
          const hasGt = gtPx.data[i] > 128;

          if (hasPred && hasGt) {
            // Overlap → yellow
            px[i] = px[i] * (1 - a) + 250 * a;
            px[i + 1] = px[i + 1] * (1 - a) + 204 * a;
            px[i + 2] = px[i + 2] * (1 - a) + 21 * a;
          } else if (hasPred) {
            // Prediction only → red
            px[i] = px[i] * (1 - a) + 239 * a;
            px[i + 1] = px[i + 1] * (1 - a) + 68 * a;
            px[i + 2] = px[i + 2] * (1 - a) + 68 * a;
          } else if (hasGt) {
            // GT only → green
            px[i] = px[i] * (1 - a) + 34 * a;
            px[i + 1] = px[i + 1] * (1 - a) + 197 * a;
            px[i + 2] = px[i + 2] * (1 - a) + 94 * a;
          }
        }
        ctx.putImageData(imgData, 0, 0);
      };

      const loadPx = (img: HTMLImageElement) => {
        const off = document.createElement("canvas");
        off.width = w;
        off.height = h;
        const c = off.getContext("2d")!;
        c.drawImage(img, 0, 0, w, h);
        return c.getImageData(0, 0, w, h);
      };

      predImg.onload = () => {
        predPx = loadPx(predImg);
        predLoaded = true;
        blend();
      };
      gtImg.onload = () => {
        gtPx = loadPx(gtImg);
        gtLoaded = true;
        blend();
      };
    };
  }, [inputBase64, predBase64, gtBase64]);

  return (
    <div className="bg-muted/20 overflow-hidden rounded-lg">
      <canvas ref={canvasRef} className="w-full object-contain" />
    </div>
  );
}
