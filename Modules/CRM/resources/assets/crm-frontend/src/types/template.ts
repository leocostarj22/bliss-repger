export type BlockType = 'text' | 'image' | 'button' | 'divider' | 'columns' | 'html' | 'video' | 'spacer' | 'feed' | 'social';
export interface TemplateBlock {
  id: string;
  type: BlockType;
  props: Record<string, unknown>;
}
export const DEFAULT_BLOCK_PROPS: Record<BlockType, Record<string, unknown>> = {
  text: { content: 'Digite seu texto aqui...', fontSize: 16, color: '#333333', align: 'left' },
  image: { src: 'https://placehold.co/600x200/1a8a8a/ffffff?text=Sua+Imagem', alt: 'Imagem', width: '100%' },
  button: { text: 'Clique Aqui', url: '#', bgColor: '#1a8a8a', textColor: '#ffffff', align: 'center', borderRadius: 6 },
  divider: { height: 1, color: '#e0e0e0', margin: 16 },
  columns: { columns: 2, gap: 16 },
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
      tiktok: 'https://tiktok.com'
    }
  },
};