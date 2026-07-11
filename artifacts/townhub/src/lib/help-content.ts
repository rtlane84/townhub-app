export type HelpVideoSource = {
  type: "youtube" | "vimeo" | "upload";
  url: string;
};

export type HelpFeaturedVideo = {
  id: string;
  title: string;
  description: string;
  duration?: string;
  audience: "all" | "customer" | "owner";
  /** When set, the card renders an embedded player. Leave empty for a coming-soon placeholder. */
  video?: HelpVideoSource | null;
};

export type HelpWhatsNewItem = {
  id: string;
  title: string;
  summary: string;
  dateLabel: string;
  tag?: string;
};

export type HelpTopic = {
  id: string;
  title: string;
  summary: string;
  highlights: string[];
  journeyStep?: number;
  link?: { href: string; label: string };
};

export type HelpFaq = {
  id: string;
  question: string;
  answer: string;
};

export const featuredVideos: HelpFeaturedVideo[] = [
  {
    id: "welcome",
    title: "Welcome to TownHub",
    description: "A quick tour of the platform — how customers discover local businesses and how owners run their storefront from one place.",
    duration: "4 min",
    audience: "all",
    video: null,
  },
  {
    id: "customer-training",
    title: "Customer Training",
    description: "Learn to browse businesses, order online, track purchases, and request appointments — no account required for most tasks.",
    duration: "6 min",
    audience: "customer",
    video: null,
  },
  {
    id: "owner-training",
    title: "Business Owner Training",
    description: "Walk through applying, getting approved, setting up billing, building your storefront, and managing day-to-day operations.",
    duration: "8 min",
    audience: "owner",
    video: null,
  },
];

export const whatsNewItems: HelpWhatsNewItem[] = [
  {
    id: "stripe-billing",
    title: "Subscription billing in Business Hub",
    summary: "Paid plans now use Stripe checkout and a Manage Billing portal for trials, renewals, and payment updates.",
    dateLabel: "Recently released",
    tag: "Business owners",
  },
  {
    id: "product-options",
    title: "Custom product options",
    summary: "Restaurants and shops can offer sizes, toppings, and add-ons that customers choose before adding items to cart.",
    dateLabel: "Recently released",
    tag: "Business owners",
  },
  {
    id: "guest-checkout",
    title: "Guest checkout improvements",
    summary: "Customers can order without creating an account and still follow their order from the confirmation page.",
    dateLabel: "Recently released",
    tag: "Customers",
  },
];

export const customerTopics: HelpTopic[] = [
  {
    id: "getting-started",
    title: "Getting started as a customer",
    summary: "Everything you need for your first visit — no technical setup required.",
    highlights: [
      "Browse All Businesses from the menu to see every active listing in town.",
      "Open a storefront to view hours, menu or services, and how to order or book.",
      "Sign in only when you want order history saved to My Orders.",
    ],
    link: { href: "/businesses", label: "Browse businesses" },
  },
  {
    id: "browse-discover",
    title: "Discover businesses, events & food trucks",
    summary: "Find what is open today and what is happening around town.",
    highlights: [
      "The home page highlights featured businesses and community updates.",
      "Events shows upcoming happenings promoted on the platform.",
      "Food Trucks lists today's stops and upcoming schedules.",
    ],
    link: { href: "/events", label: "View events" },
  },
  {
    id: "order-online",
    title: "Place an order online",
    summary: "Order pickup or delivery from businesses that offer online ordering.",
    highlights: [
      "Add items to your cart from a business storefront.",
      "Choose pickup or delivery and enter your contact details at checkout.",
      "Pay by card when the business accepts online payments, or choose pay at pickup.",
    ],
    link: { href: "/cart", label: "Open cart" },
  },
  {
    id: "guest-checkout",
    title: "Guest checkout — no account needed",
    summary: "Most orders work without signing up first.",
    highlights: [
      "Enter your name, email, and phone at checkout as a guest.",
      "You receive a confirmation page with your order number and status.",
      "Sign in later if you want past orders saved under My Orders.",
    ],
  },
  {
    id: "track-orders",
    title: "Track your orders",
    summary: "Follow progress from placed to ready for pickup or out for delivery.",
    highlights: [
      "Signed-in customers open My Orders from the menu for full history.",
      "Each order shows current status, items, and fulfillment details.",
      "Guest orders can be tracked from the confirmation link you receive.",
    ],
    link: { href: "/my-orders", label: "My orders" },
  },
  {
    id: "appointments",
    title: "Request an appointment",
    summary: "Book services at salons, spas, and appointment-based businesses.",
    highlights: [
      "On an appointment storefront, choose a service and tap Book appointment.",
      "Pick your preferred date and time, then submit your contact information.",
      "The business reviews your request and confirms by email — it is not instant until they accept.",
    ],
  },
];

