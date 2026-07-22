export type HelpAudience = "customer" | "owner";

export type HelpVideoSource = {
  type: "youtube" | "vimeo" | "upload";
  url: string;
};

export type HelpFeaturedVideo = {
  id: string;
  title: string;
  description: string;
  duration?: string;
  audience: "all" | HelpAudience;
  /** Leave empty until the training video is ready to publish. */
  video?: HelpVideoSource | null;
};

export type HelpLink = {
  href: string;
  label: string;
};

export type HelpGuide = {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  keywords?: string[];
  note?: string;
  link?: HelpLink;
  journeyStep?: number;
};

export type HelpCategory = {
  id: string;
  title: string;
  description: string;
  guides: HelpGuide[];
};

export type HelpFaq = {
  id: string;
  question: string;
  answer: string;
  keywords?: string[];
};

export type HelpDirectory = {
  categories: HelpCategory[];
  faqs: HelpFaq[];
};

export type HelpSearchResults = HelpDirectory & {
  guideCount: number;
  faqCount: number;
};

export const featuredVideos: HelpFeaturedVideo[] = [
  {
    id: "welcome",
    title: "Welcome to TownHub",
    description: "Tour local discovery, customer ordering, and the Business Hub.",
    duration: "4 min",
    audience: "all",
    video: null,
  },
  {
    id: "customer-training",
    title: "Customer Training",
    description: "Browse businesses, order online, track purchases, and request appointments.",
    duration: "6 min",
    audience: "customer",
    video: null,
  },
  {
    id: "owner-training",
    title: "Business Owner Training",
    description: "Apply, build your storefront, configure payments, and manage daily work.",
    duration: "8 min",
    audience: "owner",
    video: null,
  },
];

