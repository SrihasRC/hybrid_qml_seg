"use client";

import { use } from "react";
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
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BrainCircuit,
  Activity,
  CheckCircle,
  XCircle,
  ArrowLeft,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function ModelDetailPage({
  params,
}: {
  params: Promise<{ modelId: string }>;
}) {
  const { modelId } = use(params);

  const modelQuery = useQuery({
    queryKey: ["model", modelId],
    queryFn: ({ signal }) => api.getModel(modelId, signal),
  });

  const metricsQuery = useQuery({
    queryKey: ["metrics", modelId],
    queryFn: ({ signal }) => api.getMetrics(modelId, signal),
    enabled: !!modelQuery.data,
  });

  const comparisonQuery = useQuery({
    queryKey: ["comparison", modelId],
    queryFn: ({ signal }) => api.getComparison(modelId, signal),
    enabled: !!modelQuery.data,
  });

  const model = modelQuery.data;
  const metrics = metricsQuery.data?.metrics ?? {};
  const comparisonRows = comparisonQuery.data?.rows ?? [];

  if (modelQuery.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (modelQuery.isError || !model) {
    return (
      <div className="space-y-4">
        <Link href="/models">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Models
          </Button>
        </Link>
        <Card className="border-destructive/50">
          <CardContent className="p-6">
            <p className="text-destructive">
              Model &quot;{modelId}&quot; not found or backend is unreachable.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isHybrid = model.model_type === "hybrid";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/models">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Models
          </Button>
        </Link>
      </div>

      {/* Model info card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {isHybrid ? (
                <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                  <BrainCircuit className="text-primary h-5 w-5" />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <Activity className="h-5 w-5 text-blue-500" />
                </div>
              )}
              <div>
                <CardTitle>{model.name}</CardTitle>
                <CardDescription>{model.id}</CardDescription>
              </div>
            </div>
            <Badge variant={isHybrid ? "default" : "secondary"}>
              {model.model_type}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <InfoItem label="Encoder" value={model.encoder} />
            <InfoItem
              label="Input Size"
              value={`${model.input_size}×${model.input_size}`}
            />
            {isHybrid && (
              <>
                <InfoItem label="Qubits" value={String(model.n_qubits)} />
                <InfoItem label="Layers" value={String(model.n_layers)} />
                <InfoItem label="Quantum Device" value={model.q_device} />
              </>
            )}
          </div>

          <Separator />

          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              {model.checkpoint_exists ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="text-muted-foreground h-4 w-4" />
              )}
              <span>
                Checkpoint{" "}
                {model.checkpoint_exists ? "available" : "not found"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {model.metrics_exists ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="text-muted-foreground h-4 w-4" />
              )}
              <span>
                Metrics {model.metrics_exists ? "available" : "not found"}
              </span>
            </div>
          </div>

          {model.notes && (
            <>
              <Separator />
              <div className="flex items-start gap-2 text-sm">
                <FileText className="text-muted-foreground mt-0.5 h-4 w-4" />
                <p className="text-muted-foreground">{model.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Metrics section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Metrics</CardTitle>
          <CardDescription>
            Training and evaluation metrics for this model
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metricsQuery.isPending ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : Object.keys(metrics).length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center py-8 text-center">
              <XCircle className="mb-2 h-8 w-8" />
              <p className="text-sm">
                No metrics available for this model yet.
              </p>
              <p className="text-xs">
                Metrics file may not have been generated.
              </p>
            </div>
          ) : (
            <MetricsDisplay metrics={metrics} />
          )}
        </CardContent>
      </Card>

      {/* Comparison section */}
      {comparisonRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comparison Data</CardTitle>
            <CardDescription>
              Per-sample comparison between classical and hybrid
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(comparisonRows[0]).map((key) => (
                      <TableHead key={key}>{key}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonRows.slice(0, 50).map((row, i) => (
                    <TableRow key={i}>
                      {Object.values(row).map((val, j) => (
                        <TableCell key={j} className="text-xs">
                          {typeof val === "number"
                            ? val.toFixed(4)
                            : String(val)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-mono text-sm break-all">{value}</p>
    </div>
  );
}

function MetricsDisplay({ metrics }: { metrics: Record<string, unknown> }) {
  // Try to extract key metrics for chart
  const numericMetrics: { name: string; value: number }[] = [];
  const otherMetrics: { key: string; value: unknown }[] = [];

  for (const [key, val] of Object.entries(metrics)) {
    if (typeof val === "number") {
      numericMetrics.push({ name: key, value: val });
    } else if (typeof val === "object" && val !== null) {
      // Nested metrics (e.g. per-epoch)
      otherMetrics.push({ key, value: val });
    } else {
      otherMetrics.push({ key, value: val });
    }
  }

  const COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ];

  return (
    <div className="space-y-6">
      {numericMetrics.length > 0 && (
        <>
          {/* Metric tiles */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {numericMetrics.map((m) => (
              <div key={m.name} className="bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground text-xs">{m.name}</p>
                <p className="font-mono text-lg font-semibold">
                  {m.value < 1 && m.value > 0
                    ? m.value.toFixed(4)
                    : m.value.toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          {numericMetrics.length >= 2 && (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={numericMetrics}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis
                    dataKey="name"
                    fontSize={11}
                    className="fill-muted-foreground"
                    tick={{ fill: "currentColor" }}
                  />
                  <YAxis
                    fontSize={11}
                    className="fill-muted-foreground"
                    tick={{ fill: "currentColor" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      color: "var(--popover-foreground)",
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {numericMetrics.map((_, i) => (
                      <Cell
                        key={i}
                        fill={COLORS[i % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* Other metrics as JSON */}
      {otherMetrics.length > 0 && (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            Additional Data
          </p>
          {otherMetrics.map(({ key, value }) => (
            <div key={key} className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs font-medium">{key}</p>
              <pre className="text-muted-foreground mt-1 overflow-x-auto text-xs">
                {typeof value === "object"
                  ? JSON.stringify(value, null, 2)
                  : String(value)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
