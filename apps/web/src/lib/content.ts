import { getR2Text, getR2Json } from './r2';
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';

export interface LessonNotebooks {
  lesson?: string;
  practice?: string;
  solution?: string;
}

export interface LessonMeta {
  title: string;
  chapter: number;
  lesson: number;
  prerequisites?: Array<number | string>;
  notebooks?: LessonNotebooks;
  estimatedMinutes?: number;
  tags?: string[];
}

export interface LessonEntry {
  category: string;
  slug: string;
  title: string;
  chapter: number;
  lesson: number;
  estimatedMinutes?: number;
  tags?: string[];
  notebooks?: LessonNotebooks;
}

export interface ChapterEntry {
  id: number;
  slug: string;
  title: string;
  description: string;
  lessons: LessonEntry[];
}

export interface LearnIndex {
  chapters: ChapterEntry[];
}

export async function fetchIndex(): Promise<LearnIndex | null> {
  const getCachedIndex = unstable_cache(
    async () => getR2Json<LearnIndex>('content/_index.json'),
    ['learn-index'],
    {
      revalidate: 3600,
      tags: ['learn-index'],
    }
  );

  return getCachedIndex();
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
