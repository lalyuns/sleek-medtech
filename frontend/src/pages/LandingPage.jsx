import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Link } from 'react-router-dom'
import { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import * as THREE from 'three'
import api from '../api/client'
import {
  defaultPublicSiteContent,
  getPublicFontStack,
  getPublicHeadingWeight,
  getPublicPageBackgroundStyle,
  usePublicSiteContent
} from '../content/publicSiteContent'
import '../styles/landing.css'

const MODEL_ZOOM_MIN = 0.6
const MODEL_ZOOM_MAX = 4
const MODEL_ZOOM_STEP = 0.05
const MODEL_ZOOM_DEFAULT = 1.35
const MODEL_CAMERA_POSITION = [2.85, 1.92, 3.72]
const MODEL_CAMERA_TARGET = [0, 0, 0]
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export default function LandingPage() {
  const content = usePublicSiteContent()
  const landing = content.landing
  const imageItems = getVisibleItems(getShowcaseImages(content.publicImageGallery))
  const featuredStories = getFeaturedStories(content.featuredStories, imageItems)
  const impactStats = getArrayOrDefault(content.impactStats, defaultPublicSiteContent.impactStats)
  const accessColumns = getArrayOrDefault(content.accessColumns, defaultPublicSiteContent.accessColumns)
  const customSections = getArrayOrDefault(content.customSections, [])
  const publicFontFamily = getPublicFontStack(content.fontFamily)
  const publicHeadingWeight = getPublicHeadingWeight(content.headingWeight)
  const heroMedia = {
    imageUrl: landing.heroImageUrl || '/orthopedic-hero.svg',
    imageAlt: landing.heroImageAlt || '骨科固定片、骨釘與手術導引器材概念圖',
    mediaType: landing.heroImageUrl?.startsWith('data:video') ? 'video' : 'image',
  }
  const heroImageOpacity = clamp(Number(landing.heroImageOpacity ?? 78), 0, 100) / 100
  const heroImageFit = landing.heroImageFit === 'cover' ? 'cover' : 'contain'
  const lineBotHref = landing.lineBotUrl || '#access'
  const lineBotTarget = landing.lineBotUrl ? '_blank' : undefined
  const [aiProducts, setAiProducts] = useState([])

  useScrollDrivenMotion()

  useEffect(() => {
    document.title = content.siteTitle || `${content.brand} | 骨科 3D 建模與客製化醫療器材`
  }, [content.brand, content.siteTitle])

  useEffect(() => {
    let isMounted = true
    api.get('/catalog/products')
      .then((response) => {
        if (isMounted) setAiProducts(Array.isArray(response.data) ? response.data : [])
      })
      .catch(() => {
        if (isMounted) setAiProducts([])
      })
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <main
      className="landing-page"
      style={{
        '--public-font-family': publicFontFamily,
        '--public-heading-weight': publicHeadingWeight,
        ...getPublicPageBackgroundStyle(content, 'home')
      }}
    >
      <PublicNav brand={content.brand} logoUrl={content.logoUrl} logoAlt={content.logoAlt} labels={content.navLabels} />
      <AiAssistantWidget content={content} products={aiProducts} />

      <section className="landing-hero nable-hero" data-scroll-scene data-nb-section="hero">
        <div
          className="landing-hero__equipment"
          style={{ '--hero-image-opacity': heroImageOpacity, '--hero-image-fit': heroImageFit }}
          aria-hidden="true"
        >
          <MediaSurface item={heroMedia} />
        </div>
        <div className="landing-hero__copy">
          <p className="landing-kicker">{landing.heroKicker}</p>
          <h1>{landing.heroShortTitle || content.brand}</h1>
          <p>{landing.heroDisplaySubtitle || landing.heroSubtitle}</p>
          <div className="landing-actions">
            <Link className="landing-button landing-button--primary" to={landing.heroPrimaryCtaPath || '/showcase'}>
              {landing.heroPrimaryCtaLabel || '探索展示'}
            </Link>
            <Link className="landing-button landing-button--ghost" to={landing.heroSecondaryCtaPath || '/order'}>
              {landing.heroSecondaryCtaLabel || '產品訂購'}
            </Link>
            <a className="landing-button landing-button--linebot" href={lineBotHref} target={lineBotTarget} rel={landing.lineBotUrl ? 'noreferrer' : undefined}>
              {landing.lineBotButtonLabel || 'LINE Bot 申請入口'}
            </a>
          </div>
        </div>
        <div className="landing-scroll-cue" aria-hidden="true">
          <span>{landing.scrollCueLabel || '向下捲動'}</span>
          <i />
        </div>
      </section>

      <section className="landing-statement" data-scroll-scene>
        <p>{landing.statementText}</p>
      </section>

      <section className="landing-showcase-track" data-showcase-track data-scroll-scene>
        <div className="landing-showcase-panel">
          <div className="landing-showcase-counter" aria-hidden="true">01</div>
          {featuredStories.map((story, index) => (
            <article
              className={`landing-showcase-slide${story.imageLayout === 'wide' ? ' landing-showcase-slide--wide-media' : ''}${index === 0 ? ' is-active' : ''}`}
              data-showcase-slide
              key={story.number}
            >
              <div className="landing-showcase-copy">
                <p className="landing-kicker">{story.label}</p>
                <h2>{story.title}</h2>
                <p>{story.text}</p>
                <ul>
                  {story.points.map((point) => <li key={point}>{point}</li>)}
                </ul>
                <Link className="landing-button landing-button--white-ghost" to={story.ctaPath || (index === 0 ? '/showcase' : '/catalog')}>
                  {story.ctaLabel || '了解更多'}
                </Link>
              </div>
              <VisualSurface item={story.image} tone={index + 1} />
            </article>
          ))}
          <nav className="landing-showcase-dots" aria-label="展示段落">
            {featuredStories.map((story, index) => (
              <button
                className={index === 0 ? 'is-active' : ''}
                data-showcase-dot
                type="button"
                aria-label={`${story.label} ${story.title}`}
                key={story.number}
              />
            ))}
          </nav>
        </div>
      </section>

      <section className="product-story product-story--legacy">
        {featuredStories.map((story) => (
          <article className="product-story-card" data-scroll-scene key={story.number}>
            <VisualSurface item={story.image} tone={Number(story.number)} />
            <div className="product-story-card__copy">
              <span>{story.number}</span>
              <p className="landing-kicker">{story.label}</p>
              <h2>{story.title}</h2>
              <p>{story.text}</p>
              <div>
                {story.points.map((point) => <strong key={point}>{point}</strong>)}
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="impact-strip" data-scroll-scene>
        {impactStats.map(({ value, label }) => (
          <article key={value}>
            <strong>{value}</strong>
            <span>{label}</span>
          </article>
        ))}
      </section>

      {customSections.length > 0 && (
        <section className="landing-section custom-section-list" data-scroll-scene>
          {customSections.map((section) => (
            <article className={`custom-public-section custom-public-section--${section.layout || 'text'}`} key={section.id || section.title}>
              <div>
                {section.kicker && <p className="landing-kicker">{section.kicker}</p>}
                <h2>{section.title}</h2>
                <p>{section.text}</p>
              </div>
              {section.imageUrl && section.layout === 'image' && <MediaSurface item={section} className="custom-public-section__media" />}
            </article>
          ))}
        </section>
      )}

      <section className="landing-final-cta" data-scroll-scene>
        <div>
          <p className="landing-kicker">{landing.finalCtaKicker || 'Ready'}</p>
          <h2>{landing.finalCtaTitle}</h2>
        </div>
        <div>
          <Link className="landing-button landing-button--primary" to={landing.finalCtaPrimaryPath || '/showcase'}>
            {landing.finalCtaPrimaryLabel || '觀看展示'}
          </Link>
          <Link className="landing-button landing-button--ghost" to={landing.finalCtaSecondaryPath || '/order'}>
            {landing.finalCtaSecondaryLabel || '產品訂購'}
          </Link>
        </div>
      </section>

      <section className="landing-section landing-compare compact" id="access">
        <div className="landing-section__heading">
          <p className="landing-kicker">{landing.accessKicker || 'Access'}</p>
          <h2>{landing.accessCompactTitle || landing.accessTitle}</h2>
        </div>
        <div className="compare-grid">
          {accessColumns.map(({ title, text }) => (
            <article className="access-column access-column--public" key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <article
          className={`linebot-access-card${landing.lineBotUrl ? ' linebot-access-card--clickable' : ''}`}
          onClick={() => {
            if (landing.lineBotUrl) window.location.href = landing.lineBotUrl
          }}
        >
          <div>
            <p className="landing-kicker">LINE Bot</p>
            <h3>{landing.lineBotTitle || '透過 LINE Bot 申請更多權限'}</h3>
            <p>{landing.lineBotText}</p>
          </div>
          {landing.lineBotQrUrl && (
            <img src={landing.lineBotQrUrl} alt={landing.lineBotQrAlt || 'LINE Bot 申請 QR code'} />
          )}
        </article>
      </section>

      <Footer content={content} />
    </main>
  )
}

const AI_QUICK_PROMPTS = [
  '你們主要做什麼？',
  '我要怎麼訂購產品？',
  '如何申請內部系統權限？',
  '有哪些 3D 展示模型？'
]

function AiAssistantWidget({ content, products }) {
  const landing = content.landing || {}
  const assistantName = landing.aiAssistantName || '小睿'
  const assistantBadge = landing.aiAssistantBadge || 'AI'
  const assistantButtonTitle = landing.aiAssistantButtonTitle || `${assistantName} AI 助理`
  const assistantButtonSubtitle = landing.aiAssistantButtonSubtitle || '產品、訂購、合作都能問'
  const assistantPanelKicker = landing.aiAssistantPanelKicker || 'Ruicheng AI Assistant'
  const assistantPanelTitle = landing.aiAssistantPanelTitle || `${assistantName} AI 助理`
  const assistantGreeting = landing.aiAssistantGreeting || `您好，我是${assistantName}，睿程生醫的官網 AI 助理。您可以問我公司介紹、產品展示、訂購方式、合作需求或內部系統申請流程。`
  const assistantThinkingText = landing.aiAssistantThinkingText || `${assistantName}正在整理官網內容...`
  const assistantInputPlaceholder = landing.aiAssistantInputPlaceholder || '輸入想了解的內容'
  const assistantNote = landing.aiAssistantNote || '僅依官網公開內容回答；詳細材料參數、模型版本、BOM、報告與稽核紀錄需進入內部系統。'
  const [isOpen, setIsOpen] = useState(false)
  const [isAsking, setIsAsking] = useState(false)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: assistantGreeting
    }
  ])

  const submitQuestion = async (nextQuestion = question) => {
    const trimmedQuestion = nextQuestion.trim()
    if (!trimmedQuestion || isAsking) return
    setMessages((currentMessages) => [
      ...currentMessages,
      { role: 'user', text: trimmedQuestion },
    ])
    setQuestion('')
    setIsOpen(true)
    setIsAsking(true)

    try {
      const { data } = await api.post('/public-ai/chat', { question: trimmedQuestion })
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: 'assistant',
          text: data.answer,
          actionLabel: data.action_label,
          actionHref: data.action_href,
          source: data.source,
        }
      ])
    } catch {
      const answer = buildAiAnswer(trimmedQuestion, content, products)
      setMessages((currentMessages) => [
        ...currentMessages,
        { role: 'assistant', ...answer, source: 'fallback' }
      ])
    } finally {
      setIsAsking(false)
    }
  }

  return (
    <>
      <button className="ai-floating-button" type="button" onClick={() => setIsOpen((value) => !value)} aria-expanded={isOpen}>
        <span>{assistantBadge}</span>
        <strong>{assistantButtonTitle}</strong>
        <small>{assistantButtonSubtitle}</small>
      </button>
      {isOpen && (
        <section className="ai-chat-panel" aria-label={`${assistantName} AI 問答`}>
          <header>
            <div>
              <p>{assistantPanelKicker}</p>
              <h2>{assistantPanelTitle}</h2>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} aria-label={`關閉${assistantName} AI 問答`}>
              ×
            </button>
          </header>
          <div className="ai-chat-messages">
            {messages.map((message, index) => (
              <article className={`ai-chat-message ai-chat-message--${message.role}`} key={`${message.role}-${index}`}>
                {message.text.split('\n').map((line, lineIndex) => (
                  <p key={`${message.role}-${index}-${lineIndex}`}>{line}</p>
                ))}
                {message.source === 'fallback' && (
                  <small>目前後端尚未連上大語言模型，已先用官網內容索引回答。</small>
                )}
                {message.actionHref && (
                  <a href={message.actionHref} target={message.actionHref.startsWith('http') ? '_blank' : undefined} rel={message.actionHref.startsWith('http') ? 'noreferrer' : undefined}>
                    {message.actionLabel || '前往查看'}
                  </a>
                )}
              </article>
            ))}
            {isAsking && (
              <article className="ai-chat-message ai-chat-message--assistant">
                <p>{assistantThinkingText}</p>
              </article>
            )}
          </div>
          <div className="ai-chat-prompts" aria-label="常見問題">
            {AI_QUICK_PROMPTS.map((prompt) => (
              <button type="button" key={prompt} onClick={() => submitQuestion(prompt)} disabled={isAsking}>
                {prompt}
              </button>
            ))}
          </div>
          <form
            className="ai-chat-form"
            onSubmit={(event) => {
              event.preventDefault()
              submitQuestion()
            }}
          >
            <input
              type="text"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={assistantInputPlaceholder}
              aria-label="輸入想了解的官網問題"
              disabled={isAsking}
            />
            <button type="submit" disabled={isAsking}>{isAsking ? '思考中' : '送出'}</button>
          </form>
          <p className="ai-chat-note">{assistantNote}</p>
        </section>
      )}
    </>
  )
}

function VisualSurface({ item, tone = 0 }) {
  return (
    <div className={`visual-surface visual-surface--${tone % 6}`}>
      {getMediaUrl(item) ? (
        <MediaSurface item={item} />
      ) : (
        <div className="visual-surface__fallback" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}
    </div>
  )
}

function MediaSurface({ item, className = '' }) {
  const mediaUrl = getMediaUrl(item)
  const alt = item?.imageAlt || item?.title || '公開網站素材'
  const isVideo = getMediaType(item) === 'video'
  const mediaStyle = {
    objectFit: item?.imageFit === 'cover' ? 'cover' : 'contain',
    objectPosition: item?.imagePosition || 'center',
  }

  if (!mediaUrl) return null

  return isVideo ? (
    <video className={className} src={mediaUrl} title={alt} style={mediaStyle} autoPlay muted loop playsInline />
  ) : (
    <img className={className} src={mediaUrl} alt={alt} style={mediaStyle} />
  )
}

function useScrollDrivenMotion() {
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduceMotion.matches) return undefined

    let frame = 0
    const updateShowcase = () => {
      const tracks = document.querySelectorAll('[data-showcase-track]')
      tracks.forEach((track) => {
        const slides = Array.from(track.querySelectorAll('[data-showcase-slide]'))
        const dots = Array.from(track.querySelectorAll('[data-showcase-dot]'))
        const counter = track.querySelector('.landing-showcase-counter')
        if (!slides.length) return

        const rect = track.getBoundingClientRect()
        const scrollable = track.offsetHeight - window.innerHeight
        const raw = scrollable > 0 ? clamp(-rect.top / scrollable, 0, 1) : 0
        const activeIndex = Math.min(slides.length - 1, Math.floor(raw * slides.length))

        slides.forEach((slide, index) => {
          slide.classList.toggle('is-active', index === activeIndex)
          slide.classList.toggle('is-before', index < activeIndex)
        })
        dots.forEach((dot, index) => dot.classList.toggle('is-active', index === activeIndex))
        if (counter) counter.textContent = `0${activeIndex + 1}`
      })
    }

    const update = () => {
      frame = 0
      const viewportHeight = window.innerHeight || 1
      const scenes = document.querySelectorAll('[data-scroll-scene]')
      scenes.forEach((scene) => {
        const rect = scene.getBoundingClientRect()
        const progress = clamp((viewportHeight - rect.top) / (viewportHeight + rect.height), 0, 1)
        scene.style.setProperty('--scroll-progress', progress.toFixed(3))
        scene.toggleAttribute('data-scene-active', progress > 0.08 && progress < 0.92)
      })
      updateShowcase()
    }

    const requestUpdate = () => {
      if (frame) return
      frame = window.requestAnimationFrame(update)
    }

    update()
    const dotClickCleanups = Array.from(document.querySelectorAll('[data-showcase-track]')).flatMap((track) => {
      const dots = Array.from(track.querySelectorAll('[data-showcase-dot]'))
      const onClicks = dots.map((dot, index) => {
        const onClick = () => {
          const scrollable = track.offsetHeight - window.innerHeight
          window.scrollTo({ top: track.offsetTop + (index / dots.length) * scrollable + 1, behavior: 'smooth' })
        }
        dot.addEventListener('click', onClick)
        return () => dot.removeEventListener('click', onClick)
      })
      return onClicks
    })
    window.addEventListener('scroll', requestUpdate, { passive: true })
    window.addEventListener('resize', requestUpdate)

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      dotClickCleanups.forEach((cleanup) => cleanup())
      window.removeEventListener('scroll', requestUpdate)
      window.removeEventListener('resize', requestUpdate)
    }
  }, [])
}

