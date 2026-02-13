import { TemplateBlock } from '@/types/template';

export function blocksToHtml(blocks: TemplateBlock[] | string): string {
  if (typeof blocks === 'string') return blocks;
  if (!Array.isArray(blocks)) return '';

  return blocks.map(block => {
    const p = block.props || {};
    switch (block.type) {
      case 'text':
        // Convert newlines to <br> for better email client compatibility
        const textContent = String(p.content || '').replace(/\n/g, '<br>');
        // Use <p> for block alignment and <span> for inline styles to ensure Tiptap parses them correctly
        return `
          <p style="text-align: ${p.align}; line-height: 1.5; margin-bottom: 10px;">
            <span style="font-family: sans-serif; font-size: ${p.fontSize}px; color: ${p.color};">
              ${textContent}
            </span>
          </p>`;
      
      case 'image':
        // Wrap in <p> for alignment
        return `
          <p style="text-align: center;">
            <img src="${p.src}" alt="${p.alt}" style="width: ${p.width}; max-width: 100%; height: auto; border-radius: 4px; display: inline-block;" />
          </p>`;
      
      case 'button':
        // Wrap in <p> for alignment
        return `
          <p style="text-align: ${p.align};">
            <a href="${p.url}" style="background-color: ${p.bgColor}; color: ${p.textColor}; border-radius: ${p.borderRadius}px; padding: 12px 24px; display: inline-block; text-decoration: none; font-family: sans-serif; font-weight: bold; font-size: 16px;">
              ${p.text}
            </a>
          </p>`;
      
      case 'divider':
        return `
          <div style="margin: ${p.margin}px 0;">
            <hr style="border: 0; border-top: ${p.height}px solid ${p.color};" />
          </div>`;
      
      case 'spacer':
        return `<div style="height: ${p.height}px; line-height: ${p.height}px; font-size: 0;">&nbsp;</div>`;
      
      case 'html':
        return `<div>${p.code}</div>`;
      
      case 'video':
        return `
          <p style="text-align: center;">
            <a href="${p.url}" target="_blank" style="display: inline-block; text-decoration: none; max-width: 100%;">
              <span style="background-color: #000; color: #fff; width: 480px; max-width: 100%; height: 270px; display: flex; align-items: center; justify-content: center; border-radius: 8px; position: relative; margin: 0 auto;">
                <span style="font-size: 32px; z-index: 10;">▶</span>
                <span style="position: absolute; bottom: 10px; left: 0; right: 0; text-align: center; font-size: 14px; font-family: sans-serif; color: #ddd;">
                  ${p.thumbnailText || 'Assista ao vídeo'}
                </span>
              </span>
            </a>
          </p>`;

      case 'social': {
        const networks = (p.networks as string[]) || [];
        const iconSize = Number(p.iconSize) || 24;
        // Using generic placeholders or CDN icons could be better, here we use simple text/emoji fallback if images fail
        // In a real app, these should be assets or reliable CDN links
        const socialIcons: Record<string, string> = {
          facebook: 'https://cdn-icons-png.flaticon.com/128/733/733547.png',
          instagram: 'https://cdn-icons-png.flaticon.com/128/2111/2111463.png',
          twitter: 'https://cdn-icons-png.flaticon.com/128/733/733579.png',
          linkedin: 'https://cdn-icons-png.flaticon.com/128/174/174857.png',
          youtube: 'https://cdn-icons-png.flaticon.com/128/1384/1384060.png',
          tiktok: 'https://cdn-icons-png.flaticon.com/128/3046/3046121.png'
        };
        
        return `
          <p style="text-align: ${p.align};">
            ${networks.map(net => `
              <a href="#" style="display: inline-block; margin: 0 5px; text-decoration: none;">
                <img src="${socialIcons[net] || ''}" alt="${net}" width="${iconSize}" height="${iconSize}" style="display: block; border-radius: 4px;" />
              </a>
            `).join('')}
          </p>`;
      }

      case 'columns': {
        const colCount = Number(p.columns) || 2;
        const gap = Number(p.gap) || 10;
        return `
          <table width="100%" cellpadding="0" cellspacing="0" style="table-layout: fixed; width: 100%;">
            <tr>
              ${Array.from({ length: colCount }).map(() => `
                <td style="vertical-align: top; padding: 0 ${gap/2}px;">
                  <div style="background-color: #f9f9f9; padding: 20px; border: 1px dashed #ccc; text-align: center; color: #999; font-family: sans-serif; border-radius: 4px;">
                    Coluna
                  </div>
                </td>
              `).join('')}
            </tr>
          </table>`;
      }

      case 'feed': {
        const items = Number(p.items) || 3;
        const layout = p.layout || 'vertical';
        const isGrid = layout === 'grid';
        
        if (isGrid) {
          return `
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                ${Array.from({ length: items }).map(() => `
                  <td style="padding: 5px; width: ${100/items}%;">
                    <div style="background: #f5f5f5; height: 120px; border-radius: 4px; border: 1px solid #eee;"></div>
                  </td>
                `).join('')}
              </tr>
            </table>`;
        }
        
        return `
          <div style="font-family: sans-serif;">
            ${Array.from({ length: items }).map(() => `
              <div style="display: flex; gap: 15px; margin-bottom: 15px; border: 1px solid #eee; padding: 10px; border-radius: 8px;">
                <div style="width: 80px; height: 80px; background: #eee; border-radius: 4px; flex-shrink: 0;"></div>
                <div style="flex: 1;">
                  <div style="height: 16px; background: #eee; width: 80%; margin-bottom: 8px; border-radius: 2px;"></div>
                  <div style="height: 12px; background: #f5f5f5; width: 100%; border-radius: 2px;"></div>
                </div>
              </div>
            `).join('')}
          </div>`;
      }

      default:
        return '';
    }
  }).join('');
}