'use client';

import { useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Callout } from './Callout';
import { ColabCTA } from './ColabCTA';

const COMPONENT_MAP: Record<string, React.ComponentType<any>> = {
  Callout,
  ColabCTA,
};

export function IslandRoot() {
  useEffect(() => {
    const islands = Array.from(
      document.querySelectorAll<HTMLElement>('[data-island]')
    );
    const roots: Root[] = [];

    for (const el of islands) {
      const name = el.getAttribute('data-island');
      if (!name) continue;
      const Component = COMPONENT_MAP[name];
      if (!Component) {
        console.warn(`[island] unknown component: ${name}`);
        continue;
      }

      let props: Record<string, unknown> = {};
      const propsAttr = el.getAttribute('data-props');
      if (propsAttr) {
        try {
          props = JSON.parse(propsAttr);
        } catch (e) {
          console.warn(`[island] failed to parse props for ${name}`, e);
        }
      }

      const innerHtml = el.innerHTML.trim();
      el.innerHTML = '';

      const root = createRoot(el);
      root.render(
        innerHtml ? (
          <Component {...props}>
            <div dangerouslySetInnerHTML={{ __html: innerHtml }} />
          </Component>
        ) : (
          <Component {...props} />
        )
      );
      roots.push(root);
    }

    return () => {
      for (const root of roots) {
        root.unmount();
      }
    };
  }, []);

  return null;
}
