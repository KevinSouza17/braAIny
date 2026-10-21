import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { IconCheck, IconSparkles } from './Icons.jsx'

const SAMPLES = [
  { id: 'interface', title: 'Interface', caption: 'cartões e controles', className: 'visual-sample-interface' },
  { id: 'landscape', title: 'Paisagem', caption: 'céu e horizonte', className: 'visual-sample-landscape' },
  { id: 'abstract', title: 'Abstrato', caption: 'formas e contraste', className: 'visual-sample-abstract' },
]

export default function VisualCalibration({ onClose }) {
  const dialogRef = useRef(null)
  const returnFocusRef = useRef(null)
  const [selected, setSelected] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    returnFocusRef.current = document.activeElement
    const focusable = () => [...dialog.querySelectorAll('button:not(:disabled), textarea:not(:disabled)')]
    focusable()[0]?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') { onClose(); return }
      if (event.key !== 'Tab') return
      const items = focusable()
      const first = items[0]
      const last = items.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    dialog.addEventListener('keydown', handleKeyDown)
    return () => {
      dialog.removeEventListener('keydown', handleKeyDown)
      const target = returnFocusRef.current
      const usable = (element) => element?.isConnected && element !== document.body && typeof element.focus === 'function' && element.getClientRects().length > 0
      const fallback = document.querySelector('.main-stage')
      const destination = usable(target) ? target : fallback
      if (usable(destination)) requestAnimationFrame(() => destination.focus({ preventScroll: true }))
    }
  }, [])

  const finish = async (skip = false) => {
    if (skip) { localStorage.setItem('brainy.visual-check.v1', 'skipped'); onClose(); return }
    if (!selected || description.trim().length < 3) return
    setSaving(true)
    setError('')
    try {
      await api.saveMemory('visual_calibration', JSON.stringify({ selected, description: description.trim() }), 'visual_calibration')
      localStorage.setItem('brainy.visual-check.v1', 'done')
      onClose()
    } catch (requestError) { setError(requestError.message) } finally { setSaving(false) }
  }

  return <div ref={dialogRef} className="visual-calibration-backdrop" role="dialog" aria-modal="true" aria-labelledby="visual-calibration-title" aria-describedby="visual-calibration-description"><div className="visual-calibration-card"><div className="calibration-head"><div><div className="panel-kicker"><span className="kicker-line" />Calibração opcional</div><h2 id="visual-calibration-title">Ajude o brAIny a entender seu olhar</h2><p id="visual-calibration-description">Escolha a imagem que mais parece uma interface e descreva em uma frase. Isso fica salvo apenas na sua memória de conta.</p></div><button type="button" className="calibration-skip" onClick={() => finish(true)}>Agora não</button></div><div className="visual-samples" role="group" aria-label="Selecione uma imagem">{SAMPLES.map((sample) => <button key={sample.id} type="button" aria-pressed={selected === sample.id} className={`visual-sample ${sample.className} ${selected === sample.id ? 'is-selected' : ''}`} onClick={() => setSelected(sample.id)}><span className="visual-sample-art" aria-hidden="true" /><span className="visual-sample-copy"><strong>{sample.title}</strong><small>{sample.caption}</small></span>{selected === sample.id && <span className="visual-sample-check"><IconCheck size={13} /></span>}</button>)}</div><label htmlFor="visual-description">Como você descreveria a imagem escolhida?</label><textarea id="visual-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ex.: uma tela limpa, com cartões brancos e botões vermelhos" maxLength={240} />{error && <p className="calibration-error" role="alert">{error}</p>}<div className="calibration-actions"><button type="button" className="button-quiet" onClick={() => finish(true)}>Pular</button><button type="button" className="button-primary" disabled={!selected || description.trim().length < 3 || saving} onClick={() => finish(false)}>{saving ? 'Salvando…' : 'Salvar calibração'}</button></div><p className="calibration-note"><IconSparkles size={12} /> Preferência editável da sua conta; não treina o modelo-base.</p></div></div>
}
