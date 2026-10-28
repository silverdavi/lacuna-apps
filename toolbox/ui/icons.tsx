// The Lacuna icon system. Prefer filled geometric forms: 24px grid, chunky
// ~2px strokes, solid fills with one white cutout where needed. Icons inherit
// `currentColor` — light on suite plates. Residual thin outlines are cold tells.
import type { ReactNode } from 'react'

function I({ children, size = 18, title, filled }: {
  children: ReactNode; size?: number; title?: string; filled?: boolean
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={filled ? undefined : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      style={{ flex: 'none', display: 'block' }}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  )
}

export interface IconProps {
  size?: number
  title?: string
}

/* ------------------------------------------------------------- core surfaces — filled first pass */
export const IconInbox = (p: IconProps) => (
  <I {...p} filled>
    <path d="M3 7.5h18v11.5H3V7.5Z" />
    <path d="M3 7.5l9 6.5 9-6.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
  </I>
)
export const IconDocs = (p: IconProps) => (
  <I {...p} filled>
    <path d="M6 2h9l5 5v15H6V2Z" />
    <path d="M15 2v5h5" fill="none" stroke="#fff" strokeWidth="1.5" />
    <path d="M9 12h7M9 15.5h7" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
  </I>
)
export const IconSheets = (p: IconProps) => (
  <I {...p} filled>
    <rect x="3" y="3" width="18" height="18" rx="0" />
    <path d="M3 9.5h18M9.5 3v18" fill="none" stroke="#fff" strokeWidth="1.8" />
  </I>
)
export const IconSlides = (p: IconProps) => (
  <I {...p} filled>
    <rect x="2" y="3" width="20" height="13" rx="0" />
    <path d="M12 16v4M8 20h8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M6 8h8" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
  </I>
)
export const IconDesign = (p: IconProps) => (
  <I {...p} filled>
    <path d="M12 2l2.5 6.2L21 9.5l-4.5 4.3 1.2 6.5L12 17.2 6.3 20.3l1.2-6.5L3 9.5l6.5-1.3L12 2Z" />
  </I>
)
export const IconDatabase = (p: IconProps) => (
  <I {...p} filled>
    <ellipse cx="12" cy="6" rx="8" ry="3" />
    <path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
    <ellipse cx="12" cy="12" rx="8" ry="3" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.9" />
  </I>
)
export const IconPaint = (p: IconProps) => (
  <I {...p} filled>
    <path d="M19 2l3 3-10 10-4 1.2 1.2-4L19 2Z" />
    <path d="M8.5 14c-2.8.6-3.4 2.4-4 4.4C4 20.2 2.8 21 1.6 21c1 1.4 3.2 2.2 5.1 1.7 2.6-.6 3.9-2.5 3.9-4.8" />
  </I>
)
export const IconWhiteboard = (p: IconProps) => (
  <I {...p} filled>
    <rect x="2" y="3" width="20" height="14" rx="0" />
    <rect x="5.5" y="6" width="5" height="5" fill="#fff" opacity="0.9" />
    <path d="M8 17l-2 4M16 17l2 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </I>
)
export const IconCalendar = (p: IconProps) => (
  <I {...p} filled>
    <rect x="3" y="5" width="18" height="16" rx="0" />
    <path d="M3 10h18" fill="none" stroke="#fff" strokeWidth="1.8" />
    <path d="M8 2v5M16 2v5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <rect x="7" y="13" width="3" height="3" fill="#fff" />
  </I>
)
export const IconNotes = (p: IconProps) => (
  <I {...p} filled>
    <path d="M4 2h16v13l-6 6H4V2Z" />
    <path d="M14 21v-6h6" fill="none" stroke="#fff" strokeWidth="1.5" />
  </I>
)
export const IconWiki = (p: IconProps) => (
  <I {...p} filled>
    <path d="M12 6c-1.5-1.3-3.5-2-6-2H4v14h2c2.5 0 4.5.7 6 2 1.5-1.3 3.5-2 6-2h2V4h-2c-2.5 0-4.5.7-6 2Z" />
    <path d="M12 6v14" fill="none" stroke="#fff" strokeWidth="1.8" />
  </I>
)
export const IconPdf = (p: IconProps) => (
  <I {...p} filled>
    <path d="M6 2h9l5 5v15H6V2Z" />
    <path d="M15 2v5h5" fill="none" stroke="#fff" strokeWidth="1.5" />
  </I>
)
export const IconMessages = (p: IconProps) => (
  <I {...p} filled>
    <path d="M3 4h18v12H9l-6 5V4Z" />
    <path d="M7 9h10M7 12.5h6" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
  </I>
)
export const IconMeeting = (p: IconProps) => (
  <I {...p} filled>
    <rect x="2" y="5" width="14" height="13" rx="0" />
    <path d="M16 9.5l6-3.5v11l-6-3.5" />
  </I>
)
export const IconFiles = (p: IconProps) => (
  <I {...p} filled>
    <path d="M2.5 6h7l2 2.5h10v11.5h-19V6Z" />
  </I>
)
export const IconFolder = (p: IconProps) => (
  <I {...p} filled>
    <path d="M2 6h7l2 2.5h11v11.5H2V6Z" />
    <path d="M2 10.5h20" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.5" />
  </I>
)

/* --------------------------------------------------------- money & business */
export const IconFinance = (p: IconProps) => (
  <I {...p} filled>
    <rect x="3" y="4" width="18" height="16" rx="0" />
    <path d="M7 16V11M11 16V8M15 16v-5M19 16V7" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
  </I>
)
export const IconWallet = (p: IconProps) => (
  <I {...p} filled>
    <rect x="2" y="6" width="20" height="14" rx="0" />
    <path d="M6 6V4.5A1.5 1.5 0 0 1 7.5 3H18" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="16.5" cy="13" r="1.6" fill="#fff" />
  </I>
)
export const IconBills = (p: IconProps) => (
  <I {...p} filled>
    <path d="M5 2h14v20l-2.3-1.5L14.5 22l-2.5-1.5L9.5 22 7.3 20.5 5 22V2Z" />
    <path d="M9 8h6M9 12h6" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
  </I>
)
export const IconPayroll = (p: IconProps) => (
  <I {...p} filled>
    <circle cx="10" cy="10" r="6.5" />
    <path d="M10 7v6M8 11.2c.5 1 3.5 1.1 3.8-.2.3-1.4-3.2-1.1-3.2-2.5 0-1.1 2.5-1.3 3.5-.3" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M15 15.5a5.5 5.5 0 1 0 4.2 4" fill="none" stroke="currentColor" strokeWidth="2" />
  </I>
)
export const IconTaxes = (p: IconProps) => (
  <I {...p} filled>
    <circle cx="7.5" cy="7.5" r="3.2" />
    <circle cx="16.5" cy="16.5" r="3.2" />
    <path d="M18.5 5.5L5.5 18.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </I>
)
export const IconInvoice = (p: IconProps) => (
  <I {...p} filled>
    <path d="M5 2h14v20H5V2Z" />
    <path d="M8.5 7h7M8.5 11h7M8.5 15h4" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
  </I>
)
export const IconBriefcase = (p: IconProps) => (
  <I {...p} filled>
    <rect x="2" y="7" width="20" height="14" rx="0" />
    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M2 12h20" fill="none" stroke="#fff" strokeWidth="1.8" />
  </I>
)
export const IconStorefront = (p: IconProps) => (
  <I {...p} filled>
    <path d="M3 10l1.5-5.5h15L21 10v10H3V10Z" />
    <path d="M3 10c0 1.5 1.2 2.7 2.8 2.7S8.5 11.5 8.5 10c0 1.5 1.2 2.7 2.8 2.7s2.7-1.2 2.7-2.7c0 1.5 1.2 2.7 2.8 2.7S21 11.5 21 10" fill="none" stroke="#fff" strokeWidth="1.4" />
    <path d="M10 20v-5h4v5" fill="#fff" />
  </I>
)
export const IconCrm = (p: IconProps) => (
  <I {...p} filled>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M3 20c0-3.3 2.5-5.5 6-5.5s6 2.2 6 5.5" />
    <circle cx="17" cy="9.5" r="2.5" />
    <path d="M16 15c2.5.3 4.5 2 4.5 4.5" fill="none" stroke="currentColor" strokeWidth="2" />
  </I>
)
export const IconProjects = (p: IconProps) => (
  <I {...p} filled>
    <rect x="3" y="3" width="18" height="18" rx="0" />
    <path d="M8 8v8M12 8v5M16 8v3" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
  </I>
)
export const IconProcurement = (p: IconProps) => (
  <I {...p} filled>
    <path d="M12 2.5l9 5v9l-9 5-9-5v-9l9-5Z" />
    <path d="M3.5 7.5l8.5 4.5 8.5-4.5M12 12v9" fill="none" stroke="#fff" strokeWidth="1.6" />
  </I>
)
export const IconTimesheets = (p: IconProps) => (
  <I {...p} filled>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 6.5v6l4 2.2" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </I>
)
export const IconAnalytics = (p: IconProps) => (
  <I {...p} filled>
    <rect x="3" y="3" width="18" height="18" rx="0" />
    <path d="M6 16l4-5 3 2.5 5-6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </I>
)

/* --------------------------------------------------- authority, legal, gov */
export const IconVault = (p: IconProps) => (
  <I {...p} filled>
    <rect x="3" y="3" width="18" height="18" rx="0" />
    <circle cx="12" cy="12" r="4.5" fill="none" stroke="#fff" strokeWidth="2" />
    <path d="M12 10v2.2l1.4 1.4" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
  </I>
)
export const IconSecurity = (p: IconProps) => (
  <I {...p} filled>
    <path d="M12 2.5l8 3.2v6.5c0 4.8-3.4 8-8 9.5-4.6-1.5-8-4.7-8-9.5V5.7L12 2.5Z" />
    <path d="M9 12l2.2 2.2L15.5 10" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </I>
)
export const IconConsent = (p: IconProps) => (
  <I {...p} filled>
    <circle cx="8.5" cy="8.5" r="5" />
    <path d="M12 12l8.5 8.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M16.2 16.2l2.2-2.2M18.5 18.5l2-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </I>
)
export const IconLegal = (p: IconProps) => (
  <I {...p} filled>
    <path d="M11 3h2v16h-2z" />
    <path d="M7 21h10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M4 8l8-3 8 3-3.5 7a3.2 3.2 0 0 1-5.5 0L4 8Z" />
    <path d="M4 8l8-3 8 3" fill="none" stroke="#fff" strokeWidth="1.2" opacity="0.5" />
  </I>
)
export const IconGrants = (p: IconProps) => (
  <I {...p} filled>
    <circle cx="12" cy="9" r="6" />
    <path d="M9 14L7.2 21.5 12 19l4.8 2.5L15 14" />
    <circle cx="12" cy="9" r="1.4" fill="#fff" />
  </I>
)
export const IconDataRoom = (p: IconProps) => (
  <I {...p} filled>
    <path d="M2.5 6h7l2 2.5h10v12.5h-19V6Z" />
    <rect x="9" y="12" width="6" height="5" fill="#fff" />
    <path d="M10.5 12v-1.3a1.5 1.5 0 0 1 3 0V12" fill="none" stroke="#fff" strokeWidth="1.5" />
  </I>
)
export const IconSignature = (p: IconProps) => (
  <I {...p} filled>
    <path d="M16 3l5 5-10 10-5 1.5 1.5-5L16 3Z" />
    <path d="M3 20.5h18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </I>
)
export const IconPermit = (p: IconProps) => (
  <I {...p} filled>
    <rect x="4" y="2" width="16" height="20" rx="0" />
    <path d="M8 7.5h8M8 11.5h8" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="10" cy="16.5" r="2" fill="#fff" />
  </I>
)
export const IconGov = (p: IconProps) => (
  <I {...p} filled>
    <path d="M3 20h18M4 17h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M4 10l8-6.5L20 10v7H4v-7Z" />
    <path d="M7 17V11M10.5 17V11M13.5 17V11M17 17V11" fill="none" stroke="#fff" strokeWidth="1.8" />
  </I>
)

/* ------------------------------------------------------ people & personal */
export const IconHome = (p: IconProps) => (
  <I {...p} filled>
    <path d="M3 11l9-8 9 8v10H3V11Z" />
    <path d="M9 21v-7h6v7" fill="#fff" />
  </I>
)
export const IconPeople = (p: IconProps) => (
  <I {...p} filled>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M3 20c0-3.3 2.5-5.5 6-5.5s6 2.2 6 5.5" />
    <circle cx="17" cy="9" r="2.6" />
    <path d="M16.5 15.2c2 .6 3.5 2.2 3.5 4.8" fill="none" stroke="currentColor" strokeWidth="2" />
  </I>
)
export const IconIdentity = (p: IconProps) => (
  <I {...p} filled>
    <rect x="2" y="4" width="20" height="16" rx="0" />
    <circle cx="8.5" cy="11" r="2.2" fill="#fff" />
    <path d="M5.5 16.5c.5-1.6 1.7-2.5 3-2.5s2.5.9 3 2.5" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M14 9h5M14 13h5" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
  </I>
)
export const IconSchool = (p: IconProps) => (
  <I {...p} filled>
    <path d="M2 9.5L12 4l10 5.5-10 5.5L2 9.5Z" />
    <path d="M6 12v4.5c0 1.5 2.7 2.8 6 2.8s6-1.3 6-2.8V12" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M22 9.5V15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </I>
)
export const IconClinic = (p: IconProps) => (
  <I {...p} filled>
    <path d="M12 3c-4.5 0-8.5 3-8.5 8 0 5.2 4.8 8.2 8.5 10 3.7-1.8 8.5-4.8 8.5-10 0-5-4-8-8.5-8Z" />
    <path d="M12 8v7M8.5 11.5h7" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
  </I>
)
export const IconInsurance = (p: IconProps) => (
  <I {...p} filled>
    <path d="M12 2.5v2M3 12.5a9 9 0 0 1 18 0H3Z" />
    <path d="M12 12.5v6a2.2 2.2 0 0 1-4.4 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </I>
)
export const IconSalon = (p: IconProps) => (
  <I {...p} filled>
    <circle cx="7" cy="7" r="3" />
    <circle cx="7" cy="17" r="3" />
    <path d="M9.5 9L20 19.5M9.5 15L20 4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </I>
)
export const IconTasks = (p: IconProps) => (
  <I {...p} filled>
    <rect x="3" y="3" width="18" height="18" rx="0" />
    <path d="M7.5 12.2l2.8 2.8 6-6.2" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </I>
)
export const IconEstate = (p: IconProps) => (
  <I {...p} filled>
    <path d="M11 2h2v20h-2z" />
    <path d="M12 21H6.5M12 21h5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M12 5c-2.2 2.8-6 2.2-7 5.5 2.8 1.1 5.5-.6 7-2.2M12 8.5c2.2 2.8 6 2.2 7 5.5-2.8 1.1-5.5-.6-7-2.2" />
  </I>
)
export const IconIndustry = (p: IconProps) => (
  <I {...p} filled>
    <path d="M2.5 20V9l5.5 3.5V9l5.5 3.5V5.5h8V20h-19Z" />
    <path d="M16.5 16h2" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
  </I>
)

/* ---------------------------------------------------------------- chrome */
export const IconSearch = (p: IconProps) => (
  <I {...p} filled>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <circle cx="10.5" cy="10.5" r="3.2" fill="#fff" />
    <path d="M15.2 15.2l5.3 5.3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </I>
)
export const IconSettings = (p: IconProps) => (
  <I {...p} filled>
    <circle cx="12" cy="12" r="3.5" fill="#fff" />
    <path d="M12 2.5v2.8M12 18.7v2.8M2.5 12h2.8M18.7 12h2.8M5.2 5.2l2 2M16.8 16.8l2 2M18.8 5.2l-2 2M7.2 16.8l-2 2" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" />
  </I>
)
export const IconHelp = (p: IconProps) => (
  <I {...p} filled>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.2 9.5a2.8 2.8 0 1 1 3.8 2.6c-.9.45-1 1.1-1 1.9" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="17" r="1.1" fill="#fff" />
  </I>
)
export const IconGrid = (p: IconProps) => (
  <I {...p} filled>
    <rect x="3" y="3" width="8" height="8" />
    <rect x="13" y="3" width="8" height="8" />
    <rect x="3" y="13" width="8" height="8" />
    <rect x="13" y="13" width="8" height="8" />
  </I>
)
export const IconLayers = (p: IconProps) => (
  <I {...p} filled>
    <path d="M12 2.5l10 5-10 5L2 7.5l10-5Z" />
    <path d="M2 12.5l10 5 10-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M2 17l10 5 10-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  </I>
)
export const IconChevron = (p: IconProps) => (
  <I {...p}><path d="M9 6l6 6-6 6" /></I>
)

/* ------------------------------------------------------------- registries */
/** Every icon, named — powers the theme-lab sheet and keyword lookup. */
export const ICONS = {
  inbox: IconInbox, docs: IconDocs, sheets: IconSheets, slides: IconSlides,
  design: IconDesign, database: IconDatabase, paint: IconPaint, whiteboard: IconWhiteboard,
  calendar: IconCalendar, notes: IconNotes, wiki: IconWiki, pdf: IconPdf,
  messages: IconMessages, meeting: IconMeeting, files: IconFiles,
  finance: IconFinance, wallet: IconWallet, bills: IconBills, payroll: IconPayroll,
  taxes: IconTaxes, invoice: IconInvoice, briefcase: IconBriefcase, storefront: IconStorefront,
  crm: IconCrm, projects: IconProjects, procurement: IconProcurement,
  timesheets: IconTimesheets, analytics: IconAnalytics,
  vault: IconVault, security: IconSecurity, consent: IconConsent, legal: IconLegal,
  grants: IconGrants, dataroom: IconDataRoom, signature: IconSignature,
  permit: IconPermit, gov: IconGov,
  home: IconHome, people: IconPeople, identity: IconIdentity, school: IconSchool,
  clinic: IconClinic, insurance: IconInsurance, salon: IconSalon, tasks: IconTasks,
  estate: IconEstate, industry: IconIndustry,
  search: IconSearch, settings: IconSettings, help: IconHelp,
  grid: IconGrid, layers: IconLayers, chevron: IconChevron,
  folder: IconFolder,
} as const

export type IconName = keyof typeof ICONS

/** Suite → icon, for group headers and fallbacks. */
export const SUITE_ICONS: Record<string, IconName> = {
  'cross-cutting': 'layers',
  foundation: 'identity',
  communication: 'messages',
  productivity: 'docs',
  personal: 'home',
  business: 'briefcase',
  'legal-gov': 'legal',
  healthcare: 'clinic',
  industry: 'industry',
}

const KEYWORDS: [RegExp, IconName][] = [
  [/inbox/i, 'inbox'], [/whiteboard/i, 'whiteboard'], [/slide|present|deck/i, 'slides'],
  [/sheet|spreadsheet/i, 'sheets'], [/design studio|brand/i, 'design'], [/database/i, 'database'],
  [/paint|image edit/i, 'paint'], [/wiki/i, 'wiki'], [/note/i, 'notes'], [/pdf|redact/i, 'pdf'],
  [/docs|document collab|write/i, 'docs'], [/calendar|appointment|booking|meeting room/i, 'calendar'],
  [/meeting/i, 'meeting'], [/messag/i, 'messages'], [/vault|data room/i, 'vault'],
  [/security|audit/i, 'security'], [/consent|delegat/i, 'consent'],
  [/legal|matter|contract|intake/i, 'legal'], [/grant/i, 'grants'],
  [/sign|e-sign/i, 'signature'], [/permit|licens|compliance|policy/i, 'permit'],
  [/benefit|city|gov/i, 'gov'], [/wallet|identity|claims/i, 'wallet'],
  [/payroll|contractor/i, 'payroll'], [/tax/i, 'taxes'], [/invoic|payment|quote/i, 'invoice'],
  [/bookkeep|account|expense|fund/i, 'finance'], [/bill|subscription/i, 'bills'],
  [/crm|donor|sales/i, 'crm'], [/project/i, 'projects'],
  [/procure|vendor|inventory|order|supply/i, 'procurement'],
  [/timesheet|punch|time/i, 'timesheets'], [/analytic|report/i, 'analytics'],
  [/school|education|student/i, 'school'],
  [/medical|clinic|dental|patient|therap|oncolog|nurs|care/i, 'clinic'],
  [/insurance/i, 'insurance'], [/salon|barber|spa/i, 'salon'],
  [/storefront|commerce|store|restaurant|cafe/i, 'storefront'],
  [/estate|will/i, 'estate'], [/hr|people|hiring|onboard|job/i, 'people'],
  [/family|household|kids|home/i, 'home'], [/space|switch/i, 'grid'],
  [/task/i, 'tasks'], [/file/i, 'files'],
]

/** Best-effort icon for a flow: title keywords first (most specific), then app
 * names (ignoring the ubiquitous Universal Inbox), else the suite icon. */
export function iconForFlow(meta: { title: string; apps?: string[]; suite: string }): IconName {
  for (const [re, name] of KEYWORDS) if (re.test(meta.title)) return name
  const apps = (meta.apps ?? []).filter((a) => !/universal inbox/i.test(a)).join(' ')
  for (const [re, name] of KEYWORDS) if (re.test(apps)) return name
  return SUITE_ICONS[meta.suite] ?? 'grid'
}
