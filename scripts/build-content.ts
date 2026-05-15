import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import { processMdx } from './lib/mdx-pipeline.js';

interface ChapterDef {
  id: number;
  slug: string;
  title: string;
  description: string;
}

interface LessonNotebooksMeta {
  lesson?: string;
  practice?: string;
  solution?: string;
}

interface LessonEntry {
  category: string;
  slug: string;
  title: string;
  chapter: number;
  lesson: number;
  estimatedMinutes?: number;
  tags?: string[];
  notebooks?: LessonNotebooksMeta;
}

async function main() {
  const contentDir = path.resolve('content');
  const distDir = path.resolve('dist/content');

  const chaptersRaw = await fs.readFile(
    path.join(contentDir, '_chapters.json'),
    'utf-8'
  );
  const chapters: ChapterDef[] = JSON.parse(chaptersRaw);

  const files = await fg('**/*.mdx', { cwd: contentDir });
  const lessons: LessonEntry[] = [];

  for (const file of files) {
    const filePath = path.join(contentDir, file);
    const content = await fs.readFile(filePath, 'utf-8');

    const { data: meta, content: mdxContent } = matter(content);

    const html = await processMdx(mdxContent);

    const category = path.dirname(file);
    const slug = path.basename(file, '.mdx');

    const outDir = path.join(distDir, category);
    await fs.mkdir(outDir, { recursive: true });

    const htmlPath = path.join(outDir, `${slug}.html`);
    const metaPath = path.join(outDir, `${slug}.meta.json`);

    await fs.writeFile(htmlPath, html, 'utf-8');
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');

    lessons.push({
      category,
      slug,
      title: meta.title,
      chapter: meta.chapter,
      lesson: meta.lesson,
      estimatedMinutes: meta.estimatedMinutes,
      tags: meta.tags,
      notebooks: meta.notebooks,
    });

    console.log(`Built: ${category}/${slug}`);
  }

  const index = {
    chapters: chapters.map((ch) => ({
      ...ch,
      lessons: lessons
        .filter((l) => l.chapter === ch.id)
        .sort((a, b) => a.lesson - b.lesson),
    })),
  };

  await fs.mkdir(distDir, { recursive: true });
  await fs.writeFile(
    path.join(distDir, '_index.json'),
    JSON.stringify(index, null, 2),
    'utf-8'
  );
  console.log(`Built: _index.json (${index.chapters.length} chapters, ${lessons.length} lessons)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
