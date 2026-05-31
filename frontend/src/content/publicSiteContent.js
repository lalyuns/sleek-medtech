import { useEffect, useState } from 'react'
import api from '../api/client'

export const PUBLIC_SITE_CONTENT_KEY = 'sleek_public_site_content'
export const PUBLIC_SITE_PENDING_KEY = 'sleek_public_site_pending_publish'

export const PUBLIC_FONT_OPTIONS = [
  {
    value: 'modern-sans',
    label: '現代無襯線',
    stack: '"Noto Sans TC", Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  },
  {
    value: 'system',
    label: '系統預設',
    stack: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  },
  {
    value: 'rounded',
    label: '圓體感',
    stack: '"PingFang TC", "Microsoft JhengHei", "Noto Sans TC", system-ui, sans-serif'
  },
  {
    value: 'serif',
    label: '宋體感',
    stack: '"Noto Serif TC", "Songti TC", "PMingLiU", serif'
  }
]

export const PUBLIC_HEADING_WEIGHT_OPTIONS = [
  { value: 'light', label: '細', weight: 420 },
  { value: 'regular', label: '正常', weight: 520 },
  { value: 'medium', label: '中等', weight: 650 },
  { value: 'bold', label: '粗', weight: 800 }
]

export function getPublicFontStack(fontFamily) {
  return PUBLIC_FONT_OPTIONS.find((option) => option.value === fontFamily)?.stack || PUBLIC_FONT_OPTIONS[0].stack
}

export function getPublicHeadingWeight(headingWeight) {
  return PUBLIC_HEADING_WEIGHT_OPTIONS.find((option) => option.value === headingWeight)?.weight || 650
}

const PAGE_BACKGROUND_DEFAULTS = {
  home: { imageUrl: '', imageAlt: '首頁整頁背景圖片', opacity: 16, fit: 'cover' },
  showcase: { imageUrl: '', imageAlt: '展示頁整頁背景圖片', opacity: 16, fit: 'cover' },
  catalog: { imageUrl: '', imageAlt: '產品目錄整頁背景圖片', opacity: 14, fit: 'cover' },
  order: { imageUrl: '', imageAlt: '訂購頁整頁背景圖片', opacity: 14, fit: 'cover' },
  join: { imageUrl: '', imageAlt: '加入我們整頁背景圖片', opacity: 16, fit: 'cover' },
  login: { imageUrl: '', imageAlt: '登入頁整頁背景圖片', opacity: 22, fit: 'cover' }
}

function clampPercent(value, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(100, Math.max(0, number))
}

export function getPublicPageBackgroundStyle(content, pageKey, baseColor = '#f6f8fb', overlayRgb = '246, 248, 251') {
  const background = {
    ...(PAGE_BACKGROUND_DEFAULTS[pageKey] || {}),
    ...(content?.pageBackgrounds?.[pageKey] || {})
  }

  if (!background.imageUrl) return { backgroundColor: baseColor }

  const imageVisibility = clampPercent(background.opacity, PAGE_BACKGROUND_DEFAULTS[pageKey]?.opacity ?? 16) / 100
  const overlayOpacity = Math.min(0.98, Math.max(0, 1 - imageVisibility))
  const imageUrl = String(background.imageUrl).replace(/"/g, '\\"')

  return {
    backgroundColor: baseColor,
    backgroundImage: `linear-gradient(rgba(${overlayRgb}, ${overlayOpacity}), rgba(${overlayRgb}, ${overlayOpacity})), url("${imageUrl}")`,
    backgroundSize: background.fit === 'contain' ? 'contain' : 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: background.fit === 'contain' ? 'repeat' : 'no-repeat',
    backgroundAttachment: 'fixed'
  }
}

export const defaultPublicSiteContent = {
  brand: '睿程生醫股份有限公司',
  siteTitle: '睿程生醫股份有限公司 | 骨科 3D 建模與客製化醫療器材',
  fontFamily: 'modern-sans',
  headingWeight: 'medium',
  logoUrl: '',
  logoAlt: '睿程生醫股份有限公司 logo',
  pageBackgrounds: PAGE_BACKGROUND_DEFAULTS,
  navLabels: {
    home: '首頁',
    showcase: '展示',
    catalog: '產品',
    order: '訂購',
    join: '加入我們',
    login: '登入'
  },
  landing: {
    heroKicker: 'Orthopedic MedTech Collaboration',
    heroShortTitle: '睿程生醫',
    heroTitle: '以 3D 建模與拓樸優化，推動骨科醫療器材的客製化設計',
    heroSubtitle: '我們協助醫師、醫院與製造合作方，將臨床需求轉化為可視化、可追蹤、可協作的醫療輔助器材開發流程。',
    heroDisplaySubtitle: '用 3D 模型、材料證據與可追溯流程，讓客製化醫療器材從需求到簽核都更清楚。',
    heroPrimaryCtaLabel: '探索展示',
    heroPrimaryCtaPath: '/showcase',
    heroSecondaryCtaLabel: '產品訂購',
    heroSecondaryCtaPath: '/order',
    scrollCueLabel: '向下捲動',
    statementText: '模型版本、材料、回饋、報告與 BOM，集中在同一條可追溯證據鏈',
    finalCtaKicker: 'Ready',
    finalCtaTitle: '公開展示建立信任，內部系統管理版本變更',
    finalCtaPrimaryLabel: '觀看展示',
    finalCtaPrimaryPath: '/showcase',
    finalCtaSecondaryLabel: '產品訂購',
    finalCtaSecondaryPath: '/order',
    accessKicker: 'Access',
    accessCompactTitle: '公開看方向，內部看細節',
    lineBotTitle: 'LINE Bot 帳號申請與諮詢入口',
    lineBotText: '需要申請內部系統權限、確認產品訂購或提交需求時，請透過 LINE Bot 留下資料；我們會依身分與需求審核後續權限。',
    lineBotButtonLabel: 'LINE Bot 申請入口',
    lineBotUrl: '',
    lineBotQrUrl: '',
    lineBotQrAlt: 'LINE Bot 申請 QR code',
    aiAssistantName: '小睿',
    aiAssistantBadge: 'AI',
    aiAssistantButtonTitle: '小睿 AI 助理',
    aiAssistantButtonSubtitle: '產品、訂購、合作都能問',
    aiAssistantPanelKicker: 'Ruicheng AI Assistant',
    aiAssistantPanelTitle: '小睿 AI 助理',
    aiAssistantGreeting: '您好，我是小睿，睿程生醫的官網 AI 助理。您可以問我公司介紹、產品展示、訂購方式、合作需求或內部系統申請流程。',
    aiAssistantThinkingText: '小睿正在整理官網內容...',
    aiAssistantInputPlaceholder: '輸入想了解的內容',
    aiAssistantNote: '僅依官網公開內容回答；詳細材料參數、模型版本、BOM、報告與稽核紀錄需進入內部系統。',
    aiAssistantRole: '睿程生醫官網的 AI 助理與對外合作窗口',
    heroImageUrl: '',
    heroImageAlt: '骨科醫療科技產品展示',
    heroImageOpacity: 78,
    heroImageFit: 'contain',
    public3dTitle: '公開 3D 產品概念展示',
    public3dIntro:
      '這個展示只呈現骨科醫療輔助器材的概念模型，協助外部訪客理解技術方向；不公開 STL 模型版本、材料參數、BOM 成本或專案報告。',
    showcasePageTitle: '3D 模型與靜態產品展示',
    showcasePageIntro: '這裡集中放公開可看的產品概念展示；詳細材料參數、模型版本、報告與稽核紀錄仍需登入內部系統。',
    public3dNoteTitle: '公開展示範圍',
    public3dNoteFallback: '可旋轉、縮放與切換概念模型。詳細幾何、材料與版本資料需登入內部系統。',
    imageGalleryTitle: '靜態產品與應用圖片展示',
    imageGalleryIntro:
      '以公開圖片呈現產品概念、應用情境與合作流程視覺，不包含內部專案參數、模型版本、BOM 成本或臨床報告。',
    accessTitle: '取得更多權限，查看完整專案資料',
    footerText: '小型骨科醫療科技團隊，專注於 3D 建模、拓樸優化、客製化醫療輔助器材與數位協作流程。',
    disclaimer: '本網站內容僅作技術與合作資訊展示，實際醫療器材使用、法規審查與臨床判斷仍需依正式流程辦理。'
  },
  catalog: {
    pageTitle: '產品目錄',
    intro: '外部使用者可查看 3D 產品、圖片產品、材料本身與術後恢復相關項目。若要直接訂購，請使用簡化訂購入口。',
    orderEntryLabel: '前往產品訂購頁',
    searchTitle: '器材查詢',
    searchHint: '依使用部位、臨床用途或適應症快速找出相關醫材。',
    searchPlaceholder: '搜尋下顎、重建、術中固定...',
    resultsTitle: '產品與組件',
    emptyText: '找不到符合條件的器材。',
    selectedFallbackTitle: '產品內容',
    orderProductLabel: '訂購這類產品',
    requestTitle: '送出需求申請',
    requestHint: '審核後才會開通系統帳號',
    successMessage: '已收到申請，內部窗口會確認規格、報價與帳號權限。',
    submitLabel: '送出申請'
  },
  order: {
    heroKicker: 'Product Order',
    heroTitle: '簡單三步驟，送出產品訂購需求',
    heroIntro: '選產品、選數量、留下電話。我們收到後會由專人確認規格、交期與報價。',
    successTitle: '訂單已送出',
    successText: '我們會用您選擇的聯絡方式確認產品、數量、交期與後續付款或開立報價流程。',
    stepTypeTitle: '選擇產品類型',
    stepTypeIntro: '公司可以販售 3D 產品、圖片展示產品，也可以直接販售材料本身。',
    stepProductTitle: '選擇要訂購的產品',
    stepProductIntro: '點一下產品卡即可選取。若不確定，選最接近的品項並在備註說明。',
    emptyText: '目前此分類沒有公開可訂購產品。',
    quantityTitle: '訂購數量',
    quantityHint: '可先填預估數量，專人會再次確認。',
    stepContactTitle: '留下聯絡資料',
    stepContactIntro: '電話是必填，Email 可不填。這樣年長使用者也能直接完成訂購。',
    contactOptions: ['電話', 'LINE', 'Email', '由專人判斷'],
    submitLabel: '送出產品訂單',
    submittingLabel: '送出中...'
  },
  login: {
    title: '睿程生醫股份有限公司 登入',
    emailLabel: 'Email',
    passwordLabel: '密碼',
    submitLabel: '登入',
    errorMessage: 'Email 或密碼錯誤'
  },
  publicConceptModels: [
    {
      id: 'drf-reductor',
      title: 'DRF Reductor 展示模型',
      description: '公開展示 DRF reductor 的外觀與幾何概念，供訪客旋轉檢視；詳細材料、尺寸與版本紀錄仍保留在內部系統。',
      modelUrl: '/models/drf-reductor-v251118.stl',
      fileName: 'DRF reductor V251118.stl',
      hidden: false
    },
    {
      id: 'magic-ring',
      title: 'Magic Ring 展示模型',
      description: '公開展示 Magic ring 的產品外型與結構概念，協助外部訪客快速理解產品形式。',
      modelUrl: '/models/magic-ring.stl',
      fileName: 'Magic ring.stl',
      hidden: false
    },
    {
      id: 'slotted-ring',
      title: 'Slotted Ring 展示模型',
      description: '公開展示 Slotted ring 的外觀與槽孔結構概念，僅作官網互動檢視使用。',
      modelUrl: '/models/slotted-ring.stl',
      fileName: 'Slotted ring.stl',
      hidden: false
    }
  ],
  publicImageGallery: [
    {
      id: 'modeling',
      title: '3D 建模溝通',
      text: '用概念圖片協助醫師、醫院與製造端快速理解模型方向。',
      imageUrl: '',
      imageAlt: '3D 建模溝通概念圖片',
      hidden: false
    },
    {
      id: 'guide-photo',
      title: '手術輔助器材概念',
      text: '展示導引、定位與固定方向的公開視覺，不含實際尺寸與材料參數。',
      imageUrl: '',
      imageAlt: '手術輔助器材概念圖片',
      hidden: false
    },
    {
      id: 'workflow',
      title: '數位協作流程',
      text: '呈現從需求確認、版本討論到權限審核的合作流程概念。',
      imageUrl: '',
      imageAlt: '數位協作流程概念圖片',
      hidden: false
    },
    {
      id: 'post-op-recovery',
      title: '術後恢復輔助',
      text: '以公開圖片說明術後恢復、復健溝通與追蹤模型的應用方向。',
      imageUrl: '',
      imageAlt: '術後恢復輔助概念圖片',
      hidden: false
    },
    {
      id: 'fixator-material',
      title: '固定器材料展示',
      text: '呈現固定器材料、骨釘周邊材料與材料包的公開展示方向。',
      imageUrl: '',
      imageAlt: '固定器材料展示概念圖片',
      hidden: false
    },
    {
      id: 'clinical-communication',
      title: '醫病溝通情境',
      text: '用非敏感的視覺素材協助外部訪客理解醫師、病患與製造端的協作情境。',
      imageUrl: '',
      imageAlt: '醫病溝通情境概念圖片',
      hidden: false
    }
  ],
  featuredStories: [
    {
      number: '01',
      label: '3D Modeling',
      title: '模型，一眼看懂',
      text: '用公開模型快速對齊醫師、醫院與製造端',
      points: ['模型溝通', '術前討論', '製造協作'],
      imageIndex: 0,
      imageFit: 'contain',
      imagePosition: 'center',
      ctaLabel: '了解更多',
      ctaPath: '/showcase'
    },
    {
      number: '02',
      label: 'Surgical Support',
      title: '輔具，清楚討論',
      text: '導引、定位與固定概念公開說明，細節留在內部系統',
      points: ['導引輔具', '固定器材料', '骨釘方向'],
      imageIndex: 1,
      imageFit: 'contain',
      imagePosition: 'center',
      ctaLabel: '了解更多',
      ctaPath: '/catalog'
    },
    {
      number: '03',
      label: 'Recovery',
      title: '追蹤，持續溝通',
      text: '用簡潔圖片說明恢復輔助與追蹤場景',
      points: ['術後恢復', '病患理解', '追蹤溝通'],
      imageIndex: 3,
      imageFit: 'contain',
      imagePosition: 'center',
      ctaLabel: '了解更多',
      ctaPath: '/catalog'
    }
  ],
  impactStats: [
    { value: '3D', label: '模型協作' },
    { value: 'BOM', label: '成本與材料' },
    { value: 'Trace', label: '版本溯源' },
    { value: 'Sign', label: '簽核留痕' }
  ],
  accessColumns: [
    { title: '公開網站', text: '公司、展示、產品與訂購入口' },
    { title: '內部系統', text: '模型版本、材料參數、BOM、報告與稽核紀錄' }
  ],
  customSections: [
    {
      id: 'quality',
      kicker: 'Quality Direction',
      title: '以可追蹤流程支援醫療器材開發溝通',
      text: '每個公開模塊只呈現合作方向、概念案例與流程價值；實際材料參數、模型版本、報告與稽核紀錄仍保留在登入後的內部系統。',
      imageUrl: '',
      layout: 'text'
    }
  ],
  join: {
    pageTitle: '加入我們 | 睿程生醫股份有限公司',
    heroTitle: '加入我們，一起推動客製化骨科醫療科技',
    heroSubtitle:
      '我們結合 3D 建模、拓樸優化、材料參數與臨床需求，開發更精準、更可溝通的醫療輔助器材與數位協作流程。',
    heroKicker: 'Join Us',
    primaryCtaLabel: '填寫加入申請',
    secondaryCtaLabel: '了解公司',
    navHomeLabel: '官方網站',
    navRolesLabel: '合作方向',
    navApplicationLabel: '申請',
    navLoginLabel: '登入',
    whyKicker: 'Why Join Us',
    reasonCardText: '你會接觸醫療、工程、設計與資料系統的交會處，和團隊一起把需求變成可用流程。',
    rolesKicker: 'Open Roles / 合作方向',
    fitKicker: 'Who We Are Looking For',
    applicationKicker: 'Application Form',
    submitLabel: '送出申請',
    footerHomeLabel: '官方網站',
    footerLoginLabel: '內部系統登入',
    whyTitle: '在小型醫療科技新創中，直接參與產品與系統成形。',
    rolesTitle: '目前歡迎以下方向的人才或合作夥伴',
    fitTitle: '適合一起合作的人',
    applicationTitle: '加入我們 / 合作申請',
    applicationIntro: '這個表單給人才、實習生與合作夥伴使用，和內部系統帳號申請不同。',
    success: '申請已送出，我們將依照目前專案需求與您聯繫。',
    footerText: '加入我們頁面僅作人才與合作申請使用，不提供內部專案參數、材料、模型版本或稽核資料。',
    reasons: [
      '接觸真實骨科醫療應用',
      '參與 3D 建模與醫療器材設計',
      '接觸拓樸優化與客製化骨釘開發方向',
      '小團隊，能直接參與產品與系統建置'
    ],
    roles: [
      { title: '3D 建模 / 醫療模型設計助理', text: '協助模型整理、概念視覺化與醫療器材設計溝通。' },
      { title: '前端 / 資料庫系統開發實習生', text: '參與內部資料庫、權限與專案協作流程的前端建置。' },
      { title: '產品設計 / 工業設計合作夥伴', text: '協助輔助器材外型、使用流程與製造溝通設計。' },
      { title: '業務開發 / 醫療合作助理', text: '協助醫院、廠商、投資人與跨領域合作需求整理。' }
    ],
    fit: [
      '對醫療科技有興趣',
      '願意參與跨領域合作',
      '具備設計、工程、資訊系統、醫療管理或商業開發背景者佳',
      '能適應小型新創彈性工作模式'
    ]
  }
}

function mergeContent(base, saved) {
  if (!saved || typeof saved !== 'object') return base

  return Object.entries(saved).reduce((content, [key, value]) => {
    if (Array.isArray(value)) return { ...content, [key]: value }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return { ...content, [key]: mergeContent(content[key] || {}, value) }
    }
    return { ...content, [key]: value }
  }, base)
}

export function getPublicSiteContent() {
  if (typeof window === 'undefined') return defaultPublicSiteContent

  try {
    const saved = window.localStorage.getItem(PUBLIC_SITE_CONTENT_KEY)
    return saved ? mergeContent(defaultPublicSiteContent, JSON.parse(saved)) : defaultPublicSiteContent
  } catch {
    return defaultPublicSiteContent
  }
}

export async function fetchPublicSiteContent() {
  const response = await fetch('/api/v1/public-site-content')
  if (!response.ok) throw new Error('Unable to load public site content')
  const data = await response.json()
  return data.content && Object.keys(data.content).length > 0
    ? mergeContent(defaultPublicSiteContent, data.content)
    : defaultPublicSiteContent
}

export function savePublicSiteContent(content) {
  window.localStorage.setItem(PUBLIC_SITE_CONTENT_KEY, JSON.stringify(content))
  window.dispatchEvent(new Event('public-site-content-updated'))
}

export async function savePublicSiteContentToServer(content) {
  const { data } = await api.put('/public-site-content', { content })
  return mergeContent(defaultPublicSiteContent, data.content)
}

export function resetPublicSiteContent() {
  window.localStorage.removeItem(PUBLIC_SITE_CONTENT_KEY)
  window.localStorage.removeItem(PUBLIC_SITE_PENDING_KEY)
  window.dispatchEvent(new Event('public-site-content-updated'))
}

export function usePublicSiteContent() {
  const [content, setContent] = useState(() => getPublicSiteContent())

  useEffect(() => {
    const sync = () => setContent(getPublicSiteContent())
    window.addEventListener('storage', sync)
    window.addEventListener('public-site-content-updated', sync)
    fetchPublicSiteContent()
      .then((serverContent) => {
        setContent(serverContent)
        window.localStorage.setItem(PUBLIC_SITE_CONTENT_KEY, JSON.stringify(serverContent))
      })
      .catch(() => {})
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('public-site-content-updated', sync)
    }
  }, [])

  return content
}
