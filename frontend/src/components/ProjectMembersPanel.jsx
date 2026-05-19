import { useCallback, useEffect, useState } from 'react'
import api from '../api/client'

const ROLE_LABELS = { admin: '系統管理員', engineer: '工程師', doctor: '醫師', vendor: '廠商' }
const ACCESS_LABELS = { read_only: '唯讀', edit: '可編輯', admin: '專案管理' }

export default function ProjectMembersPanel({ projectId }) {
  const [members, setMembers] = useState([])
  const [users, setUsers] = useState([])
  const [userId, setUserId] = useState('')
  const [accessLevel, setAccessLevel] = useState('read_only')

  const load = useCallback(() => {
    api.get(`/projects/${projectId}/members`).then((response) => setMembers(response.data)).catch(() => setMembers([]))
    api.get('/users/').then((response) => setUsers(response.data)).catch(() => setUsers([]))
  }, [projectId])

  useEffect(() => {
    if (projectId) load()
  }, [projectId, load])

  const addMember = async (event) => {
    event.preventDefault()
    if (!userId) return
    await api.post(`/projects/${projectId}/members`, null, { params: { user_id: userId, access_level: accessLevel } })
    setUserId('')
    load()
  }

  const removeMember = async (member) => {
    await api.delete(`/projects/${projectId}/members/${member.user_id}`)
    load()
  }

  return (
    <div className="members-panel-grid">
      <form onSubmit={addMember} style={{ display: 'grid', alignContent: 'start', gap: 10, padding: 14, borderRadius: 8, background: '#f8fafc', border: '1px solid #dbe3ef' }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>新增成員</h3>
        <label style={labelStyle}>使用者</label>
        <select value={userId} onChange={(event) => setUserId(event.target.value)} style={fieldStyle}>
          <option value="">選擇使用者</option>
          {users.map((user) => <option key={user.user_id} value={user.user_id}>{user.name} ({ROLE_LABELS[user.role] || user.role})</option>)}
        </select>
        <label style={labelStyle}>專案權限</label>
        <select value={accessLevel} onChange={(event) => setAccessLevel(event.target.value)} style={fieldStyle}>
          {Object.entries(ACCESS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button style={{ ...buttonStyle, marginTop: 6 }}>新增成員</button>
        <p style={{ color: '#66758f', fontSize: 12, lineHeight: 1.5, margin: 0 }}>
          建議醫師維持唯讀並允許回饋/簽核；工程師使用可編輯；只有專案負責人使用專案管理。
        </p>
      </form>

      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 0.9fr 1fr 1fr auto', gap: 10, padding: '0 10px', color: '#66758f', fontSize: 12, fontWeight: 800 }}>
            <span>姓名</span>
            <span>Email</span>
            <span>角色</span>
            <span>專案權限</span>
            <span>最後活動</span>
            <span />
          </div>
          {members.map((member) => (
            <div key={member.mapping_id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 0.9fr 1fr 1fr auto', alignItems: 'center', gap: 10, fontSize: 12, padding: 10, borderRadius: 8, background: '#fff', border: '1px solid #dbe3ef', color: '#172033' }}>
              <strong>{member.name}</strong>
              <span style={{ color: '#324156', overflowWrap: 'anywhere' }}>{member.email}</span>
              <span style={{ color: '#66758f' }}>{ROLE_LABELS[member.role] || member.role}</span>
              <select value={member.access_level} onChange={async (event) => { await api.post(`/projects/${projectId}/members`, null, { params: { user_id: member.user_id, access_level: event.target.value } }); load() }} style={{ ...fieldStyle, padding: '6px 8px', fontSize: 12 }}>
                {Object.entries(ACCESS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <span style={{ color: '#66758f' }}>{member.last_activity_at ? new Date(member.last_activity_at).toLocaleString() : '尚無紀錄'}</span>
              <button onClick={() => removeMember(member)} style={{ ...buttonStyle, background: '#b42318', padding: '6px 10px' }}>移除</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const labelStyle = { color: '#66758f', fontSize: 12, fontWeight: 800 }
const fieldStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid #d2dbe8',
  background: '#fff',
  color: '#172033',
}
const buttonStyle = { border: 'none', background: '#2f63e6', color: '#fff', borderRadius: 6, padding: '8px 12px', cursor: 'pointer', fontWeight: 800 }
