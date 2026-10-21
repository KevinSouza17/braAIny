import { useEffect, useMemo, useRef, useState } from 'react'
import { Brand } from './Logo.jsx'
import {
  IconChevronLeft,
  IconChevronRight,
  IconCode,
  IconGlobe,
  IconImage,
  IconMoon,
  IconPlus,
  IconSearch,
  IconSparkles,
  IconSun,
  IconTrash,
} from './Icons.jsx'

function formatDate(iso) {
  if (!iso) return ''
  const date = new Date(iso.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6'))
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function ProjectRow({ project, active, onSelect, onDelete }) {
  const iconByKind = { site: IconGlobe, game: IconImage, app: IconCode, image: IconImage }
  const KindIcon = iconByKind[project.kind] || IconGlobe
  return (
    <div className={`project-row ${active ? 'is-active' : ''}`}>
      <button type="button" className="project-open" onClick={() => onSelect(project.id)} aria-current={active ? 'page' : undefined} aria-label={`Abrir ${project.name}`}>
        <span className="project-icon"><KindIcon size={16} /></span>
        <span className="project-copy"><strong>{project.name}</strong><small>{project.kind || 'Projeto'} · {formatDate(project.updated_at)}</small></span>
      </button>
      <button type="button" className="project-delete" title="Excluir conversa" aria-label={`Excluir ${project.name}`} onClick={(event) => { event.stopPropagation(); onDelete(project.id) }}><IconTrash size={14} /></button>
    </div>
  )
}

export default function Sidebar({ projects, historyLoading, historyError, onRetryHistory, currentId, onSelect, onDelete, onNew, view, onViewChange, health, user, onLogin, onLogout, open, onToggle, theme, onThemeToggle }) {
  const [search, setSearch] = useState('')
  const asideRef = useRef(null)
  const wasOpen = useRef(open)
  const [mobileDrawer, setMobileDrawer] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 960px)').matches)
  const visibleProjects = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return projects
    return projects.filter((project) => `${project.name} ${project.kind} ${project.prompt || ''}`.toLowerCase().includes(term))
  }, [projects, search])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 960px)')
    const update = () => setMobileDrawer(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const previouslyOpen = wasOpen.current
    if (mobileDrawer && open && !previouslyOpen) {
      requestAnimationFrame(() => asideRef.current?.querySelector('.sidebar-collapse')?.focus({ preventScroll: true }))
    } else if (mobileDrawer && !open && previouslyOpen) {
      requestAnimationFrame(() => document.querySelector('.mobile-menu-button')?.focus({ preventScroll: true }))
    }
    wasOpen.current = open
  }, [mobileDrawer, open])

  useEffect(() => {
    if (!mobileDrawer || !open) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onToggle()
        return
      }
      if (event.key !== 'Tab') return
      const aside = asideRef.current
      const focusable = Array.from(aside?.querySelectorAll('a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])') || [])
        .filter((element) => element.getClientRects().length > 0)
      if (!focusable.length) {
        event.preventDefault()
        aside?.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && (document.activeElement === first || !aside?.contains(document.activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !aside?.contains(document.activeElement))) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [mobileDrawer, onToggle, open])

  useEffect(() => {
    if (asideRef.current) asideRef.current.inert = Boolean(mobileDrawer && !open)
  }, [mobileDrawer, open])

  return (
    <aside ref={asideRef} id="primary-navigation" className={`brainy-sidebar ${open ? 'is-open' : 'is-collapsed'}`} role={mobileDrawer && open ? 'dialog' : undefined} aria-modal={mobileDrawer && open ? 'true' : undefined} aria-hidden={mobileDrawer && !open ? 'true' : undefined} aria-label="Navegação principal" tabIndex={-1}>
      <div className="sidebar-head">
        <button type="button" className="brand-button" onClick={onToggle} aria-label={open ? 'Recolher menu' : 'Abrir menu'} title={open ? 'Recolher menu' : 'Abrir menu'}><Brand /></button>
        <button type="button" className="sidebar-collapse" onClick={onToggle} aria-label={open ? 'Recolher menu' : 'Abrir menu'} title={open ? 'Recolher menu' : 'Abrir menu'}>
          {open ? <IconChevronLeft size={17} /> : <IconChevronRight size={17} />}
        </button>
      </div>

      {open ? (
        <>
          <div className="sidebar-account">
            {user ? (
              <div className="account-card">
                <span className="avatar">{(user.name || 'B').slice(0, 1).toUpperCase()}</span>
                <span className="account-copy"><strong>{user.name || 'Conta brAIny'}</strong><small>Memória sincronizada</small></span>
                <button type="button" className="account-action" onClick={onLogout}>Sair</button>
              </div>
            ) : (
              <button type="button" className="login-card" onClick={onLogin}><span className="login-dot" /><span>Entrar ou criar conta</span><strong>→</strong></button>
            )}
          </div>

          <button type="button" className="new-chat-button" onClick={onNew}><IconPlus size={17} /> Nova criação <span className="shortcut">⌘ K</span></button>

          <nav className="mode-nav" aria-label="Modos de trabalho">
            <p className="nav-label">Workspace</p>
            <button type="button" aria-current={view === 'ask' ? 'page' : undefined} className={view === 'ask' ? 'is-selected' : ''} onClick={() => onViewChange('ask')}><IconSparkles size={16} /><span>Perguntar</span><small>01</small></button>
            <button type="button" aria-current={view === 'create' ? 'page' : undefined} className={view === 'create' ? 'is-selected' : ''} onClick={() => onViewChange('create')}><IconGlobe size={16} /><span>Criar</span><small>02</small></button>
            <button type="button" aria-current={view === 'code' ? 'page' : undefined} className={view === 'code' ? 'is-selected' : ''} onClick={() => onViewChange('code')}><IconCode size={16} /><span>Assistente de código</span><small>03</small></button>
          </nav>

          <div className="history-heading"><span>Criações recentes</span><span className="history-count">{visibleProjects.length}</span></div>
          {projects.length > 0 && <label className="history-search"><IconSearch size={14} /><span className="sr-only">Pesquisar conversas</span><input aria-label="Pesquisar histórico" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar histórico" type="search" /></label>}
          <div className="history-list">
            {historyLoading ? <p className="empty-history" role="status"><span className="loading-ring" aria-hidden="true" /> Carregando histórico…</p> : historyError ? <div className="empty-history history-error" role="alert"><span>{historyError}</span><button type="button" onClick={onRetryHistory}>Tentar novamente</button></div> : projects.length === 0 ? <p className="empty-history" role="status">Suas criações e conversas aparecerão aqui.</p> : visibleProjects.length === 0 ? <p className="empty-history" role="status">Nenhuma conversa corresponde à busca.</p> : visibleProjects.map((project) => <ProjectRow key={project.id} project={project} active={project.id === currentId} onSelect={onSelect} onDelete={onDelete} />)}
          </div>

          <div className="sidebar-footer">
            <div className="status-line"><span className={`status-dot ${health?.llm_configured ? 'online' : 'warning'}`} /><span>{health?.llm_configured ? 'IA pronta para criar' : 'Configure sua IA'}</span></div>
            <button type="button" className="theme-button" onClick={onThemeToggle}>{theme === 'light' ? <IconMoon size={15} /> : <IconSun size={15} />}<span>{theme === 'light' ? 'Modo escuro' : 'Modo claro'}</span></button>
          </div>
        </>
      ) : (
        <div className="collapsed-rail">
          <button type="button" onClick={onNew} title="Nova criação" aria-label="Nova criação"><IconPlus size={18} /></button>
          <button type="button" onClick={() => onViewChange('ask')} title="Perguntar" aria-label="Perguntar"><IconSparkles size={18} /></button>
          <button type="button" onClick={() => onViewChange('create')} title="Criar" aria-label="Criar"><IconImage size={18} /></button>
          <button type="button" onClick={() => onViewChange('code')} title="Assistente de código" aria-label="Assistente de código"><IconCode size={18} /></button>
          <button type="button" onClick={onToggle} title="Abrir menu" aria-label="Abrir menu"><IconChevronRight size={18} /></button>
        </div>
      )}
    </aside>
  )
}
