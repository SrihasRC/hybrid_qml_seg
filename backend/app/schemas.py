from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class ModelCard(BaseModel):
    id: str
    name: str
    model_type: Literal["classical", "hybrid"]
    checkpoint_path: str
    metrics_path: str | None = None
    comparison_csv_path: str | None = None
    notes: str | None = None
    encoder: str = "tu-tf_efficientnetv2_s.in21k_ft_in1k"
    n_qubits: int = 8
    n_layers: int = 3
    q_device: str = "lightning.qubit"
    input_size: int = 256


class ModelCardResponse(ModelCard):
    checkpoint_exists: bool
    metrics_exists: bool


class SlicePredictionResponse(BaseModel):
    model_id: str
    threshold: float
    input_shape: list[int]
    tumor_pixels: int
    tumor_ratio: float
    mask_png_base64: str = Field(description="Binary mask encoded as base64 PNG")
    prob_png_base64: str = Field(description="Probability heatmap encoded as base64 PNG")


class VolumePredictionResponse(BaseModel):
    model_id: str
    threshold: float
    axis: int
    stride: int
    processed_slices: int
    positive_slice_count: int
    top_slices: list[dict[str, Any]]


class MetricsResponse(BaseModel):
    model_id: str
    metrics: dict[str, Any]


class ServiceHealth(BaseModel):
    status: str
    torch_version: str
    cuda_available: bool
    loaded_model_ids: list[str]
