export async function POST() {
  return Response.json({ ok: true, provider: 'google-drive' });
}

