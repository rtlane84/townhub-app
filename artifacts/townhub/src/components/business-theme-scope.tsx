import type { ReactNode, CSSProperties } from "react";
import type { PlatformTheme } from "@workspace/api-client-react";
import { businessThemeStyle, type ThemeColorFields } from "@/lib/theme-colors";
import { usePlatformBranding } from "@/components/theme-provider";

type Props = {
  business: ThemeColorFields;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

export function BusinessThemeScope({ business, className, style, children }: Props) {
  const { theme } = usePlatformBranding();
  const themeStyle = businessThemeStyle(business, theme as PlatformTheme | undefined);

  return (
    <div className={className} style={{ ...themeStyle, ...style }}>
      {children}
    </div>
  );
}
