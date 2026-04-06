from __future__ import annotations

import base64
from io import BytesIO

import cv2
import numpy as np
from PIL import Image


def _to_grayscale(image: np.ndarray) -> np.ndarray:
    if image.ndim == 2:
        return image
    if image.ndim == 3:
        return image.mean(axis=-1)
    raise ValueError(f"Unsupported image shape: {image.shape}")


def _scale_to_unit(image: np.ndarray) -> np.ndarray:
    image = image.astype(np.float32)

    if image.size == 0:
        raise ValueError("Input image is empty")

    finite_mask = np.isfinite(image)
    if not finite_mask.any():
        return np.zeros_like(image, dtype=np.float32)

    image = np.where(finite_mask, image, 0.0)

    if image.min() < -0.5 or image.max() > 1.5:
        image = np.clip(image, -3.0, 3.0)
        image = (image + 3.0) / 6.0
        return np.clip(image, 0.0, 1.0)

    if image.max() > 1.0:
        image = image / 255.0

    p01 = float(np.percentile(image, 1))
    p99 = float(np.percentile(image, 99))
    if p99 > p01:
        image = np.clip(image, p01, p99)

    mn = float(image.min())
    mx = float(image.max())
    if mx <= mn:
        return np.zeros_like(image, dtype=np.float32)

    return (image - mn) / (mx - mn)


def decode_uploaded_slice(data: bytes, filename: str) -> np.ndarray:
    name = filename.lower()
    if name.endswith(".npy"):
        image = np.load(BytesIO(data))
    elif name.endswith(".npz"):
        with np.load(BytesIO(data)) as archive:
            if "image" in archive:
                image = archive["image"]
            else:
                first_key = next(iter(archive.keys()))
                image = archive[first_key]
    else:
        image = np.array(Image.open(BytesIO(data)).convert("L"))

    image = _to_grayscale(np.asarray(image))
    return image.astype(np.float32)


def preprocess_slice(image: np.ndarray, target_size: int = 256) -> np.ndarray:
    image = _scale_to_unit(_to_grayscale(image))
    resized = cv2.resize(
        image,
        (target_size, target_size),
        interpolation=cv2.INTER_LINEAR,
    )
    return resized.astype(np.float32)


def encode_png_base64(image: np.ndarray) -> str:
    image_u8 = np.clip(image * 255.0, 0, 255).astype(np.uint8)
    ok, encoded = cv2.imencode(".png", image_u8)
    if not ok:
        raise RuntimeError("Failed to encode PNG image")
    return base64.b64encode(encoded.tobytes()).decode("ascii")


def decode_uploaded_mask(data: bytes, filename: str, target_size: int = 256) -> np.ndarray:
    """Decode an uploaded ground-truth mask file (NPZ, NPY, or image) into a
    normalised float32 array of shape (target_size, target_size) with values in [0, 1]."""
    name = filename.lower()
    if name.endswith(".npy"):
        raw = np.load(BytesIO(data))
    elif name.endswith(".npz"):
        with np.load(BytesIO(data)) as archive:
            # Prefer 'mask' key, fall back to first key
            key = "mask" if "mask" in archive else next(iter(archive.keys()))
            raw = archive[key]
    else:
        raw = np.array(Image.open(BytesIO(data)).convert("L"))

    raw = np.asarray(raw, dtype=np.float32)
    if raw.ndim > 2:
        raw = raw.mean(axis=-1)

    # Binary masks stored as 0/1 → scale to [0,1]; already 0-255 → normalise
    if raw.max() <= 1.0:
        mask = raw  # already [0,1]
    else:
        mask = raw / 255.0

    # Binarise (threshold at 0.5) then resize to match model output
    mask = (mask >= 0.5).astype(np.float32)
    if mask.shape != (target_size, target_size):
        mask = cv2.resize(mask, (target_size, target_size), interpolation=cv2.INTER_NEAREST)

    return mask
