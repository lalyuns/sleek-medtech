import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  defaultPublicSiteContent,
  fetchPublicSiteContent,
  getPublicSiteContent,
  PUBLIC_FONT_OPTIONS,
  PUBLIC_HEADING_WEIGHT_OPTIONS,
  PUBLIC_SITE_PENDING_KEY,
  resetPublicSiteContent,
  savePublicSiteContent,
  savePublicSiteContentToServer
} from '../content/publicSiteContent'
import useAuthStore from '../store/authStore'
import '../styles/publicSiteAdmin.css'

const LEAVE_MESSAGE = '你有尚未儲存的官網內容變更，確定要離開嗎？'
const PAGE_BACKGROUND_LABELS = {
  home: '首頁',
  showcase: '展示頁',
  catalog: '產品目錄頁',
  order: '訂購頁',
  join: '加入我們頁',
  login: '登入頁'
}

export default function PublicSiteAdminPage() {
  const { user, logout } = useAuthStore()
  const [draft, setDraft] = useState(() => getPublicSiteContent())
  const [jsonText, setJsonText] = useState(() => JSON.stringify(getPublicSiteContent(), null, 2))
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(getPublicSiteContent()))
  const [status, setStatus] = useState(() => (
    window.localStorage.getItem(PUBLIC_SITE_PENDING_KEY) === '1'
      ? '目前瀏覽器有尚未發布到資料庫的草稿。請重新登入高權限帳號後按「儲存內容」發布。'
      : ''
  ))
  const [activeTab, setActiveTab] = useState('home')

  const roleLabel = useMemo(() => user?.role || user?.user_role || 'admin', [user])
  const draftSnapshot = useMemo(() => JSON.stringify(draft), [draft])
  const isDirty = draftSnapshot !== savedSnapshot || jsonText !== JSON.stringify(draft, null, 2)

  useEffect(() => {
    if (!isDirty) return undefined

    const handleBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = LEAVE_MESSAGE
      return LEAVE_MESSAGE
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  useEffect(() => {
    if (window.localStorage.getItem(PUBLIC_SITE_PENDING_KEY) === '1') {
      return
    }

    fetchPublicSiteContent()
      .then((serverContent) => {
        setDraft(serverContent)
        setJsonText(JSON.stringify(serverContent, null, 2))
        setSavedSnapshot(JSON.stringify(serverContent))
      })
      .catch(() => {})
  }, [])

  const confirmLeave = () => !isDirty || window.confirm(LEAVE_MESSAGE)

  const guardNavigation = (event) => {
    if (!confirmLeave()) event.preventDefault()
  }

  const guardedLogout = () => {
    if (confirmLeave()) logout()
  }

  const updateLanding = (field, value) => {
    setDraft((current) => ({ ...current, landing: { ...current.landing, [field]: value } }))
  }

  const updateJoin = (field, value) => {
    setDraft((current) => ({ ...current, join: { ...current.join, [field]: value } }))
  }

  const updateCatalog = (field, value) => {
    setDraft((current) => ({ ...current, catalog: { ...current.catalog, [field]: value } }))
  }

  const updateOrder = (field, value) => {
    setDraft((current) => ({ ...current, order: { ...current.order, [field]: value } }))
  }

  const updateOrderListItem = (field, index, value) => {
    setDraft((current) => ({
      ...current,
      order: {
        ...current.order,
        [field]: getOrderList(current, field).map((item, itemIndex) => itemIndex === index ? value : item)
      }
    }))
  }

  const addOrderListItem = (field, value) => {
    setDraft((current) => ({
      ...current,
      order: { ...current.order, [field]: [...getOrderList(current, field), value] }
    }))
  }

  const removeOrderListItem = (field, index) => {
    setDraft((current) => ({
      ...current,
      order: { ...current.order, [field]: getOrderList(current, field).filter((_, itemIndex) => itemIndex !== index) }
    }))
  }

  const updateLoginContent = (field, value) => {
    setDraft((current) => ({ ...current, login: { ...current.login, [field]: value } }))
  }

  const updatePageBackground = (pageKey, field, value) => {
    setDraft((current) => ({
      ...current,
      pageBackgrounds: {
        ...(current.pageBackgrounds || {}),
        [pageKey]: {
          ...(defaultPublicSiteContent.pageBackgrounds?.[pageKey] || {}),
          ...(current.pageBackgrounds?.[pageKey] || {}),
          [field]: value
        }
      }
    }))
  }

  const updateNavLabel = (field, value) => {
    setDraft((current) => ({ ...current, navLabels: { ...current.navLabels, [field]: value } }))
  }

  const updateImpactStat = (index, field, value) => {
    setDraft((current) => ({
      ...current,
      impactStats: getImpactStats(current).map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
      ))
    }))
  }

  const addImpactStat = () => {
    setDraft((current) => ({
      ...current,
      impactStats: [...getImpactStats(current), { value: 'New', label: '新的指標' }]
    }))
  }

  const removeImpactStat = (index) => {
    setDraft((current) => ({
      ...current,
      impactStats: getImpactStats(current).filter((_, itemIndex) => itemIndex !== index)
    }))
  }

  const updateAccessColumn = (index, field, value) => {
    setDraft((current) => ({
      ...current,
      accessColumns: getAccessColumns(current).map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
      ))
    }))
  }

  const addAccessColumn = () => {
    setDraft((current) => ({
      ...current,
      accessColumns: [...getAccessColumns(current), { title: '新的對照欄', text: '請填入對外可公開的說明。' }]
    }))
  }

  const removeAccessColumn = (index) => {
    setDraft((current) => ({
      ...current,
      accessColumns: getAccessColumns(current).filter((_, itemIndex) => itemIndex !== index)
    }))
  }

  const updateJoinLabel = (field, value) => {
    setDraft((current) => ({ ...current, join: { ...current.join, [field]: value } }))
  }

  const updateJoinListItem = (field, index, value) => {
    setDraft((current) => ({
      ...current,
      join: {
        ...current.join,
        [field]: getJoinList(current, field).map((item, itemIndex) => itemIndex === index ? value : item)
      }
    }))
  }

  const addJoinListItem = (field, value) => {
    setDraft((current) => ({
      ...current,
      join: { ...current.join, [field]: [...getJoinList(current, field), value] }
    }))
  }

  const removeJoinListItem = (field, index) => {
    setDraft((current) => ({
      ...current,
      join: { ...current.join, [field]: getJoinList(current, field).filter((_, itemIndex) => itemIndex !== index) }
    }))
  }

  const updateJoinRole = (index, field, value) => {
    setDraft((current) => ({
      ...current,
      join: {
        ...current.join,
        roles: getJoinRoles(current).map((role, roleIndex) => (
          roleIndex === index ? { ...role, [field]: value } : role
        ))
      }
    }))
  }

  const addJoinRole = () => {
    setDraft((current) => ({
      ...current,
      join: {
        ...current.join,
        roles: [...getJoinRoles(current), { title: '新的合作方向', text: '請填入這個方向的說明。' }]
      }
    }))
  }

  const removeJoinRole = (index) => {
    setDraft((current) => ({
      ...current,
      join: { ...current.join, roles: getJoinRoles(current).filter((_, roleIndex) => roleIndex !== index) }
    }))
  }

  const uploadMedia = (file, onLoaded, label = '素材') => {
    if (!file) return
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setStatus(`${label} 請上傳圖片或影片檔，例如 PNG、JPG、WEBP、SVG、MP4 或 WEBM。`)
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      onLoaded(reader.result, file)
      setStatus(`已載入${label}：${file.name}。請按「儲存內容」發布。`)
    }
    reader.onerror = () => setStatus(`${label}讀取失敗，請重新選擇。`)
    reader.readAsDataURL(file)
  }

  const updateCustomSection = (index, field, value) => {
    setDraft((current) => ({
      ...current,
      customSections: getCustomSections(current).map((section, sectionIndex) => (
        sectionIndex === index ? { ...section, [field]: value } : section
      ))
    }))
  }

  const updateFeaturedStory = (index, field, value) => {
    setDraft((current) => ({
      ...current,
      featuredStories: getFeaturedStories(current).map((story, storyIndex) => (
        storyIndex === index ? { ...story, [field]: value } : story
      ))
    }))
  }

  const updatePublicModel = (index, field, value) => {
    setDraft((current) => ({
      ...current,
      publicConceptModels: getPublicModels(current).map((model, modelIndex) => (
        modelIndex === index ? { ...model, [field]: value } : model
      ))
    }))
  }

  const updatePublicImage = (index, field, value) => {
    setDraft((current) => ({
      ...current,
      publicImageGallery: getPublicImages(current).map((image, imageIndex) => (
        imageIndex === index ? { ...image, [field]: value } : image
      ))
    }))
  }

  const uploadPublicModel = (index, file) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.stl')) {
      setStatus('目前公開 3D 展示先支援 STL 檔案，請選擇 .stl。')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      updatePublicModel(index, 'modelUrl', reader.result)
      updatePublicModel(index, 'fileName', file.name)
      setStatus(`已載入公開展示模型：${file.name}。請按「儲存內容」發布。`)
    }
    reader.onerror = () => setStatus('模型檔案讀取失敗，請重新選擇。')
    reader.readAsDataURL(file)
  }

  const uploadPublicGalleryMedia = (index, file) => {
    uploadMedia(file, (result, loadedFile) => {
      updatePublicImage(index, 'imageUrl', result)
      updatePublicImage(index, 'imageAlt', loadedFile.name)
      updatePublicImage(index, 'mediaType', loadedFile.type.startsWith('video/') ? 'video' : 'image')
    }, '展示素材')
  }

  const uploadLogo = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setStatus('Logo 請上傳圖片檔，例如 PNG、JPG、WEBP 或 SVG。')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setDraft((current) => ({ ...current, logoUrl: reader.result, logoAlt: file.name }))
      setStatus(`已載入 Logo：${file.name}。請按「儲存內容」發布。`)
    }
    reader.onerror = () => setStatus('Logo 圖片讀取失敗，請重新選擇。')
    reader.readAsDataURL(file)
  }

  const uploadLandingImage = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setStatus('首頁主視覺請上傳圖片檔，例如 PNG、JPG、WEBP 或 SVG。')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      updateLanding('heroImageUrl', reader.result)
      updateLanding('heroImageAlt', file.name)
      setStatus(`已載入首頁主視覺：${file.name}。請按「儲存內容」發布。`)
    }
    reader.onerror = () => setStatus('首頁主視覺圖片讀取失敗，請重新選擇。')
    reader.readAsDataURL(file)
  }

  const uploadLineBotQr = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setStatus('LINE Bot QR code 請上傳圖片檔，例如 PNG、JPG、WEBP 或 SVG。')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      updateLanding('lineBotQrUrl', reader.result)
      updateLanding('lineBotQrAlt', file.name)
      setStatus(`已載入 LINE Bot QR code：${file.name}。請按「儲存內容」發布。`)
    }
    reader.onerror = () => setStatus('LINE Bot QR code 圖片讀取失敗，請重新選擇。')
    reader.readAsDataURL(file)
  }

  const uploadPageBackground = (pageKey, file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setStatus('整頁背景請上傳圖片檔，例如 PNG、JPG、WEBP 或 SVG。')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      updatePageBackground(pageKey, 'imageUrl', reader.result)
      updatePageBackground(pageKey, 'imageAlt', file.name)
      setStatus(`已載入${PAGE_BACKGROUND_LABELS[pageKey] || '頁面'}背景圖片：${file.name}。請按「儲存內容」發布。`)
    }
    reader.onerror = () => setStatus('整頁背景圖片讀取失敗，請重新選擇。')
    reader.readAsDataURL(file)
  }

  const uploadCustomSectionMedia = (index, file) => {
    uploadMedia(file, (result, loadedFile) => {
      updateCustomSection(index, 'imageUrl', result)
      updateCustomSection(index, 'imageAlt', loadedFile.name)
      updateCustomSection(index, 'mediaType', loadedFile.type.startsWith('video/') ? 'video' : 'image')
      updateCustomSection(index, 'layout', 'image')
    }, '模塊素材')
  }

  const uploadFeaturedStoryMedia = (index, file) => {
    uploadMedia(file, (result, loadedFile) => {
      updateFeaturedStory(index, 'imageUrl', result)
      updateFeaturedStory(index, 'imageAlt', loadedFile.name)
      updateFeaturedStory(index, 'mediaType', loadedFile.type.startsWith('video/') ? 'video' : 'image')
      updateFeaturedStory(index, 'imageFit', 'contain')
      updateFeaturedStory(index, 'imagePosition', 'center')
    }, '捲動展示卡片素材')
  }

  const addCustomSection = () => {
    setDraft((current) => ({
      ...current,
      customSections: [
        ...getCustomSections(current),
        {
          id: `section-${Date.now()}`,
          kicker: 'New Module',
          title: '新的官網模塊',
          text: '請在這裡填入對外可公開的概念性說明。',
          imageUrl: '',
          imageAlt: '',
          mediaType: 'image',
          layout: 'text'
        }
      ]
    }))
  }

  const addFeaturedStory = () => {
    setDraft((current) => {
      const stories = getFeaturedStories(current)
      const nextIndex = stories.length + 1
      return {
        ...current,
        featuredStories: [
          ...stories,
          {
            number: String(nextIndex).padStart(2, '0'),
            label: 'New Story',
            title: '新的展示卡片',
            text: '請填入這張首頁捲動卡片要呈現的公開說明。',
            points: ['重點一', '重點二', '重點三'],
            imageIndex: Math.max(0, nextIndex - 1),
            imageUrl: '',
            imageAlt: '',
            mediaType: 'image',
            imageFit: 'contain',
            imagePosition: 'center',
            ctaLabel: '了解更多',
            ctaPath: '/showcase'
          }
        ]
      }
    })
  }

  const removeFeaturedStory = (index) => {
    setDraft((current) => ({
      ...current,
      featuredStories: getFeaturedStories(current).filter((_, storyIndex) => storyIndex !== index)
    }))
  }

  const addPublicModel = () => {
    setDraft((current) => ({
      ...current,
      publicConceptModels: [
        ...getPublicModels(current),
        {
          id: `public-model-${Date.now()}`,
          title: '新的 3D 展示模型',
          description: '請填入對外可公開的模型說明，不要放入內部專案參數、版本或材料細節。',
          modelUrl: '',
          fileName: '',
          hidden: false
        }
      ]
    }))
  }

  const removePublicModel = (index) => {
    setDraft((current) => ({
      ...current,
      publicConceptModels: getPublicModels(current).filter((_, modelIndex) => modelIndex !== index)
    }))
  }

  const addPublicImage = () => {
    setDraft((current) => ({
      ...current,
      publicImageGallery: [
        ...getPublicImages(current),
        {
          id: `gallery-${Date.now()}`,
          title: '新的靜態圖片展示',
          text: '請填入對外可公開的圖片說明，不要放入內部專案參數。',
          imageUrl: '',
          imageAlt: '公開靜態展示圖片',
          mediaType: 'image',
          hidden: false
        }
      ]
    }))
  }

  const removePublicImage = (index) => {
    setDraft((current) => ({
      ...current,
      publicImageGallery: getPublicImages(current).filter((_, imageIndex) => imageIndex !== index)
    }))
  }

  const removeCustomSection = (index) => {
    setDraft((current) => ({
      ...current,
      customSections: getCustomSections(current).filter((_, sectionIndex) => sectionIndex !== index)
    }))
  }

  const save = async (nextDraft = draft) => {
    try {
      setStatus('儲存中...')
      const serverContent = await savePublicSiteContentToServer(nextDraft)
      savePublicSiteContent(serverContent)
      window.localStorage.removeItem(PUBLIC_SITE_PENDING_KEY)
      setDraft(serverContent)
      setJsonText(JSON.stringify(serverContent, null, 2))
      setSavedSnapshot(JSON.stringify(serverContent))
      setStatus('已儲存公開官網內容，Safari 與其他瀏覽器重新整理後也會看到同一版。')
    } catch (error) {
      const statusCode = error?.response?.status
      const nextMessage = statusCode === 401 || statusCode === 403
        ? '資料庫儲存失敗：登入權限已過期或不是高權限帳號。請重新登入後再儲存。'
        : '資料庫儲存失敗，已先嘗試儲存在目前瀏覽器。請確認後端 API 有啟動。'
      setStatus(nextMessage)
      savePublicSiteContent(nextDraft)
      window.localStorage.setItem(PUBLIC_SITE_PENDING_KEY, '1')
      setDraft(nextDraft)
      setJsonText(JSON.stringify(nextDraft, null, 2))
      setSavedSnapshot(JSON.stringify(nextDraft))
    }
  }

  const reset = () => {
    if (!confirmLeave()) return
    resetPublicSiteContent()
    window.localStorage.removeItem(PUBLIC_SITE_PENDING_KEY)
    setDraft(defaultPublicSiteContent)
    setJsonText(JSON.stringify(defaultPublicSiteContent, null, 2))
    setSavedSnapshot(JSON.stringify(defaultPublicSiteContent))
    setStatus('已恢復預設內容。')
  }

  const saveJson = () => {
    try {
      const parsed = JSON.parse(jsonText)
      void save(parsed)
    } catch {
      setStatus('JSON 格式有誤，請確認括號、逗號與引號。')
    }
  }

  return (
    <main className="public-site-admin">
      <header className="public-site-admin__bar">
        <div>
          <p>Hidden CMS</p>
          <h1>公開官網內容後台</h1>
        </div>
        <nav>
          <Link to="/" onClick={guardNavigation}>查看官網</Link>
          <Link to="/join-us" onClick={guardNavigation}>查看加入我們</Link>
          <Link to="/projects" onClick={guardNavigation}>內部系統</Link>
          <button type="button" onClick={guardedLogout}>登出</button>
        </nav>
      </header>

      <section className="admin-notice">
        <strong>登入角色：{roleLabel}</strong>
        {isDirty && <strong className="dirty-indicator">尚未儲存變更</strong>}
        <span>
          這個後台只開放高權限帳號，且不會出現在公開網站導覽列。請只編輯對外可公開的概念性內容，不要放入材料參數、STL
          版本、BOM 成本、報告或稽核紀錄。
        </span>
      </section>

      <nav className="admin-tabs" aria-label="公開網站編輯分頁">
        <button type="button" aria-pressed={activeTab === 'home'} onClick={() => setActiveTab('home')}>首頁</button>
        <button type="button" aria-pressed={activeTab === 'showcase'} onClick={() => setActiveTab('showcase')}>展示</button>
        <button type="button" aria-pressed={activeTab === 'catalog'} onClick={() => setActiveTab('catalog')}>產品</button>
        <button type="button" aria-pressed={activeTab === 'order'} onClick={() => setActiveTab('order')}>訂購</button>
        <button type="button" aria-pressed={activeTab === 'join'} onClick={() => setActiveTab('join')}>加入我們</button>
        <button type="button" aria-pressed={activeTab === 'login'} onClick={() => setActiveTab('login')}>登入</button>
        <button type="button" aria-pressed={activeTab === 'advanced'} onClick={() => setActiveTab('advanced')}>進階 JSON</button>
      </nav>

      <section className="admin-grid">
        <div className="admin-tab-content">
          {activeTab === 'home' && (
            <>
              <PageBackgroundEditor
                pageKey="home"
                background={draft.pageBackgrounds?.home}
                onChange={updatePageBackground}
                onUpload={uploadPageBackground}
              />

              <EditorPanel title="01 共用品牌與首頁 Hero">
                <TextInput label="品牌名稱" value={draft.brand} onChange={(value) => setDraft((current) => ({ ...current, brand: value }))} />
                <TextInput label="官網分頁名稱" value={draft.siteTitle || ''} onChange={(value) => setDraft((current) => ({ ...current, siteTitle: value }))} />
                <label>
                  公開網站字體
                  <select value={draft.fontFamily || 'modern-sans'} onChange={(event) => setDraft((current) => ({ ...current, fontFamily: event.target.value }))}>
                    {PUBLIC_FONT_OPTIONS.map((option) => (
                      <option value={option.value} key={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  標題字重
                  <select value={draft.headingWeight || 'medium'} onChange={(event) => setDraft((current) => ({ ...current, headingWeight: event.target.value }))}>
                    {PUBLIC_HEADING_WEIGHT_OPTIONS.map((option) => (
                      <option value={option.value} key={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <FixedLabelEditor
                  title="上方導覽列文字"
                  items={NAV_LABEL_KEYS}
                  values={draft.navLabels}
                  defaults={defaultPublicSiteContent.navLabels}
                  onChange={updateNavLabel}
                />
                <TextInput label="Logo 圖片 URL" value={draft.logoUrl || ''} onChange={(value) => setDraft((current) => ({ ...current, logoUrl: value }))} />
                <TextInput label="Logo 替代文字" value={draft.logoAlt || ''} onChange={(value) => setDraft((current) => ({ ...current, logoAlt: value }))} />
                <label className="file-upload-field">
                  上傳公司 Logo
                  <span className="file-upload-control">
                    <input type="file" accept="image/*" onChange={(event) => uploadLogo(event.target.files?.[0])} />
                  </span>
                </label>
                {draft.logoUrl && (
                  <div className="admin-logo-preview">
                    <img src={draft.logoUrl} alt={draft.logoAlt || draft.brand} />
                    <button type="button" className="secondary" onClick={() => setDraft((current) => ({ ...current, logoUrl: '', logoAlt: '' }))}>
                      移除 Logo
                    </button>
                  </div>
                )}
                <TextInput label="Hero 小標" value={draft.landing.heroKicker || ''} onChange={(value) => updateLanding('heroKicker', value)} />
                <TextInput label="Hero 主視覺大字" value={draft.landing.heroShortTitle || ''} onChange={(value) => updateLanding('heroShortTitle', value)} />
                <TextArea label="Hero 畫面副標題" value={draft.landing.heroDisplaySubtitle || ''} onChange={(value) => updateLanding('heroDisplaySubtitle', value)} />
                <div className="admin-two-column">
                  <TextInput label="Hero 主要按鈕文字" value={draft.landing.heroPrimaryCtaLabel || ''} onChange={(value) => updateLanding('heroPrimaryCtaLabel', value)} />
                  <TextInput label="Hero 主要按鈕連結" value={draft.landing.heroPrimaryCtaPath || ''} onChange={(value) => updateLanding('heroPrimaryCtaPath', value)} />
                  <TextInput label="Hero 次要按鈕文字" value={draft.landing.heroSecondaryCtaLabel || ''} onChange={(value) => updateLanding('heroSecondaryCtaLabel', value)} />
                  <TextInput label="Hero 次要按鈕連結" value={draft.landing.heroSecondaryCtaPath || ''} onChange={(value) => updateLanding('heroSecondaryCtaPath', value)} />
                  <TextInput label="捲動提示文字" value={draft.landing.scrollCueLabel || ''} onChange={(value) => updateLanding('scrollCueLabel', value)} />
                </div>
                <label className="file-upload-field">
                  上傳 Hero Section 照片檔案
                  <span className="file-upload-control">
                    <input type="file" accept="image/*" onChange={(event) => uploadLandingImage(event.target.files?.[0])} />
                  </span>
                  <span className="admin-helper">上傳後會取代官網首頁右側主視覺；記得按「儲存內容」才會發布到其他瀏覽器。</span>
                </label>
                <TextInput label="Hero 照片 URL" value={draft.landing.heroImageUrl} onChange={(value) => updateLanding('heroImageUrl', value)} />
                <TextInput label="Hero 照片替代文字" value={draft.landing.heroImageAlt} onChange={(value) => updateLanding('heroImageAlt', value)} />
                <RangeInput
                  label="Hero 圖片透明度"
                  value={Number(draft.landing.heroImageOpacity ?? 78)}
                  min="0"
                  max="100"
                  unit="%"
                  onChange={(value) => updateLanding('heroImageOpacity', Number(value))}
                />
                <label>
                  Hero 圖片顯示方式
                  <select value={draft.landing.heroImageFit || 'contain'} onChange={(event) => updateLanding('heroImageFit', event.target.value)}>
                    <option value="contain">完整顯示，不裁切</option>
                    <option value="cover">填滿版面，可能裁切</option>
                  </select>
                </label>
                {draft.landing.heroImageUrl && (
                  <>
                    <img className="admin-image-preview" src={draft.landing.heroImageUrl} alt={draft.landing.heroImageAlt} />
                    <button type="button" className="secondary" onClick={() => {
                      updateLanding('heroImageUrl', '')
                      updateLanding('heroImageAlt', '')
                    }}>
                      移除首頁照片
                    </button>
                  </>
                )}
              </EditorPanel>

              <EditorPanel title="02 首頁大標語與捲動展示卡片">
                <TextArea label="首頁大標語" value={draft.landing.statementText || ''} onChange={(value) => updateLanding('statementText', value)} />
                <div className="module-list">
                  {getFeaturedStories(draft).map((story, index) => (
                    <article className="module-editor" key={`${story.number || index}-${index}`}>
                      <div className="module-editor__header">
                        <strong>捲動展示卡片 {index + 1}</strong>
                        <button type="button" className="danger" onClick={() => removeFeaturedStory(index)}>刪除</button>
                      </div>
                      <div className="admin-two-column">
                        <TextInput label="編號" value={story.number || ''} onChange={(value) => updateFeaturedStory(index, 'number', value)} />
                        <TextInput label="小標" value={story.label || ''} onChange={(value) => updateFeaturedStory(index, 'label', value)} />
                      </div>
                      <TextInput label="標題" value={story.title || ''} onChange={(value) => updateFeaturedStory(index, 'title', value)} />
                      <TextArea label="說明" value={story.text || ''} onChange={(value) => updateFeaturedStory(index, 'text', value)} />
                      <SimpleListEditor
                        title="重點文字"
                        items={story.points}
                        addLabel="新增重點"
                        emptyValue="新的重點"
                        onChange={(pointIndex, value) => {
                          const points = Array.isArray(story.points) ? story.points : []
                          updateFeaturedStory(index, 'points', points.map((point, itemIndex) => itemIndex === pointIndex ? value : point))
                        }}
                        onAdd={() => {
                          const points = Array.isArray(story.points) ? story.points : []
                          updateFeaturedStory(index, 'points', [...points, '新的重點'])
                        }}
                        onRemove={(pointIndex) => {
                          const points = Array.isArray(story.points) ? story.points : []
                          updateFeaturedStory(index, 'points', points.filter((_, itemIndex) => itemIndex !== pointIndex))
                        }}
                      />
                      <div className="admin-two-column">
                        <TextInput label="圖片序號" value={String(story.imageIndex ?? index)} onChange={(value) => updateFeaturedStory(index, 'imageIndex', Number.parseInt(value, 10) || 0)} />
                        <TextInput label="按鈕文字" value={story.ctaLabel || ''} onChange={(value) => updateFeaturedStory(index, 'ctaLabel', value)} />
                        <TextInput label="按鈕連結" value={story.ctaPath || ''} onChange={(value) => updateFeaturedStory(index, 'ctaPath', value)} />
                      </div>
                      <TextInput label="卡片圖片 / 影片 URL" value={story.imageUrl || ''} onChange={(value) => updateFeaturedStory(index, 'imageUrl', value)} />
                      <TextInput label="卡片素材替代文字" value={story.imageAlt || ''} onChange={(value) => updateFeaturedStory(index, 'imageAlt', value)} />
                      <label>
                        卡片素材類型
                        <select value={story.mediaType || 'image'} onChange={(event) => updateFeaturedStory(index, 'mediaType', event.target.value)}>
                          <option value="image">圖片</option>
                          <option value="video">影片</option>
                        </select>
                      </label>
                      <div className="admin-two-column">
                        <label>
                          圖片顯示方式
                          <select value={story.imageFit || 'contain'} onChange={(event) => updateFeaturedStory(index, 'imageFit', event.target.value)}>
                            <option value="contain">完整顯示，不裁切</option>
                            <option value="cover">填滿框線，允許裁切</option>
                          </select>
                        </label>
                        <label>
                          圖片對齊位置
                          <select value={story.imagePosition || 'center'} onChange={(event) => updateFeaturedStory(index, 'imagePosition', event.target.value)}>
                            <option value="center">置中</option>
                            <option value="top">靠上</option>
                            <option value="bottom">靠下</option>
                            <option value="left">靠左</option>
                            <option value="right">靠右</option>
                          </select>
                        </label>
                      </div>
                      <label>
                        圖片框版型
                        <select value={story.imageLayout || 'standard'} onChange={(event) => updateFeaturedStory(index, 'imageLayout', event.target.value)}>
                          <option value="standard">標準圖片框</option>
                          <option value="wide">寬圖圖片框，適合流程圖或截圖</option>
                        </select>
                      </label>
                      <label className="file-upload-field">
                        上傳卡片圖片 / 影片
                        <span className="file-upload-control">
                          <input type="file" accept="image/*,video/*" onChange={(event) => uploadFeaturedStoryMedia(index, event.target.files?.[0])} />
                        </span>
                        <span className="admin-helper">若有上傳卡片素材，前台會優先顯示這張圖。預設使用「完整顯示，不裁切」，需要滿版效果時再改成「填滿框線」。</span>
                      </label>
                      {story.imageUrl && (
                        <>
                          <AdminMediaPreview item={story} />
                          <button type="button" className="secondary" onClick={() => {
                            updateFeaturedStory(index, 'imageUrl', '')
                            updateFeaturedStory(index, 'imageAlt', '')
                            updateFeaturedStory(index, 'mediaType', 'image')
                          }}>
                            移除卡片素材
                          </button>
                        </>
                      )}
                    </article>
                  ))}
                </div>
                <button type="button" onClick={addFeaturedStory}>新增捲動展示卡片</button>
              </EditorPanel>

              <EditorPanel title="03 Impact 指標列">
                <div className="module-list">
                  {getImpactStats(draft).map((item, index) => (
                    <article className="module-editor" key={`${item.value || index}-${index}`}>
                      <div className="module-editor__header">
                        <strong>Impact 指標 {index + 1}</strong>
                        <button type="button" className="danger" onClick={() => removeImpactStat(index)}>刪除</button>
                      </div>
                      <div className="admin-two-column">
                        <TextInput label="大字" value={item.value || ''} onChange={(value) => updateImpactStat(index, 'value', value)} />
                        <TextInput label="說明" value={item.label || ''} onChange={(value) => updateImpactStat(index, 'label', value)} />
                      </div>
                    </article>
                  ))}
                </div>
                <button type="button" onClick={addImpactStat}>新增 Impact 指標</button>
              </EditorPanel>

              <EditorPanel title="04 CTA 行動呼籲區塊">
                <div className="admin-two-column">
                  <TextInput label="CTA 小標" value={draft.landing.finalCtaKicker || ''} onChange={(value) => updateLanding('finalCtaKicker', value)} />
                  <TextInput label="CTA 標題" value={draft.landing.finalCtaTitle || ''} onChange={(value) => updateLanding('finalCtaTitle', value)} />
                  <TextInput label="CTA 主要按鈕文字" value={draft.landing.finalCtaPrimaryLabel || ''} onChange={(value) => updateLanding('finalCtaPrimaryLabel', value)} />
                  <TextInput label="CTA 主要按鈕連結" value={draft.landing.finalCtaPrimaryPath || ''} onChange={(value) => updateLanding('finalCtaPrimaryPath', value)} />
                  <TextInput label="CTA 次要按鈕文字" value={draft.landing.finalCtaSecondaryLabel || ''} onChange={(value) => updateLanding('finalCtaSecondaryLabel', value)} />
                  <TextInput label="CTA 次要按鈕連結" value={draft.landing.finalCtaSecondaryPath || ''} onChange={(value) => updateLanding('finalCtaSecondaryPath', value)} />
                </div>
              </EditorPanel>
            </>
          )}

          {activeTab === 'showcase' && (
            <>
              <PageBackgroundEditor
                pageKey="showcase"
                background={draft.pageBackgrounds?.showcase}
                onChange={updatePageBackground}
                onUpload={uploadPageBackground}
              />

              <EditorPanel title="01 公開 3D 展示">
                <TextInput label="展示頁 Hero 標題" value={draft.landing.showcasePageTitle || ''} onChange={(value) => updateLanding('showcasePageTitle', value)} />
                <TextArea label="展示頁 Hero 說明" value={draft.landing.showcasePageIntro || ''} onChange={(value) => updateLanding('showcasePageIntro', value)} />
                <TextInput label="3D 區塊標題" value={draft.landing.public3dTitle} onChange={(value) => updateLanding('public3dTitle', value)} />
                <TextArea label="3D 區塊說明" value={draft.landing.public3dIntro} onChange={(value) => updateLanding('public3dIntro', value)} />
                <TextInput label="3D 備註標題" value={draft.landing.public3dNoteTitle || ''} onChange={(value) => updateLanding('public3dNoteTitle', value)} />
                <p className="admin-helper">
                  每一個模型卡片都可以維持預設概念幾何，也可以指定公開展示用 STL。這裡不要上傳內部專案的敏感版本檔。
                </p>
                <div className="module-list">
                  {getPublicModels(draft).map((model, index) => (
                    <article className="module-editor" key={model.id || index}>
                      <div className="module-editor__header">
                        <strong>3D 展示 {index + 1}</strong>
                        <div className="module-editor__actions">
                          {model.hidden && <span className="hidden-chip">已隱藏</span>}
                          {model.fileName && <span className="file-chip">{model.fileName}</span>}
                          <button type="button" className="danger" onClick={() => removePublicModel(index)}>刪除</button>
                        </div>
                      </div>
                      <label className="visibility-toggle">
                        <input
                          type="checkbox"
                          checked={!model.hidden}
                          onChange={(event) => updatePublicModel(index, 'hidden', !event.target.checked)}
                        />
                        在官網顯示這個 3D 展示
                      </label>
                      <TextInput label="模型 ID" value={model.id} onChange={(value) => updatePublicModel(index, 'id', value)} />
                      <TextInput label="模型標題" value={model.title} onChange={(value) => updatePublicModel(index, 'title', value)} />
                      <TextArea label="模型說明" value={model.description} onChange={(value) => updatePublicModel(index, 'description', value)} />
                      <TextInput label="公開 STL 模型 URL" value={model.modelUrl || ''} onChange={(value) => updatePublicModel(index, 'modelUrl', value)} />
                      <label className="file-upload-field">
                        上傳 STL 展示模型
                        <span className="file-upload-control">
                          <input type="file" accept=".stl,model/stl,application/sla" onChange={(event) => uploadPublicModel(index, event.target.files?.[0])} />
                        </span>
                      </label>
                      {model.modelUrl && (
                        <button type="button" className="secondary" onClick={() => {
                          updatePublicModel(index, 'modelUrl', '')
                          updatePublicModel(index, 'fileName', '')
                        }}>
                          移除上傳模型，改用預設概念幾何
                        </button>
                      )}
                    </article>
                  ))}
                </div>
                <button type="button" onClick={addPublicModel}>新增 3D 展示</button>
              </EditorPanel>

              <EditorPanel title="02 靜態圖片展示">
                <TextInput label="靜態圖片展示標題" value={draft.landing.imageGalleryTitle || ''} onChange={(value) => updateLanding('imageGalleryTitle', value)} />
                <TextArea label="靜態圖片展示說明" value={draft.landing.imageGalleryIntro || ''} onChange={(value) => updateLanding('imageGalleryIntro', value)} />
                <p className="admin-helper">
                  這裡會顯示在官網 3D 展示下方。可用來放產品照片、應用情境圖或合作流程圖，但不要放內部專案參數、報告或敏感模型截圖。
                </p>
                <div className="module-list">
                  {getPublicImages(draft).map((image, index) => (
                    <article className="module-editor" key={image.id || index}>
                      <div className="module-editor__header">
                        <strong>圖片展示 {index + 1}</strong>
                        <div className="module-editor__actions">
                          {image.hidden && <span className="hidden-chip">已隱藏</span>}
                          <button type="button" className="danger" onClick={() => removePublicImage(index)}>刪除</button>
                        </div>
                      </div>
                      <label className="visibility-toggle">
                        <input
                          type="checkbox"
                          checked={!image.hidden}
                          onChange={(event) => updatePublicImage(index, 'hidden', !event.target.checked)}
                        />
                        在官網顯示這個圖片 / 影片展示
                      </label>
                      <TextInput label="圖片 ID" value={image.id || ''} onChange={(value) => updatePublicImage(index, 'id', value)} />
                      <TextInput label="圖片標題" value={image.title || ''} onChange={(value) => updatePublicImage(index, 'title', value)} />
                      <TextArea label="圖片說明" value={image.text || ''} onChange={(value) => updatePublicImage(index, 'text', value)} />
                      <TextInput label="圖片 / 影片 URL" value={image.imageUrl || ''} onChange={(value) => updatePublicImage(index, 'imageUrl', value)} />
                      <TextInput label="素材替代文字" value={image.imageAlt || ''} onChange={(value) => updatePublicImage(index, 'imageAlt', value)} />
                      <label>
                        素材類型
                        <select value={image.mediaType || 'image'} onChange={(event) => updatePublicImage(index, 'mediaType', event.target.value)}>
                          <option value="image">圖片</option>
                          <option value="video">影片</option>
                        </select>
                      </label>
                      <label className="file-upload-field">
                        上傳靜態展示圖片 / 影片
                        <span className="file-upload-control">
                          <input type="file" accept="image/*,video/*" onChange={(event) => uploadPublicGalleryMedia(index, event.target.files?.[0])} />
                        </span>
                      </label>
                      {image.imageUrl && (
                        <>
                          <AdminMediaPreview item={image} />
                          <button type="button" className="secondary" onClick={() => {
                            updatePublicImage(index, 'imageUrl', '')
                            updatePublicImage(index, 'imageAlt', '')
                            updatePublicImage(index, 'mediaType', 'image')
                          }}>
                            移除素材
                          </button>
                        </>
                      )}
                    </article>
                  ))}
                </div>
                <button type="button" onClick={addPublicImage}>新增靜態圖片</button>
              </EditorPanel>

            </>
          )}

          {activeTab === 'home' && (
            <>
              <EditorPanel title="05 取得更多權限 / 內部系統差異">
                <TextInput label="差異區小標" value={draft.landing.accessKicker || ''} onChange={(value) => updateLanding('accessKicker', value)} />
                <TextInput label="首頁差異區標題" value={draft.landing.accessCompactTitle || ''} onChange={(value) => updateLanding('accessCompactTitle', value)} />
                <TextInput label="LINE Bot 區塊標題" value={draft.landing.lineBotTitle || ''} onChange={(value) => updateLanding('lineBotTitle', value)} />
                <TextArea label="LINE Bot 區塊說明" value={draft.landing.lineBotText || ''} onChange={(value) => updateLanding('lineBotText', value)} />
                <div className="admin-two-column">
                  <TextInput label="LINE Bot 按鈕文字" value={draft.landing.lineBotButtonLabel || ''} onChange={(value) => updateLanding('lineBotButtonLabel', value)} />
                  <TextInput label="LINE Bot 連結 URL" value={draft.landing.lineBotUrl || ''} onChange={(value) => updateLanding('lineBotUrl', value)} />
                </div>
                <TextInput label="LINE Bot QR code 圖片 URL" value={draft.landing.lineBotQrUrl || ''} onChange={(value) => updateLanding('lineBotQrUrl', value)} />
                <TextInput label="LINE Bot QR code 替代文字" value={draft.landing.lineBotQrAlt || ''} onChange={(value) => updateLanding('lineBotQrAlt', value)} />
                <label className="file-upload-field">
                  上傳 LINE Bot QR code
                  <span className="file-upload-control">
                    <input type="file" accept="image/*" onChange={(event) => uploadLineBotQr(event.target.files?.[0])} />
                  </span>
                  <span className="admin-helper">只要設定 LINE Bot 連結或 QR code，官網「取得更多權限」區塊就會顯示 LINE Bot 申請入口。</span>
                </label>
                {draft.landing.lineBotQrUrl && (
                  <>
                    <img className="admin-image-preview" src={draft.landing.lineBotQrUrl} alt={draft.landing.lineBotQrAlt || 'LINE Bot QR code'} />
                    <button type="button" className="secondary" onClick={() => {
                      updateLanding('lineBotQrUrl', '')
                      updateLanding('lineBotQrAlt', '')
                    }}>
                      移除 LINE Bot QR code
                    </button>
                  </>
                )}
                <div className="module-list">
                  {getAccessColumns(draft).map((item, index) => (
                    <article className="module-editor" key={`${item.title || index}-${index}`}>
                      <div className="module-editor__header">
                        <strong>對照欄 {index + 1}</strong>
                        <button type="button" className="danger" onClick={() => removeAccessColumn(index)}>刪除</button>
                      </div>
                      <TextInput label="欄位標題" value={item.title || ''} onChange={(value) => updateAccessColumn(index, 'title', value)} />
                      <TextArea label="說明" value={item.text || ''} onChange={(value) => updateAccessColumn(index, 'text', value)} />
                    </article>
                  ))}
                </div>
                <button type="button" onClick={addAccessColumn}>新增對照欄</button>
              </EditorPanel>

              <EditorPanel title="06 小睿 AI 助理入口">
                <p className="admin-helper">
                  這裡控制官網左下角的 AI 問答入口與開啟後的初始文案。AI 會依官網公開內容回答，不會公開內部材料參數、模型版本或報告。
                </p>
                <div className="admin-two-column">
                  <TextInput label="AI 助理名稱" value={draft.landing.aiAssistantName || ''} onChange={(value) => updateLanding('aiAssistantName', value)} />
                  <TextInput label="圓形標記文字" value={draft.landing.aiAssistantBadge || ''} onChange={(value) => updateLanding('aiAssistantBadge', value)} />
                  <TextInput label="浮動按鈕標題" value={draft.landing.aiAssistantButtonTitle || ''} onChange={(value) => updateLanding('aiAssistantButtonTitle', value)} />
                  <TextInput label="浮動按鈕副標" value={draft.landing.aiAssistantButtonSubtitle || ''} onChange={(value) => updateLanding('aiAssistantButtonSubtitle', value)} />
                  <TextInput label="聊天視窗小標" value={draft.landing.aiAssistantPanelKicker || ''} onChange={(value) => updateLanding('aiAssistantPanelKicker', value)} />
                  <TextInput label="聊天視窗標題" value={draft.landing.aiAssistantPanelTitle || ''} onChange={(value) => updateLanding('aiAssistantPanelTitle', value)} />
                </div>
                <TextArea label="AI 初始問候文字" value={draft.landing.aiAssistantGreeting || ''} onChange={(value) => updateLanding('aiAssistantGreeting', value)} />
                <div className="admin-two-column">
                  <TextInput label="思考中提示文字" value={draft.landing.aiAssistantThinkingText || ''} onChange={(value) => updateLanding('aiAssistantThinkingText', value)} />
                  <TextInput label="輸入框提示文字" value={draft.landing.aiAssistantInputPlaceholder || ''} onChange={(value) => updateLanding('aiAssistantInputPlaceholder', value)} />
                </div>
                <TextArea label="AI 回答限制提示" value={draft.landing.aiAssistantNote || ''} onChange={(value) => updateLanding('aiAssistantNote', value)} />
                <TextInput label="AI 對外角色描述" value={draft.landing.aiAssistantRole || ''} onChange={(value) => updateLanding('aiAssistantRole', value)} />
              </EditorPanel>

              <EditorPanel title="07 頁尾與 LINE Bot 帳號申請說明">
                <p className="admin-helper">
                  官網已不放內部系統帳號申請表單；帳號申請統一由 LINE Bot 收件與審核。這裡只編輯頁尾的公開說明文字。
                </p>
                <TextArea label="Footer 公司簡介" value={draft.landing.footerText} onChange={(value) => updateLanding('footerText', value)} />
                <TextArea label="Footer 免責說明" value={draft.landing.disclaimer} onChange={(value) => updateLanding('disclaimer', value)} />
              </EditorPanel>
            </>
          )}

          {activeTab === 'catalog' && (
            <>
              <PageBackgroundEditor
                pageKey="catalog"
                background={draft.pageBackgrounds?.catalog}
                onChange={updatePageBackground}
                onUpload={uploadPageBackground}
              />

              <EditorPanel title="產品頁面文字">
                <p className="admin-helper">
                  這裡修改的是 /catalog 產品目錄的公開頁面文字。產品名稱、圖片、分類與是否可訂購仍請到產品管理維護，避免和訂單資料庫分開。
                </p>
                <div className="admin-actions">
                  <Link to="/catalog" onClick={guardNavigation}>查看產品頁</Link>
                  <Link to="/product-admin" onClick={guardNavigation}>管理產品資料</Link>
                </div>
                <TextInput label="頁面標題" value={draft.catalog?.pageTitle || ''} onChange={(value) => updateCatalog('pageTitle', value)} />
                <TextArea label="頁面說明" value={draft.catalog?.intro || ''} onChange={(value) => updateCatalog('intro', value)} />
                <TextInput label="訂購入口按鈕" value={draft.catalog?.orderEntryLabel || ''} onChange={(value) => updateCatalog('orderEntryLabel', value)} />
                <div className="admin-two-column">
                  <TextInput label="查詢區標題" value={draft.catalog?.searchTitle || ''} onChange={(value) => updateCatalog('searchTitle', value)} />
                  <TextInput label="查詢提示文字" value={draft.catalog?.searchHint || ''} onChange={(value) => updateCatalog('searchHint', value)} />
                  <TextInput label="搜尋框 placeholder" value={draft.catalog?.searchPlaceholder || ''} onChange={(value) => updateCatalog('searchPlaceholder', value)} />
                  <TextInput label="產品結果標題" value={draft.catalog?.resultsTitle || ''} onChange={(value) => updateCatalog('resultsTitle', value)} />
                  <TextInput label="無結果文字" value={draft.catalog?.emptyText || ''} onChange={(value) => updateCatalog('emptyText', value)} />
                  <TextInput label="右側內容預設標題" value={draft.catalog?.selectedFallbackTitle || ''} onChange={(value) => updateCatalog('selectedFallbackTitle', value)} />
                  <TextInput label="產品詳情訂購按鈕" value={draft.catalog?.orderProductLabel || ''} onChange={(value) => updateCatalog('orderProductLabel', value)} />
                </div>
              </EditorPanel>

              <EditorPanel title="產品頁需求申請區">
                <TextInput label="申請區標題" value={draft.catalog?.requestTitle || ''} onChange={(value) => updateCatalog('requestTitle', value)} />
                <TextInput label="申請區提示" value={draft.catalog?.requestHint || ''} onChange={(value) => updateCatalog('requestHint', value)} />
                <TextArea label="送出成功訊息" value={draft.catalog?.successMessage || ''} onChange={(value) => updateCatalog('successMessage', value)} />
                <TextInput label="送出按鈕文字" value={draft.catalog?.submitLabel || ''} onChange={(value) => updateCatalog('submitLabel', value)} />
              </EditorPanel>
            </>
          )}

          {activeTab === 'order' && (
            <>
              <PageBackgroundEditor
                pageKey="order"
                background={draft.pageBackgrounds?.order}
                onChange={updatePageBackground}
                onUpload={uploadPageBackground}
              />

              <EditorPanel title="訂購頁 Hero 與成功訊息">
                <p className="admin-helper">
                  這裡修改的是 /order 簡化訂購流程的公開文字。實際訂單會送到同一個產品需求訊息庫。
                </p>
                <div className="admin-actions">
                  <Link to="/order" onClick={guardNavigation}>查看訂購頁</Link>
                  <Link to="/product-admin" onClick={guardNavigation}>管理可訂購產品</Link>
                </div>
                <TextInput label="Hero 小標" value={draft.order?.heroKicker || ''} onChange={(value) => updateOrder('heroKicker', value)} />
                <TextInput label="Hero 標題" value={draft.order?.heroTitle || ''} onChange={(value) => updateOrder('heroTitle', value)} />
                <TextArea label="Hero 說明" value={draft.order?.heroIntro || ''} onChange={(value) => updateOrder('heroIntro', value)} />
                <TextInput label="成功訊息標題" value={draft.order?.successTitle || ''} onChange={(value) => updateOrder('successTitle', value)} />
                <TextArea label="成功訊息內容" value={draft.order?.successText || ''} onChange={(value) => updateOrder('successText', value)} />
              </EditorPanel>

              <EditorPanel title="訂購流程三步驟">
                <TextInput label="步驟 1 標題" value={draft.order?.stepTypeTitle || ''} onChange={(value) => updateOrder('stepTypeTitle', value)} />
                <TextArea label="步驟 1 說明" value={draft.order?.stepTypeIntro || ''} onChange={(value) => updateOrder('stepTypeIntro', value)} />
                <TextInput label="步驟 2 標題" value={draft.order?.stepProductTitle || ''} onChange={(value) => updateOrder('stepProductTitle', value)} />
                <TextArea label="步驟 2 說明" value={draft.order?.stepProductIntro || ''} onChange={(value) => updateOrder('stepProductIntro', value)} />
                <TextInput label="產品分類無資料文字" value={draft.order?.emptyText || ''} onChange={(value) => updateOrder('emptyText', value)} />
                <TextInput label="數量區標題" value={draft.order?.quantityTitle || ''} onChange={(value) => updateOrder('quantityTitle', value)} />
                <TextInput label="數量區說明" value={draft.order?.quantityHint || ''} onChange={(value) => updateOrder('quantityHint', value)} />
                <TextInput label="步驟 3 標題" value={draft.order?.stepContactTitle || ''} onChange={(value) => updateOrder('stepContactTitle', value)} />
                <TextArea label="步驟 3 說明" value={draft.order?.stepContactIntro || ''} onChange={(value) => updateOrder('stepContactIntro', value)} />
                <div className="admin-two-column">
                  <TextInput label="送出按鈕文字" value={draft.order?.submitLabel || ''} onChange={(value) => updateOrder('submitLabel', value)} />
                  <TextInput label="送出中按鈕文字" value={draft.order?.submittingLabel || ''} onChange={(value) => updateOrder('submittingLabel', value)} />
                </div>
                <SimpleListEditor
                  title="希望聯絡方式選項"
                  items={getOrderList(draft, 'contactOptions')}
                  addLabel="新增聯絡方式"
                  emptyValue="新的聯絡方式"
                  onChange={(index, value) => updateOrderListItem('contactOptions', index, value)}
                  onAdd={() => addOrderListItem('contactOptions', '新的聯絡方式')}
                  onRemove={(index) => removeOrderListItem('contactOptions', index)}
                />
              </EditorPanel>
            </>
          )}

          {activeTab === 'join' && (
            <>
              <PageBackgroundEditor
                pageKey="join"
                background={draft.pageBackgrounds?.join}
                onChange={updatePageBackground}
                onUpload={uploadPageBackground}
              />

              <EditorPanel title="01 Join Us Hero">
                <TextInput label="加入我們分頁名稱" value={draft.join.pageTitle || ''} onChange={(value) => updateJoin('pageTitle', value)} />
                <FixedLabelEditor
                  title="加入我們導覽與按鈕文字"
                  items={JOIN_LABEL_KEYS}
                  values={draft.join}
                  defaults={defaultPublicSiteContent.join}
                  onChange={updateJoinLabel}
                />
                <TextInput label="Join Us 小標" value={draft.join.heroKicker || ''} onChange={(value) => updateJoin('heroKicker', value)} />
                <TextInput label="Join Us 標題" value={draft.join.heroTitle} onChange={(value) => updateJoin('heroTitle', value)} />
                <TextArea label="Join Us 副標題" value={draft.join.heroSubtitle} onChange={(value) => updateJoin('heroSubtitle', value)} />
              </EditorPanel>

              <EditorPanel title="02 Why Join Us">
                <TextInput label="Why Join Us 標題" value={draft.join.whyTitle} onChange={(value) => updateJoin('whyTitle', value)} />
                <TextInput label="Why Join Us 小標" value={draft.join.whyKicker || ''} onChange={(value) => updateJoin('whyKicker', value)} />
                <TextArea label="Why Join Us 卡片共用說明" value={draft.join.reasonCardText || ''} onChange={(value) => updateJoin('reasonCardText', value)} />
                <SimpleListEditor
                  title="Why Join Us 卡片"
                  items={draft.join.reasons}
                  addLabel="新增原因"
                  emptyValue="新的加入原因"
                  onChange={(index, value) => updateJoinListItem('reasons', index, value)}
                  onAdd={() => addJoinListItem('reasons', '新的加入原因')}
                  onRemove={(index) => removeJoinListItem('reasons', index)}
                />
              </EditorPanel>

              <EditorPanel title="03 合作方向">
                <TextInput label="合作方向標題" value={draft.join.rolesTitle} onChange={(value) => updateJoin('rolesTitle', value)} />
                <TextInput label="合作方向小標" value={draft.join.rolesKicker || ''} onChange={(value) => updateJoin('rolesKicker', value)} />
                <div className="module-list">
                  {getJoinRoles(draft).map((role, index) => (
                    <article className="module-editor" key={`${role.title || index}-${index}`}>
                      <div className="module-editor__header">
                        <strong>合作方向 {index + 1}</strong>
                        <button type="button" className="danger" onClick={() => removeJoinRole(index)}>刪除</button>
                      </div>
                      <TextInput label="方向" value={role.title || ''} onChange={(value) => updateJoinRole(index, 'title', value)} />
                      <TextArea label="說明" value={role.text || ''} onChange={(value) => updateJoinRole(index, 'text', value)} />
                    </article>
                  ))}
                </div>
                <button type="button" onClick={addJoinRole}>新增合作方向</button>
              </EditorPanel>

              <EditorPanel title="04 適合對象">
                <TextInput label="適合對象標題" value={draft.join.fitTitle} onChange={(value) => updateJoin('fitTitle', value)} />
                <TextInput label="適合對象小標" value={draft.join.fitKicker || ''} onChange={(value) => updateJoin('fitKicker', value)} />
                <SimpleListEditor
                  title="適合對象條件"
                  items={draft.join.fit}
                  addLabel="新增條件"
                  emptyValue="新的條件"
                  onChange={(index, value) => updateJoinListItem('fit', index, value)}
                  onAdd={() => addJoinListItem('fit', '新的條件')}
                  onRemove={(index) => removeJoinListItem('fit', index)}
                />
              </EditorPanel>

              <EditorPanel title="05 申請表單與頁尾">
                <TextInput label="申請表單標題" value={draft.join.applicationTitle} onChange={(value) => updateJoin('applicationTitle', value)} />
                <TextInput label="申請表單小標" value={draft.join.applicationKicker || ''} onChange={(value) => updateJoin('applicationKicker', value)} />
                <TextArea label="申請表單說明" value={draft.join.applicationIntro} onChange={(value) => updateJoin('applicationIntro', value)} />
                <TextArea label="申請成功訊息" value={draft.join.success} onChange={(value) => updateJoin('success', value)} />
                <TextArea label="Join Us Footer 文字" value={draft.join.footerText} onChange={(value) => updateJoin('footerText', value)} />
              </EditorPanel>
            </>
          )}

          {activeTab === 'home' && (
            <EditorPanel title="首頁自訂模塊">
              <p className="admin-helper">
                這裡會顯示在官網首頁的展示與 CTA 之間。可以新增、刪除公開官網上的額外內容模塊，也能放圖片或影片素材。
              </p>
              <div className="module-list">
                {getCustomSections(draft).map((section, index) => (
                  <article className="module-editor" key={section.id || index}>
                    <div className="module-editor__header">
                      <strong>模塊 {index + 1}</strong>
                      <button type="button" className="danger" onClick={() => removeCustomSection(index)}>刪除</button>
                    </div>
                    <TextInput label="模塊小標" value={section.kicker} onChange={(value) => updateCustomSection(index, 'kicker', value)} />
                    <TextInput label="模塊標題" value={section.title} onChange={(value) => updateCustomSection(index, 'title', value)} />
                    <TextArea label="模塊說明" value={section.text} onChange={(value) => updateCustomSection(index, 'text', value)} />
                    <TextInput label="模塊圖片 / 影片 URL" value={section.imageUrl} onChange={(value) => updateCustomSection(index, 'imageUrl', value)} />
                    <TextInput label="模塊素材替代文字" value={section.imageAlt || ''} onChange={(value) => updateCustomSection(index, 'imageAlt', value)} />
                    <label>
                      素材類型
                      <select value={section.mediaType || 'image'} onChange={(event) => updateCustomSection(index, 'mediaType', event.target.value)}>
                        <option value="image">圖片</option>
                        <option value="video">影片</option>
                      </select>
                    </label>
                    <label className="file-upload-field">
                        上傳模塊圖片 / 影片
                      <span className="file-upload-control">
                        <input type="file" accept="image/*,video/*" onChange={(event) => uploadCustomSectionMedia(index, event.target.files?.[0])} />
                      </span>
                    </label>
                    <label>
                      版型
                      <select value={section.layout || 'text'} onChange={(event) => updateCustomSection(index, 'layout', event.target.value)}>
                        <option value="text">純文字</option>
                        <option value="image">文字 + 圖片</option>
                      </select>
                    </label>
                    {section.imageUrl && (
                      <>
                        <AdminMediaPreview item={section} />
                        <button type="button" className="secondary" onClick={() => updateCustomSection(index, 'imageUrl', '')}>
                          移除模塊素材
                        </button>
                      </>
                    )}
                  </article>
                ))}
              </div>
              <button type="button" onClick={addCustomSection}>新增模塊</button>
            </EditorPanel>
          )}

          {activeTab === 'login' && (
            <>
              <PageBackgroundEditor
                pageKey="login"
                background={draft.pageBackgrounds?.login}
                onChange={updatePageBackground}
                onUpload={uploadPageBackground}
              />

              <EditorPanel title="登入頁文字">
                <p className="admin-helper">
                  這裡只修改 /login 的畫面文案。登入驗證、帳號密碼與高權限判斷仍由內部系統後端負責。
                </p>
                <div className="admin-actions">
                  <Link to="/login" onClick={guardNavigation}>查看登入頁</Link>
                  <Link to="/admin/users" onClick={guardNavigation}>管理內部使用者</Link>
                </div>
                <TextInput label="登入框標題" value={draft.login?.title || ''} onChange={(value) => updateLoginContent('title', value)} />
                <div className="admin-two-column">
                  <TextInput label="Email 欄位標籤" value={draft.login?.emailLabel || ''} onChange={(value) => updateLoginContent('emailLabel', value)} />
                  <TextInput label="密碼欄位標籤" value={draft.login?.passwordLabel || ''} onChange={(value) => updateLoginContent('passwordLabel', value)} />
                  <TextInput label="登入按鈕文字" value={draft.login?.submitLabel || ''} onChange={(value) => updateLoginContent('submitLabel', value)} />
                  <TextInput label="登入失敗訊息" value={draft.login?.errorMessage || ''} onChange={(value) => updateLoginContent('errorMessage', value)} />
                </div>
              </EditorPanel>
            </>
          )}

          {activeTab === 'advanced' && (
            <EditorPanel title="進階 JSON 編輯">
              <p className="admin-helper">
                進階模式可一次編輯所有公開網站內容。這裡儲存的是前端內容設定；未來若接資料庫 API，可以沿用同一份 JSON 結構。
              </p>
              <textarea className="json-editor" value={jsonText} onChange={(event) => setJsonText(event.target.value)} rows="18" spellCheck="false" />
              <div className="admin-actions">
                <button type="button" onClick={saveJson}>套用 JSON</button>
                <button type="button" className="secondary" onClick={() => setJsonText(JSON.stringify(draft, null, 2))}>同步目前草稿</button>
              </div>
            </EditorPanel>
          )}
        </div>

        <aside className="admin-save-panel">
          <h2>發布控制</h2>
          <p>儲存後，公開首頁與加入我們頁會從後端資料庫讀取同一份內容，Safari、Chrome 和其他瀏覽器重新整理後都會同步。</p>
          <div className="admin-actions vertical">
            <button type="button" onClick={() => void save()}>儲存內容</button>
            <button type="button" className="secondary" onClick={reset}>恢復預設</button>
          </div>
          {status && <div className="admin-status">{status}</div>}
        </aside>
      </section>
    </main>
  )
}

function getCustomSections(content) {
  return Array.isArray(content.customSections) ? content.customSections : []
}

function getFeaturedStories(content) {
  return Array.isArray(content.featuredStories)
    ? content.featuredStories
    : defaultPublicSiteContent.featuredStories
}

function getImpactStats(content) {
  return Array.isArray(content.impactStats) ? content.impactStats : defaultPublicSiteContent.impactStats
}

function getAccessColumns(content) {
  return Array.isArray(content.accessColumns) ? content.accessColumns : defaultPublicSiteContent.accessColumns
}

function getJoinList(content, field) {
  return Array.isArray(content.join?.[field]) ? content.join[field] : defaultPublicSiteContent.join[field] || []
}

function getOrderList(content, field) {
  return Array.isArray(content.order?.[field]) ? content.order[field] : defaultPublicSiteContent.order[field] || []
}

function getJoinRoles(content) {
  return Array.isArray(content.join?.roles) ? content.join.roles : defaultPublicSiteContent.join.roles
}

function getPublicModels(content) {
  return Array.isArray(content.publicConceptModels)
    ? content.publicConceptModels
    : defaultPublicSiteContent.publicConceptModels
}

function getPublicImages(content) {
  return Array.isArray(content.publicImageGallery)
    ? content.publicImageGallery
    : defaultPublicSiteContent.publicImageGallery
}

function EditorPanel({ title, children }) {
  return (
    <section className="editor-panel">
      <h2>{title}</h2>
      <div className="editor-fields">{children}</div>
    </section>
  )
}

function TextInput({ label, value, onChange }) {
  return (
    <label>
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function TextArea({ label, value, onChange }) {
  return (
    <label>
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows="4" />
    </label>
  )
}

function RangeInput({ label, value, min, max, unit = '', onChange }) {
  return (
    <label>
      {label}
      <span className="range-input-row">
        <input type="range" min={min} max={max} value={value} onChange={(event) => onChange(event.target.value)} />
        <output>{value}{unit}</output>
      </span>
    </label>
  )
}

function PageBackgroundEditor({ pageKey, background = {}, onChange, onUpload }) {
  const label = PAGE_BACKGROUND_LABELS[pageKey] || '頁面'
  const defaultBackground = defaultPublicSiteContent.pageBackgrounds?.[pageKey] || {}
  const value = { ...defaultBackground, ...background }

  return (
    <EditorPanel title={`${label}整頁背景圖片`}>
      <p className="admin-helper">
        這張圖會套用在整個 {label} 背景。建議上傳橫式、高解析、不要有太密文字的圖片，並用圖片可見度控制不要干擾閱讀。
      </p>
      <label className="file-upload-field">
        上傳{label}背景圖片
        <span className="file-upload-control">
          <input type="file" accept="image/*" onChange={(event) => onUpload(pageKey, event.target.files?.[0])} />
        </span>
      </label>
      <TextInput label="背景圖片 URL" value={value.imageUrl || ''} onChange={(nextValue) => onChange(pageKey, 'imageUrl', nextValue)} />
      <TextInput label="背景圖片替代文字" value={value.imageAlt || ''} onChange={(nextValue) => onChange(pageKey, 'imageAlt', nextValue)} />
      <RangeInput
        label="背景圖片可見度"
        value={Number(value.opacity ?? defaultBackground.opacity ?? 16)}
        min="0"
        max="70"
        unit="%"
        onChange={(nextValue) => onChange(pageKey, 'opacity', Number(nextValue))}
      />
      <label>
        背景圖片顯示方式
        <select value={value.fit || 'cover'} onChange={(event) => onChange(pageKey, 'fit', event.target.value)}>
          <option value="cover">填滿頁面，可裁切</option>
          <option value="contain">完整顯示，不裁切</option>
        </select>
      </label>
      {value.imageUrl && (
        <>
          <img className="admin-image-preview" src={value.imageUrl} alt={value.imageAlt || `${label}背景圖片`} />
          <button type="button" className="secondary" onClick={() => {
            onChange(pageKey, 'imageUrl', '')
            onChange(pageKey, 'imageAlt', '')
          }}>
            移除{label}背景圖片
          </button>
        </>
      )}
    </EditorPanel>
  )
}

function FixedLabelEditor({ title, items, values = {}, defaults = {}, onChange }) {
  return (
    <div className="module-list">
      <strong>{title}</strong>
      {items.map(({ key, label }) => (
        <TextInput
          key={key}
          label={label}
          value={values?.[key] || defaults?.[key] || ''}
          onChange={(value) => onChange(key, value)}
        />
      ))}
    </div>
  )
}

function SimpleListEditor({ title, items = [], addLabel, onChange, onAdd, onRemove }) {
  return (
    <div className="module-list">
      <strong>{title}</strong>
      {items.map((item, index) => (
        <article className="module-editor compact" key={`${item || 'item'}-${index}`}>
          <div className="module-editor__header">
            <strong>項目 {index + 1}</strong>
            <button type="button" className="danger" onClick={() => onRemove(index)}>刪除</button>
          </div>
          <TextInput label="文字" value={item || ''} onChange={(value) => onChange(index, value)} />
        </article>
      ))}
      <button type="button" onClick={onAdd}>{addLabel}</button>
    </div>
  )
}

function AdminMediaPreview({ item }) {
  const isVideo = item.mediaType === 'video' || item.imageUrl?.startsWith('data:video')
  return isVideo ? (
    <video className="admin-image-preview" src={item.imageUrl} title={item.imageAlt || item.title} controls muted />
  ) : (
    <img className="admin-image-preview" src={item.imageUrl} alt={item.imageAlt || item.title} />
  )
}

const NAV_LABEL_KEYS = [
  { key: 'home', label: '首頁' },
  { key: 'showcase', label: '展示' },
  { key: 'catalog', label: '產品' },
  { key: 'order', label: '訂購' },
  { key: 'join', label: '加入我們' },
  { key: 'login', label: '登入' }
]

const JOIN_LABEL_KEYS = [
  { key: 'navHomeLabel', label: '導覽：官方網站' },
  { key: 'navRolesLabel', label: '導覽：合作方向' },
  { key: 'navApplicationLabel', label: '導覽：申請' },
  { key: 'navLoginLabel', label: '導覽：登入' },
  { key: 'primaryCtaLabel', label: '主要按鈕' },
  { key: 'secondaryCtaLabel', label: '次要按鈕' },
  { key: 'submitLabel', label: '送出按鈕' },
  { key: 'footerHomeLabel', label: 'Footer：官方網站' },
  { key: 'footerLoginLabel', label: 'Footer：內部系統登入' }
]
