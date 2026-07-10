export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string; derivativeId: string }> }
) {
  const { id, derivativeId } = await params;
  return Response.json({ id, derivativeId, file: null });
}

