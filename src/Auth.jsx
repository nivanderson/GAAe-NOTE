import { useEffect, useState } from 'react'
import * as api from './db'

export const ROLE_LABELS = { admin: 'Administrador', editor: 'Editor', reader: 'Leitor' }

function Brand() {
  return <div className="auth-brand">
    <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 28 28"><path d="m5 21 18-7-8-2 2-7-4-1-2 8-6 2 4 3z" fill="currentColor" /><path d="M5 23h18" stroke="currentColor" strokeWidth="2" /></svg></span>
    <div><h1>GAAe · AÇÕES TECA</h1><p>Acesso restrito</p></div>
  </div>
}

export function LoginScreen({ onLogin, notice }) {
  const [setup, setSetup] = useState(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { api.needsSetup().then(setSetup).catch(() => setSetup(false)) }, [])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (setup && password !== confirm) { setError('As senhas não conferem.'); return }
    setBusy(true)
    try {
      const session = setup ? await api.setupAdmin(username, password) : await api.login(username, password)
      setPassword(''); setConfirm('')
      onLogin(session)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return <div className="auth-shell">
    <form className="auth-card" onSubmit={submit}>
      <Brand />
      {setup === null ? <p className="auth-hint">Conectando…</p> : <>
        <h2>{setup ? 'Configuração inicial' : 'Entrar'}</h2>
        {setup && <p className="auth-hint">Crie o usuário <strong>administrador</strong>. Ele poderá cadastrar os demais usuários e níveis de acesso.</p>}
        <label className="auth-field"><span>Usuário</span><input autoFocus autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required /></label>
        <label className="auth-field"><span>Senha</span><input type="password" autoComplete={setup ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={setup ? 8 : undefined} /></label>
        {setup && <label className="auth-field"><span>Confirmar senha</span><input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} /></label>}
        {(error || notice) && <div className="auth-error" role="alert">{error || notice}</div>}
        <button className="button button-primary auth-submit" disabled={busy}>{busy ? 'Aguarde…' : setup ? 'Criar administrador' : 'Entrar'}</button>
        <p className="auth-foot">Senhas protegidas com criptografia bcrypt · sessão expira em 12 h</p>
      </>}
    </form>
  </div>
}

function Modal({ title, onClose, children, wide }) {
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
    <div className={`modal-card ${wide ? 'modal-wide' : ''}`} role="dialog" aria-label={title}>
      <div className="modal-head"><h2>{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label="Fechar">✕</button></div>
      {children}
    </div>
  </div>
}

export function PasswordModal({ session, onClose, onExpired }) {
  const [oldPassword, setOld] = useState('')
  const [newPassword, setNew] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState(null)
  const submit = async (e) => {
    e.preventDefault()
    if (newPassword !== confirm) { setMsg({ error: true, text: 'As senhas não conferem.' }); return }
    try {
      await api.changePassword(session.token, oldPassword, newPassword)
      setMsg({ text: 'Senha alterada com sucesso.' }); setOld(''); setNew(''); setConfirm('')
    } catch (err) {
      if (err.expired) onExpired(); else setMsg({ error: true, text: err.message })
    }
  }
  return <Modal title="Alterar minha senha" onClose={onClose}>
    <form className="modal-form" onSubmit={submit}>
      <label className="auth-field"><span>Senha atual</span><input type="password" value={oldPassword} onChange={(e) => setOld(e.target.value)} required autoComplete="current-password" /></label>
      <label className="auth-field"><span>Nova senha</span><input type="password" value={newPassword} onChange={(e) => setNew(e.target.value)} required minLength={8} autoComplete="new-password" /></label>
      <label className="auth-field"><span>Confirmar nova senha</span><input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password" /></label>
      {msg && <div className={msg.error ? 'auth-error' : 'auth-ok'}>{msg.text}</div>}
      <button className="button button-primary">Salvar nova senha</button>
    </form>
  </Modal>
}

export function UsersModal({ session, onClose, onExpired }) {
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({ username: '', password: '', role: 'editor' })
  const [msg, setMsg] = useState(null)
  const [resetFor, setResetFor] = useState(null)
  const [resetPassword, setResetPassword] = useState('')

  const handle = (err) => { if (err.expired) onExpired(); else setMsg({ error: true, text: err.message }) }
  const reload = () => api.listUsers(session.token).then(setUsers).catch(handle)
  useEffect(() => { reload() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const create = async (e) => {
    e.preventDefault()
    try {
      await api.createUser(session.token, form.username, form.password, form.role)
      setMsg({ text: `Usuário "${form.username.trim().toLowerCase()}" criado.` })
      setForm({ username: '', password: '', role: 'editor' })
      reload()
    } catch (err) { handle(err) }
  }
  const update = async (user, patch) => {
    try { await api.updateUser(session.token, user.id, patch.role ?? user.role, patch.active ?? user.active); setMsg(null); reload() } catch (err) { handle(err) }
  }
  const remove = async (user) => {
    if (!window.confirm(`Excluir o usuário "${user.username}"? Essa ação não pode ser desfeita.`)) return
    try { await api.deleteUser(session.token, user.id); setMsg({ text: `Usuário "${user.username}" excluído.` }); reload() } catch (err) { handle(err) }
  }
  const saveReset = async (e) => {
    e.preventDefault()
    try {
      await api.updateUser(session.token, resetFor.id, resetFor.role, resetFor.active, resetPassword)
      setMsg({ text: `Senha de "${resetFor.username}" redefinida.` }); setResetFor(null); setResetPassword('')
    } catch (err) { handle(err) }
  }

  return <Modal title="Usuários e níveis de acesso" onClose={onClose} wide>
    <form className="user-create" onSubmit={create}>
      <input placeholder="Usuário" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required autoComplete="off" />
      <input type="password" placeholder="Senha (mín. 8)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} autoComplete="new-password" />
      <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
        <option value="reader">Leitor</option><option value="editor">Editor</option><option value="admin">Administrador</option>
      </select>
      <button className="button button-primary">Adicionar</button>
    </form>
    <p className="role-help"><strong>Leitor:</strong> só visualiza · <strong>Editor:</strong> cria e altera tarefas · <strong>Administrador:</strong> tudo + gerencia usuários</p>
    {msg && <div className={msg.error ? 'auth-error' : 'auth-ok'}>{msg.text}</div>}
    {resetFor && <form className="user-create" onSubmit={saveReset}>
      <span className="reset-label">Nova senha para <strong>{resetFor.username}</strong>:</span>
      <input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} required minLength={8} autoComplete="new-password" autoFocus />
      <button className="button button-primary">Redefinir</button>
      <button type="button" className="button button-secondary" onClick={() => setResetFor(null)}>Cancelar</button>
    </form>}
    <table className="users-table">
      <thead><tr><th>Usuário</th><th>Nível</th><th>Situação</th><th /></tr></thead>
      <tbody>{users.map((user) => {
        const self = user.username === session.username
        return <tr key={user.id}>
          <td><strong>{user.username}</strong>{self && <span className="you-tag">você</span>}{user.locked && <span className="locked-tag">bloqueado</span>}</td>
          <td><select value={user.role} disabled={self} onChange={(e) => update(user, { role: e.target.value })}><option value="reader">Leitor</option><option value="editor">Editor</option><option value="admin">Administrador</option></select></td>
          <td><button type="button" className={`status-toggle ${user.active ? 'on' : 'off'}`} disabled={self} onClick={() => update(user, { active: !user.active })}>{user.active ? 'Ativo' : 'Inativo'}</button></td>
          <td className="row-actions">
            <button type="button" className="button button-secondary" onClick={() => { setResetFor(user); setResetPassword('') }}>Redefinir senha</button>
            {!self && <button type="button" className="delete-button" onClick={() => remove(user)}>Excluir</button>}
          </td>
        </tr>
      })}</tbody>
    </table>
  </Modal>
}
