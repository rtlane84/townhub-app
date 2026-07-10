import { shadcn } from "@clerk/themes";

const clerkForeground = "hsl(20, 20%, 15%)";
const clerkMutedForeground = "hsl(20, 10%, 45%)";
const clerkBorder = "hsl(214, 20%, 88%)";
const clerkPrimary = "hsl(221, 64%, 33%)";
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
    colorDanger: "hsl(0, 70%, 50%)",
    colorBackground: "hsl(0, 0%, 100%)",
    colorInput: "hsl(214, 20%, 88%)",
    colorInputForeground: clerkForeground,
    colorNeutral: "hsl(214, 20%, 96%)",
    fontFamily: "'Outfit', sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-lg",
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

/** Profile avatar menu — high-contrast readable actions. */
export const clerkUserButtonAppearance = {
  variables: {
    colorBackground: "hsl(0, 0%, 100%)",
    colorForeground: "hsl(20, 20%, 12%)",
    colorMutedForeground: "hsl(20, 10%, 40%)",
    colorNeutral: "hsl(30, 15%, 88%)",
    colorPrimary: "hsl(25, 80%, 45%)",
    colorDanger: "hsl(0, 70%, 50%)",
  },
  elements: {
    userButtonPopoverCard:
      "!bg-white !text-foreground border border-border shadow-xl rounded-xl overflow-hidden",
    userButtonPopoverMain: "!bg-white",
    userButtonPopoverHeader: "!bg-white border-b border-border",
    userButtonPopoverActions: "!bg-white p-2",
    userButtonPopoverActionButton:
      "!text-foreground hover:!bg-muted rounded-md px-3 py-2.5 transition-colors",
    userButtonPopoverActionButtonText: "!text-foreground !opacity-100 font-medium text-sm",
    userButtonPopoverActionButtonIcon: "!text-foreground !opacity-90",
    userPreviewMainIdentifier: "!text-foreground font-semibold",
    userPreviewSecondaryIdentifier: "!text-muted-foreground",
    userButtonPopoverFooter: "!bg-muted/50 border-t border-border",
    userButtonPopoverFooterAction:
      "!text-destructive hover:!bg-destructive/10 rounded-md px-3 py-2.5 transition-colors",
    userButtonPopoverFooterActionText: "!text-destructive !opacity-100 font-semibold text-sm",
    userButtonPopoverFooterActionIcon: "!text-destructive !opacity-100",
  },
};
