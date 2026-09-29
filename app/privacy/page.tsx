export const metadata = { title: "Privacy, HAECE" };

export default function Privacy() {
  return (
    <div className="prose">
      <span className="micro">Legal</span>
      <h1>Privacy.</h1>
      <p>We collect only what we need to run the house.</p>
      <h2>What we collect</h2>
      <ul>
        <li>Your email and shipping details, to fulfil your order.</li>
        <li>Payment details, processed securely by Stripe. We never see or store your card.</li>
        <li>Your email again, only if you join the list. One email per drop, nothing else.</li>
      </ul>
      <h2>What we never do</h2>
      <ul>
        <li>We never sell your data.</li>
        <li>We never share it except with the carriers and payment providers needed to fulfil your order.</li>
      </ul>
      <h2>Your rights</h2>
      <p>Write to us any time to see, correct, or delete what we hold about you.</p>
    </div>
  );
}
