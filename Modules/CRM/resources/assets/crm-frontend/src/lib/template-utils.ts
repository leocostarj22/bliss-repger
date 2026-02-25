import { TemplateBlock } from '@/types/template';
import { blocksToHtml } from './template-to-html';

/**
 * Gera uma thumbnail visual para um template baseado em seus blocos
 */
export function generateTemplateThumbnail(content: TemplateBlock[] | string): string {
  try {
    // Converte o conteúdo para blocos se necessário
    let blocks: TemplateBlock[] = [];
    if (typeof content === 'string') {
      try {
        blocks = JSON.parse(content);
      } catch {
        blocks = [];
      }
    } else if (Array.isArray(content)) {
      blocks = content;
    }

    if (blocks.length === 0) {
      return '';
    }

    // Cria um canvas para renderizar o preview
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    canvas.width = 300;
    canvas.height = 200;

    // Fundo branco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Analisa os blocos para criar representação visual
    let yOffset = 20;
    const maxElements = 4;
    let elementCount = 0;

    for (const block of blocks.slice(0, maxElements)) {
      if (elementCount >= maxElements || yOffset > 150) break;

      switch (block.type) {
        case 'text':
          ctx.fillStyle = '#333333';
          ctx.font = '12px sans-serif';
          const text = String(block.props?.content || 'Texto').substring(0, 30);
          ctx.fillText(text, 20, yOffset);
          yOffset += 25;
          elementCount++;
          break;

        case 'image':
          ctx.fillStyle = '#e0e0e0';
          ctx.fillRect(20, yOffset, 100, 60);
          ctx.fillStyle = '#999999';
          ctx.font = '10px sans-serif';
          ctx.fillText('Imagem', 50, yOffset + 35);
          yOffset += 70;
          elementCount++;
          break;

        case 'button':
          ctx.fillStyle = String(block.props?.bgColor || '#1a8a8a');
          ctx.fillRect(20, yOffset, 80, 25);
          ctx.fillStyle = String(block.props?.textColor || '#ffffff');
          ctx.font = '10px sans-serif';
          const buttonText = String(block.props?.text || 'Botão').substring(0, 8);
          ctx.fillText(buttonText, 45, yOffset + 16);
          yOffset += 35;
          elementCount++;
          break;

        case 'columns':
          ctx.fillStyle = '#f0f0f0';
          ctx.fillRect(20, yOffset, 120, 40);
          ctx.fillRect(150, yOffset, 120, 40);
          yOffset += 50;
          elementCount++;
          break;

        case 'divider':
          ctx.strokeStyle = '#cccccc';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(20, yOffset + 5);
          ctx.lineTo(280, yOffset + 5);
          ctx.stroke();
          yOffset += 15;
          elementCount++;
          break;

        case 'spacer':
          yOffset += 20;
          break;

        default:
          ctx.fillStyle = '#f5f5f5';
          ctx.fillRect(20, yOffset, 60, 20);
          yOffset += 30;
          elementCount++;
      }
    }

    // Adiciona indicador de mais elementos se houver
    if (blocks.length > maxElements) {
      ctx.fillStyle = '#999999';
      ctx.font = '10px sans-serif';
      ctx.fillText(`+${blocks.length - maxElements} mais...`, 20, 190);
    }

    return canvas.toDataURL();
  } catch (error) {
    console.error('Erro ao gerar thumbnail:', error);
    return '';
  }
}

/**
 * Gera uma descrição curta baseada nos primeiros elementos do template
 */
export function generateTemplateDescription(content: TemplateBlock[] | string): string {
  try {
    let blocks: TemplateBlock[] = [];
    if (typeof content === 'string') {
      try {
        blocks = JSON.parse(content);
      } catch {
        blocks = [];
      }
    } else if (Array.isArray(content)) {
      blocks = content;
    }

    if (blocks.length === 0) return 'Template vazio';

    const types = blocks.slice(0, 3).map(block => {
      switch (block.type) {
        case 'text': return 'Texto';
        case 'image': return 'Imagem';
        case 'button': return 'Botão';
        case 'columns': return 'Colunas';
        case 'divider': return 'Divisor';
        case 'spacer': return 'Espaço';
        case 'social': return 'Redes Sociais';
        case 'feed': return 'Feed';
        case 'video': return 'Vídeo';
        case 'html': return 'HTML';
        default: return 'Elemento';
      }
    });

    const description = types.join(', ');
    return blocks.length > 3 ? `${description} +${blocks.length - 3} mais` : description;
  } catch (error) {
    return 'Template';
  }
}