from __future__ import annotations

import tempfile
from pathlib import Path
from typing import Any, cast

import nibabel as nib
import numpy as np
import torch

from .model_store import ModelStore
from .preprocess import encode_png_base64, preprocess_slice


class InferenceService:
    def __init__(self, model_store: ModelStore):
        self.model_store = model_store

    @staticmethod
    def _predict_tensor(model: torch.nn.Module, input_slice: np.ndarray, device: str) -> np.ndarray:
        tensor = torch.from_numpy(input_slice).unsqueeze(0).unsqueeze(0).to(device)
        with torch.no_grad():
            logits = model(tensor)
            probs = torch.sigmoid(logits)
        return probs.squeeze().detach().cpu().numpy().astype(np.float32)

    def predict_slice(self, model_id: str, raw_slice: np.ndarray, threshold: float = 0.5) -> dict:
        loaded = self.model_store.get_model(model_id)
        image = preprocess_slice(raw_slice, target_size=loaded.card.input_size)
        prob = self._predict_tensor(loaded.model, image, self.model_store.settings.model_device)
        mask = (prob >= threshold).astype(np.float32)

        return {
            "model_id": model_id,
            "threshold": threshold,
            "input_shape": list(image.shape),
            "tumor_pixels": int(mask.sum()),
            "tumor_ratio": float(mask.mean()),
            "input_png_base64": encode_png_base64(image),
            "mask_png_base64": encode_png_base64(mask),
            "prob_png_base64": encode_png_base64(prob),
        }

    def predict_volume(
        self,
        model_id: str,
        volume_bytes: bytes,
        filename: str,
        threshold: float = 0.5,
        axis: int = 2,
        stride: int = 4,
        top_k: int = 12,
    ) -> dict:
        loaded = self.model_store.get_model(model_id)

        suffix = ".nii.gz" if filename.lower().endswith(".nii.gz") else Path(filename).suffix or ".nii"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as temp_file:
            temp_file.write(volume_bytes)
            temp_file.flush()
            nii_obj = cast(Any, nib.load(temp_file.name))
            volume = np.asarray(nii_obj.get_fdata(), dtype=np.float32)

        if volume.ndim != 3:
            raise ValueError(f"Expected 3D volume, got shape {volume.shape}")
        if axis not in (0, 1, 2):
            raise ValueError("axis must be one of 0, 1, 2")
        if stride < 1:
            raise ValueError("stride must be >= 1")

        total_slices = volume.shape[axis]
        candidates = []

        for index in range(0, total_slices, stride):
            slice_2d = np.take(volume, index, axis=axis)
            if float(np.std(slice_2d)) < 1e-6:
                continue

            image = preprocess_slice(slice_2d, target_size=loaded.card.input_size)
            prob = self._predict_tensor(loaded.model, image, self.model_store.settings.model_device)
            mask = (prob >= threshold).astype(np.float32)
            tumor_pixels = int(mask.sum())

            candidates.append(
                {
                    "slice_index": int(index),
                    "tumor_pixels": tumor_pixels,
                    "tumor_ratio": float(mask.mean()),
                    "mask_png_base64": encode_png_base64(mask),
                }
            )

        candidates.sort(key=lambda row: row["tumor_pixels"], reverse=True)
        positive_count = sum(1 for row in candidates if row["tumor_pixels"] > 0)

        return {
            "model_id": model_id,
            "threshold": threshold,
            "axis": axis,
            "stride": stride,
            "processed_slices": len(candidates),
            "positive_slice_count": positive_count,
            "top_slices": candidates[:top_k],
        }
