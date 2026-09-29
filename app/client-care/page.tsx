import sql, { getContent } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = { title: "Client Care, HAECE" };

export default async function ClientCare() {
  const email = await getContent("contact_email", "care@haece.com");
  return (
    <div className="prose">
      <span className="micro">Client Care</span>
      <h1>We are here.</h1>
      <p className="serif-lede">
        Questions about sizing, shipping, or your order. Write to us, a person replies.
      </p>
      <h2>Contact</h2>
      <p><strong>{email}</strong></p>
      <p>We reply within one business day, usually sooner.</p>
      <h2>Common questions</h2>
      <p><strong>How do I find my order?</strong><br />Use Find Your Order with your order number and email.</p>
      <p><strong>When will my piece ship?</strong><br />Pieces ship within 5 to 7 days of payment. You receive tracking the moment it leaves.</p>
      <p><strong>What if the fit is not right?</strong><br />60-day considered returns. We take it back, no questions, no forms.</p>
      <p><strong>Are duties really included?</strong><br />Yes. The price you pay is the final price, wherever you are.</p>
    </div>
  );
}
