import { getCopy } from "@/lib/copy";
import TrackOrderClient from "./TrackOrderClient";

export const dynamic = "force-dynamic";

export default async function TrackOrder() {
  const copy = await getCopy(["copy_track_heading", "copy_track_lede"]);
  return <TrackOrderClient copy={copy} />;
}
