"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Image, Maximize2 } from "lucide-react";

export default function AssetsPage() {
  const [selectedImage, setSelectedImage] = useState<{
    name: string;
    url: string;
  } | null>(null);

  const { data, isPending, isError } = useQuery({
    queryKey: ["diagrams"],
    queryFn: ({ signal }) => api.listDiagrams(signal),
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Report Assets</h1>
        <p className="text-muted-foreground text-sm">
          Diagrams, flowcharts, and visual assets from the research report
        </p>
      </div>

      {isError && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-destructive text-sm">
              Failed to load report assets. Is the backend running?
            </p>
          </CardContent>
        </Card>
      )}

      {isPending && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      )}

      {!isPending && items.length === 0 && !isError && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Image className="text-muted-foreground mb-3 h-12 w-12" />
            <p className="text-muted-foreground text-sm">
              No report diagrams found
            </p>
          </CardContent>
        </Card>
      )}

      {items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const imgUrl = api.diagramUrl(item.name);
            return (
              <Card key={item.id} className="group overflow-hidden">
                <div className="bg-muted/20 relative aspect-video cursor-pointer overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgUrl}
                    alt={item.name}
                    className="h-full w-full object-contain transition-transform group-hover:scale-105"
                    onClick={() =>
                      setSelectedImage({ name: item.name, url: imgUrl })
                    }
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                    <Maximize2 className="h-8 w-8 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </div>
                <CardContent className="flex items-center justify-between p-3">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <a href={imgUrl} download={item.name}>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </a>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Image modal */}
      <Dialog
        open={!!selectedImage}
        onOpenChange={(open) => !open && setSelectedImage(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedImage?.name}</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="space-y-4">
              <div className="bg-muted/20 overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedImage.url}
                  alt={selectedImage.name}
                  className="w-full object-contain"
                />
              </div>
              <div className="flex justify-end">
                <a href={selectedImage.url} download={selectedImage.name}>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
