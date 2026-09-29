export const metadata = { title: "Terms, HAECE" };

export default function Terms() {
  return (
    <div className="prose">
      <span className="micro">Legal</span>
      <h1>Terms.</h1>
      <p>By purchasing from Haece, you agree to the following.</p>
      <h2>Payment</h2>
      <p>All orders are paid in full in advance via Stripe. An order is confirmed only when payment succeeds. Failed or abandoned payments create no order and reserve no stock.</p>
      <h2>Pricing</h2>
      <p>Prices are in USD. Duties and taxes are included; the price at checkout is the final price.</p>
      <h2>Numbered editions</h2>
      <p>Pieces are sold as individually numbered units from limited runs. Edition numbers are assigned automatically and cannot be chosen.</p>
      <h2>Shipping</h2>
      <p>We ship worldwide within 5 to 7 days of payment. Delivery estimates are given in good faith; carriers may vary.</p>
      <h2>Returns</h2>
      <p>60-day returns on unworn pieces with labels attached. Refunds go to the original payment method.</p>
      <h2>Contact</h2>
      <p>For anything these terms do not cover, write to us. Fairness guides every decision we make.</p>
    </div>
  );
}
