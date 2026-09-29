export const metadata = { title: "Shipping and Returns, HAECE" };

export default function ShippingReturns() {
  return (
    <div className="prose">
      <span className="micro">Client Care</span>
      <h1>Shipping and returns.</h1>
      <h2>Shipping</h2>
      <ul>
        <li>Worldwide delivery via DHL, FedEx, or Aramex, 5 to 10 business days.</li>
        <li>Complimentary shipping on orders over $200.</li>
        <li>Duties and taxes included. The price at checkout is the final price.</li>
        <li>Tracking is sent the moment your piece leaves our hands.</li>
      </ul>
      <h2>Returns</h2>
      <ul>
        <li>60-day considered returns, no questions asked.</li>
        <li>Pieces must be unworn with labels attached.</li>
        <li>Write to us and we arrange the return label.</li>
        <li>Refunds are issued to the original payment method within 5 business days of arrival.</li>
      </ul>
      <h2>Numbered editions</h2>
      <p>
        Because each unit is individually numbered, exchanges are subject to availability of your size.
        If your size is gone, we refund in full.
      </p>
    </div>
  );
}
