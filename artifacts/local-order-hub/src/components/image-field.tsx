import { useId, useRef, useState } from "react";
import {
  useUploadMediaAsset,
  getListMediaAssetsQueryKey,
  type MediaAsset,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { MediaLibraryPicker } from "@/components/media-library-picker";
import {
  ACCEPTED_IMAGE_TYPES,
  IMAGE_SURFACE_GUIDANCE,
  type ImageSurface,
} from "@/lib/media-image-guidance";
import {
  readFileAsObjectUrl,
  resolveImageSrc,
  validateImageFile,
} from "@/lib/media-upload";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ImageIcon, Trash2, Upload } from "lucide-react";

interface ImageFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  surface: ImageSurface;
  testId?: string;
  disabled?: boolean;
}

export function ImageField({
  label,
  value,
  onChange,
  surface,
  testId,
  disabled = false,
}: ImageFieldProps) {
  const guidance = IMAGE_SURFACE_GUIDANCE[surface];
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  function clearPreviewObjectUrl() {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
  }

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const uploadMedia = useUploadMediaAsset({
    mutation: {
      onSuccess: (asset) => {
        clearPreviewObjectUrl();
        onChange(asset.url);
        setLocalPreview(null);
        void queryClient.invalidateQueries({ queryKey: getListMediaAssetsQueryKey() });
        toast({ title: "Image uploaded" });
      },
      onError: (err) => {
        clearPreviewObjectUrl();
        setLocalPreview(null);
        const description = err instanceof Error ? err.message : "Please try again.";
        toast({ title: "Upload failed", description, variant: "destructive" });
      },
    },
  });

  const previewSrc = localPreview ?? resolveImageSrc(value);
  const isUploading = uploadMedia.isPending;

  async function handleFileChange(file: File | null) {
    if (!file) return;
    const validationError = validateImageFile(file);
    if (validationError) {
      toast({ title: validationError, variant: "destructive" });
      return;
    }

    clearPreviewObjectUrl();
    const previewUrl = readFileAsObjectUrl(file);
    previewObjectUrlRef.current = previewUrl;
    setLocalPreview(previewUrl);
    uploadMedia.mutate({ data: { file } });
  }

  function handleLibrarySelect(asset: MediaAsset) {
    onChange(asset.url);
    setLocalPreview(null);
  }

  function handleRemove() {
    clearPreviewObjectUrl();
    onChange("");
    setLocalPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const fieldLabel = label ?? guidance.label;

  return (
    <div className="space-y-2" data-testid={testId}>
      <div>
        <label htmlFor={inputId} className="text-sm font-medium block">
          {fieldLabel}
        </label>
        <p className="text-xs text-muted-foreground mt-0.5">
          Recommended: {guidance.recommendedSize}
          {guidance.hint ? ` · ${guidance.hint}` : ""}
        </p>
      </div>

      <div
        className={cn(
          "relative rounded-lg border bg-muted/30 overflow-hidden",
          guidance.aspectClass,
          previewSrc ? "" : "flex items-center justify-center min-h-[120px]",
        )}
      >
        {previewSrc ? (
          <img
            src={previewSrc}
            alt={`${fieldLabel} preview`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground py-8">
            <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-xs">No image selected</p>
          </div>
        )}
        {isUploading && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center text-sm font-medium">
            Uploading…
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          className="sr-only"
          disabled={disabled || isUploading}
          onChange={(e) => {
            void handleFileChange(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isUploading}
          onClick={() => fileInputRef.current?.click()}
          data-testid={testId ? `${testId}-upload` : undefined}
        >
          <Upload className="h-4 w-4 mr-1.5" />
          Upload image
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isUploading}
          onClick={() => setLibraryOpen(true)}
          data-testid={testId ? `${testId}-library` : undefined}
        >
          Choose from library
        </Button>
        {(previewSrc || value) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || isUploading}
            onClick={handleRemove}
            className="text-muted-foreground hover:text-destructive"
            data-testid={testId ? `${testId}-remove` : undefined}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Remove
          </Button>
        )}
      </div>

      <Collapsible open={urlOpen} onOpenChange={setUrlOpen}>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs text-muted-foreground">
            <ChevronDown className={cn("h-3.5 w-3.5 mr-1 transition-transform", urlOpen && "rotate-180")} />
            Paste image URL instead
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <Input
            value={value}
            onChange={(e) => {
              setLocalPreview(null);
              onChange(e.target.value);
            }}
            placeholder="https://…"
            disabled={disabled || isUploading}
            data-testid={testId ? `${testId}-url` : undefined}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Existing URL-based images keep working. Paste a link if your image is hosted elsewhere.
          </p>
        </CollapsibleContent>
      </Collapsible>

      <MediaLibraryPicker
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        onSelect={handleLibrarySelect}
      />
    </div>
  );
}
