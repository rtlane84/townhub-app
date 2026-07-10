import { useState } from "react";
import { Play, Clock, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { HelpFeaturedVideo } from "@/lib/help-content";
import { resolveVideoEmbed } from "@/lib/help-video";
import { cn } from "@/lib/utils";

const audienceLabel: Record<HelpFeaturedVideo["audience"], string> = {
  all: "Everyone",
  customer: "Customers",
  owner: "Business owners",
};

type Props = {
  video: HelpFeaturedVideo;
  className?: string;
};

export function HelpVideoCard({ video, className }: Props) {
  const [playing, setPlaying] = useState(false);
  const embed = video.video ? resolveVideoEmbed(video.video) : null;

  return (
    <Card className={cn("overflow-hidden flex flex-col h-full", className)}>
      <div className="relative aspect-video bg-muted/60 border-b">
        {playing && embed ? (
          embed.kind === "iframe" ? (
            <iframe
              src={`${embed.src}?autoplay=1`}
              title={video.title}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              src={embed.src}
              controls
              autoPlay
              className="absolute inset-0 h-full w-full object-cover bg-black"
            />
          )
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Play className="h-8 w-8 text-primary ml-0.5" />
            </div>
            {embed ? (
              <Button size="sm" onClick={() => setPlaying(true)} className="gap-1.5">
                <Play className="h-3.5 w-3.5" />
                Watch video
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground max-w-[220px]">
                Video coming soon — check back for the full walkthrough.
              </p>
            )}
          </div>
        )}
        {video.duration && (
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-background/90 px-2 py-0.5 text-xs font-medium shadow-sm">
            <Clock className="h-3 w-3" />
            {video.duration}
          </span>
        )}
      </div>
      <CardContent className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-serif font-semibold text-base leading-snug">{video.title}</h3>
          <Badge variant="secondary" className="text-[10px] shrink-0">
            {audienceLabel[video.audience]}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed flex-1">{video.description}</p>
        {!embed && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
            <Sparkles className="h-3 w-3 text-primary" />
            Supports YouTube, Vimeo, or uploaded videos
          </p>
        )}
      </CardContent>
    </Card>
  );
}
