import { ListenFeedbackClient } from "@/components/feedback/ListenFeedbackClient";
import { S } from "@/components/studio/ui/s";

export default async function ListenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div
      className="min-h-screen px-4 py-10 antialiased"
      style={{ background: S.bg, color: S.textPrimary }}
    >
      <ListenFeedbackClient token={token} />
    </div>
  );
}
