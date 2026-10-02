import Link from "next/link";

export default function Footer() {
  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="wordmark">haece.</span>
          <p>Premium founder wear. Designed slowly, made properly, shipped worldwide.</p>
        </div>
        <div className="footer-col">
          <span className="micro">Collection</span>
          <Link href="/drop-01">Drop 01</Link>
          <Link href="/drop-01">All pieces</Link>
        </div>
        <div className="footer-col">
          <span className="micro">The House</span>
          <Link href="/house">Our story</Link>
          <Link href="/craft">Craft</Link>
        </div>
        <div className="footer-col">
          <span className="micro">Client Care</span>
          <Link href="/shipping-returns">Shipping and returns</Link>
          <Link href="/size-guide">Size guide</Link>
          <Link href="/track-order">Find your order</Link>
          <Link href="/client-care">Contact</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>haece., 2026. All rights reserved.</span>
        <div className="legal">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
        </div>
      </div>
    </footer>
  );
}
