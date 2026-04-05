import { ListenFeedbackClient } from "@/components/feedback/ListenFeedbackClient";

export default async function ListenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="min-h-screen bg-black px-4 py-10 text-white">
      <ListenFeedbackClient token={token} />
    </div>
  );
}