export const customerHelp: HelpDirectory = {
  categories: [
    {
      id: "discover",
      title: "Discover TownHub",
      description: "Find local businesses, services, events, and mobile stops.",
      guides: [
        {
          id: "browse-businesses",
          title: "Browse and search local businesses",
          summary: "Find an active listing and learn what it offers before you visit or order.",
          steps: [
            "Open Local Businesses to browse every active listing.",
            "Search by business name, cuisine, product, or service, then narrow the list by category or online ordering.",
            "Open a business to review its hours, open or closed state, contact details, fulfillment choices, and available items or services.",
          ],
          keywords: ["directory", "filter", "open now", "hours", "category"],
          link: { href: "/businesses", label: "Browse businesses" },
        },
        {
          id: "storefront-types",
          title: "Understand each kind of storefront",
          summary: "TownHub businesses can sell items, accept appointment requests, or share information.",
          steps: [
            "Ordering storefronts show a catalog and Add buttons when online ordering is available.",
            "Appointment storefronts let you request a service, preferred date, and time.",
            "Information-only storefronts share hours, contact details, directions, and an external website when available.",
          ],
          keywords: ["ordering", "appointment", "information only", "website"],
        },
        {
          id: "events-mobile-businesses",
          title: "Find events and mobile businesses",
          summary: "See what is happening in town and where food trucks or mobile businesses will be.",
          steps: [
            "Open Events to browse upcoming community activities and featured events.",
            "Open Food Trucks to see today's stops and upcoming schedules supplied by each mobile business.",
            "Use a listed address or map action for directions, and check the location note for pickup details.",
          ],
          keywords: ["calendar", "food truck", "mobile schedule", "location", "map"],
          link: { href: "/food-trucks", label: "View mobile schedules" },
        },
      ],
    },
    {
      id: "shop-order",
      title: "Shop and build an order",
      description: "Choose items, options, quantities, pickup, or delivery.",
      guides: [
        {
          id: "browse-items-options",
          title: "Choose items and options",
          summary: "Build an item exactly as the business offers it.",
          steps: [
            "Browse the storefront's categories and open an item to read its description and price.",
            "Choose required sizes, toppings, add-ons, or other options before adding the item.",
            "Unavailable items cannot be ordered; check back later or contact the business.",
          ],
          keywords: ["menu", "product", "service", "modifier", "add-on", "sold out"],
        },
        {
          id: "manage-cart",
          title: "Manage your cart",
          summary: "Review quantities and totals before checkout.",
          steps: [
            "Use the cart controls to change quantities or remove an item.",
            "TownHub keeps one business in a cart at a time so payment, tax, and fulfillment stay with the correct business.",
            "If you add from another business, confirm whether you want to clear the current cart first.",
          ],
          keywords: ["quantity", "remove", "clear cart", "multiple businesses"],
          link: { href: "/cart", label: "Open cart" },
        },
        {
          id: "pickup-delivery",
          title: "Choose pickup or delivery",
          summary: "The cart shows only the fulfillment choices enabled by that business.",
          steps: [
            "Select Store Pickup or Delivery when both are offered.",
            "For delivery, enter the requested address and meet any displayed minimum order.",
            "Review the delivery fee, tax, business instructions, and estimated preparation window before paying.",
          ],
          note: "Delivery areas and instructions belong to the business. Contact it directly when an address or special delivery need is unclear.",
          keywords: ["address", "minimum", "fee", "radius", "prep time", "tax"],
        },
      ],
    },
    {
      id: "checkout-payment",
      title: "Checkout and payment",
      description: "Complete checkout as a guest or signed-in customer.",
      guides: [
        {
          id: "guest-or-account",
          title: "Order as a guest or sign in",
          summary: "Most customer orders do not require an account.",
          steps: [
            "Enter your name, email, and phone in Order Details.",
            "Continue as a guest for a protected confirmation link, or sign in when you want purchases saved in My Orders.",
            "Keep a guest confirmation link private because it grants access to that order's details.",
          ],
          keywords: ["account", "login", "email", "phone", "token", "private link"],
        },
        {
          id: "payment-methods",
          title: "Pay online or at pickup",
          summary: "Each business controls which payment methods it accepts.",
          steps: [
            "Choose online card payment or pay at pickup when the option appears.",
            "Card payment opens secure Stripe Checkout for that business; return to TownHub after Stripe finishes.",
            "Pay-at-pickup orders are created immediately with payment still due to the business.",
          ],
          note: "TownHub never asks you to send card details to a business through messages or email.",
          keywords: ["Stripe", "credit card", "cash", "in person", "pay later"],
        },
        {
          id: "checkout-problems",
          title: "Handle a canceled or delayed card checkout",
          summary: "A browser return alone does not mean payment succeeded.",
          steps: [
            "Wait while TownHub confirms the payment after returning from Stripe.",
            "If checkout was canceled or failed, return to the cart and try again; do not assume an order was placed.",
            "If confirmation remains delayed, keep the page open briefly, then contact the business or TownHub support before paying a second time.",
          ],
          keywords: ["failed", "canceled", "pending", "confirming", "charged twice", "duplicate"],
        },
      ],
    },
    {
      id: "after-order",
      title: "After placing an order",
      description: "Track progress, understand statuses, and get help with changes.",
      guides: [
        {
          id: "confirmation-tracking",
          title: "Find and track your order",
          summary: "Use the confirmation page or My Orders to follow progress.",
          steps: [
            "Save the order number and confirmation page after checkout.",
            "Signed-in customers can open My Orders for their order history and details.",
            "Guest customers must use the protected link from confirmation or their notification; signing in later does not automatically attach an earlier guest order.",
          ],
          keywords: ["receipt", "history", "guest link", "order number"],
          link: { href: "/my-orders", label: "Open My Orders" },
        },
        {
          id: "order-statuses",
          title: "Understand order statuses",
          summary: "The business moves your order through its real fulfillment progress.",
          steps: [
            "New means the order was received; Confirmed means the business accepted it.",
            "Preparing means work is underway; Ready for Pickup or Out for Delivery tells you the next action.",
            "Completed means fulfillment finished. Canceled means the order will not be fulfilled.",
          ],
          keywords: ["new", "confirmed", "preparing", "ready", "out for delivery", "completed", "canceled"],
        },
        {
          id: "changes-cancellations-refunds",
          title: "Request a change, cancellation, or refund",
          summary: "The business is the first contact for a specific order.",
          steps: [
            "Call the business promptly when contact details, items, pickup, or delivery information must change.",
            "Ask the business about cancellation before it has prepared or delivered the order.",
            "Card refunds may take time to appear after the business issues them. Pay-at-pickup refunds are handled directly by the business.",
          ],
          note: "TownHub support can investigate a platform or payment-status problem, but it does not decide a business's refund policy.",
          keywords: ["wrong item", "cancel", "refund", "money back", "contact business"],
        },
      ],
    },
    {
      id: "appointments",
      title: "Appointments",
      description: "Request a service time and wait for the business's decision.",
      guides: [
        {
          id: "request-appointment",
          title: "Request an appointment",
          summary: "Appointment submissions are requests, not instant reservations.",
          steps: [
            "Open an appointment-enabled storefront and choose a service when services are listed.",
            "Select your preferred date and time, enter contact details, and submit the request.",
            "Watch for the business to confirm or decline. Contact it directly if you need to change or cancel after confirmation.",
          ],
          keywords: ["booking", "service", "preferred time", "confirm", "decline", "reservation"],
        },
      ],
    },
    {
      id: "account-support",
      title: "Account and support",
      description: "Manage your account and contact the right source for help.",
      guides: [
        {
          id: "account-settings",
          title: "Manage or delete your account",
          summary: "Use Account for profile access and account-deletion requests.",
          steps: [
            "Open Account while signed in to manage your identity profile.",
            "Use the account deletion section when you want TownHub to review and process deletion of your platform account.",
            "A deletion request does not replace contacting a business about an active order or appointment.",
          ],
          keywords: ["profile", "delete account", "privacy", "personal information"],
          link: { href: "/account", label: "Open Account" },
        },
        {
          id: "who-to-contact",
          title: "Know who to contact",
          summary: "Order questions go to the business; site and account problems go to TownHub support.",
          steps: [
            "Contact the business for item availability, preparation, delivery, appointment, cancellation, and refund-policy questions.",
            "Contact TownHub support for sign-in trouble, broken pages, missing confirmation access, or a platform payment-status concern.",
          ],
          keywords: ["support", "help", "problem", "business phone"],
        },
      ],
    },
  ],
  faqs: [
    {
      id: "account-required",
      question: "Do I need an account to order?",
      answer: "No. Most orders support guest checkout. Sign in if you want eligible purchases saved in My Orders.",
      keywords: ["guest", "login"],
    },
    {
      id: "multiple-business-cart",
      question: "Can I order from two businesses in one cart?",
      answer: "No. Each cart and order belongs to one business so fulfillment, tax, and payment stay accurate.",
      keywords: ["one business", "clear cart"],
    },
    {
      id: "delivery-availability",
      question: "Does every business deliver?",
      answer: "No. Each business chooses pickup and delivery settings. Its storefront and your cart show the available choices.",
      keywords: ["pickup", "radius"],
    },
    {
      id: "appointment-confirmed",
      question: "Is my appointment confirmed when I submit it?",
      answer: "No. It remains a request until the business confirms it. Watch for a decision notification or contact the business.",
      keywords: ["booking", "reservation"],
    },
    {
      id: "guest-order-access",
      question: "Why can’t I find a guest order in My Orders?",
      answer: "Guest orders are protected by their confirmation links and are not automatically attached when you sign in later. Use the original protected link.",
      keywords: ["missing order", "token", "history"],
    },
  ],
};

