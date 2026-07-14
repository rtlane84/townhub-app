import UIKit
import Capacitor

/// Cap 7 requires local plugins to be registered here — they are not auto-discovered.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(KitchenPrinterPlugin())
    }
}
