"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";

export default function FounderCarousel({ images, name }: { images: string[]; name: string }) {
  const [idx, setIdx] = useState(0);
  const touchX = useRef<number | null>(null);
  const n = images.length;
  const go = useCallback((d: number) => setIdx((i) => (i + d + n) % n), [n]);
  if (!n) return null;
  return (
    <div
      className="fcarousel"
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (dx > 40) go(-1);
        else if (dx < -40) go(1);
        touchX.current = null;
      }}
    >
      {images.map((src, i) => (
        <div key={src + i} className={`fslide${i === idx ? " on" : ""}`} aria-hidden={i !== idx}>
          <Image
            src={src}
            alt={i === 0 ? name : `${name}, view ${i + 1}`}
            fill
            sizes="(max-width: 900px) 100vw, 50vw"
            style={{ objectFit: "cover" }}
            priority={i === 0}
          />
        </div>
      ))}
      {n > 1 && (
        <>
          <button className="farrow left" onClick={() => go(-1)} aria-label="Previous image">
            &#8249;
          </button>
          <button className="farrow right" onClick={() => go(1)} aria-label="Next image">
            &#8250;
          </button>
          <div className="fcounter">
            <span>{String(idx + 1).padStart(2, "0")}</span>
            <span>/</span>
            <span>{String(n).padStart(2, "0")}</span>
          </div>
        </>
      )}
    </div>
  );
}