const businessOwnerHelp: HelpDirectory = {
  categories: [
    {
      id: "owner-onboarding",
      title: "Apply and gain access",
      description: "Move from application to an approved Business Hub account.",
      guides: [
        {
          id: "owner-application",
          title: "Apply to list your business",
          summary: "Submit the information the platform administrator needs to review your business.",
          journeyStep: 1,
          steps: [
            "Sign in and open List Your Business.",
            "Enter the business name, category, description, contact details, address, and weekly hours.",
            "Choose an available plan and submit. Applying does not charge a card.",
          ],
          keywords: ["application", "sign up", "plan", "hours"],
          link: { href: "/list-your-business", label: "Start or check an application" },
        },
        {
          id: "owner-approval",
          title: "Follow the approval process",
          summary: "Check application status and enter the Business Hub after approval.",
          journeyStep: 2,
          steps: [
            "Return to List Your Business to see whether the application is pending, approved, or not approved.",
            "The platform administrator reviews the listing and may contact you when information needs correction.",
            "Approval creates or activates the business, assigns your access, and opens the Business Hub for setup.",
          ],
          keywords: ["pending", "approved", "rejected", "review"],
        },
        {
          id: "owner-multiple-businesses",
          title: "Manage more than one business",
          summary: "Use the Business Hub switcher to stay in the correct listing.",
          journeyStep: 3,
          steps: [
            "Approved businesses you are authorized to manage appear in the business switcher.",
            "Select a business before changing its settings, items, orders, or appointments.",
            "Apply again through List Your Business when you need another listing reviewed.",
          ],
          note: "Every setting and operational record is scoped to the selected business.",
          keywords: ["switcher", "second location", "ownership", "authorized"],
        },
      ],
    },
    {
      id: "owner-storefront",
      title: "Build your storefront",
      description: "Configure the public identity and customer experience for the selected business.",
      guides: [
        {
          id: "owner-profile-hours",
          title: "Set the business profile and hours",
          summary: "Keep the directory and storefront information accurate.",
          journeyStep: 4,
          steps: [
            "Open Business Hub → Settings and update the business name, category, description, address, phone, and email.",
            "Set weekly hours and choose whether they appear publicly.",
            "Save changes before leaving; the page warns when changes are still unsaved.",
          ],
          keywords: ["profile", "address", "contact", "open closed", "unsaved"],
          link: { href: "/dashboard/business/settings", label: "Open Settings" },
        },
        {
          id: "owner-branding",
          title: "Add branding and public links",
          summary: "Make the public page recognizable and useful.",
          journeyStep: 5,
          steps: [
            "Upload the available storefront images and write a short public banner.",
            "Choose accent and button colors that remain readable.",
            "Add an external website and enable its storefront card when you want customers to visit it.",
          ],
          keywords: ["logo", "hero", "image", "banner", "color", "website"],
        },
        {
          id: "owner-storefront-mode",
          title: "Choose how customers interact",
          summary: "Use Ordering, Appointment, or Information mode to match the business.",
          journeyStep: 6,
          steps: [
            "Choose Ordering for online items and checkout, Appointment for service requests, or Information for a public listing without transactions.",
            "Business Hub sections change with the selected mode; Orders and Kitchen belong to Ordering, while Appointments belongs to Appointment.",
            "Plan-locked sections show a lock and cannot be enabled from the interface alone.",
          ],
          keywords: ["mode", "ordering", "appointment", "information", "locked feature"],
        },
      ],
    },
    {
      id: "owner-catalog",
      title: "Build the catalog",
      description: "Organize and maintain the items or services customers see.",
      guides: [
        {
          id: "owner-categories-items",
          title: "Create categories and items",
          summary: "Build the main menu, product list, or service list.",
          journeyStep: 7,
          steps: [
            "Open Categories and create the groups customers will browse.",
            "Open Items and add a name, price, description, image, category, and item preparation time.",
            "Edit or delete outdated entries carefully; changes affect the selected business's live catalog.",
          ],
          keywords: ["products", "services", "menu", "price", "photo", "prep time"],
          link: { href: "/dashboard/business/products", label: "Manage Items" },
        },
        {
          id: "owner-item-options",
          title: "Add sizes, toppings, and add-ons",
          summary: "Use Item Options for customer choices and price adjustments.",
          journeyStep: 8,
          steps: [
            "Create an option group such as Size, Toppings, or Extras.",
            "Add choices, prices, required or optional rules, and selection limits supported by the form.",
            "Attach the group to the appropriate items and test the customer selection flow.",
          ],
          keywords: ["modifier", "option group", "choice", "required", "extra charge"],
          link: { href: "/dashboard/business/product-options", label: "Manage Item Options" },
        },
        {
          id: "owner-item-availability",
          title: "Control availability and specials",
          summary: "Keep customers from ordering something you cannot fulfill.",
          journeyStep: 9,
          steps: [
            "Use each item's availability control to show whether it can currently be ordered.",
            "Choose a Special of the day when you want one item highlighted.",
            "Review the public storefront after major catalog changes.",
          ],
          keywords: ["sold out", "available", "special", "featured item"],
        },
      ],
    },
    {
      id: "owner-ordering-setup",
      title: "Configure ordering",
      description: "Set when, how, and at what cost customers can order.",
      guides: [
        {
          id: "owner-order-availability",
          title: "Set ordering availability and timing",
          summary: "Control whether orders are accepted and set realistic preparation estimates.",
          journeyStep: 10,
          steps: [
            "In Settings → Ordering, enable Accepting orders only when the business is ready to receive them.",
            "Choose when customers may order and use Stop accepting new orders for a temporary cutoff.",
            "Set minimum preparation time; longer item times and larger orders can increase the customer estimate automatically.",
          ],
          keywords: ["closed", "accepting orders", "cutoff", "hours", "prep estimate"],
        },
        {
          id: "owner-fulfillment",
          title: "Configure pickup and delivery",
          summary: "Offer only the fulfillment methods the business can reliably support.",
          journeyStep: 11,
          steps: [
            "Enable pickup, delivery, or both and write clear customer instructions.",
            "For delivery, set the fee, minimum order, normal delivery radius, and extra delivery-time buffer.",
            "Review the customer cart to confirm the instructions, fee, minimum, and timing are understandable.",
          ],
          note: "The displayed delivery radius is guidance and does not automatically block every address outside it.",
          keywords: ["delivery fee", "minimum", "radius", "pickup instructions", "buffer"],
        },
        {
          id: "owner-tax-payment-options",
          title: "Set tax and payment choices",
          summary: "Tell checkout what the business charges and accepts.",
          journeyStep: 12,
          steps: [
            "Enable sales tax only when applicable and set the configured rate and customer-facing label.",
            "Enable pay at pickup when the business will collect payment directly.",
            "Enable online card payment only after Stripe Connect is ready for charges.",
          ],
          keywords: ["sales tax", "rate", "cash", "pay at pickup", "card"],
        },
      ],
    },
    {
      id: "owner-payments-plans",
      title: "Payments and subscription",
      description: "Keep customer payments separate from the plan paid to TownHub.",
      guides: [
        {
          id: "owner-stripe-connect",
          title: "Set up Stripe Connect for customer cards",
          summary: "Connect Stripe when customers should pay your business online.",
          journeyStep: 13,
          steps: [
            "In Settings, start Stripe Connect onboarding and complete the requested business and payout details in the system browser.",
            "Return to TownHub and confirm that charges are enabled; follow any verification warning shown in the Business Hub.",
            "Stripe Connect is not required for pay-at-pickup, appointment-only, or information-only operation.",
          ],
          note: "Customer order payments go to the business's connected Stripe account. They are separate from the TownHub subscription.",
          keywords: ["payout", "verification", "charges enabled", "bank", "customer payment"],
          link: { href: "/dashboard/business/settings", label: "Open payment settings" },
        },
        {
          id: "owner-subscription",
          title: "Review the TownHub plan and billing",
          summary: "Understand the plan, trial, subscription state, and enabled features.",
          journeyStep: 14,
          steps: [
            "Open Business Hub → Subscription to review the current plan, status, renewal details, and enabled features.",
            "For a paid plan, start the trial or subscription through secure Stripe Billing checkout when prompted.",
            "Use Manage Billing for invoices and payment-method updates; resolve past-due warnings to avoid feature loss.",
          ],
          note: "Stripe Billing pays TownHub for the software plan. It is not the Stripe Connect account used for customer orders.",
          keywords: ["trial", "invoice", "renewal", "past due", "manage billing", "locked"],
          link: { href: "/dashboard/business/subscription", label: "Open Subscription" },
        },
      ],
    },
    {
      id: "owner-orders",
      title: "Manage orders",
      description: "Receive, prepare, complete, cancel, and refund customer orders.",
      guides: [
        {
          id: "owner-order-queue",
          title: "Work from the order queue",
          summary: "Use Overview and Orders to find the work needing attention.",
          journeyStep: 15,
          steps: [
            "New-order alerts and Overview counts point to incoming work for the selected business.",
            "Use Orders search, date, status, fulfillment, and payment filters to narrow the queue or history.",
            "Open an order to review customer contact details, items, fulfillment instructions, payment state, and timing.",
          ],
          keywords: ["overview", "filter", "search", "payment status", "customer phone"],
          link: { href: "/dashboard/business/orders", label: "Open Orders" },
        },
        {
          id: "owner-order-statuses",
          title: "Move an order through its statuses",
          summary: "Keep customer updates aligned with real fulfillment progress.",
          journeyStep: 16,
          steps: [
            "Leave a new order as New until it is reviewed, then move it to Confirmed when accepted.",
            "Use Preparing while work is underway, then Ready for Pickup or Out for Delivery as appropriate.",
            "Use Completed only after fulfillment finishes. Confirm carefully before a status that cannot be casually undone.",
          ],
          keywords: ["new", "confirmed", "preparing", "ready", "delivery", "completed"],
        },
        {
          id: "owner-kitchen",
          title: "Use the Kitchen view",
          summary: "Run a focused preparation board during active service.",
          journeyStep: 17,
          steps: [
            "Open Kitchen to view active orders grouped by fulfillment status.",
            "Use the quick actions to advance work as it moves through the kitchen.",
            "Print a kitchen ticket from order details when a paper ticket helps the team.",
          ],
          keywords: ["KDS", "board", "ticket", "printer", "busy"],
          link: { href: "/dashboard/business/kitchen", label: "Open Kitchen" },
        },
        {
          id: "owner-cancel-refund",
          title: "Cancel or refund an order",
          summary: "Treat fulfillment state and payment refund state as separate records.",
          journeyStep: 18,
          steps: [
            "Use Canceled when the order will not be fulfilled and confirm the customer communication.",
            "For an eligible online card order, open order details and issue a full or partial refund with a clear reason.",
            "Review refund history and processing status. Pay-at-pickup money is returned outside Stripe.",
          ],
          note: "Changing fulfillment status does not itself send money back. A Stripe refund does not automatically change fulfillment status.",
          keywords: ["partial refund", "full refund", "reason", "processing", "failed refund"],
        },
      ],
    },
    {
      id: "owner-appointments",
      title: "Manage appointments",
      description: "Respond to requests and record phone or walk-in appointments.",
      guides: [
        {
          id: "owner-appointment-requests",
          title: "Review customer requests",
          summary: "A request is not confirmed until the business accepts it.",
          journeyStep: 19,
          steps: [
            "Open Appointments when an alert or queue entry arrives.",
            "Confirm the requested time, decline it with an optional note, or later mark it completed or canceled.",
            "Status changes send the supported customer updates, so choose the state that matches the real schedule.",
          ],
          keywords: ["confirm", "decline", "complete", "cancel", "customer note"],
          link: { href: "/dashboard/business/appointments", label: "Open Appointments" },
        },
        {
          id: "owner-manual-appointment",
          title: "Add a phone or walk-in appointment",
          summary: "Keep manually received bookings visible with online requests.",
          journeyStep: 20,
          steps: [
            "Choose Add appointment in the Appointments page.",
            "Enter the customer, service, date, time, and any information required by the form.",
            "Review the combined schedule before confirming another request.",
          ],
          keywords: ["manual", "phone booking", "walk in", "schedule"],
        },
      ],
    },
    {
      id: "owner-notifications",
      title: "Notifications and live updates",
      description: "Choose how the team hears about new operational work.",
      guides: [
        {
          id: "owner-notification-channels",
          title: "Configure owner alert channels",
          summary: "Enable and test the channels that fit the business.",
          journeyStep: 21,
          steps: [
            "Open Notifications and configure Email, SMS, free ntfy phone notifications, Discord, or TownHub App Push where available.",
            "Use each provider's test action after saving a valid destination or setup value.",
            "Enable In-shop sound for a local chime while Business Hub is open.",
          ],
          note: "Critical Stripe, refund, and account-security alerts remain mandatory and are not disabled by operational channel switches.",
          keywords: ["email", "SMS", "Twilio", "ntfy", "Discord", "push", "sound", "test"],
          link: { href: "/dashboard/business/notifications", label: "Open Notifications" },
        },
        {
          id: "owner-live-status",
          title: "Understand live dashboard status",
          summary: "Business Hub keeps active order and appointment views refreshed.",
          journeyStep: 22,
          steps: [
            "Live means the page is receiving current business events.",
            "Reconnecting means the live connection is recovering; Polling means periodic refresh is being used instead.",
            "Offline means updates may be delayed, so restore the connection and manually verify urgent work.",
          ],
          keywords: ["SSE", "live", "reconnecting", "polling", "offline", "refresh"],
        },
      ],
    },
    {
      id: "owner-mobile",
      title: "Mobile-business schedules",
      description: "Publish where a food truck or other mobile business will operate.",
      guides: [
        {
          id: "owner-mobile-schedule",
          title: "Add and maintain mobile locations",
          summary: "Keep public stop information current for customers.",
          journeyStep: 23,
          steps: [
            "Open Mobile Schedule and add the location name, date, start and end time, and address.",
            "Add coordinates for map accuracy and a short note that helps customers find the setup.",
            "Edit or remove changed stops promptly and verify them on the public Food Trucks page.",
          ],
          keywords: ["food truck", "location", "latitude", "longitude", "map", "stop"],
          link: { href: "/dashboard/business/locations", label: "Open Mobile Schedule" },
        },
      ],
    },
    {
      id: "owner-daily",
      title: "Daily maintenance",
      description: "Keep the storefront trustworthy and respond quickly to warnings.",
      guides: [
        {
          id: "owner-daily-checklist",
          title: "Use a daily operating checklist",
          summary: "A few quick checks prevent most customer confusion.",
          journeyStep: 24,
          steps: [
            "Confirm the selected business, current hours, item availability, ordering state, and mobile schedule before service.",
            "Watch Overview, alerts, Orders, or Appointments for new customer activity.",
            "Resolve persistent Stripe or subscription warnings and update the storefront banner when operations change.",
          ],
          keywords: ["routine", "checklist", "warning", "maintenance", "daily"],
          link: { href: "/dashboard/business", label: "Open Business Hub" },
        },
      ],
    },
  ],
  faqs: [
    {
      id: "approval-time",
      question: "How long does application review take?",
      answer: "Timing depends on the platform administrator. Return to List Your Business to check the current status.",
      keywords: ["pending", "application"],
    },
    {
      id: "paid-before-approval",
      question: "When am I charged for a paid plan?",
      answer: "Applying is free. After approval, complete the requested Stripe Billing setup in Business Hub → Subscription. A configured trial begins at activation, with billing after the trial ends.",
      keywords: ["trial", "checkout", "subscription"],
    },
    {
      id: "connect-versus-billing",
      question: "What is the difference between Stripe Connect and Stripe Billing?",
      answer: "Stripe Connect lets customers pay your business for orders. Stripe Billing is the separate subscription your business pays TownHub for its software plan.",
      keywords: ["customer payments", "plan", "payout"],
    },
    {
      id: "stripe-required",
      question: "Does every business need Stripe Connect?",
      answer: "No. It is needed for online customer card payments. Pay-at-pickup, appointment-only, and information-only businesses can operate without it.",
      keywords: ["cash", "appointment", "information"],
    },
    {
      id: "locked-section",
      question: "Why is a Business Hub section locked or missing?",
      answer: "Sections depend on the selected business's plan and storefront mode. Subscription shows plan features; Settings controls the storefront mode.",
      keywords: ["feature", "navigation", "upgrade", "mode"],
    },
  ],
};

