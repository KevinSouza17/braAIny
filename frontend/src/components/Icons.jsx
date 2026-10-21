/** Ícones inline em SVG: zero dependências e renderização consistente no preview. */
const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
}

const Svg = ({ children, size = 18, className = '' }) => <svg {...base} width={size} height={size} className={className} aria-hidden="true">{children}</svg>

export const IconPlus = (p) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
export const IconSend = (p) => <Svg {...p}><path d="M4.5 12 20 4.5 15.5 20 12 13.5 4.5 12Z" /></Svg>
export const IconTrash = (p) => <Svg {...p}><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6" /></Svg>
export const IconRefresh = (p) => <Svg {...p}><path d="M20 11a8 8 0 1 0-2.3 6.3M20 5v6h-6" /></Svg>
export const IconDownload = (p) => <Svg {...p}><path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" /></Svg>
export const IconExternal = (p) => <Svg {...p}><path d="M14 4h6v6M20 4l-8.5 8.5M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></Svg>
export const IconCode = (p) => <Svg {...p}><path d="m9 8-4 4 4 4M15 8l4 4-4 4" /></Svg>
export const IconSparkles = (p) => <Svg {...p}><path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9 12 3.5ZM18.5 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" /></Svg>
export const IconWrench = (p) => <Svg {...p}><path d="M14.5 5.5a4 4 0 0 0 5.2 5.2L21 12l-9 9-3-3 9-9-.5-3.5Z" /><path d="m6 14 4 4" /></Svg>
export const IconCheck = (p) => <Svg {...p}><path d="m5 13 4.5 4.5L19 7" /></Svg>
export const IconAlert = (p) => <Svg {...p}><path d="M12 4 2.8 20h18.4L12 4ZM12 10v5M12 18h.01" /></Svg>
export const IconGame = (p) => <Svg {...p}><path d="M7 8h10a5 5 0 0 1 4.6 7l-.8 1.6A2 2 0 0 1 18 18l-1.5-2h-9L6 18a2 2 0 0 1-2.8-1.4L2.4 15A5 5 0 0 1 7 8Z" /><path d="M8 11v2M7 12h2M15.5 11.5h.01M17 13h.01" /></Svg>
export const IconGlobe = (p) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.1 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.1-3.6-8.5S9.6 5.8 12 3.5Z" /></Svg>
export const IconApp = (p) => <Svg {...p}><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><path d="M3.5 9h17M9 9v10.5" /></Svg>
export const IconImage = (p) => <Svg {...p}><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><path d="m5 17 4.5-5 3.5 4 2.5-2.5L20 17M9 9.5h.01" /></Svg>
export const IconTerminal = (p) => <Svg {...p}><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><path d="m7.5 10 2.5 2-2.5 2M12.5 14h4" /></Svg>
export const IconLayers = (p) => <Svg {...p}><path d="m12 3.5 8.5 4.5L12 12.5 3.5 8 12 3.5ZM4 12.5 12 16.5l8-4M4 16.5 12 20.5l8-4" /></Svg>
export const IconStop = (p) => <Svg {...p}><rect x="6.5" y="6.5" width="11" height="11" rx="2" /></Svg>
export const IconMenu = (p) => <Svg {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Svg>
export const IconClose = (p) => <Svg {...p}><path d="m6 6 12 12M18 6 6 18" /></Svg>
export const IconChevronLeft = (p) => <Svg {...p}><path d="m14.5 5-7 7 7 7" /></Svg>
export const IconChevronRight = (p) => <Svg {...p}><path d="m9.5 5 7 7-7 7" /></Svg>
export const IconSearch = (p) => <Svg {...p}><circle cx="10.8" cy="10.8" r="6.3" /><path d="m16 16 4.2 4.2" /></Svg>
export const IconPaperclip = (p) => <Svg {...p}><path d="m8.5 12.5 5.8-5.8a3 3 0 0 1 4.2 4.2l-7.4 7.4a4.4 4.4 0 0 1-6.2-6.2l7.2-7.2" /></Svg>
export const IconMoon = (p) => <Svg {...p}><path d="M20 15.5A8.3 8.3 0 0 1 8.5 4 8.3 8.3 0 1 0 20 15.5Z" /></Svg>
export const IconSun = (p) => <Svg {...p}><circle cx="12" cy="12" r="3.5" /><path d="M12 2.8v1.7M12 19.5v1.7M21.2 12h-1.7M4.5 12H2.8M18.5 5.5l-1.2 1.2M6.7 17.3l-1.2 1.2M18.5 18.5l-1.2-1.2M6.7 6.7 5.5 5.5" /></Svg>

export const KIND_META = {
  site: { label: 'Site', icon: IconGlobe },
  game: { label: 'Jogo', icon: IconGame },
  app: { label: 'App', icon: IconApp },
  image: { label: 'Imagem', icon: IconImage },
}
