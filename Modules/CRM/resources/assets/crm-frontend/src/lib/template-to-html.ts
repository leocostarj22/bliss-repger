import { TemplateBlock, GlobalStyles, getFontCss } from '@/types/template';

export function blocksToHtml(
  blocks: TemplateBlock[] | string,
  globalStyles?: GlobalStyles,
  _nested = false,
): string {
  if (typeof blocks === 'string') return blocks;
  if (!Array.isArray(blocks)) return '';

  const canvasBg  = globalStyles?.canvasBgColor  ?? '#f4f4f4';
  const contentBg = globalStyles?.contentBgColor ?? '#ffffff';
  const fontCss   = getFontCss(globalStyles?.fontFamily ?? 'Arial');
  const maxWidth  = globalStyles?.contentMaxWidth ?? 600;

  const blockHtmls = blocks.map(block => {
    const p = block.props || {};

    function getHueRotation(hex: string): number {
      if (!hex || typeof hex !== 'string' || hex[0] !== '#' || (hex.length !== 7 && hex.length !== 4)) return 0;
      let r: number, g: number, b: number;
      if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16) / 255;
        g = parseInt(hex[2] + hex[2], 16) / 255;
        b = parseInt(hex[3] + hex[3], 16) / 255;
      } else {
        r = parseInt(hex.slice(1, 3), 16) / 255;
        g = parseInt(hex.slice(3, 5), 16) / 255;
        b = parseInt(hex.slice(5, 7), 16) / 255;
      }
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0;
      if (max !== min) {
        const d = max - min;
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      return Math.round(h * 360);
    }
    void getHueRotation; // keep for future use

    switch (block.type) {
      case 'text': {
        const contentHtml   = String(p.content || '');
        const align         = String(p.align  || 'left');
        const bg            = String((p as any).bgColor || 'transparent');
        const size          = `${p.fontSize}px`;
        const color         = String(p.color || '#333333');
        const lineHeightRaw = Number((p as any).lineHeight ?? 1.5);
        const lineHeight    = Number.isFinite(lineHeightRaw) ? lineHeightRaw : 1.5;
        const blockFont     = (p as any).fontFamily
          ? getFontCss(String((p as any).fontFamily))
          : fontCss;
        return (
          `<div class="rt" style="text-align:${align};line-height:${lineHeight};` +
          `background-color:${bg};font-family:${blockFont};font-size:${size};color:${color};">` +
          contentHtml +
          `</div>`
        );
      }

      case 'image': {
        const imgAlign    = String(p.align ?? 'center');
        const imgRadius   = Number(p.borderRadius ?? 0);
        const imgMaxH     = String(p.maxHeight ?? 'auto');
        const imgFit      = String(p.objectFit  ?? 'cover');
        const imgMaxHStyle = imgMaxH !== 'auto'
          ? `max-height:${imgMaxH};object-fit:${imgFit};`
          : 'height:auto;';
        const imgTag = (
          `<img src="${p.src}" alt="${p.alt || ''}" ` +
          `style="width:${p.width};max-width:100%;${imgMaxHStyle}` +
          `border-radius:${imgRadius}px;display:inline-block;" />`
        );
        const wrapped = p.hyperlink
          ? `<a href="${p.hyperlink}" target="_blank" style="text-decoration:none;">${imgTag}</a>`
          : imgTag;
        return `<p style="text-align:${imgAlign};margin:0;">${wrapped}</p>`;
      }

      case 'button': {
        const btnFontSize = Number(p.fontSize  ?? 14);
        const btnPaddingV = Number(p.paddingV  ?? 12);
        const btnPaddingH = Number(p.paddingH  ?? 24);
        return (
          `<p style="text-align:${p.align};margin:0;">` +
          `<a href="${p.url}" style="background-color:${p.bgColor};color:${p.textColor};` +
          `border-radius:${p.borderRadius}px;padding:${btnPaddingV}px ${btnPaddingH}px;` +
          `display:inline-block;text-decoration:none;font-family:${fontCss};` +
          `font-weight:600;font-size:${btnFontSize}px;">${p.text}</a></p>`
        );
      }

      case 'divider': {
        const margin   = Math.max(Number(p.margin ?? 16), 0);
        const divStyle = String(p.style ?? 'solid');
        return `<div style="margin:${margin}px 0;"><hr style="border:0;border-top:${p.height}px ${divStyle} ${p.color};" /></div>`;
      }

      case 'spacer':
        return `<div style="height:${p.height}px;line-height:${p.height}px;font-size:0;">&nbsp;</div>`;

      case 'html':
        return String((p as any).code || '');

      case 'video': {
        const width    = String(p.width || '480px');
        const thumbUrl = String(p.thumbnailUrl || '');
        const thumbTxt = String(p.thumbnailText || 'Assista ao vídeo');
        if (thumbUrl) {
          return (
            `<p style="text-align:center;margin:0;">` +
            `<a href="${p.url}" target="_blank" style="display:inline-block;text-decoration:none;max-width:100%;">` +
            `<img src="${thumbUrl}" alt="${thumbTxt}" ` +
            `style="width:${width};max-width:100%;height:auto;border-radius:8px;display:block;" /></a></p>`
          );
        }
        return (
          `<p style="text-align:center;margin:0;">` +
          `<a href="${p.url}" target="_blank" style="display:inline-block;text-decoration:none;max-width:100%;">` +
          `<span style="background-color:#000;color:#fff;width:${width};max-width:100%;height:270px;` +
          `display:flex;align-items:center;justify-content:center;border-radius:8px;position:relative;margin:0 auto;">` +
          `<span style="font-size:32px;z-index:10;">▶</span>` +
          `<span style="position:absolute;bottom:10px;left:0;right:0;text-align:center;font-size:14px;` +
          `font-family:${fontCss};color:#ddd;">${thumbTxt}</span></span></a></p>`
        );
      }

      case 'social': {
        const networks = (p.networks as string[]) || [];
        const iconSize = Math.max(12, Number(p.iconSize) || 28);
        const bgColor  = String(p.color || '#111827');
        const links    = (p.links as Record<string, string>) || {};
        const align    = p.align === 'center' ? 'center' : (p.align === 'right' ? 'right' : 'left');
        const box      = iconSize + 14;
        const iconifyNames: Record<string, string> = {
          facebook: 'facebook', instagram: 'instagram', twitter: 'twitter',
          linkedin: 'linkedin', youtube: 'youtube', tiktok: 'tiktok',
        };
        const iconUrlFor = (net: string) => {
          const name = iconifyNames[net];
          if (!name) return `https://via.placeholder.com/${iconSize}x${iconSize}.png?text=${net[0].toUpperCase()}`;
          const svg = `https://api.iconify.design/simple-icons/${name}.svg?color=ffffff`;
          return `https://images.weserv.nl/?url=${encodeURIComponent(svg)}&w=${iconSize}&h=${iconSize}&fit=contain&output=png`;
        };
        return (
          `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">` +
          `<tr><td align="${align}">` +
          `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="${align}"><tr>` +
          networks.map(net => {
            const link    = links[net] || '#';
            const iconUrl = iconUrlFor(net);
            return (
              `<td style="padding:0 4px;">` +
              `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;">` +
              `<tr><td width="${box}" height="${box}" align="center" valign="middle" ` +
              `style="background-color:${bgColor};border-radius:999px;">` +
              `<a href="${link}" target="_blank" style="display:inline-block;text-decoration:none;">` +
              `<img src="${iconUrl}" width="${iconSize}" height="${iconSize}" alt="${net}" ` +
              `style="display:block;width:${iconSize}px;height:${iconSize}px;border:0;outline:none;" /></a>` +
              `</td></tr></table></td>`
            );
          }).join('') +
          `</tr></table></td></tr></table>`
        );
      }

      case 'columns': {
        const colCount        = Number(p.columns) || 2;
        const gap             = Number(p.gap)     || 10;
        const children        = (block.children  || []) as TemplateBlock[];
        const containerBg     = String(p.bgColor  || 'transparent');
        const containerRadius = Number(p.borderRadius || 0);
        const columnBgColors  = (p.columnBgColors as string[] | undefined) || [];
        return (
          `<table width="100%" cellpadding="0" cellspacing="0" ` +
          `style="table-layout:fixed;width:100%;background-color:${containerBg};` +
          `border-radius:${containerRadius}px;"><tr>` +
          Array.from({ length: colCount }).map((_, i) => {
            const cellBg  = columnBgColors[i] || 'transparent';
            const content = children[i]
              ? blocksToHtml([children[i]], undefined, true)
              : `<div style="padding:16px;text-align:center;color:#aaa;font-family:${fontCss};font-size:12px;">Coluna ${i + 1}</div>`;
            return (
              `<td style="vertical-align:top;padding:8px ${gap / 2}px;background-color:${cellBg};">` +
              content +
              `</td>`
            );
          }).join('') +
          `</tr></table>`
        );
      }

      case 'feed': {
        const items  = Number(p.items)  || 3;
        const layout = String(p.layout || 'vertical');
        if (layout === 'grid') {
          return (
            `<table width="100%" cellpadding="0" cellspacing="0">` +
            `<tr>${Array.from({ length: items }).map(() =>
              `<td style="padding:5px;width:${100 / items}%;">` +
              `<div style="background:#f5f5f5;height:120px;border-radius:4px;border:1px solid #eee;"></div>` +
              `</td>`
            ).join('')}</tr></table>`
          );
        }
        return (
          `<div style="font-family:${fontCss};">` +
          Array.from({ length: items }).map(() =>
            `<div style="display:flex;gap:15px;margin-bottom:15px;border:1px solid #eee;padding:10px;border-radius:8px;">` +
            `<div style="width:80px;height:80px;background:#eee;border-radius:4px;flex-shrink:0;"></div>` +
            `<div style="flex:1;">` +
            `<div style="height:16px;background:#eee;width:80%;margin-bottom:8px;border-radius:2px;"></div>` +
            `<div style="height:12px;background:#f5f5f5;width:100%;border-radius:2px;"></div>` +
            `</div></div>`
          ).join('') +
          `</div>`
        );
      }

      default:
        return '';
    }
  });

  // Nested calls (e.g. column children): return raw block HTML, no wrapper
  if (_nested) return blockHtmls.join('');

  // Wrap each block with consistent spacing
  const spaced = blockHtmls
    .filter(h => h.trim() !== '')
    .map(h => `<div style="margin-bottom:16px;">${h}</div>`)
    .join('');

  const minified = spaced.replace(/>\s+</g, '><').trim();

  if (/<html\b/i.test(minified) || /<!doctype\b/i.test(minified)) {
    return minified;
  }

  // Rich-text styles for <p>, <h1-3>, lists, etc. inside text blocks
  const richTextStyles = (
    '<style>' +
    '.rt p{margin-bottom:1em}' +
    '.rt p:last-child{margin-bottom:0}' +
    '.rt h1{font-size:1.75em;font-weight:bold;margin-bottom:.5em}' +
    '.rt h2{font-size:1.4em;font-weight:bold;margin-bottom:.5em}' +
    '.rt h3{font-size:1.17em;font-weight:bold;margin-bottom:.4em}' +
    '.rt ul{padding-left:1.5em;list-style-type:disc;margin-bottom:1em}' +
    '.rt ol{padding-left:1.5em;list-style-type:decimal;margin-bottom:1em}' +
    '.rt li{margin-bottom:.25em}' +
    '.rt blockquote{border-left:4px solid #d1d5db;padding-left:1em;font-style:italic}' +
    '.rt a{color:#2563eb;text-decoration:underline}' +
    '.rt strong{font-weight:bold}' +
    '.rt em{font-style:italic}' +
    '</style>'
  );

  return (
    richTextStyles +
    `<div style="width:100%;background-color:${canvasBg};padding:20px 0;font-family:${fontCss};">` +
    `<div style="max-width:${maxWidth}px;margin:0 auto;background-color:${contentBg};` +
    `padding:24px;box-sizing:border-box;">` +
    minified +
    `</div></div>`
  );
}
