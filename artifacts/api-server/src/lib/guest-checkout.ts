export type GuestOrderContactInput = {
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  fulfillmentType: "PICKUP" | "DELIVERY" | string;
  deliveryAddress?: string | null;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[\d\s()+-]{7,20}$/;

export function validateGuestOrderContact(
  input: GuestOrderContactInput,
): { ok: true } | { ok: false; error: string } {
  const name = input.customerName.trim();
  if (!name) {
    return { ok: false, error: "Customer name is required." };
  }

  const email = input.customerEmail.trim();
  if (!email) {
    return { ok: false, error: "Email is required for order updates." };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const phone = input.customerPhone?.trim() ?? "";
  if (!phone) {
    return { ok: false, error: "Phone number is required." };
  }
  if (!PHONE_PATTERN.test(phone)) {
    return { ok: false, error: "Enter a valid phone number." };
  }

  if (input.fulfillmentType === "DELIVERY") {
    const address = input.deliveryAddress?.trim() ?? "";
    if (!address) {
      return { ok: false, error: "Delivery address is required." };
    }
  }

  return { ok: true };
}
