import path from 'node:path';
import fg from 'fast-glob';
import { execa } from 'execa';

function contentTypeFor(file: string): string {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}

function tagFor(key: string): string | null {
  // key examples:
  //   content/numpy/1.1-ndarray.html  -> lesson:numpy:1.1-ndarray
  //   content/numpy/1.1-ndarray.meta.json -> lesson:numpy:1.1-ndarray
  //   content/_index.json -> learn-index
  if (key === 'content/_index.json') return 'learn-index';

  const m = key.match(/^content\/([^/]+)\/(.+?)(\.meta)?\.(html|json)$/);
  if (m) {
    const [, category, slug] = m;
    return `lesson:${category}:${slug}`;
  }
  return null;
}

async function triggerRevalidate(tags: string[]) {
  const url = process.env.REVALIDATE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!url || !secret) {
    console.log(
      '[revalidate] skipping (REVALIDATE_URL or REVALIDATE_SECRET not set)'
    );
    return;
  }
  if (tags.length === 0) {
    console.log('[revalidate] no tags to revalidate');
    return;
  }

  console.log(`[revalidate] POST ${url}  tags=${tags.join(',')}`);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ tags }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`[revalidate] failed: ${res.status} ${text}`);
    process.exit(1);
  }
  const json = (await res.json().catch(() => ({}))) as {
    revalidated?: string[];
    count?: number;
  };
  console.log(
    `[revalidate] ok: ${json.count ?? tags.length} tag(s) invalidated`
  );
}

async function main() {
  const args = process.argv.slice(2);
  const isLocal = args.includes('--local');

  const distDir = path.resolve('dist/content');
  const files = await fg('**/*.{html,json}', { cwd: distDir });

  if (files.length === 0) {
    console.error(
      'dist/content is empty. Run `pnpm content:build` first.'
    );
    process.exit(1);
  }

  const cwd = path.resolve('apps/web');
  const tags = new Set<string>();

  for (const file of files) {
    const filePath = path.join(distDir, file);
    const key = `content/${file}`;
    const contentType = contentTypeFor(file);

    const cmdArgs = [
      'exec',
      'wrangler',
      'r2',
      'object',
      'put',
      `ml-learning-content/${key}`,
      `--file=${filePath}`,
      `--content-type=${contentType}`,
    ];
    if (isLocal) cmdArgs.push('--local');

    console.log(`Uploading: ${key} ${isLocal ? '(local)' : ''}`);
    try {
      await execa('pnpm', cmdArgs, { cwd, stdio: 'inherit' });
    } catch (e) {
      console.error(`Failed to upload ${key}:`, e);
      process.exit(1);
    }

    const tag = tagFor(key);
    if (tag) tags.add(tag);
  }

  if (isLocal) {
    console.log('[revalidate] skipping in --local mode');
    return;
  }

  await triggerRevalidate([...tags]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
