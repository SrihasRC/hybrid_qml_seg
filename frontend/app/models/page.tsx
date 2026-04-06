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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import {
  BrainCircuit,
  Activity,
  CheckCircle,
  XCircle,
  ArrowRight,
} from "lucide-react";
import type { ModelCard } from "@/lib/types";

export default function ModelsPage() {
  const { data: models, isPending, isError } = useQuery({
    queryKey: ["models"],
    queryFn: ({ signal }) => api.listModels(signal),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Model Catalog</h1>
        <p className="text-muted-foreground text-sm">
          All registered classical and hybrid quantum segmentation models
        </p>
      </div>

      {isError && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-destructive text-sm">
              Failed to load models. Is the backend running?
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="grid">
        <TabsList>
          <TabsTrigger value="grid">Cards</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="mt-4">
          {isPending ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(models ?? []).map((model) => (
                <ModelGridCard key={model.id} model={model} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="table" className="mt-4">
          {isPending ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : (
            <ModelTableView models={models ?? []} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ModelGridCard({ model }: { model: ModelCard }) {
  const isHybrid = model.model_type === "hybrid";

  return (
    <Link href={`/models/${model.id}`}>
      <Card className="hover:border-primary/40 group transition-all hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {isHybrid ? (
                <BrainCircuit className="text-primary h-5 w-5" />
              ) : (
                <Activity className="h-5 w-5 text-blue-500" />
              )}
              <CardTitle className="text-sm leading-tight">
                {model.name}
              </CardTitle>
            </div>
            <ArrowRight className="text-muted-foreground h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <CardDescription className="text-xs">{model.id}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={isHybrid ? "default" : "secondary"}>
              {model.model_type}
            </Badge>
            {isHybrid && (
              <Badge variant="outline" className="text-xs">
                {model.n_qubits}q / {model.n_layers}L
              </Badge>
            )}
          </div>

          <div className="flex gap-3 text-xs">
            <span className="flex items-center gap-1">
              {model.checkpoint_exists ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <XCircle className="text-muted-foreground h-3 w-3" />
              )}
              Checkpoint
            </span>
            <span className="flex items-center gap-1">
              {model.metrics_exists ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <XCircle className="text-muted-foreground h-3 w-3" />
              )}
              Metrics
            </span>
          </div>

          {model.notes && (
            <p className="text-muted-foreground line-clamp-2 text-xs">
              {model.notes}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function ModelTableView({ models }: { models: ModelCard[] }) {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Qubits</TableHead>
            <TableHead>Checkpoint</TableHead>
            <TableHead>Metrics</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {models.map((model) => (
            <TableRow key={model.id} className="cursor-pointer">
              <TableCell>
                <Link
                  href={`/models/${model.id}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {model.id}
                </Link>
              </TableCell>
              <TableCell className="font-medium">{model.name}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    model.model_type === "hybrid" ? "default" : "secondary"
                  }
                >
                  {model.model_type}
                </Badge>
              </TableCell>
              <TableCell>
                {model.model_type === "hybrid"
                  ? `${model.n_qubits}q / ${model.n_layers}L`
                  : "—"}
              </TableCell>
              <TableCell>
                {model.checkpoint_exists ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="text-muted-foreground h-4 w-4" />
                )}
              </TableCell>
              <TableCell>
                {model.metrics_exists ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="text-muted-foreground h-4 w-4" />
                )}
              </TableCell>
              <TableCell className="text-muted-foreground max-w-[200px] truncate text-xs">
                {model.notes ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
