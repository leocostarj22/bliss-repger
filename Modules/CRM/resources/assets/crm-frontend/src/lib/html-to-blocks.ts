import { useState, useRef, useCallback } from 'react';
import type { TemplateBlock } from '@/types/template';
import { DEFAULT_BLOCK_PROPS } from '@/types/template';
import { v4Fallback } from '@/lib/id';

function extractStyleBlocks(html: string): string {
  const match = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
  return match ? match.join('\n') : '';
}

function stripStyleTags(html: string): string {
  return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
}

export function htmlToBlocks(html: string): TemplateBlock[] {
  if (!html.trim()) return [];
  // For now, just wrap as HTML block - the inline editor handles the rest
  return [{ id: v4Fallback(), type: 'html', props: { code: html } }];
}

export { extractStyleBlocks, stripStyleTags };
