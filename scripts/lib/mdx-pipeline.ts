import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeShiki from '@shikijs/rehype';
import rehypeStringify from 'rehype-stringify';

function attributesToProps(attributes: any[] = []): Record<string, unknown> {
  return attributes.reduce<Record<string, unknown>>((acc, attr) => {
    if (attr.type === 'mdxJsxAttribute') {
      acc[attr.name] = attr.value;
    }
    return acc;
  }, {});
}

function mdxJsxToHastElement(tagName: 'div' | 'span') {
  return (state: any, node: any) => {
    const componentName = node.name;
    if (!componentName) {
      return state.all(node);
    }
    return {
      type: 'element',
      tagName,
      properties: {
        'data-island': componentName,
        'data-props': JSON.stringify(attributesToProps(node.attributes)),
      },
      children: state.all(node),
    };
  };
}

export async function processMdx(content: string) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(remarkMath)
    .use(remarkRehype, {
      allowDangerousHtml: true,
      handlers: {
        mdxJsxFlowElement: mdxJsxToHastElement('div'),
        mdxJsxTextElement: mdxJsxToHastElement('span'),
      },
    })
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
