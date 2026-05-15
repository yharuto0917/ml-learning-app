import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeShiki from '@shikijs/rehype';
import rehypeStringify from 'rehype-stringify';
import type { Element } from 'hast';
import type { Handler, State } from 'mdast-util-to-hast';
import type {
  MdxJsxAttribute,
  MdxJsxExpressionAttribute,
  MdxJsxFlowElement,
  MdxJsxTextElement,
} from 'mdast-util-mdx-jsx';

const BLOCK_ONLY_COMPONENTS = new Set(['Callout', 'ColabCTA']);

function attributesToProps(
  componentName: string,
  attributes: Array<MdxJsxAttribute | MdxJsxExpressionAttribute> = []
): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const attr of attributes) {
    if (attr.type === 'mdxJsxAttribute') {
      props[attr.name] = attr.value;
    } else {
      console.warn(
        `[mdx-pipeline] <${componentName}>: expression attribute (\`${attr.value ?? ''}\`) is not supported and will be skipped`
      );
    }
  }
  return props;
}

function mdxJsxToHastElement(defaultTagName: 'div' | 'span'): Handler {
  return (state: State, node: MdxJsxFlowElement | MdxJsxTextElement) => {
    const componentName = node.name;
    if (!componentName) {
      return state.all(node);
    }

    let tagName: 'div' | 'span' = defaultTagName;
    if (
      defaultTagName === 'span' &&
      BLOCK_ONLY_COMPONENTS.has(componentName)
    ) {
      console.warn(
        `[mdx-pipeline] <${componentName}> is block-only but appears inline; emitting as <div>. Wrap with blank lines around the tag to make it a proper block.`
      );
      tagName = 'div';
    }

    const element: Element = {
      type: 'element',
      tagName,
      properties: {
        'data-island': componentName,
        'data-props': JSON.stringify(
          attributesToProps(componentName, node.attributes)
        ),
      },
      children: state.all(node) as Element['children'],
    };
    return element;
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
