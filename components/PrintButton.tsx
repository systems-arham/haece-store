"use client";

export default function PrintButton() {
  return (
    <button className="btn-dark no-print" onClick={() => window.print()} style={{ marginBottom: 24 }}>
      Print this list
    </button>
  );
}
