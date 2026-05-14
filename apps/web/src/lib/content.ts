import { getR2Text, getR2Json } from './r2';
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';

export interface LessonMeta {
  title: string;
  chapter: number;
  lesson: number;
  prerequisites?: number[];
  notebooks?: Record<string, string>;
  estimatedMinutes?: number;
  tags?: string[];
}

export async function fetchLesson(category: string, slug: string) {
  const getCachedLesson = unstable_cache(
    async () => {
      const htmlKey = `content/${category}/${slug}.html`;
      const metaKey = `content/${category}/${slug}.meta.json`;

      const [html, meta] = await Promise.all([
        getR2Text(htmlKey),
        getR2Json<LessonMeta>(metaKey),
      ]);

      return { html, meta };
    },
    [`lesson:${category}:${slug}`],
    {
      revalidate: 3600,
      tags: [`lesson:${category}:${slug}`],
    }
  );

  const data = await getCachedLesson();
  
  if (!data.html || !data.meta) {
    notFound();
  }

  return data;
}
