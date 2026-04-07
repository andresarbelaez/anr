import { redirect } from "next/navigation";

/** Legacy assistant URL → studio Assistant window. */
export default function AssistantRedirectPage() {
  redirect("/studio?open=assistant");
}
