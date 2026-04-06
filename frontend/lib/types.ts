// ── Backend response types (mirrors backend/app/schemas.py) ──

export interface ServiceHealth {
  status: string;
  torch_version: string;
  cuda_available: boolean;
  loaded_model_ids: string[];
}

export interface ModelCard {
  id: string;
  name: string;
  model_type: "classical" | "hybrid";
  checkpoint_path: string;
  metrics_path: string | null;
  comparison_csv_path: string | null;
  notes: string | null;
  encoder: string;
  n_qubits: number;
  n_layers: number;
  q_device: string;
  input_size: number;
  checkpoint_exists: boolean;
  metrics_exists: boolean;
}

export interface SlicePredictionResponse {
  model_id: string;
  threshold: number;
  input_shape: number[];
  tumor_pixels: number;
  tumor_ratio: number;
  input_png_base64: string;
  mask_png_base64: string;
  prob_png_base64: string;
}

export interface VolumePredictionResponse {
  model_id: string;
  threshold: number;
  axis: number;
  stride: number;
  processed_slices: number;
  positive_slice_count: number;
  top_slices: VolumeSliceResult[];
}

export interface VolumeSliceResult {
  slice_index: number;
  tumor_pixels: number;
  tumor_ratio: number;
  mask_png_base64: string;
}

export interface MetricsResponse {
  model_id: string;
  metrics: Record<string, unknown>;
}

export interface ComparisonResponse {
  model_id: string;
  rows: Record<string, unknown>[];
}

export interface ReportDiagram {
  id: string;
  name: string;
  download_url: string;
}

export interface ReportDiagramsResponse {
  items: ReportDiagram[];
}

export interface ModelImage {
  id: string;
  name: string;
  download_url: string;
  size_bytes: number;
}

export interface ModelImagesResponse {
  model_id: string;
  folder: string;
  items: ModelImage[];
}
