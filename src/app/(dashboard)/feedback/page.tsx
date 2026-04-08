import { redirect } from "next/navigation";

/** Legacy list route → home feedback micro-app (list view). */
export default function FeedbackListRedirectPage() {
  redirect("/home?open=feedback");
}
