export const metadata = { title: "Craft, HAECE" };

const details = [
  { n: "01", t: "Considered silhouette", d: "Every piece starts on paper, not in a trend forecast. Proportions are tested on real bodies until the drape is right." },
  { n: "02", t: "Heavyweight fabrics", d: "Brushed fleece, technical knits, dense cottons. Fabrics chosen to hold their shape for years, not seasons." },
  { n: "03", t: "The embroidered mark", d: "A single haece. mark, embroidered at the chest. Placed once, never repeated, never enlarged." },
  { n: "04", t: "Tailoring details", d: "Barrel cuffs with buttons on a hoodie. A hidden placket on a layer. A sharp pleat on a trouser. Details you feel before you see." },
  { n: "05", t: "Numbered editions", d: "Each unit carries its edition number, like 047 / 300. Limited runs, individually tracked from our shelf to your door." },
];

export default function Craft() {
  return (
    <div className="prose">
      <span className="micro">Craft</span>
      <h1>Details you feel before you see.</h1>
      <p className="serif-lede">
        Minimalism is unforgiving. With nothing to hide behind, every seam has to earn its place.
      </p>
      {details.map((x) => (
        <div key={x.n} style={{ marginBottom: 30 }}>
          <h2><span className="micro" style={{ display: "inline", marginRight: 12 }}>{x.n}</span>{x.t}</h2>
          <p>{x.d}</p>
        </div>
      ))}
    </div>
  );
}
