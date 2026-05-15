import { ImageResponse } from 'next/og';
import { fetchLesson } from '@/lib/content';

export const runtime = 'edge';
export const alt = 'ML Learning · Lesson';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface ImageProps {
  params: Promise<{ category: string; slug: string }>;
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
          fontFamily:
            '"Helvetica Neue", Helvetica, Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", system-ui, sans-serif',
        }}
      >
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
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
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
            fontWeight: 300,
          }}
        >
          <span style={{ display: 'flex' }}>
            <span style={{ fontWeight: 600, color: '#18181b' }}>
              ML Learning
            </span>
            <span style={{ marginLeft: 12, color: '#a1a1aa' }}>
              from Scratch
            </span>
          </span>
          {estimatedMinutes > 0 && (
            <span style={{ display: 'flex' }}>{`${estimatedMinutes} min read`}</span>
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
