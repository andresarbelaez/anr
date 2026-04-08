import { redirect } from "next/navigation";

/** Legacy list URL → home Releases window. */
export default function ReleasesRedirectPage() {
  redirect("/home?open=releases");
}
