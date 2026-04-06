from __future__ import annotations

import numpy as np
import pennylane as qml
import segmentation_models_pytorch as smp
import torch
import torch.nn as nn


def build_classical_model(encoder: str) -> nn.Module:
    return smp.UnetPlusPlus(
        encoder_name=encoder,
        encoder_weights=None,
        in_channels=1,
        classes=1,
        activation=None,
    )


def make_quantum_circuit(n_qubits: int, n_layers: int, q_device: str):
    dev = qml.device(q_device, wires=n_qubits)

    @qml.qnode(dev, interface="torch", diff_method="adjoint")
    def quantum_circuit(inputs, weights):
        qml.AngleEmbedding(inputs * np.pi, wires=range(n_qubits), rotation="Y")
        for layer in range(n_layers):
            for qubit in range(n_qubits):
                qml.RY(weights[layer, qubit, 0], wires=qubit)
                qml.RZ(weights[layer, qubit, 1], wires=qubit)
            for qubit in range(n_qubits):
                qml.CNOT(wires=[qubit, (qubit + 1) % n_qubits])
        return tuple(qml.expval(qml.PauliZ(i)) for i in range(n_qubits))

    return quantum_circuit


class QuantumBottleneck(nn.Module):
    def __init__(
        self,
        encoder_dim: int,
        n_qubits: int,
        n_layers: int,
        q_device: str = "lightning.qubit",
    ):
        super().__init__()
        self.n_qubits = n_qubits
        self.n_layers = n_layers
        self.quantum_circuit = make_quantum_circuit(
            n_qubits=n_qubits,
            n_layers=n_layers,
            q_device=q_device,
        )

        self.pre_proj = nn.Sequential(
            nn.Linear(encoder_dim, n_qubits),
            nn.Tanh(),
        )

        self.q_weights = nn.Parameter(torch.randn(n_layers, n_qubits, 2) * 0.01)

        self.post_proj = nn.Linear(n_qubits, encoder_dim)
        nn.init.zeros_(self.post_proj.weight)
        nn.init.zeros_(self.post_proj.bias)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        bsz, channels, height, width = x.shape
        pooled = x.mean(dim=[2, 3])
        angles = self.pre_proj(pooled)

        q_results = []
        for idx in range(bsz):
            angle_vec = angles[idx]
            if angle_vec.device.type != "cpu":
                angle_vec = angle_vec.cpu()

            weight_tensor = self.q_weights
            if weight_tensor.device.type != "cpu":
                weight_tensor = weight_tensor.cpu()

            circuit_output = self.quantum_circuit(angle_vec, weight_tensor)
            q_results.append(torch.stack(list(circuit_output)))

        q_out = torch.stack(q_results).float().to(x.device)
        q_features = self.post_proj(q_out)
        q_spatial = q_features.unsqueeze(-1).unsqueeze(-1).expand(bsz, channels, height, width)
        return x + q_spatial


class HybridQuantumSegModel(nn.Module):
    def __init__(
        self,
        encoder: str,
        n_qubits: int,
        n_layers: int,
        encoder_dim: int = 256,
        q_device: str = "lightning.qubit",
    ):
        super().__init__()
        self.backbone = smp.UnetPlusPlus(
            encoder_name=encoder,
            encoder_weights=None,
            in_channels=1,
            classes=1,
            activation=None,
        )
        self.q_bottleneck = QuantumBottleneck(
            encoder_dim=encoder_dim,
            n_qubits=n_qubits,
            n_layers=n_layers,
            q_device=q_device,
        )
        self.use_quantum = True

    def set_quantum_enabled(self, enabled: bool = True) -> None:
        self.use_quantum = bool(enabled)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        features = self.backbone.encoder(x)
        if self.use_quantum:
            features[-1] = self.q_bottleneck(features[-1])
        decoder_out = self.backbone.decoder(features)
        return self.backbone.segmentation_head(decoder_out)


def build_hybrid_model(
    encoder: str,
    n_qubits: int,
    n_layers: int,
    q_device: str = "lightning.qubit",
) -> nn.Module:
    return HybridQuantumSegModel(
        encoder=encoder,
        n_qubits=n_qubits,
        n_layers=n_layers,
        encoder_dim=256,
        q_device=q_device,
    )
