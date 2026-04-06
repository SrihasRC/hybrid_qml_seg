"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import {
  Activity,
  Box,
  BrainCircuit,
  ScanLine,
  Cuboid,
  BarChart3,
  Image,
  CheckCircle,
  XCircle,
  Cpu,
  Zap,
} from "lucide-react";

export default function DashboardPage() {
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: ({ signal }) => api.health(signal),
    refetchInterval: 15_000,
  });

  const modelsQuery = useQuery({
    queryKey: ["models"],
    queryFn: ({ signal }) => api.listModels(signal),
  });

  const models = modelsQuery.data ?? [];
  const classicalCount = models.filter(
    (m) => m.model_type === "classical",
  ).length;
  const hybridCount = models.filter((m) => m.model_type === "hybrid").length;
  const readyCount = models.filter((m) => m.checkpoint_exists).length;

  const health = healthQuery.data;

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Meningioma segmentation platform overview
        </p>
      </div>

      {/* Health banner */}
      <Card
        className={
          healthQuery.isError
            ? "border-destructive/50 bg-destructive/5"
            : "border-primary/30 bg-primary/5"
        }
      >
        <CardContent className="flex items-center gap-4 p-4">
          {healthQuery.isPending ? (
            <>
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-48" />
            </>
          ) : healthQuery.isError ? (
            <>
              <XCircle className="text-destructive h-8 w-8" />
              <div>
                <p className="font-medium">Backend Offline</p>
                <p className="text-muted-foreground text-sm">
                  Cannot reach API at{" "}
                  {process.env.NEXT_PUBLIC_API_BASE_URL ??
                    "http://127.0.0.1:8000"}
                </p>
              </div>
            </>
          ) : (
            <>
              <CheckCircle className="text-primary h-8 w-8" />
              <div className="flex-1">
                <p className="font-medium">Backend Online</p>
                <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <Cpu className="h-3 w-3" />
                    PyTorch {health?.torch_version}
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    CUDA{" "}
                    {health?.cuda_available ? "Available" : "Not available"}
                  </span>
                  <span>
                    {health?.loaded_model_ids.length ?? 0} model(s) loaded
                  </span>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                Healthy
              </Badge>
            </>
          )}
        </CardContent>
      </Card>

      {/* Stats tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Box}
          label="Total Models"
          value={modelsQuery.isPending ? null : models.length}
        />
        <StatCard
          icon={BrainCircuit}
          label="Hybrid Quantum"
          value={modelsQuery.isPending ? null : hybridCount}
        />
        <StatCard
          icon={Activity}
          label="Classical"
          value={modelsQuery.isPending ? null : classicalCount}
        />
        <StatCard
          icon={CheckCircle}
          label="Ready (checkpoint)"
          value={modelsQuery.isPending ? null : readyCount}
        />
      </div>

      {/* Quick links */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Quick Links</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLink
            href="/models"
            icon={Box}
            title="Model Catalog"
            description="Browse and compare all registered models"
          />
          <QuickLink
            href="/inference/slice"
            icon={ScanLine}
            title="Slice Inference"
            description="Run 2D slice segmentation"
          />
          <QuickLink
            href="/inference/volume"
            icon={Cuboid}
            title="Volume Inference"
            description="Run 3D NIfTI volume analysis"
          />
          <QuickLink
            href="/comparison"
            icon={BarChart3}
            title="Compare Models"
            description="Metrics and ablation analysis"
          />
          <QuickLink
            href="/assets"
            icon={Image}
            title="Report Assets"
            description="Diagrams and flowcharts"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number | null;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-muted-foreground text-xs">{label}</p>
          {value === null ? (
            <Skeleton className="mt-1 h-6 w-12" />
          ) : (
            <p className="text-2xl font-bold">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function QuickLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:border-primary/40 transition-colors hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Icon className="text-primary h-4 w-4" />
            <CardTitle className="text-sm">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <CardDescription className="text-xs">{description}</CardDescription>
        </CardContent>
      </Card>
    </Link>
  );
}
