import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { getPublicFontStack, getPublicHeadingWeight, getPublicPageBackgroundStyle, usePublicSiteContent } from '../content/publicSiteContent'

const PRODUCT_TYPES = [
  { value: 'all', label: '全部產品', hint: '先看所有可訂購項目' },
  { value: '3d_product', label: '3D 產品', hint: '導板、固定片、客製模型' },
  { value: 'image_product', label: '圖片產品', hint: '可用圖片說明的產品' },
  { value: 'material', label: '材料本身', hint: '固定器材料與醫材材料包' },
  { value: 'recovery', label: '術後恢復', hint: '復健、追蹤與恢復輔助' },
  { value: 'fixator', label: '固定器材料', hint: '固定器、骨釘相關材料' },
]

const TYPE_LABELS = PRODUCT_TYPES.reduce((labels, item) => ({ ...labels, [item.value]: item.label }), {})

const INITIAL_FORM = {
  requester_name: '',
  organization: '',
  phone: '',
  email: '',
  preferred_contact: '',
  delivery_note: '',
  message: '',
}

export default function ProductOrderPage() {
  const content = usePublicSiteContent()
  const { order = {} } = content
  const publicFontFamily = getPublicFontStack(content.fontFamily)
  const publicHeadingWeight = getPublicHeadingWeight(content.headingWeight)
  const contactOptions = useMemo(
    () => Array.isArray(order.contactOptions) && order.contactOptions.length > 0
      ? order.contactOptions.filter((option) => String(option).trim())
      : ['電話', 'LINE', 'Email', '由專人判斷'],
    [order.contactOptions],
  )
  const [products, setProducts] = useState([])
  const [selectedType, setSelectedType] = useState('all')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [form, setForm] = useState(INITIAL_FORM)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadProducts = useCallback(async () => {
    const response = await api.get('/catalog/products')
    const orderableProducts = response.data.filter((product) => product.order_enabled !== false)
    setProducts(orderableProducts)
    setSelectedProductId((current) => {
      if (orderableProducts.some((product) => String(product.product_id) === String(current))) return current
      return orderableProducts[0] ? String(orderableProducts[0].product_id) : ''
    })
  }, [])

  useEffect(() => {
    Promise.resolve().then(() => loadProducts())
  }, [loadProducts])

  const filteredProducts = useMemo(() => {
    if (selectedType === 'all') return products
    return products.filter((product) => (product.product_type || '3d_product') === selectedType)
  }, [products, selectedType])

  const effectivePreferredContact = contactOptions.includes(form.preferred_contact)
    ? form.preferred_contact
    : contactOptions[0] || ''

  const effectiveSelectedProductId = useMemo(() => {
    if (filteredProducts.some((product) => String(product.product_id) === String(selectedProductId))) return selectedProductId
    return filteredProducts[0] ? String(filteredProducts[0].product_id) : ''
  }, [filteredProducts, selectedProductId])

  const selectedProduct = useMemo(
    () => products.find((product) => String(product.product_id) === String(effectiveSelectedProductId)),
    [products, effectiveSelectedProductId],
  )

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const adjustQuantity = (delta) => {
    setQuantity((current) => Math.min(99, Math.max(1, current + delta)))
  }

  const submitOrder = async (event) => {
    event.preventDefault()
    if (!effectiveSelectedProductId || isSubmitting) return
    setIsSubmitting(true)
    try {
      await api.post('/catalog/requests', {
        ...form,
        preferred_contact: effectivePreferredContact,
        product_id: Number(effectiveSelectedProductId),
        quantity,
        request_source: 'web',
        request_type: 'order',
        message: [
          form.message,
          selectedProduct?.senior_note ? `老人友善備註：${selectedProduct.senior_note}` : '',
        ].filter(Boolean).join('\n'),
      })
      setSubmitted(true)
      setQuantity(1)
      setForm({ ...INITIAL_FORM, preferred_contact: contactOptions[0] || '' })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="order-page"
      style={{
        fontFamily: publicFontFamily,
        '--public-heading-weight': publicHeadingWeight,
        ...getPublicPageBackgroundStyle(content, 'order')
      }}
    >
      <header className="order-topbar">
        <Link className="order-brand" to="/">
          <span>睿</span>
          <strong>睿程生醫股份有限公司</strong>
        </Link>
        <nav>
          <Link to="/">首頁</Link>
          <Link to="/catalog">產品目錄</Link>
          <Link to="/login">內部登入</Link>
        </nav>
      </header>

      <main className="order-main">
        <section className="order-hero">
          <p>{order.heroKicker}</p>
          <h1>{order.heroTitle}</h1>
          <span>{order.heroIntro}</span>
        </section>

        {submitted && (
          <section className="order-success" role="status">
            <strong>{order.successTitle}</strong>
            <span>{order.successText}</span>
          </section>
        )}

        <form className="order-flow" onSubmit={submitOrder}>
          <section className="order-step">
            <div className="order-step__heading">
              <span>1</span>
              <div>
                <h2>{order.stepTypeTitle}</h2>
                <p>{order.stepTypeIntro}</p>
              </div>
            </div>
            <div className="order-type-grid">
              {PRODUCT_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  className={selectedType === type.value ? 'order-type-card active' : 'order-type-card'}
                  onClick={() => setSelectedType(type.value)}
                >
                  <strong>{type.label}</strong>
                  <span>{type.hint}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="order-step">
            <div className="order-step__heading">
              <span>2</span>
              <div>
                <h2>{order.stepProductTitle}</h2>
                <p>{order.stepProductIntro}</p>
              </div>
            </div>
            <div className="order-products">
              {filteredProducts.length === 0 && <div className="order-empty">{order.emptyText}</div>}
              {filteredProducts.map((product) => (
                <button
                  key={product.product_id}
                  type="button"
                  className={String(product.product_id) === String(effectiveSelectedProductId) ? 'order-product active' : 'order-product'}
                  onClick={() => setSelectedProductId(String(product.product_id))}
                >
                  <div className="order-product__image">
                    {product.image_url ? <ProductMedia url={product.image_url} name={product.name} /> : <span className="order-product__placeholder" aria-hidden="true" />}
                  </div>
                  <div>
                    <span>{TYPE_LABELS[product.product_type] || '3D 產品'}</span>
                    <strong>{product.name}</strong>
                    <p>{product.senior_note || product.description || '可由專人協助確認產品細節。'}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="order-quantity">
              <div>
                <strong>{order.quantityTitle}</strong>
                <span>{order.quantityHint}</span>
              </div>
              <button type="button" onClick={() => adjustQuantity(-1)} aria-label="減少數量">-</button>
              <output>{quantity}</output>
              <button type="button" onClick={() => adjustQuantity(1)} aria-label="增加數量">+</button>
            </div>
          </section>

          <section className="order-step">
            <div className="order-step__heading">
              <span>3</span>
              <div>
                <h2>{order.stepContactTitle}</h2>
                <p>{order.stepContactIntro}</p>
              </div>
            </div>
            <div className="order-form-grid">
              <label>
                姓名
                <input required value={form.requester_name} onChange={(event) => updateForm('requester_name', event.target.value)} placeholder="請輸入姓名" />
              </label>
              <label>
                聯絡電話
                <input required inputMode="tel" value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} placeholder="請輸入電話" />
              </label>
              <label>
                公司 / 醫院 / 單位
                <input value={form.organization} onChange={(event) => updateForm('organization', event.target.value)} placeholder="可留空" />
              </label>
              <label>
                Email
                <input type="email" value={form.email} onChange={(event) => updateForm('email', event.target.value)} placeholder="可留空" />
              </label>
              <label>
                希望聯絡方式
                <select value={effectivePreferredContact} onChange={(event) => updateForm('preferred_contact', event.target.value)}>
                  {contactOptions.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label>
                交付 / 配送備註
                <input value={form.delivery_note} onChange={(event) => updateForm('delivery_note', event.target.value)} placeholder="例如到院、寄送、先報價" />
              </label>
              <label className="order-form-grid__full">
                補充說明
                <textarea value={form.message} onChange={(event) => updateForm('message', event.target.value)} placeholder="例如術後恢復用途、固定器材料需求、希望聯絡時間" />
              </label>
            </div>
            <button className="order-submit" type="submit" disabled={!effectiveSelectedProductId || isSubmitting}>
              {isSubmitting ? order.submittingLabel : order.submitLabel}
            </button>
          </section>
        </form>
      </main>
    </div>
  )
}

function ProductMedia({ url, name }) {
  const isVideo = url.startsWith('data:video') || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)
  return isVideo ? (
    <video src={url} title={name} autoPlay muted loop playsInline />
  ) : (
    <img src={url} alt={name} />
  )
}
