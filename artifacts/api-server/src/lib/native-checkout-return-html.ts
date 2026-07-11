/**
 * Minimal Stripe → app bounce page.
 * Served from the API so checkout still returns correctly when APP_BASE_URL
 * points at the Railway API host (frontend lives on Workers / elsewhere).
 */
export function buildNativeCheckoutReturnHtml(webOrigin: string): string {
  const origin = webOrigin.replace(/\/$/, "");
  // Escape for embedding inside a JS string literal.
  const safeOrigin = origin.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Returning to TownHub…</title>
    <style>
      :root {
        color-scheme: light;
        font-family: system-ui, -apple-system, sans-serif;
      }
      body {
        margin: 0;
        min-height: 100dvh;
        display: grid;
        place-items: center;
        background: #faf8f5;
        color: #2c241c;
        padding: 24px;
        text-align: center;
      }
      a { color: #1e3a5f; }
    </style>
    <script>
      (function () {
        var webOrigin = '${safeOrigin}';
        var params = new URLSearchParams(location.search);
        var payment = params.get("payment") || "success";
        var pendingCheckoutId = params.get("pendingCheckoutId");
        var orderId = params.get("orderId");
        var token = params.get("token") || "";

        var deepLink;
        var webUrl;

        if (payment === "canceled") {
          var cancelQs = "?payment=canceled";
          deepLink = "townhub://cart" + cancelQs;
          webUrl = webOrigin + "/cart" + cancelQs;
        } else if (pendingCheckoutId) {
          var qs = new URLSearchParams();
          qs.set("payment", payment);
          if (token) qs.set("token", token);
          var search = "?" + qs.toString();
          deepLink =
            "townhub://checkout/return/" +
            encodeURIComponent(pendingCheckoutId) +
            search;
          webUrl =
            webOrigin +
            "/checkout/return/" +
            encodeURIComponent(pendingCheckoutId) +
            search;
        } else if (orderId) {
          var oqs = new URLSearchParams();
          oqs.set("payment", payment);
          if (token) oqs.set("token", token);
          var osearch = "?" + oqs.toString();
          deepLink = "townhub://order/" + encodeURIComponent(orderId) + osearch;
          webUrl = webOrigin + "/order/" + encodeURIComponent(orderId) + osearch;
        } else {
          deepLink = "townhub://cart?payment=canceled";
          webUrl = webOrigin + "/cart?payment=canceled";
        }

        location.replace(deepLink);
        window.setTimeout(function () {
          location.replace(webUrl);
        }, 500);

        window.addEventListener("DOMContentLoaded", function () {
          var link = document.getElementById("open-app");
          if (link) link.setAttribute("href", deepLink);
        });
      })();
    </script>
  </head>
  <body>
    <div>
      <p>Returning to TownHub…</p>
      <p><a id="open-app" href="townhub://cart">Tap here if the app doesn’t open</a></p>
    </div>
  </body>
</html>`;
}
