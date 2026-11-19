export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      version: process.env.NEXT_PUBLIC_APP_VERSION,
      sha: process.env.NEXT_PUBLIC_COMMIT_SHA,
      builtAt: process.env.NEXT_PUBLIC_BUILT_AT,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
