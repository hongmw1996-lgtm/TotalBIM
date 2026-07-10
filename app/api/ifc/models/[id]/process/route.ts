export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  return Response.json({ id: (await params).id, queued: true });
}

