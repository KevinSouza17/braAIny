import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api.js'
import Sidebar from './components/Sidebar.jsx'
import ChatPanel from './components/ChatPanel.jsx'
import PreviewPanel from './components/PreviewPanel.jsx'
import Assistant from './components/Assistant.jsx'
import AskPanel from './components/AskPanel.jsx'
import VisualCalibration from './components/VisualCalibration.jsx'
import { Brand } from './components/Logo.jsx'
import { IconAlert, IconCheck, IconLayers, IconMenu, IconMoon, IconSparkles, IconSun } from './components/Icons.jsx'

const ETAPAS = [
  'Entendendo sua ideia…',
  'Construindo a primeira versão…',
  'Validando sintaxe e estrutura…',
  'Executando no sandbox…',
  'Aplicando os últimos ajustes…',
]

const VIEW_LABELS = { create: 'Criar', ask: 'Perguntar', code: 'Código' }

function Toasts({ items, onDismiss }) {
  return (
    <div className="toast-stack" aria-live="polite">
      {items.map((toast) => (
        <button key={toast.id} type="button" className={`toast toast-${toast.type}`} onClick={() => onDismiss(toast.id)} role={toast.type === 'error' ? 'alert' : 'status'} aria-atomic="true">
          {toast.type === 'error' ? <IconAlert size={16} /> : <IconCheck size={16} />}
          <span>{toast.message}</span>
        </button>
      ))}
    </div>
  )
}

