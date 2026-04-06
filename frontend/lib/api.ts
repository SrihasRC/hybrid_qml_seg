import type {
  ComparisonResponse,
  MetricsResponse,
  ModelCard,
  ModelImagesResponse,
  ReportDiagramsResponse,
  ServiceHealth,
  SlicePredictionResponse,
  VolumePredictionResponse,
} from "./types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

// ── helpers ──

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { signal });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(body || res.statusText, res.status);
  }
  return res.json() as Promise<T>;
}

async function postMultipart<T>(
  path: string,
  formData: FormData,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    body: formData,
    signal,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(body || res.statusText, res.status);
  }
  return res.json() as Promise<T>;
}

// ── public API ──

export const api = {
  health: (signal?: AbortSignal) => get<ServiceHealth>("/health", signal),

  listModels: (signal?: AbortSignal) => get<ModelCard[]>("/models", signal),

  getModel: (modelId: string, signal?: AbortSignal) =>
    get<ModelCard>(`/models/${modelId}`, signal),

  getMetrics: (modelId: string, signal?: AbortSignal) =>
    get<MetricsResponse>(`/models/${modelId}/metrics`, signal),

  getComparison: (modelId: string, signal?: AbortSignal) =>
    get<ComparisonResponse>(`/models/${modelId}/comparison`, signal),

  predictSlice: (
    file: File,
    modelId: string,
    threshold: number,
    signal?: AbortSignal,
  ) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("model_id", modelId);
    fd.append("threshold", String(threshold));
    return postMultipart<SlicePredictionResponse>("/predict/slice", fd, signal);
  },

  predictVolume: (
    file: File,
    modelId: string,
    opts: { threshold: number; axis: number; stride: number; top_k: number },
    signal?: AbortSignal,
  ) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("model_id", modelId);
    fd.append("threshold", String(opts.threshold));
    fd.append("axis", String(opts.axis));
    fd.append("stride", String(opts.stride));
    fd.append("top_k", String(opts.top_k));
    return postMultipart<VolumePredictionResponse>(
      "/predict/volume",
      fd,
      signal,
    );
  },

  listDiagrams: (signal?: AbortSignal) =>
    get<ReportDiagramsResponse>("/assets/report-diagrams", signal),

  diagramUrl: (filename: string) =>
    `${BASE_URL}/assets/report-diagrams/${encodeURIComponent(filename)}`,

  listModelImages: (modelId: string, signal?: AbortSignal) =>
    get<ModelImagesResponse>(`/models/${modelId}/images`, signal),

  modelImageUrl: (modelId: string, filename: string) =>
    `${BASE_URL}/models/${modelId}/images/${encodeURIComponent(filename)}`,
} as const;

export { ApiError };
