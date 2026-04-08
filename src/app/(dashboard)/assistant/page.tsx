import { redirect } from "next/navigation";

/** Legacy assistant URL → home Assistant window. */
export default function AssistantRedirectPage() {
  redirect("/home?open=assistant");
}