export function PublicShowcasePage() {
  const content = usePublicSiteContent()
  const landing = content.landing
  const publicFontFamily = getPublicFontStack(content.fontFamily)
  const publicHeadingWeight = getPublicHeadingWeight(content.headingWeight)
  const imageItems = getVisibleItems(getShowcaseImages(content.publicImageGallery))
  const modelItems = getVisibleItems(content.publicConceptModels)

  useEffect(() => {
    document.title = `展示中心 | ${content.brand}`
  }, [content.brand])

  return (
    <main
      className="landing-page"
      style={{
        '--public-font-family': publicFontFamily,
        '--public-heading-weight': publicHeadingWeight,
        ...getPublicPageBackgroundStyle(content, 'showcase')
      }}
    >
      <PublicNav brand={content.brand} logoUrl={content.logoUrl} logoAlt={content.logoAlt} labels={content.navLabels} />

      <section className="landing-section showcase-hero">
        <div className="landing-section__heading">
          <p className="landing-kicker">Showcase</p>
          <h1>{landing.showcasePageTitle || '3D 模型與靜態產品展示'}</h1>
          <p>{landing.showcasePageIntro}</p>
        </div>
      </section>

      <section className="landing-section public-3d-section" id="public-3d">
        <div className="landing-section__heading">
          <p className="landing-kicker">Public 3D Concept Viewer</p>
          <h2>{landing.public3dTitle}</h2>
          <p>{landing.public3dIntro}</p>
        </div>
        <PublicProductViewer
          models={modelItems}
          noteTitle={landing.public3dNoteTitle}
          noteFallback={landing.public3dNoteFallback}
        />
      </section>

      <section className="landing-section public-image-section" id="public-images">
        <div className="landing-section__heading">
          <p className="landing-kicker">Static Product Gallery</p>
          <h2>{landing.imageGalleryTitle || defaultPublicSiteContent.landing.imageGalleryTitle}</h2>
          <p>{landing.imageGalleryIntro || defaultPublicSiteContent.landing.imageGalleryIntro}</p>
        </div>
        <PublicImageGallery items={imageItems} />
      </section>

      <Footer content={content} />
    </main>
  )
}

