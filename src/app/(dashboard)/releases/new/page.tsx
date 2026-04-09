import { redirect } from "next/navigation";

/** Legacy new-release URL → home Releases window (use in-app New release). */
export default function NewReleaseRedirectPage() {
  redirect("/home?open=releases");
}
