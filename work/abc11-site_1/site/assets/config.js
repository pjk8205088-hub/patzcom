// ===== PATZCOM store configuration =====
window.PATZCOM_CONFIG = {
  currency: "USD",
  // Payment credentials stay on the server. The cart reads readiness from /api/payments/config.
  paypalClientId: "",
  stripePublishableKey: "",
  paymentPriority: ["paypal", "stripe"],
  shippingFlat: 0,          // flat shipping fee added at checkout (USD)
  contactEmail: "support@patzcom.com"
};
