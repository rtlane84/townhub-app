import type { TownPhoto } from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageField } from "@/components/image-field";
import { createTownPhotoId, reorderTownPhotos } from "@/lib/town-photos";
import { ArrowDown, ArrowUp, Star, Trash2 } from "lucide-react";

type TownPhotosEditorProps = {
  photos: TownPhoto[];
  onChange: (photos: TownPhoto[]) => void;
  disabled?: boolean;
};

export function TownPhotosEditor({
  photos,
  onChange,
  disabled = false,
}: TownPhotosEditorProps) {
  const sorted = [...photos].sort((a, b) => a.sortOrder - b.sortOrder);
  const [addKey, setAddKey] = useState(0);

  const updatePhoto = (id: string, patch: Partial<TownPhoto>) => {
    onChange(
      photos.map((photo) => (photo.id === id ? { ...photo, ...patch } : photo)),
    );
  };

  const setPrimary = (id: string) => {
    onChange(
      photos.map((photo, index) => ({
        ...photo,
        isPrimary: photo.id === id,
        sortOrder: photo.id === id ? 0 : index + 1,
      })),
    );
  };

  const removePhoto = (id: string) => {
    const remaining = photos.filter((photo) => photo.id !== id);
    const hadPrimary = photos.some(
      (photo) => photo.id === id && photo.isPrimary,
    );
    onChange(
      remaining.map((photo, index) => ({
        ...photo,
        sortOrder: index,
        isPrimary: hadPrimary ? index === 0 : photo.isPrimary,
      })),
    );
  };

  const movePhoto = (index: number, direction: -1 | 1) => {
    onChange(reorderTownPhotos(sorted, index, index + direction));
  };

  const addPhoto = (url: string) => {
    if (!url.trim()) return;
    const next: TownPhoto = {
      id: createTownPhotoId(),
      url: url.trim(),
      caption: null,
      isPrimary: photos.length === 0,
      sortOrder: photos.length,
    };
    onChange([...photos, next]);
    setAddKey((key) => key + 1);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upload multiple town photos for the homepage carousel. Reorder, set a
        primary photo, and optionally add a short caption. If empty, the single
        homepage hero image below is used.
      </p>

      {sorted.length > 0 ? (
        <ul className="space-y-3">
          {sorted.map((photo, index) => (
            <li
              key={photo.id}
              className="rounded-2xl border border-border/70 bg-card p-3 shadow-sm"
            >
              <div className="flex gap-3">
                <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-muted">
                  <img
                    src={photo.url}
                    alt={photo.caption || `Town photo ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {photo.isPrimary ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                        <Star className="h-3 w-3" aria-hidden />
                        Primary
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={disabled}
                        onClick={() => setPrimary(photo.id)}
                      >
                        Set primary
                      </Button>
                    )}
                    <div className="ml-auto flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={disabled || index === 0}
                        aria-label="Move photo up"
                        onClick={() => movePhoto(index, -1)}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={disabled || index === sorted.length - 1}
                        aria-label="Move photo down"
                        onClick={() => movePhoto(index, 1)}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        disabled={disabled}
                        aria-label="Remove photo"
                        onClick={() => removePhoto(photo.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor={`town-photo-caption-${photo.id}`}
                      className="text-xs"
                    >
                      Caption (optional)
                    </Label>
                    <Input
                      id={`town-photo-caption-${photo.id}`}
                      value={photo.caption ?? ""}
                      maxLength={120}
                      disabled={disabled}
                      placeholder="Short caption"
                      onChange={(event) =>
                        updatePhoto(photo.id, {
                          caption: event.target.value,
                        })
                      }
                      onBlur={(event) =>
                        updatePhoto(photo.id, {
                          caption: event.target.value.trim() || null,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-border/80 bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          No town photos yet. Add one below to start the homepage carousel.
        </p>
      )}

      <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
        <ImageField
          key={addKey}
          surface="homepage-town-photo"
          label="Add town photo"
          value=""
          onChange={(url) => {
            if (url) addPhoto(url);
          }}
          disabled={disabled}
          testId="town-photo-add"
        />
      </div>
    </div>
  );
}