function PublicNav({ brand, logoUrl, logoAlt, labels }) {
  const nav = { ...defaultPublicSiteContent.navLabels, ...labels }
  return (
    <header className="public-nav">
      <Link className="public-brand" to="/">
        {logoUrl ? <img src={logoUrl} alt={logoAlt || brand} /> : <span />}
        {brand}
      </Link>
      <nav>
        <Link to="/">{nav.home}</Link>
        <Link to="/showcase">{nav.showcase}</Link>
        <Link to="/catalog">{nav.catalog}</Link>
        <Link to="/order">{nav.order}</Link>
        <Link to="/join-us">{nav.join}</Link>
        <Link to="/login">{nav.login}</Link>
      </nav>
    </header>
  )
}

function PublicImageGallery({ items }) {
  if (!items.length) return null

  return (
    <div className="public-image-grid">
      {items.map((item) => (
        <article className="public-image-card" key={item.id || item.title}>
          <div className="public-image-card__media">
            {getMediaUrl(item) ? (
              <MediaSurface item={item} />
            ) : (
              <div className="public-image-placeholder" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            )}
          </div>
          <div className="public-image-card__copy">
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </div>
        </article>
      ))}
    </div>
  )
}

function PublicProductViewer({ models, noteTitle, noteFallback }) {
  const [activeModelId, setActiveModelId] = useState(models[0]?.id)
  const activeModel = models.find((model) => model.id === activeModelId) || models[0]
  const [autoRotate, setAutoRotate] = useState(true)
  const [modelZoom, setModelZoom] = useState(MODEL_ZOOM_DEFAULT)
  const [resetViewToken, setResetViewToken] = useState(0)

  const stopAutoRotate = useCallback(() => {
    setAutoRotate(false)
  }, [])

  const updateModelZoom = (nextZoom) => {
    setModelZoom(Math.min(MODEL_ZOOM_MAX, Math.max(MODEL_ZOOM_MIN, nextZoom)))
    stopAutoRotate()
  }

  const resetModelView = () => {
    setModelZoom(MODEL_ZOOM_DEFAULT)
    setAutoRotate(true)
    setResetViewToken((token) => token + 1)
  }

  if (!activeModel) return null

  return (
    <div className="public-3d-layout">
      <div
        className="public-3d-stage"
        aria-label="公開互動式 3D 產品概念展示"
        onPointerDown={stopAutoRotate}
        onWheel={stopAutoRotate}
        onTouchStart={stopAutoRotate}
      >
        <Canvas camera={{ position: MODEL_CAMERA_POSITION, fov: 34 }} dpr={[1, 2]} gl={{ antialias: true }}>
          <color attach="background" args={['#eef5fb']} />
          <ambientLight intensity={0.62} />
          <directionalLight position={[4, 6, 5]} intensity={1.6} />
          <directionalLight position={[-4, 2, -3]} intensity={0.55} />
          <Suspense fallback={null}>
            {activeModel.modelUrl ? (
              <PublicSTLModel key={activeModel.id} url={activeModel.modelUrl} autoRotate={autoRotate} modelZoom={modelZoom} />
            ) : (
              <ConceptModel key={activeModel.id} type={activeModel.id} autoRotate={autoRotate} modelZoom={modelZoom} />
            )}
          </Suspense>
          <PublicOrbitControls onUserInteract={stopAutoRotate} resetViewToken={resetViewToken} />
        </Canvas>
      </div>
      <aside className="public-3d-panel">
        <div>
          <p className="landing-kicker">Concept Only</p>
          <h3>{activeModel.title}</h3>
          <p>{activeModel.description}</p>
        </div>
        <div className="public-3d-buttons">
          {models.map((model) => (
            <button
              key={model.id}
              type="button"
              aria-pressed={activeModel.id === model.id}
              onClick={() => {
                setActiveModelId(model.id)
                setAutoRotate(true)
                setModelZoom(MODEL_ZOOM_DEFAULT)
                setResetViewToken((token) => token + 1)
              }}
            >
              {model.title}
            </button>
          ))}
        </div>
        <div className="public-3d-zoom">
          <div className="public-3d-zoom__heading">
            <strong>模型縮放</strong>
            <span>{Math.round(modelZoom * 100)}%</span>
          </div>
          <div className="public-3d-zoom__controls">
            <button
              type="button"
              aria-label="縮小模型"
              onClick={() => updateModelZoom(modelZoom - 0.15)}
              disabled={modelZoom <= MODEL_ZOOM_MIN}
            >
              -
            </button>
            <input
              type="range"
              min={MODEL_ZOOM_MIN}
              max={MODEL_ZOOM_MAX}
              step={MODEL_ZOOM_STEP}
              value={modelZoom}
              aria-label="調整模型縮放大小"
              onChange={(event) => updateModelZoom(Number(event.target.value))}
            />
            <button
              type="button"
              aria-label="放大模型"
              onClick={() => updateModelZoom(modelZoom + 0.15)}
              disabled={modelZoom >= MODEL_ZOOM_MAX}
            >
              +
            </button>
          </div>
          <button type="button" className="public-3d-zoom__reset" onClick={resetModelView}>
            重設視角與大小
          </button>
          <p>可拖曳旋轉、滾輪縮放，也可以用滑桿控制公開模型大小。</p>
        </div>
        <div className="public-3d-note">
          <strong>{noteTitle || '公開展示範圍'}</strong>
          <span>
            {activeModel.modelUrl
              ? `目前顯示公開上傳模型${activeModel.fileName ? `：${activeModel.fileName}` : ''}。詳細材料與版本資料仍需登入內部系統。`
              : (noteFallback || '可旋轉、縮放與切換概念模型。詳細幾何、材料與版本資料需登入內部系統。')}
          </span>
        </div>
      </aside>
    </div>
  )
}

