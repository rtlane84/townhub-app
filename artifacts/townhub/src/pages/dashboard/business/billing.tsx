import { Redirect } from "wouter";

/** Legacy route — subscription details moved to /dashboard/business/subscription */
export default function BusinessBilling() {
  return <Redirect to="/dashboard/business/subscription" />;
}
