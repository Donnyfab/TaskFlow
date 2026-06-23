export type CoachStreamPayload = {
  ok?: boolean
  reply?: string
  error?: string
  commitment?: unknown
  checkin?: unknown
  pattern?: string | null
  messages?: unknown[]
  mode?: string
}

export async function readCoachEventStream(
  response: Response,
  onToken: (text: string) => void,
): Promise<CoachStreamPayload> {
  if (!response.body) {
    throw new Error('Forge could not stream a response.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let donePayload: CoachStreamPayload | null = null

  function processBlock(block: string) {
    if (!block.trim()) return

    let eventName = 'message'
    const dataLines: string[] = []

    for (const rawLine of block.split(/\r?\n/)) {
      const line = rawLine.trimEnd()
      if (line.startsWith('event:')) {
        eventName = line.slice('event:'.length).trim()
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice('data:'.length).trimStart())
      }
    }

    if (!dataLines.length) return

    const payload = JSON.parse(dataLines.join('\n')) as CoachStreamPayload & { text?: string }
    if (eventName === 'token') {
      if (payload.text) onToken(payload.text)
      return
    }
    if (eventName === 'done') {
      donePayload = payload
      return
    }
    if (eventName === 'error') {
      throw new Error(payload.error || 'Forge could not respond.')
    }
  }

  while (true) {
    const { value, done } = await reader.read()
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done })

    const blocks = buffer.split(/\n\n/)
    buffer = blocks.pop() || ''
    for (const block of blocks) processBlock(block)

    if (done) break
  }

  if (buffer) processBlock(buffer)
  if (!donePayload) throw new Error('Forge ended the stream before finishing.')
  return donePayload
}
