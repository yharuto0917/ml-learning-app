import { ImageResponse } from 'next/og';
import { fetchLesson } from '@/lib/content';

export const runtime = 'edge';
export const alt = 'ML Learning · Lesson';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface ImageProps {
  params: Promise<{ category: string; slug: string }>;
}

// Google Fonts CSS API から必要な文字のみの subset woff2 を取得し ArrayBuffer で返す。
// edge runtime / Cloudflare Workers での日本語表示には Satori にフォントを渡す必要がある。
async function loadGoogleFont(
  family: string,
  weight: number,
  text: string
): Promise<ArrayBuffer> {
  const params = new URLSearchParams({
    family: `${family}:wght@${weight}`,
    text,
  });
  const cssRes = await fetch(
    `https://fonts.googleapis.com/css2?${params.toString()}`,
    {
      headers: {
        // モダンブラウザ UA を渡すと CSS に woff2 URL が含まれる(古いブラウザだと ttf になる)
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
      },
    }
  );
  if (!cssRes.ok) {
    throw new Error(`Google Fonts CSS fetch failed: ${cssRes.status}`);
  }
  const css = await cssRes.text();
  const match = css.match(/src:\s*url\(([^)]+)\)\s*format\(['"]woff2['"]\)/);
  if (!match) {
    throw new Error('woff2 URL not found in CSS');
  }
  const fontRes = await fetch(match[1]);
  if (!fontRes.ok) {
    throw new Error(`Font file fetch failed: ${fontRes.status}`);
  }
  return fontRes.arrayBuffer();
}

export default async function OgImage({ params }: ImageProps) {
  const { category, slug } = await params;

  let title = 'Not Found';
  let chapter = 0;
  let lesson = 0;
  let estimatedMinutes = 0;
  let tags: string[] = [];

  try {
    const { meta } = await fetchLesson(category, slug);
    if (meta) {
      title = meta.title;
      chapter = meta.chapter;
      lesson = meta.lesson;
      estimatedMinutes = meta.estimatedMinutes ?? 0;
      tags = meta.tags ?? [];
    }
  } catch {
    // R2 unavailable など。フォールバックの "Not Found" 表示で続行
  }

  // フォントの subset 取得は描画する文字のみで十分(数 KB)
  const subsetText = [
    title,
    tags.join(''),
    'ML Learning · from Scratch min read Chapter Lesson Not Found',
    '0123456789#',
  ].join('');

  let fontBold: ArrayBuffer | null = null;
  let fontRegular: ArrayBuffer | null = null;
  try {
    [fontBold, fontRegular] = await Promise.all([
      loadGoogleFont('Noto Sans JP', 700, subsetText),
      loadGoogleFont('Noto Sans JP', 400, subsetText),
    ]);
  } catch (e) {
    console.error('[og] failed to load Noto Sans JP, falling back to no-font:', e);
    // フォント取得失敗時は ImageResponse のデフォルト挙動に任せる(英数字は描画されるが日本語は豆腐になる)
  }

  const showChapterLine = chapter > 0 && lesson > 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#fafafa',
          padding: '80px',
          color: '#18181b',
          fontFamily: 'Noto Sans JP',
        }}
      >
        {showChapterLine && (
          <div
            style={{
              display: 'flex',
              fontSize: 20,
              letterSpacing: 6,
              color: '#71717a',
              fontWeight: 700,
              textTransform: 'uppercase',
              marginBottom: 32,
            }}
          >
            {`Chapter ${chapter} · Lesson ${lesson}`}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            fontSize: 88,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: -2,
            flex: 1,
            wordBreak: 'break-word',
          }}
        >
          {title}
        </div>

        {tags.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 16,
              marginBottom: 20,
              fontSize: 20,
              color: '#a1a1aa',
            }}
          >
            {tags.slice(0, 4).map((t) => (
              <span key={t}>{`#${t}`}</span>
            ))}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            borderTop: '1px solid #e4e4e7',
            paddingTop: 32,
            fontSize: 24,
            color: '#52525b',
            fontWeight: 400,
          }}
        >
          <span style={{ display: 'flex' }}>
            <span style={{ fontWeight: 700, color: '#18181b' }}>ML Learning</span>
            <span style={{ marginLeft: 12, color: '#a1a1aa' }}>from Scratch</span>
          </span>
          {estimatedMinutes > 0 && (
            <span style={{ display: 'flex' }}>{`${estimatedMinutes} min read`}</span>
          )}
        </div>
      </div>
    ),
    {
      ...size,
      fonts:
        fontBold && fontRegular
          ? [
              {
                name: 'Noto Sans JP',
                data: fontBold,
                style: 'normal',
                weight: 700,
              },
              {
                name: 'Noto Sans JP',
                data: fontRegular,
                style: 'normal',
                weight: 400,
              },
            ]
          : undefined,
    }
  );
}
