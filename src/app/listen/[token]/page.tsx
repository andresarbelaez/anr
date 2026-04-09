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
      className="flex h-dvh min-h-0 flex-col overflow-hidden px-4 py-6 antialiased sm:py-8"
      style={{ background: S.bg, color: S.textPrimary }}
    >
      <ListenFeedbackClient token={token} />
    </div>
  );
}
