import { useEffect, useRef, useState } from 'react'
import { Markdown } from '../lib/markdown.jsx'
import { api } from '../api.js'
import { IconAlert, IconCheck, IconLayers, IconPlus, IconSend, IconSparkles, IconWrench } from './Icons.jsx'

const KINDS = [
  { id: 'auto', label: 'Automático' },
  { id: 'site', label: 'Site' },
  { id: 'app', label: 'App' },
  { id: 'game', label: 'Jogo' },
  { id: 'image', label: 'Imagem' },
]

const REFERENCE_MIMES = new Set([
  'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff',
  'application/pdf', 'audio/mpeg', 'audio/wav', 'audio/mp4', 'video/mp4',
])
const MAX_REFERENCE_BYTES = 12 * 1024 * 1024
const MAX_REFERENCE_FILES = 3

const EXEMPLOS = [
  { kind: 'site', eyebrow: 'SITE', title: 'Landing page', hint: 'Uma página clara para apresentar sua ideia.', text: 'Crie uma landing page sofisticada para uma cafeteria artesanal, com menu, horários e formulário de contato.' },
  { kind: 'app', eyebrow: 'APP', title: 'Lista de tarefas', hint: 'Prioridades, filtros e progresso do dia.', text: 'Monte um app de lista de tarefas com prioridades, filtros, busca e progresso do dia.' },
  { kind: 'game', eyebrow: 'JOGO', title: 'Jogo 2D', hint: 'Uma experiência simples, jogável e responsiva.', text: 'Faça um jogo da cobrinha com pontuação, velocidade crescente e controles de teclado e toque.' },
  { kind: 'image', eyebrow: 'IMAGEM', title: 'Identidade visual', hint: 'Um logo minimalista para sua marca.', text: 'Gere um logo minimalista vermelho e branco para uma startup de IA chamada brAIny.' },
]

function Bubble({ role, content, children, meta }) {
  const copy = async () => {
    try { await navigator.clipboard.writeText(content || '') } catch { /* clipboard pode estar bloqueado no preview */ }
  }
  const isSystem = role === 'system'
  return (
    <article className={`chat-bubble ${role === 'user' ? 'from-user' : isSystem ? 'from-system' : 'from-ai'}`}>
      <div className="bubble-label">
        <span className={role === 'user' ? 'user-mark' : isSystem ? 'system-mark' : 'ai-mark'}>{role === 'user' ? 'Você' : isSystem ? 'i' : 'b'}</span>
        <span>{role === 'user' ? 'Você' : isSystem ? 'Sistema' : 'brAIny'}</span>
        {meta && <small>{meta}</small>}
        {role === 'assistant' && <button type="button" className="copy-bubble" onClick={copy}>Copiar</button>}
      </div>
      {children}
    </article>
  )
}

