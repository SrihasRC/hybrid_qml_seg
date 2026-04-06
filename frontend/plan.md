# Frontend Implementation Plan (Next.js + shadcn + Tailwind)

## 1) Project Context

### 1.1 Goal
Build a production-quality frontend for your meningioma segmentation project that lets users:
- Browse model versions (classical and hybrid quantum)
- Run 2D slice inference
- Run 3D volume inference (NIfTI)
- Compare metrics and ablation outcomes
- View report diagrams/assets

### 1.2 Current State (Confirmed)
- Frontend stack is already initialized in this folder with Next.js, shadcn, and Tailwind.
- Backend API is already implemented and ready in sibling folder: ../backend.
- Backend model registry includes:
  - classical_v2
  - classical_v3
  - hybrid_v3
  - hybrid_v4
  - hybrid_final_runA
  - hybrid_final_runB

### 1.3 Product/Research Context to Reflect in UI
The UI should clearly communicate that this project compares classical and hybrid quantum segmentation for meningioma MRI, with special emphasis on controlled final-run ablation:
- Run A: small-lesion focus enabled
- Run B: small-lesion focus disabled

The frontend should support missing-artifact states gracefully for final runs (if checkpoint/metrics are not yet present).

## 2) Backend Contract (Source of Truth)

### 2.1 Base URL
- Local dev expected: http://127.0.0.1:8000

### 2.2 Available Endpoints
- GET /health
- GET /models
- GET /models/{model_id}
- GET /models/{model_id}/metrics
- GET /models/{model_id}/comparison
- POST /predict/slice (multipart form-data)
- POST /predict/volume (multipart form-data)
- GET /assets/report-diagrams
- GET /assets/report-diagrams/{filename}

### 2.3 Important Response Characteristics
- Slice and volume outputs include base64-encoded PNG masks.
- Model list includes checkpoint/metrics availability flags.
- Volume endpoint returns top slices and summary counts.

### 2.4 Small Backend Documentation Fix Needed
Current backend README still references website_backend path in a few lines. Actual folder is backend. This does not block frontend work but should be corrected for team clarity.

## 3) Frontend Scope

### In Scope
- Full UI shell and navigation
- Model catalog + model detail cards
- Slice upload + inference + overlay visualization
- Volume upload + top-slice result browser
- Metrics and comparison dashboards
- Report diagram gallery
- Robust loading, error, and empty states
- Responsive behavior for desktop and mobile

### Out of Scope (for this phase)
- Authentication/authorization
- User accounts/history persistence
- Real-time websocket streaming inference
- PACS/Hospital integration





### 5.2 API Layer Strategy
Create a typed API client using fetch wrappers:
- Central base URL from env (NEXT_PUBLIC_API_BASE_URL)
- Unified error normalization
- Timeout + abort support
- Multipart helper for prediction endpoints

### 5.3 State Management
- Server state: TanStack Query
- Local UI state: React state + lightweight context where needed
- Avoid global heavy state unless a clear need appears

### 5.4 Visualization Strategy
- Decoding base64 masks into browser images for overlay
- Side-by-side and opacity-slider overlay modes
- Charts for DSC/HD95 and size-bin metrics (Recharts)

## 6) UI Modules to Build

### 6.1 Dashboard
- Health banner (API online/offline)
- Model summary tiles by type (classical/hybrid)
- Quick links to inference tools

### 6.2 Model Catalog
- Model cards with:
  - Name, type, encoder, qubits/layers (if hybrid)
  - Checkpoint/metrics availability badges
  - Notes and run provenance
- Table mode with sortable columns

### 6.3 Slice Inference
- Inputs:
  - model_id select
  - threshold slider
  - image upload (png/jpg/npy/npz)
- Outputs:
  - mask preview
  - probability map preview
  - tumor pixels and tumor ratio

### 6.4 Volume Inference
- Inputs:
  - model_id select
  - threshold
  - axis
  - stride
  - top_k
  - .nii/.nii.gz upload
- Outputs:
  - processed slices
  - positive slice count
  - top slice cards with mask previews

### 6.5 Metrics and Comparison
- Per-model metric cards
- Hybrid vs classical comparison table
- Size-bin plots (small/mid/large) where data is available
- Delta highlights for ablation (Run A vs Run B once metrics are present)

### 6.6 Report Assets
- Fetch and display report diagrams
- Click-to-expand image modal
- Download button for each asset

## 7) Error Handling and UX Rules

- Show clear status states: idle, loading, success, error
- Backend 400: render user-actionable message
- Backend 404 model/checkpoint missing: show "artifact not ready" state
- Backend 500: show retry affordance and diagnostics hint
- Disable submit during in-flight prediction
- For large uploads, show progress-style feedback (simulated spinner states at minimum)

## 8) Env and Config Plan

Create frontend .env.local:
- NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000

Optional (if using Next route handlers/proxy):
- INTERNAL_API_BASE_URL=http://127.0.0.1:8000

CORS is already enabled in backend for localhost origins.

## 9) Package Plan (Frontend)

Core additions recommended:
- @tanstack/react-query
- zod
- react-hook-form
- @hookform/resolvers
- recharts
- zustand
