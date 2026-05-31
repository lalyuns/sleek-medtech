import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import useAuthStore from '../store/authStore'

const SOURCE_LABELS = {
  self_made: '自製',
  purchased: '外購',
  outsourced: '委外',
  customer_supplied: '客供',
}

const REQUEST_LABELS = {
  submitted: '新申請',
  reviewing: '審核中',
  quoted: '已報價',
  approved: '已核准',
  rejected: '已拒絕',
}

const PRODUCT_TYPE_LABELS = {
  '3d_product': '3D 產品',
  image_product: '圖片產品',
  material: '材料本身',
  recovery: '術後恢復',
  fixator: '固定器材料',
}

const REQUEST_SOURCE_LABELS = {
  web: '官網',
  linebot: 'LINE Bot',
}

const JOIN_APPLICATION_LABELS = {
  submitted: '新申請',
  reviewing: '審核中',
  contacted: '已聯繫',
  archived: '已封存',
}

export default function ProductAdminPage() {
  const [products, setProducts] = useState([])
  const [components, setComponents] = useState([])
  const [requests, setRequests] = useState([])
  const [joinApplications, setJoinApplications] = useState([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    description: '',
    body_region: '',
    clinical_use: '',
    surgical_stage: '',
    indication: '',
    product_type: '3d_product',
    image_url: '',
    senior_note: '',
    order_enabled: true,
  })
  const [componentForm, setComponentForm] = useState({ name: '', part_number: '', source_type: 'purchased', unit: 'pcs', supplier_name: '', unit_cost: '', lead_time_days: '', is_critical: false, requires_certificate: false })
  const [bomForm, setBomForm] = useState({ component_id: '', quantity: 1, unit: 'pcs', note: '' })
  const navigate = useNavigate()
  const { logout } = useAuthStore()

  const refresh = useCallback(async () => {
    const [productsResponse, componentsResponse, requestsResponse, joinApplicationsResponse] = await Promise.all([
      api.get('/products'),
      api.get('/components'),
      api.get('/product-requests'),
      api.get('/join-us/applications'),
    ])
    setProducts(productsResponse.data)
    setComponents(componentsResponse.data)
    setRequests(requestsResponse.data)
    setJoinApplications(joinApplicationsResponse.data)
    setSelectedProductId((current) => {
      if (productsResponse.data.some((product) => String(product.product_id) === String(current))) return current
      return productsResponse.data[0] ? String(productsResponse.data[0].product_id) : ''
    })
  }, [])

  useEffect(() => {
    Promise.resolve().then(() => refresh())
  }, [refresh])

  const selectedProduct = useMemo(
    () => products.find((product) => String(product.product_id) === String(selectedProductId)),
    [products, selectedProductId],
  )

  const createProduct = async (event) => {
    event.preventDefault()
    await api.post('/products', { ...productForm, is_public: true, status: 'active' })
    setProductForm({
      name: '',
      sku: '',
      description: '',
      body_region: '',
      clinical_use: '',
      surgical_stage: '',
      indication: '',
      product_type: '3d_product',
      image_url: '',
      senior_note: '',
      order_enabled: true,
    })
    await refresh()
  }

  const createComponent = async (event) => {
    event.preventDefault()
    await api.post('/components', {
      ...componentForm,
      unit_cost: componentForm.unit_cost ? Number(componentForm.unit_cost) : null,
      lead_time_days: componentForm.lead_time_days ? Number(componentForm.lead_time_days) : null,
    })
    setComponentForm({ name: '', part_number: '', source_type: 'purchased', unit: 'pcs', supplier_name: '', unit_cost: '', lead_time_days: '', is_critical: false, requires_certificate: false })
    await refresh()
  }

  const addBomItem = async (event) => {
    event.preventDefault()
    if (!selectedProductId) return
    await api.post(`/products/${selectedProductId}/bom`, {
      ...bomForm,
      component_id: Number(bomForm.component_id),
      quantity: Number(bomForm.quantity),
    })
    setBomForm({ component_id: '', quantity: 1, unit: 'pcs', note: '' })
    await refresh()
  }

  const updateRequestStatus = async (requestId, status) => {
    await api.put(`/product-requests/${requestId}`, { status })
    await refresh()
  }

  const updateJoinApplicationStatus = async (applicationId, status) => {
    await api.put(`/join-us/applications/${applicationId}`, { status })
    await refresh()
  }

  const uploadProductMedia = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      window.alert('產品展示素材請上傳圖片或影片檔。')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setProductForm((value) => ({ ...value, image_url: reader.result }))
    }
    reader.onerror = () => window.alert('產品展示素材讀取失敗，請重新選擇。')
    reader.readAsDataURL(file)
  }

  return (
    <div className="ops-page">
      <header className="ops-topbar">
        <div className="ops-brand">
          <span className="ops-brand-mark">睿</span>
          <span>睿程生醫 產品管理</span>
        </div>
        <nav className="ops-nav">
          <button onClick={() => navigate('/projects')}>專案列表</button>
          <button onClick={() => navigate('/catalog')}>公開型錄</button>
          <button onClick={logout}>登出</button>
        </nav>
      </header>

      <main className="ops-main">
        <section className="ops-title-row">
          <h1>產品與組件管理</h1>
          <p>管理套組、BOM、自製/外購來源、供應商資訊，以及外部需求申請</p>
        </section>

        <section className="product-admin-grid">
          <form className="ops-panel stacked-form" onSubmit={createProduct}>
            <h2>新增產品</h2>
            <input required value={productForm.name} onChange={(event) => setProductForm((value) => ({ ...value, name: event.target.value }))} placeholder="產品名稱" />
            <input required value={productForm.sku} onChange={(event) => setProductForm((value) => ({ ...value, sku: event.target.value }))} placeholder="SKU / 型號" />
            <select value={productForm.product_type} onChange={(event) => setProductForm((value) => ({ ...value, product_type: event.target.value }))}>
              {Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <div className="two-col">
              <input value={productForm.body_region} onChange={(event) => setProductForm((value) => ({ ...value, body_region: event.target.value }))} placeholder="使用部位，例如下顎骨" />
              <input value={productForm.surgical_stage} onChange={(event) => setProductForm((value) => ({ ...value, surgical_stage: event.target.value }))} placeholder="使用階段，例如術中固定" />
            </div>
            <input value={productForm.clinical_use} onChange={(event) => setProductForm((value) => ({ ...value, clinical_use: event.target.value }))} placeholder="臨床用途" />
            <input value={productForm.image_url} onChange={(event) => setProductForm((value) => ({ ...value, image_url: event.target.value }))} placeholder="產品展示圖片 / 影片 URL" />
            <label className="ops-file-field">
              上傳產品展示圖片 / 影片
              <input type="file" accept="image/*,video/*" onChange={(event) => uploadProductMedia(event.target.files?.[0])} />
            </label>
            {productForm.image_url && (
              <button type="button" onClick={() => setProductForm((value) => ({ ...value, image_url: '' }))}>
                移除產品展示素材
              </button>
            )}
            <textarea value={productForm.description} onChange={(event) => setProductForm((value) => ({ ...value, description: event.target.value }))} placeholder="對外描述" />
            <textarea value={productForm.senior_note} onChange={(event) => setProductForm((value) => ({ ...value, senior_note: event.target.value }))} placeholder="老人友善簡短說明，例如：電話確認後再付款" />
            <textarea value={productForm.indication} onChange={(event) => setProductForm((value) => ({ ...value, indication: event.target.value }))} placeholder="適應症 / 使用情境" />
            <label><input type="checkbox" checked={productForm.order_enabled} onChange={(event) => setProductForm((value) => ({ ...value, order_enabled: event.target.checked }))} /> 開放官網直接訂購</label>
            <button className="ops-primary">新增產品</button>
          </form>

          <form className="ops-panel stacked-form" onSubmit={createComponent}>
            <h2>新增組件</h2>
            <input required value={componentForm.name} onChange={(event) => setComponentForm((value) => ({ ...value, name: event.target.value }))} placeholder="組件名稱" />
            <input value={componentForm.part_number} onChange={(event) => setComponentForm((value) => ({ ...value, part_number: event.target.value }))} placeholder="料號" />
            <select value={componentForm.source_type} onChange={(event) => setComponentForm((value) => ({ ...value, source_type: event.target.value }))}>
              {Object.entries(SOURCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <div className="two-col">
              <input value={componentForm.unit_cost} onChange={(event) => setComponentForm((value) => ({ ...value, unit_cost: event.target.value }))} placeholder="單價" />
              <input value={componentForm.lead_time_days} onChange={(event) => setComponentForm((value) => ({ ...value, lead_time_days: event.target.value }))} placeholder="交期天數" />
            </div>
            <input value={componentForm.supplier_name} onChange={(event) => setComponentForm((value) => ({ ...value, supplier_name: event.target.value }))} placeholder="供應商/委外廠" />
            <label><input type="checkbox" checked={componentForm.is_critical} onChange={(event) => setComponentForm((value) => ({ ...value, is_critical: event.target.checked }))} /> 關鍵零件</label>
            <label><input type="checkbox" checked={componentForm.requires_certificate} onChange={(event) => setComponentForm((value) => ({ ...value, requires_certificate: event.target.checked }))} /> 需證明文件</label>
            <button className="ops-primary">新增組件</button>
          </form>
        </section>

        <section className="ops-table-panel">
          <div className="ops-section-heading">
            <h2>產品 BOM</h2>
            <select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)}>
              {products.map((product) => <option key={product.product_id} value={product.product_id}>{product.name}</option>)}
            </select>
          </div>
          {selectedProduct && (
            <div className="ops-context-grid">
              <div><span>產品類型</span><strong>{PRODUCT_TYPE_LABELS[selectedProduct.product_type] || '3D 產品'}</strong></div>
              <div><span>使用部位</span><strong>{selectedProduct.body_region || '未設定'}</strong></div>
              <div><span>臨床用途</span><strong>{selectedProduct.clinical_use || '未設定'}</strong></div>
              <div><span>使用階段</span><strong>{selectedProduct.surgical_stage || '未設定'}</strong></div>
              <div><span>官網訂購</span><strong>{selectedProduct.order_enabled ? '開放' : '關閉'}</strong></div>
              <div><span>適應症</span><strong>{selectedProduct.indication || '未設定'}</strong></div>
            </div>
          )}
          <form className="bom-add-row" onSubmit={addBomItem}>
            <select required value={bomForm.component_id} onChange={(event) => setBomForm((value) => ({ ...value, component_id: event.target.value }))}>
              <option value="">選擇組件</option>
              {components.map((component) => <option key={component.component_id} value={component.component_id}>{component.name}</option>)}
            </select>
            <input type="number" min="0.001" step="0.001" value={bomForm.quantity} onChange={(event) => setBomForm((value) => ({ ...value, quantity: event.target.value }))} placeholder="數量" />
            <input value={bomForm.unit} onChange={(event) => setBomForm((value) => ({ ...value, unit: event.target.value }))} placeholder="單位" />
            <input value={bomForm.note} onChange={(event) => setBomForm((value) => ({ ...value, note: event.target.value }))} placeholder="備註" />
            <button className="ops-primary">加入 BOM</button>
          </form>
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>組件</th>
                  <th>來源</th>
                  <th>數量</th>
                  <th>供應商</th>
                  <th>單價</th>
                  <th>文件</th>
                </tr>
              </thead>
              <tbody>
                {(selectedProduct?.bom_items || []).map((item) => (
                  <tr key={item.item_id}>
                    <td>{item.component.name}<div className="ops-muted">{item.note}</div></td>
                    <td><span className={`ops-status ${item.component.source_type === 'self_made' ? 'info' : 'warning'}`}>{SOURCE_LABELS[item.component.source_type]}</span></td>
                    <td>{item.quantity} {item.unit}</td>
                    <td>{item.component.supplier_name || '-'}</td>
                    <td>{item.component.unit_cost ? `$${Number(item.component.unit_cost).toFixed(2)}` : '-'}</td>
                    <td>{item.component.requires_certificate ? '需文件' : '不需文件'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="ops-table-panel">
          <div className="ops-section-heading">
            <h2>外部申請</h2>
            <span>{requests.length} 筆</span>
          </div>
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>申請人</th>
                  <th>來源</th>
                  <th>產品</th>
                  <th>數量</th>
                  <th>狀態</th>
                  <th>聯絡</th>
                  <th>更新</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.request_id}>
                    <td>{request.requester_name}<div className="ops-muted">{request.organization || request.message}</div></td>
                    <td>
                      <span className="ops-status muted">{REQUEST_SOURCE_LABELS[request.request_source] || request.request_source || '官網'}</span>
                      <div className="ops-muted">{request.request_type || 'order'}</div>
                    </td>
                    <td>{products.find((product) => product.product_id === request.product_id)?.name || '-'}</td>
                    <td>{request.quantity}</td>
                    <td><span className="ops-status info">{REQUEST_LABELS[request.status]}</span></td>
                    <td>
                      {request.email === 'phone-only@order.local' ? '未提供 Email' : request.email}
                      <div className="ops-muted">{request.phone || request.preferred_contact || request.line_user_id}</div>
                      {request.delivery_note && <div className="ops-muted">{request.delivery_note}</div>}
                    </td>
                    <td>
                      <select value={request.status} onChange={(event) => updateRequestStatus(request.request_id, event.target.value)}>
                        {Object.entries(REQUEST_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="ops-table-panel">
          <div className="ops-section-heading">
            <h2>加入我們申請</h2>
            <span>{joinApplications.length} 筆</span>
          </div>
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>申請人</th>
                  <th>身份</th>
                  <th>感興趣方向</th>
                  <th>自我介紹</th>
                  <th>聯絡</th>
                  <th>狀態</th>
                  <th>更新</th>
                </tr>
              </thead>
              <tbody>
                {joinApplications.map((application) => (
                  <tr key={application.application_id}>
                    <td>
                      {application.name}
                      {application.portfolio_url && (
                        <div className="ops-muted">
                          <a href={application.portfolio_url} target="_blank" rel="noreferrer">履歷 / 作品集</a>
                        </div>
                      )}
                    </td>
                    <td>{application.applicant_type || '-'}</td>
                    <td>{application.interest}</td>
                    <td><div className="ops-muted preserve-lines">{application.intro}</div></td>
                    <td>
                      {application.email}
                      <div className="ops-muted">{application.phone || '未提供電話'}</div>
                    </td>
                    <td><span className="ops-status info">{JOIN_APPLICATION_LABELS[application.status]}</span></td>
                    <td>
                      <select value={application.status} onChange={(event) => updateJoinApplicationStatus(application.application_id, event.target.value)}>
                        {Object.entries(JOIN_APPLICATION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
