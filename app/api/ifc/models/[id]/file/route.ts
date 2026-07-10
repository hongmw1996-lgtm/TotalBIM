export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  return Response.json({ id: (await params).id, file: null });
}

