import { TemplateBlock } from '@/types/template';

export function blocksToHtml(blocks: TemplateBlock[] | string): string {
  if (typeof blocks === 'string') return blocks;
  if (!Array.isArray(blocks)) return '';

  const htmlContent = blocks.map(block => {
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
          case r:
            h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g:
            h = ((b - r) / d + 2) / 6; break;
          case b:
            h = ((r - g) / d + 4) / 6; break;
        }
      }
      return Math.round(h * 360);
    }

    switch (block.type) {
      case 'text': {
        const contentHtml = String(p.content || '');
        const align = p.align || 'left';
        const bg = (p as any).bgColor || 'transparent';
        const size = `${p.fontSize}px`;
        const color = String(p.color || '#333333');
        const lineHeightRaw = Number((p as any).lineHeight ?? 1.5);
        const lineHeight = Number.isFinite(lineHeightRaw) ? lineHeightRaw : 1.5;
        return `<div style="text-align: ${align}; line-height: ${lineHeight}; margin: 10px 0; background-color: ${bg};">
          <div style="font-family: sans-serif; font-size: ${size}; color: ${color};">${contentHtml}</div>
        </div>`;
      }
      
      case 'image':
        const imgTag = `<img src="${p.src}" alt="${p.alt}" style="width: ${p.width}; max-width: 100%; height: auto; border-radius: 4px; display: inline-block;" />`;
        return p.hyperlink 
          ? `<p style="text-align: center; margin: 10px 0;"><a href="${p.hyperlink}" target="_blank" style="text-decoration: none;">${imgTag}</a></p>`
          : `<p style="text-align: center; margin: 10px 0;">${imgTag}</p>`;
      
      case 'button':
        return `<p style="text-align: ${p.align}; margin: 10px 0;"><a href="${p.url}" style="background-color: ${p.bgColor}; color: ${p.textColor}; border-radius: ${p.borderRadius}px; padding: 12px 24px; display: inline-block; text-decoration: none; font-family: sans-serif; font-weight: bold; font-size: 16px;">${p.text}</a></p>`;
      
      case 'divider': {
        const margin = Math.max(Number(p.margin ?? 10), 10);
        return `<div style="margin: ${margin}px 0;"><hr style="border: 0; border-top: ${p.height}px solid ${p.color};" /></div>`;
      }
      
      case 'spacer':
        return `<div style="height: ${p.height}px; line-height: ${p.height}px; font-size: 0;">&nbsp;</div>`;
      
      case 'html':
        return String((p as any).code || '');

      case 'video': {
        const width = String(p.width || '480px');
        const thumbnailUrl = p.thumbnailUrl;
        const thumbnailText = p.thumbnailText || 'Assista ao vídeo';
        
        if (thumbnailUrl) {
          return `<p style="text-align: center; margin: 10px 0;"><a href="${p.url}" target="_blank" style="display: inline-block; text-decoration: none; max-width: 100%;"><img src="${thumbnailUrl}" alt="${thumbnailText}" style="width: ${width}; max-width: 100%; height: auto; border-radius: 8px; display: block;" /></a></p>`;
        } else {
          const height = '270px';
          return `<p style="text-align: center; margin: 10px 0;"><a href="${p.url}" target="_blank" style="display: inline-block; text-decoration: none; max-width: 100%;"><span style="background-color: #000; color: #fff; width: ${width}; max-width: 100%; height: ${height}; display: flex; align-items: center; justify-content: center; border-radius: 8px; position: relative; margin: 0 auto;"><span style="font-size: 32px; z-index: 10;">▶</span><span style="position: absolute; bottom: 10px; left: 0; right: 0; text-align: center; font-size: 14px; font-family: sans-serif; color: #ddd;">${thumbnailText}</span></span></a></p>`;
        }
      }

      case 'social': {
        const networks = (p.networks as string[]) || [];
        const iconSize = Math.max(12, Number(p.iconSize) || 28);
        const bgColor = String(p.color || '#111827');
        const links = (p.links as Record<string, string>) || {};

        const iconifyNames: Record<string, string> = {
          facebook: 'facebook',
          instagram: 'instagram',
          twitter: 'twitter',
          linkedin: 'linkedin',
          youtube: 'youtube',
          tiktok: 'tiktok',
        };

        const align = p.align === 'center' ? 'center' : (p.align === 'right' ? 'right' : 'left');

        const iconUrlFor = (net: string) => {
          const name = iconifyNames[net];
          if (!name) return `https://via.placeholder.com/${iconSize}x${iconSize}.png?text=${net.charAt(0).toUpperCase()}`;
          const svg = `https://api.iconify.design/simple-icons/${name}.svg?color=ffffff`;
          return `https://images.weserv.nl/?url=${encodeURIComponent(svg)}&w=${iconSize}&h=${iconSize}&fit=contain&output=png`;
        };

        return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%; margin: 10px 0;">
          <tr>
            <td align="${align}">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="${align}">
                <tr>
                  ${networks.map((net) => {
                    const link = links[net] || '#';
                    const iconUrl = iconUrlFor(net);
                    const box = iconSize + 14;

                    return `<td style="padding: 0 4px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse: separate;">
                        <tr>
                          <td width="${box}" height="${box}" align="center" valign="middle" style="background-color: ${bgColor}; border-radius: 999px;">
                            <a href="${link}" target="_blank" style="display: inline-block; text-decoration: none;">
                              <img src="${iconUrl}" width="${iconSize}" height="${iconSize}" alt="${net}" style="display: block; width: ${iconSize}px; height: ${iconSize}px; border: 0; outline: none; text-decoration: none;" />
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>`;
                  }).join('')}
                </tr>
              </table>
            </td>
          </tr>
        </table>`;
      }

      case 'columns': {
      const colCount = Number(p.columns) || 2;
      const gap = Number(p.gap) || 10;
      const children = (block as any).children as TemplateBlock[] || [];

      return `<table width="100%" cellpadding="0" cellspacing="0" style="table-layout: fixed; width: 100%; margin: 10px 0;"><tr>${Array.from({ length: colCount }).map((_, i) => {
        const content = children[i] ? blocksToHtml([children[i]]) : `<div style="background-color: #f9f9f9; padding: 20px; border: 1px dashed #ccc; text-align: center; color: #999; font-family: sans-serif; border-radius: 4px;">Coluna ${i + 1}</div>`;
        return `<td style="vertical-align: top; padding: 0 ${gap/2}px;">${content}</td>`;
      }).join('')}</tr></table>`;
    }

      case 'feed': {
        const items = Number(p.items) || 3;
        const layout = p.layout || 'vertical';
        const isGrid = layout === 'grid';
        if (isGrid) {
          return `<table width="100%" cellpadding="0" cellspacing="0" style="margin: 10px 0;"><tr>${Array.from({ length: items }).map(() => `<td style="padding: 5px; width: ${100/items}%;"><div style="background: #f5f5f5; height: 120px; border-radius: 4px; border: 1px solid #eee;"></div></td>`).join('')}</tr></table>`;
        }
        return `<div style="font-family: sans-serif; margin: 10px 0;">${Array.from({ length: items }).map(() => `<div style="display: flex; gap: 15px; margin-bottom: 15px; border: 1px solid #eee; padding: 10px; border-radius: 8px;"><div style="width: 80px; height: 80px; background: #eee; border-radius: 4px; flex-shrink: 0;"></div><div style="flex: 1;"><div style="height: 16px; background: #eee; width: 80%; margin-bottom: 8px; border-radius: 2px;"></div><div style="height: 12px; background: #f5f5f5; width: 100%; border-radius: 2px;"></div></div></div>`).join('')}</div>`;
      }
      
      default:
        return '';
    }
  }).join('');

  const minified = htmlContent.replace(/>\s+</g, '><').trim();

  if (/<html\b/i.test(minified) || /<!doctype\b/i.test(minified)) {
    return minified;
  }

  const html = `<div style="width: 100%; background-color: #ffffff; font-family: sans-serif;"><div style="max-width: 600px; margin: 0 auto; padding: 0; box-sizing: border-box;">${minified}</div></div>`;

  // Strict minification to remove all newlines and excessive whitespace between tags
  return html.replace(/>\s+</g, '><').trim();
}