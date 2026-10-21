/**
 * Renderizador de markdown mínimo e seguro (escapa HTML antes de formatar).
 * Suficiente para as respostas do assistente de código e resumos do chat —
 * evita adicionar dependências só por causa disso.
 */

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function inline(text) {
  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|\s)\*([^*\n]+)\*(?=\s|$)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
}

export function renderMarkdown(markdown) {
  if (!markdown) return ''
  const blocks = []
  const source = escapeHtml(markdown).replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, _lang, code) => {
    blocks.push(`<pre><code>${code.replace(/\n$/, '')}</code></pre>`)
    return `\u0000BLOCK${blocks.length - 1}\u0000`
  })

  const html = []
  let listType = null

  const closeList = () => {
    if (listType) {
      html.push(listType === 'ul' ? '</ul>' : '</ol>')
      listType = null
    }
  }

  for (const rawLine of source.split('\n')) {
    const line = rawLine.trimEnd()
    if (/^\u0000BLOCK\d+\u0000$/.test(line.trim())) {
      closeList()
      html.push(line.trim())
      continue
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      closeList()
      const level = Math.min(heading[1].length, 3)
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`)
      continue
    }
    const bullet = line.match(/^\s*[-*+]\s+(.*)$/)
    if (bullet) {
      if (listType !== 'ul') {
        closeList()
        html.push('<ul>')
        listType = 'ul'
      }
      html.push(`<li>${inline(bullet[1])}</li>`)
      continue
    }
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/)
    if (numbered) {
      if (listType !== 'ol') {
        closeList()
        html.push('<ol>')
        listType = 'ol'
      }
      html.push(`<li>${inline(numbered[1])}</li>`)
      continue
    }
    if (/^\s*>\s?/.test(line)) {
      closeList()
      html.push(`<blockquote>${inline(line.replace(/^\s*>\s?/, ''))}</blockquote>`)
      continue
    }
    if (!line.trim()) {
      closeList()
      continue
    }
    closeList()
    html.push(`<p>${inline(line)}</p>`)
  }
  closeList()

  return html
    .join('\n')
    .replace(/\u0000BLOCK(\d+)\u0000/g, (_, index) => blocks[Number(index)])
}

export function Markdown({ children, className = '' }) {
  return (
    <div
      className={`prose-brainy ${className}`}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(children) }}
    />
  )
}