function replaceGuide(
  categories: HelpCategory[],
  guideId: string,
  replacement: (guide: HelpGuide) => HelpGuide,
): HelpCategory[] {
  return categories.map((category) => ({
    ...category,
    guides: category.guides.map((guide) =>
      guide.id === guideId ? replacement(guide) : guide,
    ),
  }));
}

export function resolveBusinessOwnerHelpForDistribution(storeDistribution: boolean): HelpDirectory {
  if (!storeDistribution) return businessOwnerHelp;

  const categories = replaceGuide(
    businessOwnerHelp.categories,
    "owner-subscription",
    (guide) => ({
      ...guide,
      title: "Review the TownHub plan and status",
      summary: "See the selected plan, subscription status, and enabled features.",
      steps: [
        "Open Business Hub → Subscription to review the current plan, status, and enabled features.",
        "Subscription purchases and changes are not available inside this app.",
        "Tap Manage on the web to open the TownHub website in your browser, then sign in with the same account to subscribe or update billing.",
        "If your business was recently approved, you may also follow the secure setup instructions sent to the account email, or contact TownHub support when the subscription needs attention.",
      ],
      note: "Return to Subscription after setup to confirm that the expected features are enabled.",
    }),
  );

  const faqs = businessOwnerHelp.faqs.map((faq) =>
    faq.id === "paid-before-approval"
      ? {
          ...faq,
          answer: "Applying is free. If approved, open Business Hub → Subscription and tap Manage on the web, or follow the secure subscription setup instructions sent to the account email. Any configured trial begins only after activation.",
        }
      : faq,
  );

  return { categories, faqs };
}

