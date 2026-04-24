export type AiAction =
  | 'generate_text'
  | 'improve_text'
  | 'rewrite'
  | 'summarize'
  | 'generate_cta'
  | 'generate_template'

export type AiTone = 'formal' | 'informal' | 'persuasivo' | 'direto' | 'amigavel'

export interface AiGenerateParams {
  action: AiAction
  prompt?: string
  current_content?: string
  tone?: AiTone
}

export async function generateAiContent(params: AiGenerateParams): Promise<string> {
  const response = await fetch('/api/v1/email/ai/generate', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(params),
  })

  const json = await response.json()

  if (!response.ok) {
    throw new Error(
      typeof json?.error === 'string' ? json.error : `Erro ${response.status}`
    )
  }

  return json.data.content as string
}
