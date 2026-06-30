export type HelpWorkflow = {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  link?: { href: string; label: string };
};

export type HelpFaq = {
  id: string;
  question: string;
  answer: string;
};

export const customerWorkflows: HelpWorkflow[] = [
  {
    id: "browse",
    title: "Browse local businesses",
    summary: "Discover shops, restaurants, salons, and services in one place.",
    steps: [
      "Open All Businesses from the main menu to see every active listing.",
      "Use the home page for featured businesses, events, food trucks, and town highlights.",
      "Tap a business name to open its storefront page with hours, description, and offerings.",
    ],
    link: { href: "/businesses", label: "Browse businesses" },
  },
  {
    id: "events-food-trucks",
    title: "Events and food trucks",
    summary: "See what is happening around town and where mobile vendors are today.",
    steps: [
      "Visit Events for upcoming community happenings and promoted highlights.",
      "Visit Food Trucks for today's stops and upcoming schedules.",
    ],
    link: { href: "/events", label: "View events" },
  },
  {
    id: "order-online",
    title: "Place an order online",
    summary: "Order pickup or delivery from businesses that offer online ordering.",
    steps: [
      "On a storefront, add items to your cart.",
      "Open the cart, choose pickup or delivery, and enter your contact details.",
      "Pay online with a card when the business accepts it, or choose pay at pickup if offered.",
      "After checkout you receive an order confirmation page with status updates.",
    ],
    link: { href: "/cart", label: "Go to cart" },
  },
  {
    id: "track-orders",
    title: "Track your orders",
    summary: "Follow order progress and revisit past purchases.",
    steps: [
      "Sign in to see My Orders in the navigation.",
      "Open an order to view its current status, items, and fulfillment details.",
      "Guest checkout orders can still be viewed from the confirmation link you receive.",
    ],
    link: { href: "/my-orders", label: "My orders" },
  },
  {
    id: "appointments",
    title: "Request an appointment",
    summary: "Book services at salons and appointment-based businesses.",
    steps: [
      "On an appointment storefront, choose a service and tap Book appointment.",
      "Pick your preferred date and time, then submit your contact information.",
      "The business reviews your request and confirms or follows up with you by email.",
    ],
  },
];

export const businessOwnerWorkflows: HelpWorkflow[] = [
  {
    id: "list-business",
    title: "List your business",
    summary: "Apply to join the marketplace and get reviewed by the platform team.",
    steps: [
      "Sign in, then open List Your Business from the menu.",
      "Complete the application with your business name, category, contact info, and hours.",
      "Choose a subscription plan and submit for review.",
      "When approved, your storefront goes live and you gain access to the Business Hub.",
    ],
    link: { href: "/list-your-business", label: "Start application" },
  },
  {
    id: "business-hub",
    title: "Manage your Business Hub",
    summary: "Your dashboard for day-to-day operations after approval.",
    steps: [
      "Open Business Hub from the menu after you are signed in as a business owner.",
      "Use Overview for today's orders, revenue snapshot, and recent activity.",
      "Switch between businesses from the header if you manage more than one listing.",
    ],
    link: { href: "/dashboard/business", label: "Open Business Hub" },
  },
  {
    id: "catalog",
    title: "Products and menu",
    summary: "Build what customers see on your storefront.",
    steps: [
      "Add categories to organize your catalog in Business Hub → Categories.",
      "Create products with names, prices, descriptions, and images in Products.",
      "Changes appear on your public storefront once saved.",
    ],
    link: { href: "/dashboard/business/products", label: "Manage products" },
  },
  {
    id: "orders",
    title: "Orders and kitchen",
    summary: "Accept, prepare, and fulfill customer orders.",
    steps: [
      "New orders appear in Business Hub → Orders with live alerts for incoming requests.",
      "Update order status as you confirm, prepare, and mark ready for pickup or delivery.",
      "Use Kitchen for a focused prep view during busy periods.",
    ],
    link: { href: "/dashboard/business/orders", label: "View orders" },
  },
  {
    id: "appointments-manage",
    title: "Appointment requests",
    summary: "Review and respond to booking requests from customers.",
    steps: [
      "Incoming requests appear in Business Hub → Appointments.",
      "Confirm, decline, or complete appointments as your schedule allows.",
      "Customers receive email updates when you change appointment status.",
    ],
    link: { href: "/dashboard/business/appointments", label: "Manage appointments" },
  },
  {
    id: "settings",
    title: "Storefront and payments",
    summary: "Configure how customers interact with your business online.",
    steps: [
      "In Settings, choose ordering mode, appointment mode, or both.",
      "Set pickup and delivery options, hours, and customer-facing instructions.",
      "Connect Stripe in Payments to accept online card checkout.",
      "Food truck vendors can manage daily locations under Locations.",
    ],
    link: { href: "/dashboard/business/settings", label: "Business settings" },
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
    id: "appointment-confirmed",
    question: "Is my appointment confirmed when I submit a request?",
    answer:
      "Not automatically. You submit a request and the business confirms availability. Watch for an email update when they accept or respond.",
  },
];

export const businessOwnerFaqs: HelpFaq[] = [
  {
    id: "approval-time",
    question: "How long does application review take?",
    answer:
      "Review timing depends on the platform administrator. You can check application status on the List Your Business page while you wait.",
  },
  {
    id: "multiple-businesses",
    question: "Can I manage more than one business?",
    answer:
      "Yes. After approval, use the business switcher in the Business Hub header to move between listings you own.",
  },
  {
    id: "stripe-required",
    question: "Do I need Stripe for every business?",
    answer:
      "Stripe is required only for online card payments. Pay-at-pickup and appointment-only storefronts can operate without connecting Stripe.",
  },
];
