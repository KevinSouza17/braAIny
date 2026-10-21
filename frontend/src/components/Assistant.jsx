import { useState } from 'react'
import { api } from '../api.js'
import { Markdown } from '../lib/markdown.jsx'
import { IconCheck, IconCode, IconSparkles } from './Icons.jsx'

const MODES = [
  { id: 'explain', label: 'Explicar' },
  { id: 'fix', label: 'Corrigir bugs' },
  { id: 'refactor', label: 'Refatorar' },
  { id: 'review', label: 'Revisar' },
]

const EXEMPLO = `function soma(a, b) {
  return a + b
}
console.log(soma(2))`

export default function Assistant({ onNotify }) {
  const [code, setCode] = useState('')
  const [mode, setMode] = useState('fix')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    if (!code.trim() || busy) return
    setBusy(true)
    setError('')
    setAnswer('')
    try {
      const result = await api.codeAssist(code, mode, question)
      setAnswer(result.answer)
    } catch (err) {
      setError(err.message)
      onNotify?.(err.message, 'error')
    } finally { setBusy(false) }
  }

  return (
    <section className="code-assistant">
      <header className="assistant-head"><div className="assistant-title"><span className="assistant-icon"><IconCode size={18} /></span><div><div className="panel-kicker"><span className="kicker-line" />Ferramentas</div><h1>Assistente de código</h1></div></div><span className="assistant-safe"><IconCheck size={13} /> análise sem execução</span><p>Cole um trecho para entender, corrigir, refatorar ou revisar. Nada é executado — o envio só acontece quando você clicar.</p></header>
      <div className="assistant-workspace">
        <form onSubmit={submit} className="assistant-editor-panel"><div className="editor-panel-top"><div className="mode-tabs">{MODES.map((item) => <button key={item.id} type="button" aria-pressed={mode === item.id} className={mode === item.id ? 'is-active' : ''} onClick={() => setMode(item.id)}>{item.label}</button>)}</div><button type="button" className="example-button" onClick={() => setCode(EXEMPLO)}>Usar exemplo</button></div><div className="code-input-wrap"><div className="code-gutter" aria-hidden="true"><span>01</span><span>02</span><span>03</span><span>04</span><span>05</span></div><textarea className="code-input" aria-label="Código para analisar" placeholder="Cole seu código aqui..." value={code} onChange={(event) => setCode(event.target.value)} spellCheck={false} /></div><input className="question-input" aria-label="Dúvida específica (opcional)" placeholder="Dúvida específica (opcional)" value={question} onChange={(event) => setQuestion(event.target.value)} /><button type="submit" className="assistant-submit" disabled={busy || !code.trim()} aria-busy={busy}><IconSparkles size={16} />{busy ? 'Analisando…' : 'Analisar código'}</button></form>
        <div className="assistant-answer-panel">{error && <div className="assistant-error" role="alert"><span aria-hidden="true">!</span><p>{error}</p></div>}{busy && !error && <div className="assistant-progress" role="status"><span className="loading-ring" aria-hidden="true" />Analisando seu código…</div>}{!answer && !error && !busy && <div className="answer-empty"><div className="answer-empty-icon"><IconSparkles size={18} /></div><h2>A resposta aparece aqui.</h2><p>Escolha um modo, cole o código e deixe o brAIny organizar a análise para você.</p></div>}{answer && <div className="assistant-result"><p className="assistant-success" role="status"><IconCheck size={14} /> Análise concluída</p><Markdown>{answer}</Markdown></div>}</div>
      </div>
    </section>
  )
}
