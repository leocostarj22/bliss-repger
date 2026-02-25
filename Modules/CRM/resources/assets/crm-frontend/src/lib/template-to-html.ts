import { TemplateBlock } from '@/types/template';

export function blocksToHtml(blocks: TemplateBlock[] | string): string {
  if (typeof blocks === 'string') return blocks;
  if (!Array.isArray(blocks)) return '';

  const htmlContent = blocks.map(block => {
    const p = block.props || {};
    switch (block.type) {
      case 'text':
        const textContent = String(p.content || '').replace(/\n/g, '<br>');
        return `<p style="text-align: ${p.align}; line-height: 1.5; margin: 0;"><span style="font-family: sans-serif; font-size: ${p.fontSize}px; color: ${p.color};">${textContent}</span></p>`;
      
      case 'image':
        return `<p style="text-align: center; margin: 0;"><img src="${p.src}" alt="${p.alt}" style="width: ${p.width}; max-width: 100%; height: auto; border-radius: 4px; display: inline-block;" /></p>`;
      
      case 'button':
        return `<p style="text-align: ${p.align}; margin: 10px 0;"><a href="${p.url}" style="background-color: ${p.bgColor}; color: ${p.textColor}; border-radius: ${p.borderRadius}px; padding: 12px 24px; display: inline-block; text-decoration: none; font-family: sans-serif; font-weight: bold; font-size: 16px;">${p.text}</a></p>`;
      
      case 'divider':
        return `<div style="margin: ${p.margin}px 0;"><hr style="border: 0; border-top: ${p.height}px solid ${p.color};" /></div>`;
      
      case 'spacer':
        return `<div style="height: ${p.height}px; line-height: ${p.height}px; font-size: 0;">&nbsp;</div>`;
      
      case 'html':
        return `<div>${p.code}</div>`;
      
      case 'video':
        return `<p style="text-align: center; margin: 0;"><a href="${p.url}" target="_blank" style="display: inline-block; text-decoration: none; max-width: 100%;"><span style="background-color: #000; color: #fff; width: 480px; max-width: 100%; height: 270px; display: flex; align-items: center; justify-content: center; border-radius: 8px; position: relative; margin: 0 auto;"><span style="font-size: 32px; z-index: 10;">▶</span><span style="position: absolute; bottom: 10px; left: 0; right: 0; text-align: center; font-size: 14px; font-family: sans-serif; color: #ddd;">${p.thumbnailText || 'Assista ao vídeo'}</span></span></a></p>`;

      case 'social': {
        const networks = (p.networks as string[]) || [];
        const iconSize = Number(p.iconSize) || 28;
        const color = String(p.color || '#333333');
        const links = (p.links as Record<string, string>) || {};
        
        const icons: Record<string, string> = {
          facebook: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
          instagram: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z',
          twitter: 'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z',
          linkedin: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
          youtube: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
          tiktok: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v6.14c0 3.48-2.32 6.66-5.79 7.42-3.21.7-6.57-.6-8.23-3.37-1.65-2.77-1.02-6.3 1.57-8.4 2.1-1.69 5.09-1.6 7.26-.05V5.5c-1.04-.62-2.22-.98-3.44-1.01-3.66-.08-6.8 2.56-7.38 6.17-.6 3.66 1.76 7.24 5.3 8.37 3.24 1.03 6.84-.73 8.16-3.87.5-1.19.64-2.48.42-3.76V4.32c-1.44.49-2.8.35-4.08-.41V.02Z'
        };
        
        const align = p.align === 'center' ? 'center' : (p.align === 'right' ? 'right' : 'left');
        const margin = align === 'center' ? '0 auto' : (align === 'right' ? '0 0 0 auto' : '0 auto 0 0');
        
        // Use a div wrapper for Tiptap compatibility (text-align works better on block containers in editors)
        // Keep the inner table with align attribute for Outlook support
        return `<div style="text-align: ${align}; width: 100%;">
          <table align="${align}" style="display: inline-table; margin: ${margin}; text-align: ${align};" cellpadding="0" cellspacing="0" border="0" role="presentation">
            <tr>
              ${networks.map(net => {
                const link = links[net] || '#';
                const iconPath = icons[net] || '';
                const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="${color}"/><path d="${iconPath}" fill="#ffffff" transform="translate(12, 12)"/></svg>`;
                const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
                
                return `<td style="padding: 0 4px;"><a href="${link}" target="_blank" style="display: inline-block; text-decoration: none;"><img src="${dataUri}" width="${iconSize}" height="${iconSize}" alt="${net}" style="display: block; width: ${iconSize}px; height: ${iconSize}px; border: 0;" /></a></td>`;
              }).join('')}
            </tr>
          </table>
        </div>`;
      }

      case 'columns': {
      const colCount = Number(p.columns) || 2;
      const gap = Number(p.gap) || 10;
      const children = p.children as TemplateBlock[] || [];

      return `<table width="100%" cellpadding="0" cellspacing="0" style="table-layout: fixed; width: 100%;"><tr>${Array.from({ length: colCount }).map((_, i) => {
        const content = children[i] ? blocksToHtml([children[i]]) : `<div style="background-color: #f9f9f9; padding: 20px; border: 1px dashed #ccc; text-align: center; color: #999; font-family: sans-serif; border-radius: 4px;">Coluna ${i + 1}</div>`;
        return `<td style="vertical-align: top; padding: 0 ${gap/2}px;">${content}</td>`;
      }).join('')}</tr></table>`;
    }

      case 'feed': {
        const items = Number(p.items) || 3;
        const layout = p.layout || 'vertical';
        const isGrid = layout === 'grid';
        if (isGrid) {
          return `<table width="100%" cellpadding="0" cellspacing="0"><tr>${Array.from({ length: items }).map(() => `<td style="padding: 5px; width: ${100/items}%;"><div style="background: #f5f5f5; height: 120px; border-radius: 4px; border: 1px solid #eee;"></div></td>`).join('')}</tr></table>`;
        }
        return `<div style="font-family: sans-serif;">${Array.from({ length: items }).map(() => `<div style="display: flex; gap: 15px; margin-bottom: 15px; border: 1px solid #eee; padding: 10px; border-radius: 8px;"><div style="width: 80px; height: 80px; background: #eee; border-radius: 4px; flex-shrink: 0;"></div><div style="flex: 1;"><div style="height: 16px; background: #eee; width: 80%; margin-bottom: 8px; border-radius: 2px;"></div><div style="height: 12px; background: #f5f5f5; width: 100%; border-radius: 2px;"></div></div></div>`).join('')}</div>`;
      }
      
      default:
        return '';
    }
  }).join('');

  const html = `<div style="width: 100%; background-color: #ffffff; font-family: sans-serif;"><div style="max-width: 600px; margin: 0 auto; padding: 0; box-sizing: border-box;">${htmlContent}</div></div>`;
  
  // Strict minification to remove all newlines and excessive whitespace between tags
  return html.replace(/>\s+</g, '><').trim();
}