function PublicSTLModel({ url, autoRotate, modelZoom }) {
  const groupRef = useRef(null)
  const loadedGeometry = useLoader(STLLoader, url)
  const geometry = useMemo(() => {
    const nextGeometry = loadedGeometry.clone()
    nextGeometry.center()
    nextGeometry.computeBoundingBox()
    return nextGeometry
  }, [loadedGeometry])

  const scale = useMemo(() => {
    const box = geometry.boundingBox
    if (!box) return 1
    const size = new THREE.Vector3()
    box.getSize(size)
    return 2.9 / Math.max(size.x, size.y, size.z, 1)
  }, [geometry])

  useEffect(() => {
    return () => geometry.dispose()
  }, [geometry])

  useFrame((_, delta) => {
    if (!autoRotate || !groupRef.current) return
    groupRef.current.rotation.y += delta * 0.16
  })

  return (
    <group ref={groupRef} scale={modelZoom}>
      <mesh geometry={geometry} scale={scale} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#60a5fa" roughness={0.36} metalness={0.08} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function PublicOrbitControls({ onUserInteract, resetViewToken }) {
  const { camera, gl } = useThree()
  const controls = useMemo(() => {
    const instance = new ThreeOrbitControls(camera, gl.domElement)
    instance.enableDamping = true
    instance.enablePan = false
    instance.minDistance = 1.25
    instance.maxDistance = 8.5
    instance.target.set(...MODEL_CAMERA_TARGET)
    return instance
  }, [camera, gl.domElement])

  useFrame(() => controls.update(), -1)

  useEffect(() => {
    camera.position.set(...MODEL_CAMERA_POSITION)
    controls.target.set(...MODEL_CAMERA_TARGET)
    controls.update()
  }, [camera, controls, resetViewToken])

  useEffect(() => {
    controls.addEventListener('start', onUserInteract)
    return () => controls.removeEventListener('start', onUserInteract)
  }, [controls, onUserInteract])

  useEffect(() => {
    return () => controls.dispose()
  }, [controls])

  return null
}

function ConceptModel({ type, autoRotate, modelZoom }) {
  const groupRef = useRef(null)

  useFrame((_, delta) => {
    if (!autoRotate || !groupRef.current) return
    groupRef.current.rotation.y += delta * 0.16
  })

  return (
    <group ref={groupRef} rotation={[0.18, -0.45, 0]} position={[0, 0, 0]} scale={modelZoom}>
      {type === 'implant' ? <ImplantConcept /> : type === 'planning' ? <PlanningConcept /> : <GuideConcept />}
    </group>
  )
}

function GuideConcept() {
  return (
    <group>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[2.7, 0.32, 1.45]} />
        <meshStandardMaterial color="#d8e4ef" roughness={0.46} metalness={0.08} />
      </mesh>
      <mesh position={[-0.62, 0.42, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 1.65, 42]} />
        <meshStandardMaterial color="#2563eb" roughness={0.34} metalness={0.18} />
      </mesh>
      <mesh position={[0.48, 0.48, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.19, 0.19, 1.52, 42]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.3} metalness={0.08} />
      </mesh>
      <mesh position={[0.88, -0.08, 0.86]} rotation={[0.25, 0.15, 0]}>
        <boxGeometry args={[0.84, 0.48, 0.18]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.15} />
      </mesh>
      <mesh position={[-1.1, -0.02, -0.76]} rotation={[0, 0.25, 0]}>
        <torusGeometry args={[0.36, 0.045, 18, 72]} />
        <meshStandardMaterial color="#0ea5e9" roughness={0.25} />
      </mesh>
    </group>
  )
}

