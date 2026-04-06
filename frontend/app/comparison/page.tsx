"use client";

import { useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { BarChart3, XCircle } from "lucide-react";

export default function ComparisonPage() {
  const [modelA, setModelA] = useState<string>("");
  const [modelB, setModelB] = useState<string>("");

  const modelsQuery = useQuery({
    queryKey: ["models"],
    queryFn: ({ signal }) => api.listModels(signal),
  });

  const metricsA = useQuery({
    queryKey: ["metrics", modelA],
    queryFn: ({ signal }) => api.getMetrics(modelA, signal),
    enabled: !!modelA,
  });

  const metricsB = useQuery({
    queryKey: ["metrics", modelB],
    queryFn: ({ signal }) => api.getMetrics(modelB, signal),
    enabled: !!modelB,
  });

  const comparisonA = useQuery({
    queryKey: ["comparison", modelA],
    queryFn: ({ signal }) => api.getComparison(modelA, signal),
    enabled: !!modelA,
  });

  const models = modelsQuery.data ?? [];
  const mA = metricsA.data?.metrics ?? {};
  const mB = metricsB.data?.metrics ?? {};

  // Gather all numeric keys across both metric sets
  const allNumericKeys = new Set<string>();
  for (const [k, v] of Object.entries(mA)) {
    if (typeof v === "number") allNumericKeys.add(k);
  }
  for (const [k, v] of Object.entries(mB)) {
    if (typeof v === "number") allNumericKeys.add(k);
  }
  const numericKeys = Array.from(allNumericKeys);

  // Build chart data
  const chartData = numericKeys.map((key) => ({
    metric: key,
    [modelA || "A"]:
      typeof mA[key] === "number" ? (mA[key] as number) : undefined,
    [modelB || "B"]:
      typeof mB[key] === "number" ? (mB[key] as number) : undefined,
  }));

  // Radar data (normalize to 0-1 range)
  const radarData = numericKeys
    .filter(
      (k) =>
        typeof mA[k] === "number" &&
        typeof mB[k] === "number" &&
        (mA[k] as number) <= 1 &&
        (mB[k] as number) <= 1,
    )
    .map((key) => ({
      metric: key,
      [modelA || "A"]: mA[key] as number,
      [modelB || "B"]: mB[key] as number,
    }));

  const comparisonRows = comparisonA.data?.rows ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Model Comparison
        </h1>
        <p className="text-muted-foreground text-sm">
          Compare metrics between two models side by side
        </p>
      </div>

      {/* Model selectors */}
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Model A</Label>
            {modelsQuery.isPending ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={modelA} onValueChange={setModelA}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Model A..." />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            m.model_type === "hybrid" ? "default" : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {m.model_type}
                        </Badge>
                        {m.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <Label>Model B</Label>
            {modelsQuery.isPending ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={modelB} onValueChange={setModelB}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Model B..." />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            m.model_type === "hybrid" ? "default" : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {m.model_type}
                        </Badge>
                        {m.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Empty state */}
      {(!modelA || !modelB) && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BarChart3 className="text-muted-foreground mb-3 h-12 w-12" />
            <p className="text-muted-foreground text-sm">
              Select two models above to compare their metrics
            </p>
          </CardContent>
        </Card>
      )}

      {/* Metrics comparison */}
      {modelA && modelB && (
        <>
          {/* Loading */}
          {(metricsA.isPending || metricsB.isPending) && (
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          )}

          {/* No metrics */}
          {!metricsA.isPending &&
            !metricsB.isPending &&
            numericKeys.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center py-8">
                  <XCircle className="text-muted-foreground mb-2 h-8 w-8" />
                  <p className="text-muted-foreground text-sm">
                    No comparable numeric metrics found for these models.
                  </p>
                </CardContent>
              </Card>
            )}

          {/* Metric tiles */}
          {numericKeys.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Metrics Side-by-Side</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {numericKeys.map((key) => {
                    const valA =
                      typeof mA[key] === "number"
                        ? (mA[key] as number)
                        : null;
                    const valB =
                      typeof mB[key] === "number"
                        ? (mB[key] as number)
                        : null;
                    const delta =
                      valA !== null && valB !== null ? valB - valA : null;

                    return (
                      <div key={key} className="bg-muted/30 rounded-lg p-3">
                        <p className="text-muted-foreground mb-1 text-xs font-medium">
                          {key}
                        </p>
                        <div className="flex items-end justify-between gap-2">
                          <div>
                            <p className="text-muted-foreground text-[10px]">
                              {modelA}
                            </p>
                            <p className="font-mono text-sm font-bold">
                              {valA !== null ? valA.toFixed(4) : "—"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-muted-foreground text-[10px]">
                              {modelB}
                            </p>
                            <p className="font-mono text-sm font-bold">
                              {valB !== null ? valB.toFixed(4) : "—"}
                            </p>
                          </div>
                        </div>
                        {delta !== null && (
                          <div className="mt-1 text-right">
                            <Badge
                              variant={delta >= 0 ? "default" : "destructive"}
                              className="text-[10px]"
                            >
                              {delta >= 0 ? "+" : ""}
                              {delta.toFixed(4)}
                            </Badge>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Charts */}
          {chartData.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Bar chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Bar Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-border"
                        />
                        <XAxis
                          dataKey="metric"
                          fontSize={10}
                          tick={{ fill: "currentColor" }}
                        />
                        <YAxis
                          fontSize={10}
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
                        <Legend />
                        <Bar
                          dataKey={modelA}
                          fill="var(--chart-1)"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey={modelB}
                          fill="var(--chart-3)"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Radar chart */}
              {radarData.length >= 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Radar Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid />
                          <PolarAngleAxis
                            dataKey="metric"
                            fontSize={10}
                            tick={{ fill: "currentColor" }}
                          />
                          <PolarRadiusAxis fontSize={9} />
                          <Radar
                            name={modelA}
                            dataKey={modelA}
                            stroke="var(--chart-1)"
                            fill="var(--chart-1)"
                            fillOpacity={0.2}
                          />
                          <Radar
                            name={modelB}
                            dataKey={modelB}
                            stroke="var(--chart-3)"
                            fill="var(--chart-3)"
                            fillOpacity={0.2}
                          />
                          <Legend />
                          <Tooltip />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Comparison CSV */}
          {comparisonRows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Per-Sample Comparison Data
                </CardTitle>
                <CardDescription>
                  From comparison CSV for {modelA} (showing first 50 rows)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(comparisonRows[0]).map((key) => (
                          <TableHead key={key} className="text-xs">
                            {key}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparisonRows.slice(0, 50).map((row, i) => (
                        <TableRow key={i}>
                          {Object.values(row).map((val, j) => (
                            <TableCell key={j} className="font-mono text-xs">
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
        </>
      )}
    </div>
  );
}
