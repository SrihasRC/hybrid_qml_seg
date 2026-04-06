from __future__ import annotations

from pathlib import Path
from typing import Any

import torch
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .config import settings
from .inference import InferenceService
from .model_store import ModelStore
from .preprocess import decode_uploaded_mask, decode_uploaded_slice, encode_png_base64
from .schemas import (
    MetricsResponse,
    ModelCardResponse,
    ServiceHealth,
    SlicePredictionResponse,
    VolumePredictionResponse,
)

app = FastAPI(title=settings.api_title, version=settings.api_version)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

store = ModelStore(settings)
inference = InferenceService(store)


@app.get("/health", response_model=ServiceHealth)
def health() -> ServiceHealth:
    return ServiceHealth(
        status="ok",
        torch_version=torch.__version__,
        cuda_available=torch.cuda.is_available(),
        loaded_model_ids=store.loaded_model_ids(),
    )


@app.get("/models", response_model=list[ModelCardResponse])
def list_models() -> list[ModelCardResponse]:
    return store.list_cards()


@app.get("/models/{model_id}", response_model=ModelCardResponse)
def get_model(model_id: str) -> ModelCardResponse:
    for card in store.list_cards():
        if card.id == model_id:
            return card
    raise HTTPException(status_code=404, detail=f"Unknown model_id: {model_id}")


@app.get("/models/{model_id}/metrics", response_model=MetricsResponse)
def get_metrics(model_id: str) -> MetricsResponse:
    try:
        metrics = store.get_metrics(model_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return MetricsResponse(model_id=model_id, metrics=metrics)


@app.get("/models/{model_id}/comparison")
def get_comparison(model_id: str) -> dict[str, Any]:
    try:
        rows = store.get_comparison_rows(model_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"model_id": model_id, "rows": rows}


@app.post("/predict/slice", response_model=SlicePredictionResponse)
async def predict_slice(
    file: UploadFile = File(...),
    model_id: str = Form(...),
    threshold: float = Form(0.5),
) -> SlicePredictionResponse:
    if threshold <= 0 or threshold >= 1:
        raise HTTPException(status_code=400, detail="threshold must be in (0,1)")

    try:
        data = await file.read()
        image = decode_uploaded_slice(data, file.filename or "input.png")
        result = inference.predict_slice(model_id=model_id, raw_slice=image, threshold=threshold)
        return SlicePredictionResponse(**result)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Inference failed: {exc}") from exc


@app.post("/predict/volume", response_model=VolumePredictionResponse)
async def predict_volume(
    file: UploadFile = File(...),
    model_id: str = Form(...),
    threshold: float = Form(0.5),
    axis: int = Form(2),
    stride: int = Form(4),
    top_k: int = Form(12),
) -> VolumePredictionResponse:
    if threshold <= 0 or threshold >= 1:
        raise HTTPException(status_code=400, detail="threshold must be in (0,1)")

    filename = file.filename or "volume.nii.gz"
    if not (filename.lower().endswith(".nii") or filename.lower().endswith(".nii.gz")):
        raise HTTPException(status_code=400, detail="Volume upload must be .nii or .nii.gz")

    try:
        payload = await file.read()
        result = inference.predict_volume(
            model_id=model_id,
            volume_bytes=payload,
            filename=filename,
            threshold=threshold,
            axis=axis,
            stride=stride,
            top_k=top_k,
        )
        return VolumePredictionResponse(**result)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Volume inference failed: {exc}") from exc


@app.get("/assets/report-diagrams")
def list_report_diagrams() -> dict[str, list[dict[str, str]]]:
    diagram_dir = settings.report_diagrams_dir
    if not diagram_dir.exists():
        return {"items": []}

    items = []
    for path in sorted(diagram_dir.glob("*")):
        if path.is_file():
            items.append(
                {
                    "id": path.name,
                    "name": path.name,
                    "download_url": f"/assets/report-diagrams/{path.name}",
                }
            )
    return {"items": items}


@app.get("/assets/report-diagrams/{filename}")
def get_report_diagram(filename: str):
    safe_name = Path(filename).name
    target = settings.report_diagrams_dir / safe_name
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="Asset not found")
    return FileResponse(path=target)


