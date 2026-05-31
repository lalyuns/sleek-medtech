import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { getPublicFontStack, getPublicHeadingWeight, getPublicPageBackgroundStyle, usePublicSiteContent } from '../content/publicSiteContent'
import '../styles/landing.css'

export default function JoinUsPage() {
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const content = usePublicSiteContent()
  const join = content.join
  const publicFontFamily = getPublicFontStack(content.fontFamily)
  const publicHeadingWeight = getPublicHeadingWeight(content.headingWeight)

  useEffect(() => {
    document.title = join.pageTitle || `加入我們 | ${content.brand}`
  }, [content.brand, join.pageTitle])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    setError('')
    const form = event.currentTarget
    const formData = new FormData(form)
    try {
      await api.post('/join-us/applications', {
        name: String(formData.get('name') || ''),
        email: String(formData.get('email') || ''),
        phone: String(formData.get('phone') || ''),
        applicant_type: String(formData.get('role') || ''),
        interest: String(formData.get('interest') || ''),
        portfolio_url: String(formData.get('portfolio') || ''),
        intro: String(formData.get('intro') || ''),
      })
      setSubmitted(true)
      form.reset()
    } catch {
      setError('送出失敗，請稍後再試或改用其他聯絡方式。')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main
      className="landing-page join-page"
      style={{
        '--public-font-family': publicFontFamily,
        '--public-heading-weight': publicHeadingWeight,
        ...getPublicPageBackgroundStyle(content, 'join')
      }}
    >
      <header className="public-nav">
        <Link className="public-brand" to="/">
          {content.logoUrl ? <img src={content.logoUrl} alt={content.logoAlt || content.brand} /> : <span />}
          {content.brand}
        </Link>
        <nav>
          <Link to="/">{join.navHomeLabel}</Link>
          <a href="#roles">{join.navRolesLabel}</a>
          <a href="#join-application">{join.navApplicationLabel}</a>
          <Link to="/login">{join.navLoginLabel}</Link>
        </nav>
      </header>

      <section className="landing-hero join-hero">
        <div className="landing-hero__copy">
          <p className="landing-kicker">{join.heroKicker}</p>
          <h1>{join.heroTitle}</h1>
          <p>{join.heroSubtitle}</p>
          <div className="landing-actions">
            <a className="landing-button landing-button--primary" href="#join-application">{join.primaryCtaLabel}</a>
            <Link className="landing-button landing-button--ghost" to="/">{join.secondaryCtaLabel}</Link>
          </div>
        </div>
      </section>

      <section className="landing-section landing-band">
        <div className="landing-section__heading">
          <p className="landing-kicker">{join.whyKicker}</p>
          <h2>{join.whyTitle}</h2>
        </div>
        <div className="landing-card-grid four">
          {join.reasons.map((reason) => (
            <article className="landing-card" key={reason}>
              <h3>{reason}</h3>
              <p>{join.reasonCardText}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="roles">
        <div className="landing-section__heading">
          <p className="landing-kicker">{join.rolesKicker}</p>
          <h2>{join.rolesTitle}</h2>
        </div>
        <div className="landing-card-grid two">
          {join.roles.map(({ title, text }) => (
            <article className="landing-card landing-card--large" key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-compare">
        <div className="landing-section__heading">
          <p className="landing-kicker">{join.fitKicker}</p>
          <h2>{join.fitTitle}</h2>
        </div>
        <div className="fit-list">
          {join.fit.map((item) => <span key={item}>{item}</span>)}
        </div>
      </section>

      <section className="landing-section application-section" id="join-application">
        <div className="landing-section__heading">
          <p className="landing-kicker">{join.applicationKicker}</p>
          <h2>{join.applicationTitle}</h2>
          <p>{join.applicationIntro}</p>
        </div>
        {submitted ? (
          <div className="success-panel">{join.success}</div>
        ) : (
          <form className="landing-form" onSubmit={handleSubmit}>
            {error && <div className="success-panel error-panel">{error}</div>}
            <FormInput label="姓名" name="name" required />
            <FormInput label="Email" name="email" type="email" required />
            <FormInput label="電話" name="phone" />
            <FormSelect label="身份類型" name="role" options={['學生', '工程師', '設計師', '醫療背景', '業務開發', '其他']} />
            <FormInput label="感興趣方向" name="interest" required />
            <FormInput label="履歷或作品集連結" name="portfolio" />
            <label className="full">
              自我介紹
              <textarea name="intro" rows="5" required />
            </label>
            <button className="landing-button landing-button--primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? '送出中...' : join.submitLabel}
            </button>
          </form>
        )}
      </section>

      <footer className="landing-footer">
        <div>
          <h2>{content.brand}</h2>
          <p>{join.footerText}</p>
        </div>
        <nav>
          <Link to="/">{join.footerHomeLabel}</Link>
          <Link to="/login">{join.footerLoginLabel}</Link>
        </nav>
      </footer>
    </main>
  )
}

function FormInput({ label, ...props }) {
  return (
    <label>
      {label}
      <input {...props} />
    </label>
  )
}

function FormSelect({ label, options, ...props }) {
  return (
    <label>
      {label}
      <select {...props}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  )
}