function ImplantConcept() {
  return (
    <group>
      <mesh position={[0, 0, 0]} rotation={[0, 0, -0.22]}>
        <boxGeometry args={[2.65, 0.24, 0.72]} />
        <meshStandardMaterial color="#b7c5d5" roughness={0.42} metalness={0.18} />
      </mesh>
      {[-0.9, 0, 0.9].map((x) => (
        <mesh key={x} position={[x, 0.04, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.82, 36]} />
          <meshStandardMaterial color="#1d4ed8" roughness={0.28} metalness={0.24} />
        </mesh>
      ))}
      <mesh position={[1.24, -0.28, 0.02]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.12, 0.16, 1.22, 36]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.22} metalness={0.12} />
      </mesh>
      <mesh position={[-1.25, 0.28, 0.02]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.12, 0.16, 1.12, 36]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.22} metalness={0.12} />
      </mesh>
    </group>
  )
}

function PlanningConcept() {
  return (
    <group>
      <mesh position={[-0.72, 0.08, 0]}>
        <sphereGeometry args={[0.74, 48, 24]} />
        <meshStandardMaterial color="#dce8f4" roughness={0.52} metalness={0.04} />
      </mesh>
      <mesh position={[0.35, 0.02, 0]} scale={[1.25, 0.68, 0.86]}>
        <sphereGeometry args={[0.72, 48, 24]} />
        <meshStandardMaterial color="#c4d4e4" roughness={0.5} metalness={0.04} />
      </mesh>
      <mesh position={[0.95, 0.44, 0]} rotation={[0, 0, 0.32]}>
        <boxGeometry args={[1.2, 0.08, 0.08]} />
        <meshStandardMaterial color="#2563eb" roughness={0.26} />
      </mesh>
      <mesh position={[0.95, -0.34, 0.04]} rotation={[0, 0, -0.28]}>
        <boxGeometry args={[1.12, 0.08, 0.08]} />
        <meshStandardMaterial color="#0ea5e9" roughness={0.26} />
      </mesh>
      <mesh position={[-0.15, 0.74, 0]}>
        <torusGeometry args={[0.42, 0.035, 16, 72]} />
        <meshStandardMaterial color="#0f172a" roughness={0.36} metalness={0.08} />
      </mesh>
    </group>
  )
}

