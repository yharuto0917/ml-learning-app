import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function getR2Context() {
  const ctx = await getCloudflareContext({ async: true });
  return ctx.env.CONTENT_BUCKET;
}

export async function getR2Object(key: string) {
  const bucket = await getR2Context();
  return bucket.get(key);
}

export async function getR2Text(key: string) {
  const obj = await getR2Object(key);
  return obj ? obj.text() : null;
}

export async function getR2Json<T>(key: string): Promise<T | null> {
  const text = await getR2Text(key);
  return text ? JSON.parse(text) : null;
}
