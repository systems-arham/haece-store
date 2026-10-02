"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usd } from "@/lib/format";
import { useCart } from "@/components/CartProvider";

type Variant = { id: number; sku: string; size: string; stock: number };

export default function ProductView({
  product,
  gallery,
  variants,
}: {
  product: {
    name: string;
    tagline: string;
    description: string;
    details: string[];
    priceCents: number;
    image: string;
    slug: string;
    preorder: boolean;
    preorderNote: string | null;
  };
  gallery: string[];
  variants: Variant[];
}) {
  const [img, setImg] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const { add } = useCart();

  const selected = variants.find((v) => v.size === size) || null;
  const soldOut = variants.every((v) => v.stock === 0);

  function addToBag() {
    if (!selected || selected.stock === 0) return;
    add(
      {
        sku: selected.sku,
        name: product.name,
        size: selected.size,
        priceCents: product.priceCents,
        image: product.image,
        slug: product.slug,
      },
      1
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  }

  return (
    <section className="product-page">
      <div>
        <div className="gallery-main">
          <Image
            src={gallery[img]}
            alt={product.name}
            width={900}
            height={1125}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            priority
          />
        </div>
        {gallery.length > 1 && (
          <div className="gallery-thumbs">
            {gallery.map((g, i) => (
              <button key={g + i} className={i === img ? "on" : ""} onClick={() => setImg(i)} aria-label={`View ${i + 1}`}>
                <Image src={g} alt="" width={200} height={200} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="product-info">
        <span className="micro">Drop 01</span>
        <h1>{product.name}</h1>
        {product.preorder && (
          <p style={{ marginTop: 10 }}>
            <span className="badge pending">Pre-order</span>
            {product.preorderNote && (
              <span style={{ fontSize: 13, color: "var(--muted)", marginLeft: 10 }}>{product.preorderNote}</span>
            )}
          </p>
        )}
        <p className="tagline">{product.tagline}</p>
        <p className="price">{usd(product.priceCents)}</p>
        <p className="desc">{product.description}</p>

        <div className="size-label">
          <span className="micro" style={{ color: "var(--ink)" }}>Select size</span>
          <Link href="/size-guide">Size guide</Link>
        </div>
        <div className="size-grid">
          {variants.map((v) => (
            <button
              key={v.sku}
              disabled={v.stock === 0}
              className={size === v.size ? "on" : ""}
              onClick={() => setSize(v.size)}
            >
              {v.size}
            </button>
          ))}
        </div>

        <button className="add-bag" disabled={!selected || selected.stock === 0 || soldOut} onClick={addToBag}>
          {soldOut ? "Sold out" : added ? "Added to bag" : selected ? `${product.preorder ? "Pre-order" : "Add to bag"}, ${usd(product.priceCents)}` : "Select a size"}
        </button>
        {!soldOut && (
          <p className="edition-note">
            {selected
              ? selected.stock <= 10
                ? `Only ${selected.stock} left in ${selected.size}`
                : "Individually numbered edition of 300"
              : "Individually numbered edition of 300"}
          </p>
        )}

        <div className="acc">
          <details className="acc-item" open>
            <summary>Details <span>+</span></summary>
            <div className="acc-body">
              <ul style={{ marginLeft: 18 }}>
                {(product.details || []).map((d, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>{d}</li>
                ))}
              </ul>
            </div>
          </details>
          <details className="acc-item">
            <summary>Shipping <span>+</span></summary>
            <div className="acc-body">
              Worldwide shipping with duties included. Complimentary shipping on orders over $200.
              Pieces are made to order in limited runs and ship within 5 to 7 days.
            </div>
          </details>
          <details className="acc-item">
            <summary>Returns <span>+</span></summary>
            <div className="acc-body">
              60-day considered returns. If the piece is not right, we take it back, no questions, no forms.
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}
