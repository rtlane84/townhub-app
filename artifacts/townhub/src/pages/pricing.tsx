import { Redirect } from "wouter";

/** Pricing lives on the List Your Business page for prospective owners. */
export default function Pricing() {
  return <Redirect to="/list-your-business#plans" />;
}
