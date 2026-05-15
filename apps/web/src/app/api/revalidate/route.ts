import { revalidateTag } from 'next/cache';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const runtime = 'edge';

interface RevalidateBody {
  tags?: unknown;
}

// 文字列の constant-time 比較。length 自体は早 return するが、secret の長さは
// 公知化しても問題ないため許容(中身のバイト比較は等時間)。
// `node:crypto` の `timingSafeEqual` は edge runtime + Workers の bundler 相性が
// 不安定なので、Web Crypto に依存しない手書き実装を採用。
function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const secret = (env as unknown as Record<string, unknown>)
    .REVALIDATE_SECRET as string | undefined;

  if (!secret) {
    return Response.json(
      { error: 'REVALIDATE_SECRET is not configured on the worker' },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const provided = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!timingSafeEqualStr(provided, secret)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: RevalidateBody;
  try {
    body = (await request.json()) as RevalidateBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (
    !Array.isArray(body.tags) ||
    body.tags.length === 0 ||
    !body.tags.every((t) => typeof t === 'string')
  ) {
    return Response.json(
      { error: '`tags` must be a non-empty array of strings' },
      { status: 400 }
    );
  }

  const tags = body.tags as string[];
  for (const tag of tags) {
    revalidateTag(tag, 'default');
  }

  return Response.json({ revalidated: tags, count: tags.length });
}
