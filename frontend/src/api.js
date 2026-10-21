/**
 * Cliente da API do brAIny.
 *
 * Nenhuma chave de LLM passa por aqui: o frontend só conversa com o backend,
 * que é o único que conhece as credenciais dos provedores.
 */

const BASE = import.meta.env.VITE_API_BASE || ''
let csrfToken = null

async function getCsrfToken(force = false) {
  if (csrfToken && !force) return csrfToken
  const response = await fetch(`${BASE}/api/auth/csrf`, { credentials: 'include' })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data.token) throw new Error('Não foi possível preparar a proteção da sessão.')
  csrfToken = data.token
  return csrfToken
}

async function request(path, options = {}, retried = false) {
  const method = (options.method || 'GET').toUpperCase()
  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (mutating) headers['X-CSRF-Token'] = headers['X-CSRF-Token'] || await getCsrfToken()
  const response = await fetch(`${BASE}${path}`, { credentials: 'include', ...options, headers })
  const text = await response.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = { detail: text } }
  if (response.status === 403 && mutating && !retried && String(data?.detail || '').includes('CSRF')) {
    csrfToken = null
    return request(path, options, true)
  }
  if (!response.ok) {
    const detail = (data && (data.detail || data.aviso)) || `Erro HTTP ${response.status}`
    const error = new Error(typeof detail === 'string' ? detail : JSON.stringify(detail))
    error.status = response.status
    throw error
  }
  return data
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitForJob(jobId, { timeoutMs = 10 * 60 * 1000, intervalMs = 500 } = {}) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const job = await request(`/api/jobs/${encodeURIComponent(jobId)}`)
    if (job.status === 'COMPLETED') return job.result
    if (job.status === 'FAILED' || job.status === 'CANCELLED') {
      throw new Error(job.error || 'A operação assíncrona não foi concluída.')
    }
    await sleep(intervalMs)
  }
  const error = new Error('A operação demorou mais que o esperado. Consulte o histórico de jobs e tente novamente.')
  error.jobId = jobId
  throw error
}

const JOB_EVENTS = ['job.created', 'job.started', 'generation.started', 'generation.progress',
  'validation.started', 'repair.started', 'repair.progress', 'generation.finalizing', 'generation.completed',
  'generation.failed', 'job.cancelled', 'job.closed', 'job.timeout']

async function streamJob(jobId, { onEvent, timeoutMs = 10 * 60 * 1000 } = {}) {
  if (typeof EventSource === 'undefined') return waitForJob(jobId, { timeoutMs })
  const started = Date.now()
  let lastId = 0
  let connectionErrors = 0
  let settled = false
  const streamed = await new Promise((resolve, reject) => {
    let source
    let retryTimer
    const finish = (error, value) => {
      if (settled) return
      settled = true
      clearTimeout(retryTimer)
      source?.close()
      error ? reject(error) : resolve(value)
    }
    const connect = () => {
      if (Date.now() - started >= timeoutMs) return finish(new Error('O stream de progresso expirou.'))
      const suffix = lastId ? `?last_event_id=${lastId}` : ''
      source = new EventSource(`${BASE}/api/jobs/${encodeURIComponent(jobId)}/events${suffix}`, { withCredentials: true })
      const handle = (event) => {
        if (event.lastEventId) lastId = Number(event.lastEventId) || lastId
        let data = {}
        try { data = event.data ? JSON.parse(event.data) : {} } catch { return }
        const update = { type: event.type, ...data }
        onEvent?.(update)
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('brainy:job-progress', { detail: { jobId, ...update } }))
        if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(data.status) || event.type === 'job.closed') {
          finish(data.status === 'FAILED' ? new Error('A operação não foi concluída.') : null, data)
        }
      }
      JOB_EVENTS.forEach((name) => source.addEventListener(name, handle))
      source.onerror = () => {
        source.close()
        clearTimeout(retryTimer)
        connectionErrors += 1
        if (connectionErrors >= 3) return finish(new Error('Fluxo de eventos indisponível; consultando o job.'))
        retryTimer = setTimeout(connect, 750 * connectionErrors)
      }
    }
    connect()
  }).catch(async () => {
    const remainingMs = Math.max(5_000, timeoutMs - (Date.now() - started))
    return waitForJob(jobId, { timeoutMs: remainingMs, intervalMs: 1_000 })
  })
  const job = await request(`/api/jobs/${encodeURIComponent(jobId)}`)
  if (job.status === 'FAILED' || job.status === 'CANCELLED') throw new Error(job.error || 'A operação não foi concluída.')
  return job.result || streamed
}

