import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeShiki from '@shikijs/rehype';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';

function remarkMdxToIsland() {
  return (tree: any) => {
    visit(tree, ['mdxJsxFlowElement', 'mdxJsxTextElement'], (node: any) => {
      const componentName = node.name;
      if (componentName) {
        node.type = 'html';
        const props = node.attributes.reduce((acc: any, attr: any) => {
          if (attr.type === 'mdxJsxAttribute') {
            acc[attr.name] = attr.value;
          }
          return acc;
        }, {});
        node.value = `<div data-island="${componentName}" data-props='${JSON.stringify(props)}'></div>`;
      }
    });
  };
}

export async function processMdx(content: string) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(remarkMdxToIsland)
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeKatex)
    .use(rehypeShiki, {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      langs: ['python', 'bash', 'json', 'tsx'],
    })
    .use(rehypeStringify, { allowDangerousHtml: true });

  const file = await processor.process(content);
  return String(file);
}