export default function ChatPanel({ project, busy, stage, kind, setKind, onSubmit, onRefine }) {
  const [text, setText] = useState('')
  const [localFiles, setLocalFiles] = useState([])
  const [submitError, setSubmitError] = useState('')
  const [uploading, setUploading] = useState(false)
  const scroller = useRef(null)
  const fileRef = useRef(null)
  const uploadedIds = useRef(new WeakMap())
  const messages = project?.messages || []
  const hasProject = Boolean(project)

  useEffect(() => {
    if (scroller.current && (messages.length > 0 || busy)) scroller.current.scrollTop = scroller.current.scrollHeight
  }, [messages.length, busy, stage])

  const submit = async (event) => {
    event.preventDefault()
    const value = text.trim()
    if (!value || busy || uploading) return
    if (!hasProject && kind === 'image' && localFiles.length) {
      setSubmitError('Anexos de referência podem ser usados em sites, apps e jogos; remova-os ou troque o tipo de criação.')
      return
    }
    setSubmitError('')
    setUploading(true)
    try {
      const attachmentIds = []
      for (const file of localFiles) {
        let uploadId = uploadedIds.current.get(file)
        if (!uploadId) {
          const uploaded = await api.uploadFile(file)
          uploadId = uploaded?.id
          if (!uploadId) throw new Error('O upload não retornou um identificador seguro.')
          uploadedIds.current.set(file, uploadId)
        }
        attachmentIds.push(uploadId)
      }
      if (hasProject) await onRefine(value, attachmentIds)
      else await onSubmit(value, kind, attachmentIds)
      setText('')
      setLocalFiles([])
      uploadedIds.current = new WeakMap()
    } catch (error) {
      setSubmitError(error.message || 'Não foi possível enviar o pedido. Seus arquivos continuam anexados para tentar novamente.')
    } finally {
      setUploading(false)
    }
  }

  const addFiles = (fileList) => {
    const candidates = Array.from(fileList || [])
    if (!candidates.length) return
    if (!hasProject && kind === 'image') {
      setSubmitError('Anexos não estão disponíveis no modo Imagem; escolha Site, App ou Jogo.')
      return
    }
    const accepted = []
    const rejected = []
    let count = localFiles.length
    for (const file of candidates) {
      const mime = String(file.type || '').split(';', 1)[0].toLowerCase()
      if (!REFERENCE_MIMES.has(mime) || file.size > MAX_REFERENCE_BYTES) {
        rejected.push(file.name)
      } else if (count >= MAX_REFERENCE_FILES) {
        rejected.push(file.name)
      } else {
        accepted.push(file)
        count += 1
      }
    }
    if (accepted.length) setLocalFiles((current) => [...current, ...accepted].slice(0, MAX_REFERENCE_FILES))
    setSubmitError(rejected.length
      ? 'Alguns arquivos não foram adicionados. Use até 3 referências de imagem, PDF, MP3, WAV, M4A ou MP4, com no máximo 12 MB cada.'
      : '')
  }
  const projectState = busy ? 'Processando' : hasProject ? 'Pronto para ajustar' : 'Pronto para criar'
  const projectDescription = project ? `${project.kind || 'Projeto'} · ${Object.keys(project.files || {}).length} arquivo(s)` : 'Descreva uma ideia e acompanhe a construção em tempo real.'

  return (
    <section className="brainy-chat">
      <header className="panel-header">
        <div className="panel-heading">
          <div className="panel-kicker"><span className="kicker-line" />{hasProject ? 'Projeto em edição' : 'Workspace de criação'}</div>
          <h1>{project ? project.name : 'O que vamos criar?'}</h1>
          <p>{projectDescription}</p>
        </div>
        <div className="panel-header-meta">
          <span className={`project-state ${busy ? 'is-busy' : ''}`}><span />{projectState}</span>
          {project && <span className="project-id"><IconLayers size={13} />{project.id.slice(4, 10)}</span>}
        </div>
      </header>

      <div ref={scroller} className="chat-scroll">
        <div className="chat-content">
          {!hasProject && (
            <div className="welcome-block">
              <div className="welcome-hero">
                <div className="welcome-intro"><span className="welcome-symbol"><IconSparkles size={18} /></span><span className="welcome-note">Uma ideia, um workspace completo</span></div>
                <h2>Da ideia ao <em>pronto.</em></h2>
                <p>Descreva um site, app, jogo ou imagem. O brAIny constrói, valida e abre um preview vivo para você acompanhar tudo.</p>
                <div className="welcome-process" aria-label="Fluxo de criação"><span><IconCheck size={12} />Descreva</span><span><IconCheck size={12} />Valide</span><span><IconCheck size={12} />Refine</span></div>
              </div>
              <div className="suggestions-heading"><span>Comece por um exemplo</span><small>ou escreva do seu jeito</small></div>
              <div className="quick-suggestions">
                {EXEMPLOS.map((item) => (
                  <button type="button" key={item.title} className="quick-suggestion" onClick={() => { setKind(item.kind); setText(item.text) }}>
                    <span className="suggestion-icon">{item.eyebrow.slice(0, 1)}</span>
                    <span className="suggestion-copy"><strong>{item.title}</strong><small>{item.hint}</small></span>
                    <IconPlus size={14} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <Bubble key={message.id} role={message.role} content={message.content} meta={message.kind === 'repair' ? `autocorreção · tentativa ${message.meta?.attempt || ''}` : undefined}>
              {message.role === 'assistant' ? <Markdown>{message.content}</Markdown> : <p className="preserve-lines">{message.content}</p>}
              {message.kind === 'image' && message.meta?.url && <img className="chat-image" src={message.meta.url} alt="Imagem gerada pelo brAIny" />}
              {message.meta?.warnings?.length > 0 && <p className="inline-notice warning"><IconAlert size={14} />{message.meta.warnings[0]}</p>}
              {message.kind === 'result' && message.meta?.attempts > 0 && <p className="inline-notice success"><IconWrench size={14} />{message.meta.attempts} autocorreção(ões) aplicada(s)</p>}
              {message.kind === 'result' && message.meta?.mode === 'ops' && <p className="inline-notice success"><IconCheck size={14} />Edição incremental aplicada</p>}
            </Bubble>
          ))}

          {busy && <div className="thinking-line" role="status" aria-live="polite"><span className="thinking-orb" aria-hidden="true"><i /><i /><i /></span><span>{stage || 'Trabalhando…'}</span><small>o preview será atualizado ao concluir</small></div>}
        </div>
      </div>

      <form className="creation-composer" onSubmit={submit} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addFiles(event.dataTransfer.files) }}>
        {!hasProject && <div className="kind-row"><span className="composer-label">Tipo de criação</span>{KINDS.map((item) => <button type="button" key={item.id} aria-pressed={kind === item.id} className={kind === item.id ? 'is-selected' : ''} onClick={() => setKind(item.id)}>{item.label}</button>)}</div>}
        {localFiles.length > 0 && <div className="file-row" aria-label="Arquivos anexados">{localFiles.map((file, index) => <button type="button" key={`${file.name}-${index}`} aria-label={`Remover arquivo ${file.name}`} onClick={() => setLocalFiles((current) => current.filter((_, i) => i !== index))}>◫ {file.name} ×</button>)}</div>}
        {submitError && <p className="composer-inline-error" role="alert" aria-live="assertive">{submitError}</p>}
        <div className="composer-box">
          <button type="button" className="composer-add" title={!hasProject && kind === 'image' ? 'Anexos indisponíveis no modo Imagem' : 'Adicionar arquivo de referência'} aria-label="Adicionar arquivo de referência" disabled={busy || uploading || (!hasProject && kind === 'image')} onClick={() => fileRef.current?.click()}><IconPlus size={18} aria-hidden="true" /></button>
          <input ref={fileRef} className="sr-only" type="file" accept={REFERENCE_ACCEPT} multiple disabled={busy || uploading || (!hasProject && kind === 'image')} onChange={(event) => { addFiles(event.target.files); event.target.value = '' }} />
          <textarea rows={1} value={text} disabled={busy} aria-label={hasProject ? 'Descreva o ajuste para o projeto' : 'Descreva o que você quer criar'} placeholder={hasProject ? 'Peça um ajuste ao seu projeto…' : 'Descreva o que você quer criar…'} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) submit(event) }} />
          <button type="submit" className="send-button" disabled={busy || uploading || !text.trim()} aria-label={uploading ? 'Enviando pedido e arquivos' : 'Enviar'}><IconSend size={17} /></button>
        </div>
        <div className="composer-hint"><span>Enter envia · Shift + Enter quebra linha</span><span>{hasProject ? 'Ajuste incremental' : 'GPT + Nano Banana prontos'}</span></div>
      </form>
    </section>
  )
}
const REFERENCE_ACCEPT = Array.from(REFERENCE_MIMES).join(',')
