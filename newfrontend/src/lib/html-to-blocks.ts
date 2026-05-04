import type { TemplateBlock } from '@/types/template';
import { DEFAULT_BLOCK_PROPS } from '@/types/template';
import { v4Fallback } from '@/lib/id';

function mkText(html: string): TemplateBlock {
  return { id: v4Fallback(), type: 'text', props: { ...DEFAULT_BLOCK_PROPS.text, content: html } };
}

function mkImage(src: string, alt: string, hyperlink = ''): TemplateBlock {
  return {
    id: v4Fallback(), type: 'image',
    props: { ...DEFAULT_BLOCK_PROPS.image, src, alt, hyperlink },
  };
}

function mkButton(text: string, url: string, bgColor: string, textColor: string): TemplateBlock {
  return {
    id: v4Fallback(), type: 'button',
    props: {
      ...DEFAULT_BLOCK_PROPS.button, text, url,
      bgColor: bgColor || DEFAULT_BLOCK_PROPS.button.bgColor,
      textColor: textColor || DEFAULT_BLOCK_PROPS.button.textColor,
    },
  };
}

function mkDivider(): TemplateBlock {
  return { id: v4Fallback(), type: 'divider', props: { ...DEFAULT_BLOCK_PROPS.divider } };
}

function mkSpacer(): TemplateBlock {
  return { id: v4Fallback(), type: 'spacer', props: { height: 16 } };
}

function isButtonLike(el: HTMLElement): boolean {
  const s = el.style;
  if (s.backgroundColor && s.backgroundColor !== 'transparent' && s.backgroundColor !== '') return true;
  if (s.display === 'inline-block' && s.padding) return true;
  const cls = (el.className || '').toLowerCase();
  if (typeof cls === 'string' && (cls.includes('button') || cls.includes('btn') || cls.includes('cta'))) return true;
  return false;
}

function processNodes(nodes: ChildNode[]): TemplateBlock[] {
  const blocks: TemplateBlock[] = [];
  const textBuf: string[] = [];

  const flush = () => {
    if (textBuf.length) { blocks.push(mkText(textBuf.join('\n'))); textBuf.length = 0; }
  };

  for (const node of nodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent?.trim();
      if (t) textBuf.push(`<p>${t}</p>`);
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === 'hr') { flush(); blocks.push(mkDivider()); continue; }

    if (tag === 'img') {
      flush();
      blocks.push(mkImage(el.getAttribute('src') || '', el.alt || ''));
      continue;
    }

    if (tag === 'a') {
      const a = el as HTMLAnchorElement;
      const img = a.querySelector('img');
      if (img) { flush(); blocks.push(mkImage(img.getAttribute('src') || '', img.alt || '', a.getAttribute('href') || '')); continue; }
      if (isButtonLike(el)) {
        flush();
        blocks.push(mkButton(el.textContent?.trim() || 'Clique aqui', a.getAttribute('href') || '#', a.style.backgroundColor, a.style.color));
        continue;
      }
      textBuf.push(el.outerHTML);
      continue;
    }

    if (['p','h1','h2','h3','h4','h5','h6','ul','ol','blockquote','pre'].includes(tag)) {
      const imgChild = el.querySelector(':scope > img');
      if (imgChild && el.children.length === 1) { flush(); blocks.push(mkImage(imgChild.getAttribute('src') || '', imgChild.alt || '')); continue; }
      const aChild = el.querySelector(':scope > a');
      if (aChild) {
        const imgIn = aChild.querySelector('img');
        if (imgIn && aChild.children.length === 1 && el.children.length === 1) {
          flush(); blocks.push(mkImage(imgIn.getAttribute('src') || '', imgIn.alt || '', aChild.getAttribute('href') || ''));
          continue;
        }
        if (isButtonLike(aChild as HTMLElement) && el.children.length === 1) {
          flush();
          blocks.push(mkButton(aChild.textContent?.trim() || 'Clique aqui', aChild.getAttribute('href') || '#', (aChild as HTMLElement).style.backgroundColor, (aChild as HTMLElement).style.color));
          continue;
        }
      }
      textBuf.push(el.outerHTML);
      continue;
    }

    if (tag === 'table') {
      const rows = el.querySelectorAll(':scope > tbody > tr, :scope > tr');
      if (rows.length === 1) {
        const cells = Array.from(rows[0].querySelectorAll(':scope > td, :scope > th'));
        if (cells.length >= 2 && cells.length <= 4) {
          flush();
          const children: TemplateBlock[] = cells.map(c => processNodes(Array.from(c.childNodes))[0] ?? mkSpacer());
          blocks.push({ id: v4Fallback(), type: 'columns', props: { ...DEFAULT_BLOCK_PROPS.columns, columns: cells.length }, children });
          continue;
        }
      }
      flush();
      blocks.push({ id: v4Fallback(), type: 'html', props: { code: el.outerHTML } });
      continue;
    }

    if (['div','section','article','header','footer','main','center'].includes(tag)) {
      if (!el.textContent?.trim() && !el.querySelector('img')) continue;
      const directDivs = Array.from(el.children).filter(c => ['div','td'].includes(c.tagName.toLowerCase()));
      if (directDivs.length >= 2 && directDivs.length <= 4 && directDivs.length === el.children.length) {
        const isCols = directDivs.some(c => {
          const s = (c as HTMLElement).style;
          return s.float || s.display === 'inline-block' || s.width || s.maxWidth || s.flex;
        });
        if (isCols) {
          flush();
          const children: TemplateBlock[] = directDivs.map(c => processNodes(Array.from(c.childNodes))[0] ?? mkSpacer());
          blocks.push({ id: v4Fallback(), type: 'columns', props: { ...DEFAULT_BLOCK_PROPS.columns, columns: directDivs.length }, children });
          continue;
        }
      }
      flush();
      blocks.push(...processNodes(Array.from(el.childNodes)));
      continue;
    }

    if (el.textContent?.trim()) {
      textBuf.push(`<p>${el.innerHTML}</p>`);
    }
  }

  flush();
  return blocks;
}

export function htmlToBlocks(html: string): TemplateBlock[] {
  if (!html.trim()) return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return processNodes(Array.from(doc.body.childNodes));
}
