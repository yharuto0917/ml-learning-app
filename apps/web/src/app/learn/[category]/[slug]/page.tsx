import { fetchLesson } from '@/lib/content';
import { LessonHeader } from '@/components/LessonHeader';
import { LessonFooter } from '@/components/LessonFooter';
import { notFound } from 'next/navigation';

export const dynamicParams = true;

interface PageProps {
  params: Promise<{ category: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { category, slug } = await params;
  try {
    const { meta } = await fetchLesson(category, slug);
    return { title: meta?.title ?? 'Not Found' };
  } catch (e) {
    return { title: 'Not Found' };
  }
}

export default async function LessonPage({ params }: PageProps) {
  const { category, slug } = await params;
  
  let html = '';
  let meta = null;

  try {
    const data = await fetchLesson(category, slug);
    html = data.html || '';
    meta = data.meta;
  } catch (e) {
    notFound();
  }

  return (
    <article className="prose max-w-none">
      <LessonHeader meta={meta!} />
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <LessonFooter />
    </article>
  );
}