function searchableGuideText(category: HelpCategory, guide: HelpGuide): string {
  return [
    category.title,
    category.description,
    guide.title,
    guide.summary,
    ...guide.steps,
    ...(guide.keywords ?? []),
    guide.note ?? "",
  ]
    .join(" ")
    .toLocaleLowerCase();
}

function searchableFaqText(faq: HelpFaq): string {
  return [faq.question, faq.answer, ...(faq.keywords ?? [])]
    .join(" ")
    .toLocaleLowerCase();
}

export function filterHelpDirectory(
  directory: HelpDirectory,
  query: string,
): HelpSearchResults {
  const terms = query
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  const matches = (text: string) => terms.every((term) => text.includes(term));
  const categories = directory.categories
    .map((category) => ({
      ...category,
      guides: terms.length
        ? category.guides.filter((guide) => matches(searchableGuideText(category, guide)))
        : category.guides,
    }))
    .filter((category) => category.guides.length > 0);
  const faqs = terms.length
    ? directory.faqs.filter((faq) => matches(searchableFaqText(faq)))
    : directory.faqs;

  return {
    categories,
    faqs,
    guideCount: categories.reduce((total, category) => total + category.guides.length, 0),
    faqCount: faqs.length,
  };
}

export const platformSupportContact = {
  providerName: "LaneTech",
  email: "Ronnie@LaneTechWV.com",
} as const;