export const businessOwnerTopics: HelpTopic[] = [
  {
    id: "apply",
    title: "Apply to list your business",
    summary: "Submit your application so the platform team can review your listing.",
    journeyStep: 1,
    highlights: [
      "Sign in, then open List Your Business from the menu.",
      "Enter your business name, category, contact info, and weekly hours.",
      "Choose a subscription plan that matches the features you need.",
      "Submit — no card is charged during the application itself.",
    ],
    link: { href: "/list-your-business", label: "Start application" },
  },
  {
    id: "approval",
    title: "The approval process",
    summary: "What happens after you submit and how to check your status.",
    journeyStep: 2,
    highlights: [
      "A platform administrator reviews your application for completeness and fit.",
      "You can return to List Your Business to see pending or approved status.",
      "When approved, your business is created and you gain access to the Business Hub.",
    ],
  },
  {
    id: "choose-plan",
    title: "Choose a subscription plan",
    summary: "Pick the plan that unlocks the capabilities your business needs.",
    journeyStep: 3,
    highlights: [
      "Compare plans on the Pricing page — features and prices update automatically.",
      "Founding, beta, and free plans do not require card checkout.",
      "Paid plans include a trial when configured; billing starts after checkout in Business Hub.",
    ],
    link: { href: "/list-your-business#plans", label: "View plans" },
  },
  {
    id: "billing-after-approval",
    title: "Complete billing after approval",
    summary: "Activate paid plans with secure Stripe checkout.",
    journeyStep: 4,
    highlights: [
      "After approval on a paid plan, open Business Hub → Subscription.",
      "Tap Start Free Trial or Start Subscription to open Stripe checkout.",
      "Paid features unlock once your subscription is trialing or active.",
    ],
    link: { href: "/dashboard/business/subscription", label: "Go to Subscription" },
  },
  {
    id: "storefront",
    title: "Build your storefront",
    summary: "Configure the public page customers see when they find your business.",
    journeyStep: 5,
    highlights: [
      "Upload a hero image, logo, and banner text in Business Hub → Settings.",
      "Set accent and button colors to match your brand.",
      "Choose ordering mode, appointment mode, or an information-only page.",
      "Preview your live storefront from the public business link.",
    ],
    link: { href: "/dashboard/business/settings", label: "Storefront settings" },
  },
  {
    id: "products",
    title: "Add products & services",
    summary: "Build the catalog customers browse and order from.",
    journeyStep: 6,
    highlights: [
      "Create categories to organize your menu or service list.",
      "Add products with names, prices, descriptions, and photos.",
      "Attach product options (sizes, toppings, add-ons) when your plan includes them.",
    ],
    link: { href: "/dashboard/business/products", label: "Manage products" },
  },
  {
    id: "orders",
    title: "Manage orders",
    summary: "Accept, prepare, and fulfill customer orders from one dashboard.",
    journeyStep: 7,
    highlights: [
      "New orders appear in Business Hub → Orders with alerts for incoming requests.",
      "Update status as you confirm, prepare, and mark ready for pickup or delivery.",
      "Use Kitchen for a focused prep view during busy periods.",
    ],
    link: { href: "/dashboard/business/orders", label: "View orders" },
  },
  {
    id: "appointments-manage",
    title: "Manage appointments",
    summary: "Review and respond to booking requests from customers.",
    journeyStep: 8,
    highlights: [
      "Incoming requests appear in Business Hub → Appointments.",
      "Confirm, decline, or mark complete as your schedule allows.",
      "Customers receive email updates when you change appointment status.",
    ],
    link: { href: "/dashboard/business/appointments", label: "Manage appointments" },
  },
  {
    id: "subscriptions-billing",
    title: "Subscriptions & ongoing billing",
    summary: "Manage your TownHub plan, trial, and payment method.",
    journeyStep: 9,
    highlights: [
      "Business Hub → Subscription shows your plan, status, and enabled features.",
      "Manage Billing opens the Stripe Customer Portal for invoices and payment updates.",
      "Past-due subscriptions show a warning — update your card to avoid losing access.",
    ],
    link: { href: "/dashboard/business/subscription", label: "Subscription & billing" },
  },
  {
    id: "enabled-features",
    title: "Enabled features on your plan",
    summary: "See which capabilities your subscription unlocks.",
    journeyStep: 10,
    highlights: [
      "Your Subscription page lists features included with your current plan.",
      "Locked items in the Business Hub menu indicate features not on your plan.",
      "Upgrade by choosing a higher plan and completing checkout, or contact the platform admin.",
    ],
    link: { href: "/dashboard/business/subscription", label: "View features" },
  },
];

