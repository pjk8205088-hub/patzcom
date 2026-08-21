// ===== PATZCOM store configuration =====
window.PATZCOM_CONFIG = {
  currency: "USD",
  // Enter your PayPal LIVE client ID here to enable real payments.
  // Get it at https://developer.paypal.com/dashboard  → Apps & Credentials → Live
  paypalClientId: "",       // e.g. "AZ1abc...xyz"
  // Stripe card checkout is planned as the second payment option after review.
  // Add publishable/server keys only when the Stripe integration is implemented.
  stripePublishableKey: "",
  paymentPriority: ["paypal", "stripe"],
  shippingFlat: 0,          // flat shipping fee added at checkout (USD)
  contactEmail: "support@patzcom.com"
};
