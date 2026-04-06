from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pandas as pd
import torch
import torch.nn as nn

from .config import Settings
from .model_defs import build_classical_model, build_hybrid_model
from .schemas import ModelCard, ModelCardResponse


@dataclass
class LoadedModel:
    card: ModelCard
    model: nn.Module


class ModelStore:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._cards = self._load_cards()
        self._loaded: dict[str, LoadedModel] = {}

    def _load_cards(self) -> dict[str, ModelCard]:
        registry_path = self.settings.registry_path
        if not registry_path.exists():
            raise FileNotFoundError(f"Model registry not found: {registry_path}")

        payload = json.loads(registry_path.read_text(encoding="utf-8"))
        cards = payload.get("models", [])
        output: dict[str, ModelCard] = {}
        for row in cards:
            card = ModelCard.model_validate(row)
            output[card.id] = card
        return output

    def _resolve_path(self, maybe_relative_path: str | None) -> Path | None:
        if not maybe_relative_path:
            return None
        p = Path(maybe_relative_path)
        if p.is_absolute():
            return p
        return self.settings.project_root / p

    def list_cards(self) -> list[ModelCardResponse]:
        response: list[ModelCardResponse] = []
        for card in self._cards.values():
            checkpoint_path = self._resolve_path(card.checkpoint_path)
            metrics_path = self._resolve_path(card.metrics_path)
            response.append(
                ModelCardResponse(
                    **card.model_dump(),
                    checkpoint_exists=bool(checkpoint_path and checkpoint_path.exists()),
                    metrics_exists=bool(metrics_path and metrics_path.exists()),
                )
            )
        return response

    def get_card(self, model_id: str) -> ModelCard:
        if model_id not in self._cards:
            raise KeyError(f"Unknown model_id: {model_id}")
        return self._cards[model_id]

    @staticmethod
    def _extract_state_dict(checkpoint_obj: Any) -> dict[str, torch.Tensor]:
        if isinstance(checkpoint_obj, dict):
            for key in ("model_state", "state_dict", "model", "net"):
                state = checkpoint_obj.get(key)
                if isinstance(state, dict):
                    return state
            if all(torch.is_tensor(v) for v in checkpoint_obj.values()):
                return checkpoint_obj
        raise ValueError("Checkpoint does not contain a valid state dict")

    @staticmethod
    def _normalize_state_dict_keys(state_dict: dict[str, torch.Tensor]) -> dict[str, torch.Tensor]:
        return {k.replace("module.", ""): v for k, v in state_dict.items()}

    def _best_match_state(
        self,
        state_dict: dict[str, torch.Tensor],
        target_state: dict[str, torch.Tensor],
    ) -> dict[str, torch.Tensor]:
        candidates: list[dict[str, torch.Tensor]] = []

        normalized = self._normalize_state_dict_keys(state_dict)
        candidates.append(normalized)

        if any(k.startswith("backbone.") for k in normalized):
            candidates.append(
                {
                    k[len("backbone.") :]: v
                    for k, v in normalized.items()
                    if k.startswith("backbone.")
                }
            )
        else:
            candidates.append({f"backbone.{k}": v for k, v in normalized.items()})

        best: dict[str, torch.Tensor] = {}
        for candidate in candidates:
            filtered = {
                key: value
                for key, value in candidate.items()
                if key in target_state and tuple(value.shape) == tuple(target_state[key].shape)
            }
            if len(filtered) > len(best):
                best = filtered

        if not best:
            raise RuntimeError("No compatible tensor keys found while loading checkpoint")
        return best

    def _instantiate_model(self, card: ModelCard) -> nn.Module:
        if card.model_type == "classical":
            model = build_classical_model(encoder=card.encoder)
        else:
            model = build_hybrid_model(
                encoder=card.encoder,
                n_qubits=card.n_qubits,
                n_layers=card.n_layers,
                q_device=card.q_device,
            )
        return model.to(self.settings.model_device)

    def get_model(self, model_id: str) -> LoadedModel:
        if model_id in self._loaded:
            return self._loaded[model_id]

        card = self.get_card(model_id)
        checkpoint_path = self._resolve_path(card.checkpoint_path)
        if not checkpoint_path or not checkpoint_path.exists():
            raise FileNotFoundError(f"Checkpoint missing for {model_id}: {checkpoint_path}")

        model = self._instantiate_model(card)
        checkpoint_obj = torch.load(checkpoint_path, map_location=self.settings.model_device)
        source_state = self._extract_state_dict(checkpoint_obj)
        compatible_state = self._best_match_state(source_state, model.state_dict())
        model.load_state_dict(compatible_state, strict=False)
        model.eval()

        loaded = LoadedModel(card=card, model=model)
        self._loaded[model_id] = loaded
        return loaded

    def get_metrics(self, model_id: str) -> dict[str, Any]:
        card = self.get_card(model_id)
        metrics_path = self._resolve_path(card.metrics_path)
        if not metrics_path or not metrics_path.exists():
            return {}
        return json.loads(metrics_path.read_text(encoding="utf-8"))

    def get_comparison_rows(self, model_id: str) -> list[dict[str, Any]]:
        card = self.get_card(model_id)
        csv_path = self._resolve_path(card.comparison_csv_path)
        if not csv_path or not csv_path.exists():
            return []
        rows = pd.read_csv(csv_path).to_dict(orient="records")
        return [{str(k): v for k, v in row.items()} for row in rows]

    def loaded_model_ids(self) -> list[str]:
        return sorted(self._loaded.keys())
