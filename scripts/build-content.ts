import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import { processMdx } from './lib/mdx-pipeline.js';

async function main() {
  const contentDir = path.resolve('content');
  const distDir = path.resolve('dist/content');

  const files = await fg('**/*.mdx', { cwd: contentDir });

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
    
    console.log(`Built: ${category}/${slug}`);
  }
}

main().catch(console.error);