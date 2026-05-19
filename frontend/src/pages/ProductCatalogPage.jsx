import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'

const SOURCE_LABELS = {
  self_made: '自製',
  purchased: '外購',
  outsourced: '委外',
  customer_supplied: '客供',
}

export default function ProductCatalogPage() {
  const [products, setProducts] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [form, setForm] = useState({ requester_name: '', organization: '', email: '', phone: '', quantity: 1, message: '' })
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    api.get('/catalog/products').then((response) => {
      setProducts(response.data)
      if (response.data[0]) setSelectedId(String(response.data[0].product_id))
    })
  }, [])

  const selectedProduct = useMemo(
    () => products.find((product) => String(product.product_id) === String(selectedId)),
    [products, selectedId],
  )

  const submitRequest = async (event) => {
    event.preventDefault()
    await api.post('/catalog/requests', {
      ...form,
      product_id: selectedId ? Number(selectedId) : null,
      quantity: Number(form.quantity || 1),
    })
    setSubmitted(true)
    setForm({ requester_name: '', organization: '', email: '', phone: '', quantity: 1, message: '' })
  }

  return (
    <div className="ops-page">
      <header className="ops-topbar">
        <div className="ops-brand">
          <span className="ops-brand-mark">睿</span>
          <span>睿程生醫 產品型錄</span>
        </div>
        <nav className="ops-nav">
          <a href="/login">內部登入</a>
        </nav>
      </header>

      <main className="ops-main catalog-layout">
        <section className="ops-title-row">
          <h1>可申請產品</h1>
          <p>外部使用者可查看套組內容並送出需求；正式報價、文件與權限會由內部審核後開通。</p>
        </section>

        <section className="catalog-grid">
          <div className="ops-table-panel">
            <div className="ops-section-heading">
              <h2>產品與組件</h2>
              <span>{products.length} 項</span>
            </div>
            <div className="catalog-products">
              {products.map((product) => (
                <button
                  key={product.product_id}
                  className={String(product.product_id) === String(selectedId) ? 'catalog-product active' : 'catalog-product'}
                  onClick={() => setSelectedId(String(product.product_id))}
                >
                  <strong>{product.name}</strong>
                  <span>{product.sku}</span>
                  {product.body_region && <span>{product.body_region}</span>}
                  <p>{product.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="ops-table-panel">
            <div className="ops-section-heading">
              <h2>{selectedProduct?.name || '產品內容'}</h2>
              <span>{selectedProduct?.bom_items?.length || 0} 件組成</span>
            </div>
            {selectedProduct && (
              <div className="ops-context-grid">
                <div><span>使用部位</span><strong>{selectedProduct.body_region || '未設定'}</strong></div>
                <div><span>臨床用途</span><strong>{selectedProduct.clinical_use || '未設定'}</strong></div>
                <div><span>使用階段</span><strong>{selectedProduct.surgical_stage || '未設定'}</strong></div>
                <div><span>適應症</span><strong>{selectedProduct.indication || '未設定'}</strong></div>
              </div>
            )}
            <div className="ops-table-wrap">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>組件</th>
                    <th>來源</th>
                    <th>數量</th>
                    <th>文件</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedProduct?.bom_items || []).map((item) => (
                    <tr key={`${item.name}-${item.source_type}`}>
                      <td>
                        {item.name}
                        {item.note && <div className="ops-muted">{item.note}</div>}
                      </td>
                      <td><span className={`ops-status ${item.source_type === 'self_made' ? 'info' : 'warning'}`}>{SOURCE_LABELS[item.source_type]}</span></td>
                      <td>{item.quantity} {item.unit}</td>
                      <td>{item.requires_certificate ? '需文件' : '不需文件'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="ops-panel">
          <div className="ops-section-heading inline-heading">
            <h2>送出需求申請</h2>
            <span>審核後才會開通系統帳號</span>
          </div>
          {submitted && <div className="catalog-success">已收到申請，內部窗口會確認規格、報價與帳號權限。</div>}
          <form className="catalog-request-form" onSubmit={submitRequest}>
            <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
              {products.map((product) => <option key={product.product_id} value={product.product_id}>{product.name}</option>)}
            </select>
            <input required value={form.requester_name} onChange={(event) => setForm((value) => ({ ...value, requester_name: event.target.value }))} placeholder="申請人姓名" />
            <input value={form.organization} onChange={(event) => setForm((value) => ({ ...value, organization: event.target.value }))} placeholder="單位/公司" />
            <input required type="email" value={form.email} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} placeholder="Email" />
            <input value={form.phone} onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))} placeholder="電話" />
            <input min="1" type="number" value={form.quantity} onChange={(event) => setForm((value) => ({ ...value, quantity: event.target.value }))} placeholder="數量" />
            <textarea value={form.message} onChange={(event) => setForm((value) => ({ ...value, message: event.target.value }))} placeholder="規格、交期或補充說明" />
            <button className="ops-primary" type="submit">送出申請</button>
          </form>
        </section>
      </main>
    </div>
  )
}
