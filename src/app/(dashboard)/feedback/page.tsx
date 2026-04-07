import { redirect } from "next/navigation";

/** Legacy list route → studio feedback micro-app (list view). */
export default function FeedbackListRedirectPage() {
  redirect("/studio?open=feedback");
}
