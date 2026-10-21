/** Marca brAIny: o nó central representa uma ideia que vira artefato. */
export function LogoMark({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="brAIny" className="logo-mark">
      <defs>
        <linearGradient id="brainy-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#C53A2D" />
          <stop offset="1" stopColor="#8F1D14" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#brainy-bg)" />
      <path d="M25 45c-4.6 0-8-3.2-8-7.4 0-1.1-.7-1.8-1.8-2.3-2.4-1.1-3.4-3.6-2.3-5.9.6-1.3.5-2.2-.2-3.4-1.9-3.2-.4-7.2 3.2-8.5 1.2-.4 1.9-1.1 2.4-2.3 1.5-3.5 5.6-4.9 8.9-3.1 1.2.6 2.1.5 3.3 0 3.4-1.5 7.4.2 8.6 3.7.4 1.2 1.1 1.9 2.3 2.4 3.6 1.4 5.1 5.4 3.1 8.6-.6 1-.7 1.9-.2 3 .5 1.1.6 2.4.2 3.5-.7 2-2.6 3.3-4.7 3.3h-4.4" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" opacity=".96" />
      <path d="M32 17v30M22 27h6M20 36h7M36 24h6M35 33h7" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" />
      <circle cx="32" cy="17" r="2.6" fill="#fff" /><circle cx="32" cy="47" r="2.6" fill="#fff" />
    </svg>
  )
}

export function Wordmark({ className = '' }) {
  return <span className={`brand-wordmark ${className}`}>br<span>AI</span>ny</span>
}

export function Brand({ compact = false }) {
  return (
    <div className={`brand-lockup ${compact ? 'is-compact' : ''}`}>
      <LogoMark size={compact ? 30 : 38} />
      <div className="brand-copy"><Wordmark /><p>do pedido ao pronto</p></div>
    </div>
  )
}
