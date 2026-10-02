import { getCopy } from "@/lib/copy";
import BagClient from "./BagClient";

export const dynamic = "force-dynamic";

export default async function BagPage() {
  const copy = await getCopy(["copy_bag_empty_heading", "copy_bag_empty_sub"]);
  return <BagClient copy={copy} />;
}
