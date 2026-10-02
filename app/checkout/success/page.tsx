import { Suspense } from "react";
import { getCopy } from "@/lib/copy";
import SuccessInner from "./SuccessInner";

export const dynamic = "force-dynamic";

export default async function SuccessPage() {
  const copy = await getCopy(["copy_success_heading", "copy_success_sub", "copy_success_cta"]);
  return (
    <Suspense>
      <SuccessInner copy={copy} />
    </Suspense>
  );
}
