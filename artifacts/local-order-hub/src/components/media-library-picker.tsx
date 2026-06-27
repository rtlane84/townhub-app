import { useState } from "react";
import {
  useListMediaAssets,
  getListMediaAssetsQueryKey,
  type MediaAsset,
} from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveImageSrc } from "@/lib/media-upload";
import { cn } from "@/lib/utils";
import { ImageIcon } from "lucide-react";

interface MediaLibraryPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (asset: MediaAsset) => void;
}

export function MediaLibraryPicker({ open, onOpenChange, onSelect }: MediaLibraryPickerProps) {
  const { data: assets, isLoading, isError } = useListMediaAssets(undefined, {
    query: {
      enabled: open,
      queryKey: getListMediaAssetsQueryKey(),
    },
  });

  const [selectedId, setSelectedId] = useState<number | null>(null);

  function handleConfirm() {
    const asset = assets?.find((a) => a.id === selectedId);
    if (!asset) return;
    onSelect(asset);
    onOpenChange(false);
    setSelectedId(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif">Choose from library</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          Select a previously uploaded image. Upload new images from the form first if your library is empty.
        </p>
        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 py-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive py-6 text-center">Could not load media library.</p>
        ) : !assets?.length ? (
          <div className="py-12 text-center text-muted-foreground">
            <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No uploaded images yet.</p>
            <p className="text-xs mt-1">Use Upload image to add your first one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[50vh] overflow-y-auto py-1">
            {assets.map((asset) => {
              const selected = selectedId === asset.id;
              const src = resolveImageSrc(asset.url);
              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => setSelectedId(asset.id)}
                  className={cn(
                    "relative aspect-square rounded-lg border overflow-hidden bg-muted transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected ? "ring-2 ring-primary border-primary" : "hover:border-primary/50",
                  )}
                  data-testid={`media-asset-${asset.id}`}
                >
                  {src ? (
                    <img src={src} alt={asset.originalFilename} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selectedId == null} data-testid="button-confirm-media">
            Use selected image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
