import { shadcn } from "@clerk/themes";

const clerkForeground = "hsl(222, 22%, 12%)";
const clerkMutedForeground = "hsl(220, 10%, 42%)";
const clerkBorder = "hsl(220, 14%, 90%)";
const clerkPrimary = "hsl(221, 83%, 32%)";
const clerkPrimaryForeground = "#ffffff";

/** Sign-in / sign-up card styling (ClerkProvider). */
export const clerkAuthAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  variables: {
    colorPrimary: clerkPrimary,
    colorPrimaryForeground: clerkPrimaryForeground,
    colorForeground: clerkForeground,
    colorMutedForeground: clerkMutedForeground,
    colorDanger: "hsl(0, 72%, 51%)",
    colorBackground: "hsl(0, 0%, 100%)",
    colorInput: "hsl(220, 14%, 88%)",
    colorInputForeground: clerkForeground,
    colorNeutral: "hsl(220, 16%, 96%)",
    fontFamily: "'Outfit', sans-serif",
    borderRadius: "1.25rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-[1.75rem] w-[440px] max-w-full overflow-hidden shadow-[0_8px_40px_-12px_rgba(15,23,42,0.16)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-2xl font-serif text-foreground font-semibold tracking-tight",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButton: {
      backgroundColor: "#ffffff",
      border: `1px solid ${clerkBorder}`,
      color: clerkForeground,
      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
      "&:hover": {
        backgroundColor: "hsl(214, 20%, 96%)",
        borderColor: "hsl(214, 20%, 80%)",
      },
    },
    socialButtonsBlockButtonText: {
      color: clerkForeground,
      fontWeight: 500,
      fontSize: "0.875rem",
    },
    formButtonPrimary: {
      backgroundColor: clerkPrimary,
      color: clerkPrimaryForeground,
      fontWeight: 500,
      "&:hover": {
        backgroundColor: "hsl(221, 64%, 28%)",
      },
      "&:focus": {
        backgroundColor: "hsl(221, 64%, 28%)",
      },
    },
    formButtonPrimaryText: {
      color: clerkPrimaryForeground,
      fontWeight: 500,
    },
    formFieldLabel: "text-foreground font-medium",
    footerActionLink: "text-primary font-medium hover:underline",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground bg-white",
  },
};

/** Native: hide Clerk OAuth — Apple and Google use the system-browser bridge instead. */
export const nativeClerkAuthAppearance = {
  ...clerkAuthAppearance,
  elements: {
    ...clerkAuthAppearance.elements,
    socialButtonsRoot: { display: "none" },
    dividerRow: { display: "none" },
  },
};

/** Profile avatar menu — high-contrast readable actions. */
export const clerkUserButtonAppearance = {
  variables: {
    colorBackground: "hsl(0, 0%, 100%)",
    colorForeground: "hsl(222, 22%, 12%)",
    colorMutedForeground: "hsl(220, 10%, 42%)",
    colorNeutral: "hsl(220, 14%, 90%)",
    colorPrimary: "hsl(221, 83%, 32%)",
    colorDanger: "hsl(0, 72%, 51%)",
  },
  elements: {
    userButtonPopoverCard:
      "!bg-white !text-foreground border-0 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.16)] rounded-[1.5rem] overflow-hidden",
    userButtonPopoverMain: "!bg-white",
    userButtonPopoverHeader: "!bg-white border-b border-border",
    userButtonPopoverActions: "!bg-white p-2",
    userButtonPopoverActionButton:
      "!text-foreground hover:!bg-muted rounded-md px-3 py-2.5 transition-colors",
    userButtonPopoverActionButtonText: "!text-foreground !opacity-100 font-medium text-sm",
    userButtonPopoverActionButtonIcon: "!text-foreground !opacity-90",
    // Custom items (Delete TownHub account) default to Clerk's dim grey; render as destructive.
    userButtonPopoverCustomItemButton:
      "!text-destructive hover:!bg-destructive/10 rounded-md px-3 py-2.5 transition-colors",
    userButtonPopoverCustomItemButtonIconBox: "!text-destructive !opacity-100",
    userPreviewMainIdentifier: "!text-foreground font-semibold",
    userPreviewSecondaryIdentifier: "!text-muted-foreground",
    userButtonPopoverFooter: "!bg-muted/50 border-t border-border",
    userButtonPopoverFooterAction:
      "!text-destructive hover:!bg-destructive/10 rounded-md px-3 py-2.5 transition-colors",
    userButtonPopoverFooterActionText: "!text-destructive !opacity-100 font-semibold text-sm",
    userButtonPopoverFooterActionIcon: "!text-destructive !opacity-100",
  },
};