async function requestJob(path, options) {
  const response = await request(path, options)
  return response?.job_id ? streamJob(response.job_id) : response
}

export const api = {
  health: () => request('/api/health'),
  config: () => request('/api/config'),
  models: () => request('/api/models'),
  authMe: () => request('/api/auth/me'),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  listMemories: () => request('/api/me/memories'),
  saveMemory: (key, value, source = 'explicit', type = 'CONTEXT') =>
    request('/api/me/memories', { method: 'POST', body: JSON.stringify({ key, value, content: value, source, type }) }),
  editMemory: (id, key, value, type = 'CONTEXT', source = 'explicit') =>
    request(`/api/me/memories/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ key, value, content: value, type, source }) }),
  deleteMemory: (id) => request(`/api/me/memories/${id}`, { method: 'DELETE' }),
  uploadFile: async (file) => {
    const form = new FormData()
    form.append('file', file)
    const send = async () => {
      const response = await fetch(`${BASE}/api/me/uploads`, { method: 'POST', body: form, credentials: 'include', headers: { 'X-CSRF-Token': await getCsrfToken() } })
      const data = await response.json().catch(() => ({}))
      return { response, data }
    }
    let { response, data } = await send()
    if (response.status === 403 && String(data?.detail || '').includes('CSRF')) {
      csrfToken = null
      ;({ response, data } = await send())
    }
    if (!response.ok) {
      const error = new Error(data.detail || `Erro HTTP ${response.status}`)
      error.status = response.status
      throw error
    }
    return data
  },
  listUploads: () => request('/api/me/uploads'),
  chatHistory: () => request('/api/me/chat-history'),
  usage: () => request('/api/me/usage'),
  getJob: (id) => request(`/api/jobs/${encodeURIComponent(id)}`),
  streamJob: (id, options) => streamJob(id, options),
  cancelJob: (id) => request(`/api/jobs/${encodeURIComponent(id)}/cancel`, { method: 'POST' }),
  retryJob: (id) => requestJob(`/api/jobs/${encodeURIComponent(id)}/retry`, { method: 'POST' }),

  listProjects: () => request('/api/projects'),
  getProject: (id) => request(`/api/projects/${encodeURIComponent(id)}`),
  projectUsage: (id) => request(`/api/projects/${encodeURIComponent(id)}/usage`),
  createProject: (prompt, kind, model, attachments = []) =>
    requestJob('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ prompt, kind: kind === 'auto' ? null : kind, model: model || null, ...(attachments.length ? { attachments } : {}) }),
    }),
  renameProject: (id, name) =>
    request(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
  deleteProject: (id) => request(`/api/projects/${id}`, { method: 'DELETE' }),

  refine: (id, instruction, attachments = []) =>
    requestJob(`/api/projects/${id}/refine`, {
      method: 'POST',
      body: JSON.stringify({ instruction, ...(attachments.length ? { attachments } : {}) }),
    }),
  repair: (id, errors, attempt) =>
    requestJob(`/api/projects/${id}/repair`, {
      method: 'POST',
      body: JSON.stringify({ errors, attempt }),
    }),
  preflight: (id) => request(`/api/projects/${id}/preflight`),

  codeAssist: (code, mode, question) =>
    request('/api/code/assist', { method: 'POST', body: JSON.stringify({ code, mode, question }) }),

  chat: (messages, context = '', searchWeb = true, attachments = [], projectId = null) =>
    request('/api/chat', { method: 'POST', body: JSON.stringify({ messages, context, search_web: searchWeb, attachments, ...(projectId ? { project_id: projectId } : {}) }) }),
  research: (messages, context = '', model = null) =>
    requestJob('/api/research', { method: 'POST', body: JSON.stringify({ messages, context, model }) }),

  createImage: (prompt) =>
    requestJob('/api/images', { method: 'POST', body: JSON.stringify({ prompt, as_project: true }) }),

  previewUrl: (id, reloadKey = 0) => `${BASE}/api/projects/${id}/preview?v=${reloadKey}`,
  exportUrl: (id) => `${BASE}/api/projects/${id}/export`,
}
