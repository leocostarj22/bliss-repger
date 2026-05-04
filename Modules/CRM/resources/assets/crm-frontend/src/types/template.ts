export type BlockType = 'text' | 'image' | 'button' | 'divider' | 'columns' | 'html' | 'video' | 'spacer' | 'feed' | 'social';

export interface TemplateBlock {
  id: string;
  type: BlockType;
  props: Record<string, unknown>;
  children?: TemplateBlock[];
}

export interface GlobalStyles {
  canvasBgColor: string;
  contentBgColor: string;
  fontFamily: string;
  contentMaxWidth: number;
}

export const DEFAULT_GLOBAL_STYLES: GlobalStyles = {
  canvasBgColor: '#f4f4f4',
  contentBgColor: '#ffffff',
  fontFamily: 'Arial',
  contentMaxWidth: 600,
};

export const SAFE_FONTS = [
  { value: 'Arial', label: 'Arial', css: 'Arial, sans-serif' },
  { value: 'Helvetica', label: 'Helvetica', css: 'Helvetica, Arial, sans-serif' },
  { value: 'Verdana', label: 'Verdana', css: 'Verdana, Geneva, sans-serif' },
  { value: 'Georgia', label: 'Georgia', css: 'Georgia, serif' },
  { value: 'Times New Roman', label: 'Times New Roman', css: '"Times New Roman", Times, serif' },
  { value: 'Tahoma', label: 'Tahoma', css: 'Tahoma, Geneva, sans-serif' },
] as const;

export function getFontCss(fontName: string): string {
  return SAFE_FONTS.find(f => f.value === fontName)?.css ?? 'Arial, sans-serif';
}

export const DEFAULT_BLOCK_PROPS: Record<BlockType, Record<string, unknown>> = {
  text: { content: 'Digite seu texto aqui...', fontSize: 16, lineHeight: 1.5, color: '#333333', align: 'left', bgColor: '#ffffff', fontFamily: '' },
  image: { src: 'https://placehold.co/600x200/1a8a8a/ffffff?text=Sua+Imagem', alt: 'Imagem', width: '100%', hyperlink: '', borderRadius: 0, objectFit: 'cover', maxHeight: 'auto' },
  button: { text: 'Clique Aqui', url: '#', bgColor: '#1a8a8a', textColor: '#ffffff', align: 'center', borderRadius: 6 },
  divider: { height: 1, color: '#e0e0e0', margin: 16 },
  columns: { columns: 2, gap: 16, bgColor: '#ffffff', columnBgColors: ['#ffffff', '#ffffff', '#ffffff', '#ffffff'], borderRadius: 0, children: [] },
  html: { code: '<p style="color:#888;">HTML customizado</p>' },
  video: { src: 'https://www.youtube.com/watch?v=1234567890', width: '100%', height: 'auto' },
  spacer: { height: 16 },
  feed: { url: 'https://www.instagram.com/feed', width: '100%', height: 'auto' },
  social: {
    networks: ['facebook', 'twitter', 'linkedin'],
    align: 'center',
    iconSize: 28,
    color: '#333333',
    links: {
      facebook: 'https://facebook.com',
      twitter: 'https://twitter.com',
      linkedin: 'https://linkedin.com',
      instagram: 'https://instagram.com',
      youtube: 'https://youtube.com',
      tiktok: 'https://tiktok.com',
    },
  },
};