export const customerFaqs: HelpFaq[] = [
  {
    id: "account-required",
    question: "Do I need an account to order?",
    answer:
      "No. Guest checkout is available for most orders. Sign in if you want My Orders to keep a history of purchases tied to your account.",
  },
  {
    id: "payment-options",
    question: "How does payment work?",
    answer:
      "Each business chooses what it accepts. Some offer pay online by card; others allow pay at pickup. The cart shows the options available for that business.",
  },
  {
    id: "guest-order-status",
    question: "How do I check a guest order status?",
    answer:
      "Use the order confirmation page link from checkout or the email confirmation. Signed-in customers can also find all orders under My Orders.",
  },
  {
    id: "appointment-confirmed",
    question: "Is my appointment confirmed when I submit a request?",
    answer:
      "Not automatically. You submit a request and the business confirms availability. Watch for an email update when they accept or respond.",
  },
  {
    id: "delivery-area",
    question: "Does every business deliver?",
    answer:
      "No. Each business sets its own pickup and delivery options. The storefront and cart show what is available for that listing.",
  },
];

export const businessOwnerFaqs: HelpFaq[] = [
  {
    id: "approval-time",
    question: "How long does application review take?",
    answer:
      "Review timing depends on the platform administrator. Check application status on the List Your Business page while you wait.",
  },
  {
    id: "paid-before-approval",
    question: "When am I charged for a paid plan?",
    answer:
      "Applying is free. After approval, complete checkout in Business Hub → Subscription. Trials begin at checkout — you are not charged until the trial ends.",
  },
  {
    id: "multiple-businesses",
    question: "Can I manage more than one business?",
    answer:
      "Yes. After approval, use the business switcher in the Business Hub header to move between listings you own.",
  },
  {
    id: "stripe-connect-vs-billing",
    question: "What is the difference between Stripe Connect and subscription billing?",
    answer:
      "Subscription billing is what you pay TownHub for your plan. Stripe Connect is separate — it lets customers pay your business directly for orders. Connect Stripe in Payments when you want online order checkout.",
  },
  {
    id: "stripe-required",
    question: "Do I need Stripe for every business?",
    answer:
      "Stripe Connect is required only for online card order payments. Pay-at-pickup and appointment-only storefronts can operate without connecting Stripe for orders.",
  },
];

/** @deprecated Use customerTopics — kept for tests migrating from workflows */
export const customerWorkflows = customerTopics.map((topic) => ({
  id: topic.id,
  title: topic.title,
  summary: topic.summary,
  steps: topic.highlights,
  link: topic.link,
}));

/** @deprecated Use businessOwnerTopics */
export const businessOwnerWorkflows = businessOwnerTopics.map((topic) => ({
  id: topic.id,
  title: topic.title,
  summary: topic.summary,
  steps: topic.highlights,
  link: topic.link,
}));

export const platformSupportContact = {
  providerName: "LaneTech",
  email: "Ronnie@LaneTechWV.com",
} as const;