function Footer({ content }) {
  const nav = { ...defaultPublicSiteContent.navLabels, ...content.navLabels }
  return (
    <footer className="landing-footer">
      <div>
        <h2>{content.brand}</h2>
        <p>{content.landing.footerText}</p>
      </div>
      <nav>
        <Link to="/">{nav.home}</Link>
        <Link to="/showcase">{nav.showcase}</Link>
        <Link to="/catalog">{nav.catalog}</Link>
        <Link to="/order">{nav.order}</Link>
        <Link to="/join-us">{nav.join}</Link>
        <Link to="/login">內部系統登入</Link>
      </nav>
      <p className="disclaimer">
        {content.landing.disclaimer}
      </p>
    </footer>
  )
}

function getShowcaseImages(savedImages) {
  const defaults = defaultPublicSiteContent.publicImageGallery
  if (!Array.isArray(savedImages) || savedImages.length === 0) return defaults

  const savedIds = new Set(savedImages.map((item) => item.id || item.title))
  const missingDefaults = defaults.filter((item) => !savedIds.has(item.id || item.title))
  return [...savedImages, ...missingDefaults]
}

function getVisibleItems(items = []) {
  return items.filter((item) => item?.hidden !== true)
}

function getFeaturedStories(savedStories, imageItems) {
  const defaults = defaultPublicSiteContent.featuredStories
  const stories = Array.isArray(savedStories) && savedStories.length > 0 ? savedStories : defaults
  return stories.map((story, index) => ({
    number: story.number || `0${index + 1}`,
    label: story.label || '',
    title: story.title || '',
    text: story.text || '',
    points: Array.isArray(story.points) ? story.points : [],
    ctaLabel: story.ctaLabel || '了解更多',
    ctaPath: story.ctaPath || (index === 0 ? '/showcase' : '/catalog'),
    image: story.imageUrl
      ? {
          imageUrl: story.imageUrl,
          imageAlt: story.imageAlt || story.title,
          mediaType: story.mediaType || (story.imageUrl.startsWith('data:video') ? 'video' : 'image'),
          imageFit: story.imageFit || 'contain',
          imagePosition: story.imagePosition || 'center',
          title: story.title,
        }
      : imageItems[Number.isFinite(Number(story.imageIndex)) ? Number(story.imageIndex) : index] || imageItems[index],
    imageLayout: story.imageLayout || 'standard',
  }))
}

