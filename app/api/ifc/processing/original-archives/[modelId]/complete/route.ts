export async function POST(_: Request, { params }: { params: Promise<{ modelId: string }> }) {
  return Response.json({ modelId: (await params).modelId, ok: true });
}

