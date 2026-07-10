export async function POST(_: Request, { params }: { params: Promise<{ jobId: string }> }) {
  return Response.json({ jobId: (await params).jobId, ok: true });
}