function getArrayOrDefault(value, fallback) {
  return Array.isArray(value) ? value : fallback
}

function buildAiAnswer(question, content, products = []) {
  const landing = content.landing || {}
  const questionText = question.toLowerCase()
  const lineBotHref = landing.lineBotUrl || '#access'
  const visibleModels = getVisibleItems(content.publicConceptModels || [])
  const visibleImages = getVisibleItems(getShowcaseImages(content.publicImageGallery))
  const publicProducts = Array.isArray(products) ? products : []
  const assistantName = landing.aiAssistantName || '小睿'
  const answerGuard = `${assistantName}只能根據目前官網公開內容回答；詳細醫療參數、材料規格、STL 版本、BOM、報告與稽核紀錄需要透過內部系統或 LINE Bot 申請後查看。`

  if (hasAnyTerm(questionText, ['line', '帳號', '權限', '申請', '登入', '內部系統'])) {
    return {
      text: `${landing.lineBotTitle || 'LINE Bot 帳號申請與諮詢入口'}\n${landing.lineBotText || '需要申請內部系統權限、確認產品訂購或提交需求時，可以透過 LINE Bot 留下資料。'}\n${answerGuard}`,
      actionLabel: '前往 LINE Bot / 申請區',
      actionHref: lineBotHref
    }
  }

  if (hasAnyTerm(questionText, ['訂', '購', 'order', '產品', '價格', '報價', '材料', '固定器'])) {
    const productSummary = publicProducts.length
      ? `目前官網公開產品包含：${publicProducts.slice(0, 5).map((product) => product.name).join('、')}。`
      : `${content.catalog?.intro || '產品目錄會展示 3D 產品、圖片產品、材料本身與術後恢復相關項目。'}`
    return {
      text: `${productSummary}\n若要下單，請到「訂購」頁選擇產品類型、品項、數量並留下聯絡方式，後續由專人確認規格、交期與報價。\n${answerGuard}`,
      actionLabel: '前往訂購頁',
      actionHref: '/order'
    }
  }

  if (hasAnyTerm(questionText, ['3d', 'stl', '模型', '展示', '旋轉', '縮放'])) {
    const modelSummary = visibleModels.length
      ? `目前公開 3D 展示包含：${visibleModels.map((model) => model.title).join('、')}。`
      : landing.public3dIntro
    return {
      text: `${modelSummary}\n公開展示可以旋轉、縮放與切換概念模型，但不會公開完整專案參數與版本紀錄。\n${answerGuard}`,
      actionLabel: '前往展示頁',
      actionHref: '/showcase'
    }
  }

  if (hasAnyTerm(questionText, ['加入', '工作', '實習', '人才', '合作', '職缺', '履歷'])) {
    return {
      text: `${content.join?.heroTitle || '加入我們，一起推動客製化骨科醫療科技'}\n這個頁面是給人才、實習生與合作夥伴使用，和內部系統帳號申請分開。你可以留下感興趣方向、作品集或自我介紹。\n${answerGuard}`,
      actionLabel: '前往加入我們',
      actionHref: '/join-us'
    }
  }

  const knowledge = buildPublicKnowledge(content, publicProducts, visibleModels, visibleImages)
  const scored = knowledge
    .map((entry) => ({
      ...entry,
      score: scoreKnowledgeEntry(questionText, entry)
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  if (!scored.length) {
    return {
      text: `我是${assistantName}，${content.brand} 的官網 AI 助理。公開官網主要讓訪客理解 3D 建模、拓樸優化、客製化醫療輔助器材、產品目錄與訂購入口。\n您可以問${assistantName}：「怎麼訂購產品」、「有哪些 3D 展示」、「如何申請內部系統權限」或「怎麼加入合作」。\n${answerGuard}`
    }
  }

  return {
    text: `${assistantName}在官網公開內容中找到這些相關資訊：\n${scored.map((entry, index) => `${index + 1}. ${entry.title}：${entry.text}`).join('\n')}\n${answerGuard}`
  }
}

function buildPublicKnowledge(content, products, models, images) {
  const landing = content.landing || {}
  const catalog = content.catalog || {}
  const order = content.order || {}
  const join = content.join || {}
  return [
    {
      title: '公司定位',
      text: `${content.brand}。${landing.heroDisplaySubtitle || landing.heroSubtitle || ''}`
    },
    {
      title: '公開與內部資料分工',
      text: landing.accessCompactTitle || '公開網站看方向，內部系統看細節。'
    },
    {
      title: '產品目錄',
      text: catalog.intro || '產品目錄展示公開可看的產品類型與訂購入口。'
    },
    {
      title: '訂購流程',
      text: order.heroIntro || '選產品、選數量、留下電話，後續由專人確認規格、交期與報價。'
    },
    {
      title: '加入我們',
      text: join.heroIntro || join.heroTitle || '加入我們頁面提供人才、實習生與合作夥伴申請入口。'
    },
    ...models.map((model) => ({
      title: model.title,
      text: model.description || '公開 3D 展示模型。'
    })),
    ...images.map((image) => ({
      title: image.title,
      text: image.text || '公開圖片展示。'
    })),
    ...products.map((product) => ({
      title: product.name,
      text: [product.description, product.senior_note, product.body_region, product.clinical_use, product.indication].filter(Boolean).join(' ')
    }))
  ].filter((entry) => entry.title || entry.text)
}

function hasAnyTerm(text, terms) {
  return terms.some((term) => text.includes(term.toLowerCase()))
}

function scoreKnowledgeEntry(questionText, entry) {
  const haystack = `${entry.title} ${entry.text}`.toLowerCase()
  const tokens = questionText
    .split(/[\s,，。！？、；;：:/]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
  if (!tokens.length) return 0
  return tokens.reduce((score, token) => score + (haystack.includes(token) ? token.length : 0), 0)
}

function getMediaUrl(item) {
  return item?.mediaUrl || item?.imageUrl || ''
}

function getMediaType(item) {
  if (item?.mediaType) return item.mediaType
  const mediaUrl = getMediaUrl(item)
  return mediaUrl.startsWith('data:video') || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(mediaUrl) ? 'video' : 'image'
}