# ── Model folder image endpoints ──

# Maps model_id to its folder relative to project_root
_MODEL_FOLDER_MAP: dict[str, str] = {
    "classical_v2": "v2",
    "classical_v3": "v3",
    "hybrid_v2": "p2_v2",
    "hybrid_v3": "p2_v3",
    "hybrid_v4": "p2_v4",
    "hybrid_final_runA": "p2_vf_runA",
    "hybrid_final_runB": "p2_vf_runB",
}

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"}


def _model_folder(model_id: str) -> Path | None:
    rel = _MODEL_FOLDER_MAP.get(model_id)
    if not rel:
        return None
    return settings.project_root / rel


@app.get("/models/{model_id}/images")
def list_model_images(model_id: str) -> dict[str, Any]:
    folder = _model_folder(model_id)
    if not folder or not folder.exists():
        return {"model_id": model_id, "items": []}

    items = []
    for path in sorted(folder.glob("*")):
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS:
            items.append(
                {
                    "id": path.name,
                    "name": path.name,
                    "download_url": f"/models/{model_id}/images/{path.name}",
                    "size_bytes": path.stat().st_size,
                }
            )
    return {"model_id": model_id, "folder": folder.name, "items": items}


@app.get("/models/{model_id}/images/{filename}")
def get_model_image(model_id: str, filename: str):
    folder = _model_folder(model_id)
    if not folder:
        raise HTTPException(status_code=404, detail=f"Unknown model: {model_id}")

    safe_name = Path(filename).name
    target = folder / safe_name
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="Image not found")
    if target.suffix.lower() not in IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Not an image file")
    return FileResponse(path=target)


# ── GT mask decode endpoint ──

@app.post("/utils/decode-mask")
async def decode_mask(
    file: UploadFile = File(...),
) -> dict[str, Any]:
    """Decode an uploaded ground-truth mask (NPZ, NPY, or image) and return
    it as a base64 PNG so the frontend can render overlays."""
    try:
        data = await file.read()
        mask = decode_uploaded_mask(data, file.filename or "mask.npz")
        return {
            "gt_mask_png_base64": encode_png_base64(mask),
            "shape": list(mask.shape),
            "nonzero_pixels": int((mask > 0).sum()),
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to decode mask: {exc}") from exc


# ── Demo samples endpoint ──

_DEMO_DIR = settings.project_root / "demo_samples"


@app.get("/demo-samples")
def list_demo_samples() -> dict[str, Any]:
    img_dir = _DEMO_DIR / "images"
    mask_dir = _DEMO_DIR / "masks"
    if not img_dir.exists():
        return {"items": []}

    items = []
    for path in sorted(img_dir.glob("*.npz")):
        name = path.name
        has_mask = (mask_dir / name).exists()
        items.append({"name": name, "has_mask": has_mask})
    return {"items": items}


@app.get("/demo-samples/images/{filename}")
def get_demo_image(filename: str):
    """Serve a demo image NPZ as a base64 PNG."""
    target = _DEMO_DIR / "images" / Path(filename).name
    if not target.exists():
        raise HTTPException(status_code=404, detail="Demo image not found")
    try:
        data = target.read_bytes()
        image = decode_uploaded_slice(data, target.name)
        from .preprocess import preprocess_slice
        processed = preprocess_slice(image, target_size=256)
        return {"image_png_base64": encode_png_base64(processed), "name": target.name}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/demo-samples/masks/{filename}")
def get_demo_mask(filename: str):
    """Serve a demo mask NPZ as a base64 PNG."""
    target = _DEMO_DIR / "masks" / Path(filename).name
    if not target.exists():
        raise HTTPException(status_code=404, detail="Demo mask not found")
    try:
        data = target.read_bytes()
        mask = decode_uploaded_mask(data, target.name)
        return {"mask_png_base64": encode_png_base64(mask), "name": target.name}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/demo-samples/raw/{filename}")
def get_demo_raw(filename: str):
    """Serve the raw NPZ file so the frontend can upload it for inference."""
    target = _DEMO_DIR / "images" / Path(filename).name
    if not target.exists():
        raise HTTPException(status_code=404, detail="Demo file not found")
    return FileResponse(path=target, media_type="application/octet-stream")
