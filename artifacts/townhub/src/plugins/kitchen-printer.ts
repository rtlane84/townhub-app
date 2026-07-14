import { registerPlugin } from "@capacitor/core";

export type KitchenPrinterPrintResult = {
  cancelled?: boolean;
};

export interface KitchenPrinterPlugin {
  printHtml(options: {
    html: string;
    jobName?: string;
  }): Promise<KitchenPrinterPrintResult>;
}

/** Native iOS AirPrint bridge (`KitchenPrinterPlugin.swift`). */
export const KitchenPrinter = registerPlugin<KitchenPrinterPlugin>("KitchenPrinter");
