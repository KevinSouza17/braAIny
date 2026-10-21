import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api.js'
import { IconAlert, IconCheck, IconCode, IconDownload, IconExternal, IconLayers, IconRefresh, IconTerminal, IconWrench } from './Icons.jsx'

const SANDBOX_ATTRS = 'allow-scripts'
const MAX_PREVIEW_MESSAGES = 200
const MAX_REPAIR_ERRORS = 10

export default function PreviewPanel({ project, onProjectUpdated, onNotify, maxAttempts = 3 }) {
  const [tab, setTab] = useState('preview')
  const [reloadKey, setReloadKey] = useState(0)
  const [logs, setLogs] = useState([])
  const [status, setStatus] = useState({ state: 'idle', message: '' })
  const [autoRepair, setAutoRepair] = useState(true)
  const [selectedFile, setSelectedFile] = useState(null)
  const [frameLoading, setFrameLoading] = useState(Boolean(project))
  const [frameError, setFrameError] = useState(false)

  const buffer = useRef([])
  const attempt = useRef(0)
  const seenSignatures = useRef(new Set())
  const projectRef = useRef(project)
  const busyRef = useRef(false)
  const iframeRef = useRef(null)
  const receivedMessages = useRef(0)

  projectRef.current = project
  const projectId = project?.id
  const files = useMemo(() => project?.files || {}, [project])
  const fileNames = useMemo(() => Object.keys(files).sort(), [files])

  useEffect(() => {
    buffer.current = []
    receivedMessages.current = 0
    attempt.current = 0
    seenSignatures.current = new Set()
    setLogs([])
    setStatus({ state: 'idle', message: '' })
    setFrameLoading(Boolean(project))
    setFrameError(false)
    setReloadKey((key) => key + 1)
    setSelectedFile(null)
    setTab('preview')
  }, [projectId])

  useEffect(() => {
    if (fileNames.length && (!selectedFile || !fileNames.includes(selectedFile))) setSelectedFile(fileNames.includes('index.html') ? 'index.html' : fileNames[0])
  }, [fileNames, selectedFile])

  const signatureOf = (errors) => errors.map((e) => `${e.type || 'error'}:${String(e.message || '').slice(0, 120)}`).sort().join('|')

  const runRepair = useCallback(async (errors) => {
    const current = projectRef.current
    if (!current || busyRef.current) return
    const signature = signatureOf(errors)
    if (seenSignatures.current.has(signature)) {
      setStatus({ state: 'blocked', message: 'O mesmo erro reapareceu; autocorreção pausada para evitar loop.' })
      return
    }
    if (attempt.current >= maxAttempts) {
      setStatus({ state: 'blocked', message: `Limite de ${maxAttempts} autocorreções atingido.` })
      return
    }
    seenSignatures.current.add(signature)
    attempt.current += 1
    busyRef.current = true
    setStatus({ state: 'repairing', message: `Autocorrigindo · tentativa ${attempt.current}/${maxAttempts}` })
    try {
      const result = await api.repair(current.id, errors, attempt.current)
      if (result.repaired) {
        onProjectUpdated(result.project)
        setStatus({ state: 'repaired', message: `Corrigido na tentativa ${attempt.current}` })
        setFrameLoading(true)
        setReloadKey((key) => key + 1)
        buffer.current = []
      } else setStatus({ state: 'blocked', message: result.reason || 'Não foi possível corrigir.' })
    } catch (error) {
      setStatus({ state: 'error', message: `Falha na autocorreção: ${error.message}` })
      onNotify?.(error.message, 'error')
    } finally {
      busyRef.current = false
    }
  }, [maxAttempts, onNotify, onProjectUpdated])

  const flush = useCallback(() => {
    const errors = buffer.current.filter((e) => e && e.message)
    if (!errors.length) {
      setStatus((prev) => prev.state === 'idle' ? { state: 'clean', message: 'Preview executado sem erros.' } : prev)
      return
    }
    setStatus({ state: 'errors', message: `${errors.length} erro(s) capturado(s) no console.` })
    if (autoRepair) runRepair(errors)
  }, [autoRepair, runRepair])

  useEffect(() => {
    function onMessage(event) {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return
      const data = event.data
      if (!data || data.__brainy !== 1 || typeof data.type !== 'string') return
      receivedMessages.current += 1
      if (receivedMessages.current > MAX_PREVIEW_MESSAGES) return
      if (data.type === 'error') {
        const payload = data.payload
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return
        const message = String(payload.message || 'Erro de runtime').slice(0, 1200)
        const error = {
          type: 'error', message,
          source: String(payload.source || 'preview').slice(0, 512),
          line: Number.isInteger(payload.line) && payload.line >= 0 ? Math.min(payload.line, 10_000_000) : null,
          col: Number.isInteger(payload.col) && payload.col >= 0 ? Math.min(payload.col, 10_000_000) : null,
          stack: String(payload.stack || '').slice(0, 2000),
        }
        if (buffer.current.length < MAX_REPAIR_ERRORS) buffer.current.push(error)
        setLogs((prev) => [...prev.slice(-60), { level: 'error', text: message }])
      } else if (data.type === 'console.error') {
        const payload = data.payload
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return
        const message = String(payload.message || 'Erro no console').slice(0, 1200)
        if (buffer.current.length < MAX_REPAIR_ERRORS) buffer.current.push({ type: 'console.error', message, source: 'console', line: null, col: null, stack: '' })
        setLogs((prev) => [...prev.slice(-60), { level: 'error', text: message }])
      } else if (data.type === 'console.warn') {
        const message = String(data.payload?.message || 'Aviso no console').slice(0, 600)
        setLogs((prev) => [...prev.slice(-60), { level: 'warn', text: message }])
      } else if (data.type === 'settled') flush()
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [flush])

  const statusIcon = status.state === 'repairing' ? <IconWrench size={14} /> : status.state === 'clean' || status.state === 'repaired' ? <IconCheck size={14} /> : <IconAlert size={14} />
  const tabs = [
    { id: 'preview', label: 'Preview', icon: IconLayers },
    { id: 'code', label: 'Código', icon: IconCode },
    { id: 'console', label: 'Console', icon: IconTerminal, count: logs.length },
    { id: 'events', label: 'Logs', icon: IconWrench, count: project?.events?.length || 0 },
  ]

  const reloadPreview = () => {
    buffer.current = []
    receivedMessages.current = 0
    setFrameLoading(true)
    setFrameError(false)
    setStatus({ state: 'idle', message: '' })
    setReloadKey((key) => key + 1)
  }

  const handleTabKeyDown = (event, index) => {
    const nextIndex = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1
    if (nextIndex < 0) return
    event.preventDefault()
    const nextTab = tabs[nextIndex]
    setTab(nextTab.id)
    document.getElementById(`preview-tab-${nextTab.id}`)?.focus()
  }

  return (
    <section className="brainy-preview">
      <header className="preview-toolbar">
        <div className="preview-toolbar-left">
          <div className="preview-workspace-title"><span className="live-dot" /><strong>Preview</strong>{project && <small>{project.name}</small>}</div>
          <nav className="preview-tabs" role="tablist" aria-label="Painéis do projeto">
            {tabs.map((item, index) => { const Icon = item.icon; return <button key={item.id} id={`preview-tab-${item.id}`} type="button" role="tab" aria-controls="preview-panel" aria-selected={tab === item.id} tabIndex={tab === item.id ? 0 : -1} aria-label={item.count > 0 ? `${item.label}, ${item.count} itens` : item.label} className={tab === item.id ? 'is-active' : ''} onKeyDown={(event) => handleTabKeyDown(event, index)} onClick={() => setTab(item.id)}><Icon size={13} aria-hidden="true" /><span>{item.label}</span>{item.count > 0 && <small aria-hidden="true">{item.count}</small>}</button> })}
          </nav>
        </div>
        <div className="preview-toolbar-actions">
          <label className={`repair-toggle ${autoRepair ? 'is-active' : ''}`} title="Corrigir erros do preview automaticamente"><input type="checkbox" aria-label="Corrigir erros do preview automaticamente" checked={autoRepair} onChange={(event) => setAutoRepair(event.target.checked)} /><IconWrench size={13} aria-hidden="true" /><span>Autocorreção</span></label>
          <button type="button" className="icon-button" title="Recarregar preview" aria-label="Recarregar preview" onClick={reloadPreview} disabled={!project}><IconRefresh size={15} aria-hidden="true" /></button>
          <a className={`icon-button ${!project ? 'is-disabled' : ''}`} aria-label="Abrir preview em nova aba" aria-disabled={!project} tabIndex={project ? 0 : -1} title="Abrir preview em nova aba" href={project ? api.previewUrl(project.id, reloadKey) : undefined} target="_blank" rel="noreferrer"><IconExternal size={15} aria-hidden="true" /></a>
          <a className={`icon-button ${!project ? 'is-disabled' : ''}`} aria-label="Baixar projeto" aria-disabled={!project} tabIndex={project ? 0 : -1} title="Baixar projeto" href={project ? api.exportUrl(project.id) : undefined}><IconDownload size={15} aria-hidden="true" /></a>
        </div>
      </header>

      {tab === 'preview' && status.state !== 'idle' && <div className={`preview-status status-${status.state}`} role={status.state === 'errors' || status.state === 'error' ? 'alert' : 'status'} aria-live={status.state === 'errors' || status.state === 'error' ? 'assertive' : 'polite'}>{statusIcon}<span>{status.message}</span><span className="status-tail">sandbox isolado</span></div>}

      <div className={`preview-canvas preview-canvas-${tab}`} role="tabpanel" id="preview-panel" aria-labelledby={`preview-tab-${tab}`}>
        {!project && <div className="preview-empty" role="status"><div className="empty-preview-icon"><IconLayers size={22} /></div><span className="panel-kicker"><span className="kicker-line" />Live output</span><h2>Seu preview aparece aqui.</h2><p>Crie algo no chat para abrir uma área de visualização, código e logs em um workspace isolado.</p><div className="empty-preview-points"><span><IconCheck size={14} />Sandbox isolado</span><span><IconCheck size={14} />Validação automática</span></div></div>}

        {project && tab === 'preview' && <div className="preview-browser"><div className="browser-chrome"><span /><span /><span /><small>{project.name.toLowerCase().replace(/\s+/g, '-')}</small><i /></div><div className="preview-frame-wrap">{frameLoading && <div className="preview-loading" role="status"><span className="loading-ring" aria-hidden="true" /><strong>Carregando preview</strong><small>Preparando a visualização isolada…</small></div>}{frameError ? <div className="preview-frame-error" role="alert"><IconAlert size={18} /><strong>Não foi possível abrir o preview.</strong><button type="button" className="button-secondary" onClick={reloadPreview}>Tentar novamente</button></div> : <iframe key={`${project.id}-${reloadKey}`} title={`Preview do projeto ${project.name}`} ref={iframeRef} className="preview-iframe" sandbox={SANDBOX_ATTRS} src={api.previewUrl(project.id, reloadKey)} onLoad={() => setFrameLoading(false)} onError={() => { setFrameLoading(false); setFrameError(true) }} />}</div></div>}

        {project && tab === 'code' && <div className="code-workspace"><div className="code-file-list"><div className="code-list-label">Arquivos <span>{fileNames.length}</span></div>{fileNames.map((name) => <button key={name} type="button" onClick={() => setSelectedFile(name)} className={selectedFile === name ? 'is-active' : ''}><IconCode size={13} />{name}</button>)}</div><div className="code-editor"><div className="editor-toolbar"><span>{selectedFile || 'Selecione um arquivo'}</span><span>somente leitura</span></div><pre>{selectedFile ? files[selectedFile] : 'Selecione um arquivo para inspecionar o código.'}</pre></div></div>}

        {project && tab === 'console' && <div className="console-view">{logs.length === 0 ? <div className="empty-tab"><IconTerminal size={20} /><p>Console limpo.</p><small>Mensagens de erro e avisos aparecerão aqui.</small></div> : logs.map((log, index) => <div key={index} className={`console-line ${log.level}`}><span>{log.level}</span><p>{log.text}</p></div>)}</div>}

        {project && tab === 'events' && <div className="events-view">{(project.events || []).length === 0 ? <div className="empty-tab"><IconWrench size={20} /><p>Nenhum log técnico ainda.</p><small>Eventos de geração e validação aparecerão aqui.</small></div> : (project.events || []).map((event) => <div key={event.id} className="event-row"><div><span className="event-type">{event.type}</span><time>{event.created_at ? event.created_at.slice(11, 19) : ''}</time></div><p>{event.message}</p>{event.meta?.remaining_issues?.length > 0 && <small>{event.meta.remaining_issues.length} aviso(s) remanescente(s)</small>}</div>)}</div>}
      </div>
    </section>
  )
}
