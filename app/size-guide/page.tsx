export const metadata = { title: "Size Guide, HAECE" };

const rows = [
  ["XS", "84", "64", "62"],
  ["S", "88", "66", "63"],
  ["M", "94", "68", "64"],
  ["L", "100", "70", "65"],
  ["XL", "106", "72", "66"],
  ["XXL", "112", "74", "67"],
];

export default function SizeGuide() {
  return (
    <div className="prose">
      <span className="micro">Client Care</span>
      <h1>Size guide.</h1>
      <p className="serif-lede">Measured in centimeters, on the garment laid flat.</p>
      <table className="size-table">
        <thead>
          <tr><th>Size</th><th>Chest</th><th>Length</th><th>Sleeve</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]}><td><strong>{r[0]}</strong></td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td></tr>
          ))}
        </tbody>
      </table>
      <h2>Fit notes</h2>
      <p><strong>The Founder Coat</strong> is cut boxy. Take your usual size for the intended drape, or size down for a closer fit.</p>
      <p><strong>The Atlas Vest (men's)</strong> is a straight cut. <strong>The Atlas Vest (women's)</strong> is tailored and runs closer to the body.</p>
      <p><strong>Onyx Layer</strong> and <strong>The Uniform Tee</strong> are true to size with a relaxed shoulder.</p>
      <p><strong>The Pleated Trouser</strong> is wide leg with a tailored waistband. Take your usual waist size.</p>
      <p>Between sizes, or unsure. Write to us and we will guide you honestly.</p>
    </div>
  );
}