export default function App() {
  const [projects, setProjects] = useState([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [current, setCurrent] = useState(null)
  const [view, setView] = useState('create')
  const [kind, setKind] = useState('auto')
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState('')
  const [health, setHealth] = useState(null)
  const [toasts, setToasts] = useState([])
  const [askBusy, setAskBusy] = useState(false)
  const [user, setUser] = useState(null)
  const [authLoaded, setAuthLoaded] = useState(false)
  const [visualCalibrationOpen, setVisualCalibrationOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window === 'undefined' || window.innerWidth > 1120)
  const [mobileWorkspace, setMobileWorkspace] = useState('chat')
  const [theme, setTheme] = useState(() => localStorage.getItem('brainy.theme') || 'light')
  const stageTimer = useRef(null)
  const previousWidth = useRef(typeof window === 'undefined' ? 0 : window.innerWidth)
  const operationId = useRef(0)
  const currentRef = useRef(current)
  currentRef.current = current

  const notify = useCallback((message, type = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((item) => item.id !== id)), 5500)
  }, [])

  const toggleSidebar = useCallback(() => setSidebarOpen((value) => !value), [])

  const refreshProjects = useCallback(async () => {
    setHistoryError('')
    try {
      setProjects((await api.listProjects()).projects || [])
      setHistoryLoaded(true)
    } catch (error) {
      setHistoryLoaded(true)
      setHistoryError(error.message || 'Não foi possível carregar o histórico.')
      notify(`Não foi possível carregar suas conversas: ${error.message}`, 'error')
    }
  }, [notify])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('brainy.theme', theme)
  }, [theme])

  useEffect(() => {
    const collapseForWorkspace = () => {
      const width = window.innerWidth
      if ((previousWidth.current > 1120 && width <= 1120) || (previousWidth.current > 960 && width <= 960)) setSidebarOpen(false)
      previousWidth.current = width
    }
    window.addEventListener('resize', collapseForWorkspace)
    return () => window.removeEventListener('resize', collapseForWorkspace)
  }, [])

  useEffect(() => {
    let active = true
    api.health().then(setHealth).catch(() => notify('Backend do brAIny não respondeu.', 'error'))
    refreshProjects()
    api.authMe()
      .then((data) => { if (active) setUser(data.user || null) })
      .catch(() => { if (active) setUser(null) })
      .finally(() => { if (active) setAuthLoaded(true) })
    return () => { active = false }
  }, [refreshProjects, notify])

  useEffect(() => {
    setVisualCalibrationOpen(Boolean(user && !localStorage.getItem('brainy.visual-check.v1')))
  }, [user])

  useEffect(() => {
    if (!busy) {
      clearInterval(stageTimer.current)
      return undefined
    }
    let index = 0
    setStage(ETAPAS[0])
    stageTimer.current = setInterval(() => {
      index = Math.min(index + 1, ETAPAS.length - 1)
      setStage(ETAPAS[index])
    }, 9000)
    return () => clearInterval(stageTimer.current)
  }, [busy])

  const handleCreate = async (prompt, selectedKind, attachments = []) => {
    const currentOperation = ++operationId.current
    setBusy(true)
    try {
      const project = await api.createProject(prompt, selectedKind, null, attachments)
      if (currentOperation !== operationId.current) return project
      currentRef.current = project
      setCurrent(project)
      await refreshProjects()
      if (currentOperation !== operationId.current) return project
      const attempts = project.messages?.find((message) => message.meta?.attempts)?.meta?.attempts || 0
      notify(attempts ? `Pronto. Fiz ${attempts} autocorreção(ões) antes de mostrar.` : 'Pronto. Projeto validado sem erros.')
      return project
    } catch (error) {
      if (currentOperation !== operationId.current) return null
      notify(error.message, 'error')
      throw error
    } finally {
      if (currentOperation === operationId.current) {
        setBusy(false)
        setStage('')
      }
    }
  }

  const handleRefine = async (instruction, attachments = []) => {
    if (!current) return
    const currentOperation = ++operationId.current
    const projectId = current.id
    setBusy(true)
    try {
      const project = await api.refine(current.id, instruction, attachments)
      if (currentOperation !== operationId.current || currentRef.current?.id !== projectId) return project
      currentRef.current = project
      setCurrent(project)
      await refreshProjects()
      if (currentOperation !== operationId.current || currentRef.current?.id !== projectId) return project
      notify('Alteração aplicada.')
      return project
    } catch (error) {
      if (currentOperation !== operationId.current) return null
      notify(error.message, 'error')
      throw error
    } finally {
      if (currentOperation === operationId.current) {
        setBusy(false)
        setStage('')
      }
    }
  }

  const handleSelect = async (projectId) => {
    if (busy) return
    const currentOperation = ++operationId.current
    try {
      const project = await api.getProject(projectId)
      if (currentOperation !== operationId.current) return
      currentRef.current = project
      setCurrent(project)
      setView('create')
      setMobileWorkspace('chat')
      setSidebarOpen(false)
    } catch (error) {
      if (currentOperation !== operationId.current) return
      if (error.status === 404) {
        currentRef.current = null
        setCurrent(null)
        notify('Este projeto não existe mais ou foi removido.', 'error')
      } else notify(error.message, 'error')
    }
  }

  const handleDelete = async (projectId) => {
    try {
      await api.deleteProject(projectId)
      if (currentRef.current?.id === projectId) {
        operationId.current += 1
        currentRef.current = null
        setCurrent(null)
        setBusy(false)
        setStage('')
      }
      await refreshProjects()
      notify('Conversa removida.')
    } catch (error) {
      notify(error.message, 'error')
    }
  }

  const handleLogout = async () => {
    try {
      await api.logout()
      operationId.current += 1
      currentRef.current = null
      setCurrent(null)
      setBusy(false)
      setStage('')
      setUser(null)
      notify('Você saiu da conta.')
    } catch (error) {
      notify(error.message, 'error')
    }
  }

  const handleProjectUpdated = useCallback((project) => {
    if (!project || currentRef.current?.id !== project.id) return
    currentRef.current = project
    setCurrent(project)
    refreshProjects()
  }, [refreshProjects])

  const startNew = () => {
    operationId.current += 1
    currentRef.current = null
    setBusy(false)
    setStage('')
    setCurrent(null)
    setKind('auto')
    setView('create')
    setMobileWorkspace('chat')
    setSidebarOpen(false)
  }

  return (
    <div className={`brainy-app ${sidebarOpen ? 'sidebar-is-open' : 'sidebar-is-closed'}`}>
      <div className="mobile-topbar">
        <button type="button" className="mobile-menu-button" onClick={() => setSidebarOpen(true)} aria-label="Abrir navegação" aria-controls="primary-navigation" aria-expanded={sidebarOpen}>
          <IconMenu size={19} />
        </button>
        <Brand compact />
        <div className="mobile-topbar-actions">
          <span className="mobile-view-label">{view === 'create' ? (current?.name || 'Workspace') : VIEW_LABELS[view]}</span>
          <button type="button" className="mobile-theme-button" onClick={() => setTheme((value) => value === 'light' ? 'dark' : 'light')} aria-label="Alternar tema">
            {theme === 'light' ? <IconMoon size={17} /> : <IconSun size={17} />}
          </button>
        </div>
      </div>

      {sidebarOpen && <button type="button" className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="Fechar navegação" />}
      <Sidebar
        projects={projects}
        historyLoading={!historyLoaded}
        historyError={historyError}
        onRetryHistory={refreshProjects}
        currentId={current?.id}
        onSelect={handleSelect}
        onDelete={handleDelete}
        onNew={startNew}
        view={view}
        onViewChange={(nextView) => { operationId.current += 1; setBusy(false); setStage(''); setView(nextView); if (nextView === 'create') setMobileWorkspace('chat'); setSidebarOpen(false) }}
        health={health}
        user={user}
        onLogin={() => window.location.assign('/api/auth/login')}
        onLogout={handleLogout}
        open={sidebarOpen}
        onToggle={toggleSidebar}
        theme={theme}
        onThemeToggle={() => setTheme((value) => value === 'light' ? 'dark' : 'light')}
      />

      <main className="main-stage" tabIndex={-1}>
        {view === 'code' ? <Assistant onNotify={notify} /> : view === 'ask' ? (
          <AskPanel
            project={current}
            busy={askBusy}
            onBusyChange={setAskBusy}
            onNotify={notify}
            user={user}
            onCreateImage={() => { operationId.current += 1; currentRef.current = null; setCurrent(null); setBusy(false); setStage(''); setKind('image'); setView('create'); setMobileWorkspace('chat') }}
          />
        ) : (
          <div className="mobile-create-shell">
            <div className="creation-layout">
              <div className={`mobile-pane mobile-pane-chat ${mobileWorkspace === 'chat' ? 'is-active' : ''}`}><ChatPanel project={current} busy={busy} stage={stage} kind={kind} setKind={setKind} onSubmit={handleCreate} onRefine={handleRefine} /></div>
              <div className={`mobile-pane mobile-pane-preview ${mobileWorkspace === 'preview' ? 'is-active' : ''}`}><PreviewPanel project={current} onProjectUpdated={handleProjectUpdated} onNotify={notify} maxAttempts={health?.max_repair_attempts ?? 3} /></div>
            </div>
            <nav className="mobile-workspace-nav" aria-label="Workspace mobile">
              <button type="button" className={mobileWorkspace === 'chat' ? 'is-active' : ''} onClick={() => setMobileWorkspace('chat')}><IconSparkles size={16} /><span>Chat</span></button>
              <button type="button" className={mobileWorkspace === 'preview' ? 'is-active' : ''} onClick={() => setMobileWorkspace('preview')}><IconLayers size={16} /><span>Preview</span></button>
            </nav>
          </div>
        )}
      </main>

      <Toasts items={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((item) => item.id !== id))} />
      {visualCalibrationOpen && <VisualCalibration onClose={() => setVisualCalibrationOpen(false)} />}
    </div>
  )
}
