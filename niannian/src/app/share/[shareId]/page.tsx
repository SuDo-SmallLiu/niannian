import { redirect } from 'next/navigation';

/** 旧版分享链接 /share/{code} → 公开播放页 */
export default async function ShareRedirectPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  redirect(`/share/${shareId}/play`);
}
