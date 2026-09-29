import Link from "next/link";
import Image from "next/image";
import { usd } from "@/lib/format";

export type CardProduct = {
  id: number;
  name: string;
  slug: string;
  tagline: string;
  price_cents: number;
  image: string;
};

export default function ProductCard({ product }: { product: CardProduct }) {
  return (
    <Link href={`/product/${product.slug}`} className="card">
      <div className="img-wrap">
        <Image src={product.image} alt={product.name} width={600} height={750} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div className="card-meta">
        <div>
          <span className="name">{product.name}</span>
          <span className="sub">{product.tagline}</span>
        </div>
        <span className="price">{usd(product.price_cents)}</span>
      </div>
    </Link>
  );
}
