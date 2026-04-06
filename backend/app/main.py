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
from .preprocess import decode_uploaded_slice
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
