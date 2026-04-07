import { redirect } from "next/navigation";

/** Legacy list URL → studio Releases window. */
export default function ReleasesRedirectPage() {
  redirect("/studio?open=releases");
}
