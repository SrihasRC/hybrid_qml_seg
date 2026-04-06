# Website Backend (Non-Frontend Stack)

This backend is ready for your website frontend to consume.
It provides:

- Model registry for all classical/hybrid versions
- Runtime model loading from existing `.pth` checkpoints
- Slice inference endpoint (`/predict/slice`) for PNG/JPG/NPY/NPZ
- 3D volume endpoint (`/predict/volume`) for NIfTI (`.nii`, `.nii.gz`)
- Metrics/comparison endpoints for report dashboards
- Diagram asset listing/download endpoints

## 1) Environment

From workspace root (`notebooks`):

```bash
uv pip install fastapi "uvicorn[standard]" python-multipart pydantic-settings pillow numpy pandas nibabel opencv-python-headless torch torchvision segmentation-models-pytorch albumentations pennylane pennylane-lightning
```

## 2) Run API

```bash
cd website_backend
../.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Docs:

- Swagger UI: `http://127.0.0.1:8000/docs`
- OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`

## 3) Core Endpoints

- `GET /health`
- `GET /models`
- `GET /models/{model_id}`
- `GET /models/{model_id}/metrics`
- `GET /models/{model_id}/comparison`
- `POST /predict/slice`
- `POST /predict/volume`
- `GET /assets/report-diagrams`
- `GET /assets/report-diagrams/{filename}`

## 4) Example Calls

List models:

```bash
curl http://127.0.0.1:8000/models
```

Slice prediction:

```bash
curl -X POST http://127.0.0.1:8000/predict/slice \
  -F "model_id=hybrid_v4" \
  -F "threshold=0.5" \
  -F "file=@/absolute/path/to/slice.png"
```

Volume prediction:

```bash
curl -X POST http://127.0.0.1:8000/predict/volume \
  -F "model_id=hybrid_v4" \
  -F "threshold=0.5" \
  -F "axis=2" \
  -F "stride=4" \
  -F "top_k=8" \
  -F "file=@/absolute/path/to/volume.nii.gz"
```

## 5) Registry Customization

Model registry file:

- `website_backend/model_registry.json`

Add new entries when a new checkpoint or run is available.

## 6) Frontend Integration Contract

Expected frontend flow:

1. Call `GET /models` to populate model selector.
2. Call `POST /predict/slice` or `POST /predict/volume`.
3. Decode returned base64 PNG masks and render overlays in UI.
4. Fetch `GET /models/{model_id}/metrics` for model cards.
5. Use report diagrams endpoints for static visual assets.
