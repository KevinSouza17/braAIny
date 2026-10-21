import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { Markdown } from '../lib/markdown.jsx'
import { IconCheck, IconPaperclip, IconPlus, IconSearch, IconSend, IconSparkles } from './Icons.jsx'

const EXAMPLES = [
  'Explique a diferença entre frontend e backend de forma simples.',
  'Me ajude a escolher uma paleta minimalista para uma landing page.',
  'Qual é o preço atual do ChatGPT?',
]

const QUICK_ACTIONS = [
  { id: 'calculate', title: 'Calcular', description: 'Resolva contas rapidamente', prompt: 'Quanto é 248 * 37?', icon: '∑' },
  { id: 'answer', title: 'Conversar', description: 'Tire dúvidas e organize ideias', prompt: '', icon: '◌' },
  { id: 'image', title: 'Criar imagem', description: 'Gere uma imagem por descrição', prompt: '', icon: '✦' },
]

const formatCost = (amount) => amount == null
  ? 'custo indisponível: preço não informado ou consumo incerto'
  : `estimativa de US$ ${Number(amount).toFixed(4)} (não é cobrança)`

export default function AskPanel({ project, busy, onBusyChange, onNotify, onCreateImage, user, authLoaded = true, onLogin }) {
  const [text, setText] = useState('')
  const [messages, setMessages] = useState([])
  const [attachments, setAttachments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [searchWeb, setSearchWeb] = useState(true)
  const [historyState, setHistoryState] = useState('loading')
  const [historyError, setHistoryError] = useState('')
  const [historyRetry, setHistoryRetry] = useState(0)
  const [requestError, setRequestError] = useState('')
  const [usage, setUsage] = useState(null)
  const inputRef = useRef(null)
  const fileRef = useRef(null)
  const scroller = useRef(null)

  useEffect(() => { if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight }, [messages, busy])
  useEffect(() => {
    if (!user) { setMessages([]); setAttachments([]); setText(''); setHistoryState('empty'); return undefined }
    let active = true
    setHistoryState('loading')
    setHistoryError('')
    api.chatHistory().then((data) => {
      if (!active) return
      setMessages(data.messages || [])
      setHistoryState('ready')
    }).catch((error) => {
      if (!active) return
      setHistoryError(error.message || 'Não foi possível carregar o histórico.')
      setHistoryState('error')
    })
    return () => { active = false }
  }, [user, historyRetry])

  useEffect(() => {
    let active = true
    if (!user) { setUsage(null); return undefined }
    api.usage().then((data) => { if (active) setUsage(data) }).catch(() => { if (active) setUsage(null) })
    return () => { active = false }
  }, [user])

  const selectFiles = async (event) => {
    const files = Array.from(event.target.files || []).slice(0, 6)
    event.target.value = ''
    if (!user || !authLoaded || !files.length) return
    setUploading(true)
    try {
      const uploaded = []
      for (const file of files) uploaded.push(await api.uploadFile(file))
      setAttachments((current) => [...current, ...uploaded].slice(0, 6))
    } catch (error) { onNotify(error.message, 'error') } finally { setUploading(false) }
  }

  const submit = async (event) => {
    event?.preventDefault()
    const value = text.trim()
    if (!user || !authLoaded || !value || busy) return
    const visibleAttachments = attachments.map(({ id, filename, mime }) => ({ id, name: filename, mime }))
    const next = [...messages, { role: 'user', content: value, attachments: visibleAttachments }]
    setMessages(next)
    setText('')
    setRequestError('')
    onBusyChange(true)
    try {
      const context = project ? `${project.name} (${project.kind}): ${project.description || project.prompt}` : ''
      const result = await api.chat(next, context, searchWeb, attachments.map((item) => item.id), project?.id || null)
      setMessages((current) => [...current, { role: 'assistant', content: result.answer, sources: result.sources || [] }])
      setAttachments([])
      api.usage().then(setUsage).catch(() => {})
    } catch (error) { setRequestError(error.message || 'Não foi possível enviar a mensagem.'); onNotify(error.message, 'error') } finally { onBusyChange(false) }
  }

  const chooseAction = (action) => {
    if (action.id === 'image') { onCreateImage?.(); return }
    setText(action.prompt)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <section className="brainy-ask">
      <header className="ask-header">
        <div className="ask-header-inner">
          <div className="ask-topline"><span className="ask-brandline"><span className="ask-live-mark"><IconSparkles size={15} /></span>brAIny assistente</span><span className="ask-context">respostas com contexto</span></div>
          <div className="ask-title-row"><div><div className="panel-kicker"><span className="kicker-line" />Espaço de trabalho</div><h1>Como posso ajudar?</h1></div><button type="button" className={`web-search-toggle ${searchWeb ? 'is-active' : ''}`} aria-pressed={searchWeb} onClick={() => setSearchWeb((value) => !value)}><span className="web-search-dot" /><IconSearch size={13} />Pesquisa web {searchWeb ? 'ativa' : 'desativada'}</button></div>
          <p>Converse, pesquise, calcule ou organize uma ideia. Quando estiver pronto, transforme a conversa em uma criação.</p>
          {user && usage && <div className="ask-usage-strip" role="status" aria-live="polite"><strong>Uso mensal</strong><span>{usage.used?.chat_requests ?? 0} de {usage.limits?.chat_requests ?? '—'} conversas</span><span>{usage.used?.input_tokens ?? 0} tokens de entrada · {usage.used?.output_tokens ?? 0} de saída</span><span>Custo: {formatCost(usage.estimated_cost_usd)}</span>{project?.usage && <span>Projeto atual: {project.usage.llm_calls} chamadas · {project.usage.input_tokens} tokens de entrada · {project.usage.output_tokens} de saída · {formatCost(project.usage.estimated_cost_usd)}</span>}</div>}
        </div>
      </header>

      <div ref={scroller} className="ask-scroller">
        {!authLoaded ? (
          <div className="ask-state-card" role="status"><span className="loading-ring" aria-hidden="true" /><p>Verificando sua sessão…</p></div>
        ) : !user ? (
          <div className="ask-state-card" role="status"><h2>Entre para conversar.</h2><p>Seu histórico e seus anexos ficam protegidos na sua conta.</p><button type="button" className="button-primary" onClick={onLogin}>Entrar ou criar conta</button></div>
        ) : messages.length === 0 ? historyState === 'loading' ? (
          <div className="ask-state-card" role="status"><span className="loading-ring" aria-hidden="true" /><p>Carregando seu histórico…</p></div>
        ) : historyState === 'error' ? (
          <div className="ask-state-card ask-state-error" role="alert"><p>Não foi possível carregar o histórico: {historyError}</p><button type="button" className="button-secondary" onClick={() => setHistoryRetry((value) => value + 1)}>Tentar novamente</button></div>
        ) : (
          <div className="ask-frame ask-empty"><div className="ask-hero-symbol"><IconSparkles size={24} /></div><h2>Comece com uma tarefa.</h2><p className="ask-hero-copy">Respostas rápidas para decisões reais — com fontes quando a pesquisa estiver ativa.</p><div className="ask-actions-grid">{QUICK_ACTIONS.map((action) => <button key={action.id} type="button" className="ask-action-card" onClick={() => chooseAction(action)}><span className="ask-action-icon">{action.icon}</span><span><strong>{action.title}</strong><small>{action.description}</small></span><IconPlus size={14} className="ask-action-plus" /></button>)}</div><div className="ask-examples-title">Experimente perguntar</div><div className="ask-examples-grid">{EXAMPLES.map((example) => <button key={example} type="button" className="ask-example" onClick={() => { setText(example); inputRef.current?.focus() }}>{example}</button>)}</div></div>
        ) : (
          <div className="ask-frame ask-thread">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`ask-message ${message.role === 'user' ? 'ask-user' : 'ask-assistant'}`}><div className="ask-message-label"><span className={message.role === 'user' ? 'message-avatar user' : 'message-avatar'}>{message.role === 'user' ? 'Você' : 'b'}</span><span>{message.role === 'user' ? 'Você' : 'brAIny'}</span></div>{message.role === 'assistant' ? <><Markdown>{message.content}</Markdown>{message.sources?.length > 0 && <div className="ask-sources"><p>Fontes pesquisadas</p><div>{message.sources.map((source, sourceIndex) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">[{sourceIndex + 1}] {source.title}</a>)}</div></div>}</> : <><p className="preserve-lines">{message.content}</p>{message.attachments?.length > 0 && <div className="ask-message-files">{message.attachments.map((file) => <span key={file.id || file.name}><IconPaperclip size={12} />{file.name}</span>)}</div>}</>}</div>)}{busy && <div className="ask-message ask-assistant"><div className="brainy-thinking"><span className="thinking-orb"><i /><i /><i /></span><span>Preparando uma resposta…</span></div></div>}</div>
        )}
      </div>
      {requestError && <div className="ask-request-error" role="alert"><strong>Não foi possível concluir a solicitação.</strong><span>{requestError}</span></div>}

      <form onSubmit={submit} className="ask-composer"><div className="ask-attachment-row"><button type="button" className="ask-attach-button" onClick={() => fileRef.current?.click()} disabled={busy || uploading || !user || !authLoaded}><IconPaperclip size={15} /> Anexar fotos ou arquivos</button><input ref={fileRef} type="file" className="sr-only" multiple accept="image/*,application/pdf,text/plain,text/csv,text/markdown,application/json,audio/*,video/mp4" onChange={selectFiles} />{attachments.map((file) => <button key={file.id} type="button" className="ask-file-chip" title="Remover anexo" aria-label={`Remover anexo ${file.filename}`} onClick={() => setAttachments((current) => current.filter((item) => item.id !== file.id))}>{file.filename} ×</button>)}</div><div className="ask-composer-inner"><textarea ref={inputRef} rows={1} value={text} placeholder="Pergunte qualquer coisa ou descreva uma tarefa…" aria-label="Escreva sua pergunta" onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) submit(event) }} disabled={busy || uploading || !user || !authLoaded} /><button type="submit" aria-label="Enviar pergunta" className="ask-send" disabled={busy || uploading || !user || !authLoaded || !text.trim()}><IconSend size={17} /></button></div><div className="ask-disclaimer"><span><IconCheck size={12} /> Histórico e anexos ficam na sua conta</span><span>Enter envia · Shift + Enter quebra linha</span></div></form>
    </section>
  )
}
