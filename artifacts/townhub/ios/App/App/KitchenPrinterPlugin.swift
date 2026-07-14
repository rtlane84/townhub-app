import Foundation
import Capacitor
import UIKit

/**
 * Presents the system print / AirPrint sheet for kitchen ticket HTML.
 * WKWebView's window.print() is not reliable in Capacitor; this uses
 * UIMarkupTextPrintFormatter + UIPrintInteractionController instead.
 */
@objc(KitchenPrinterPlugin)
public class KitchenPrinterPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "KitchenPrinterPlugin"
    public let jsName = "KitchenPrinter"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "printHtml", returnType: CAPPluginReturnPromise),
    ]

    @objc func printHtml(_ call: CAPPluginCall) {
        guard let html = call.getString("html"), !html.isEmpty else {
            call.reject("Missing html")
            return
        }
        let jobName = call.getString("jobName") ?? "Kitchen Ticket"

        DispatchQueue.main.async {
            let printInfo = UIPrintInfo.printInfo()
            printInfo.jobName = jobName
            printInfo.outputType = .general

            let controller = UIPrintInteractionController.shared
            controller.printInfo = printInfo
            controller.printFormatter = UIMarkupTextPrintFormatter(markupText: html)

            guard let presenter = self.bridge?.viewController else {
                call.reject("Print UI is not available.")
                return
            }

            let completion: UIPrintInteractionController.CompletionHandler = { _, completed, error in
                if let error {
                    call.reject(error.localizedDescription)
                    return
                }
                if !completed {
                    call.resolve(["cancelled": true])
                    return
                }
                call.resolve(["cancelled": false])
            }

            if UIDevice.current.userInterfaceIdiom == .pad {
                controller.present(from: presenter.view.bounds, in: presenter.view, animated: true, completionHandler: completion)
            } else {
                let presented = controller.present(animated: true, completionHandler: completion)
                if !presented {
                    call.reject("Print UI is not available.")
                }
            }
        }
    }
}
