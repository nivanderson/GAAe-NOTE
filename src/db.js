// Banco online (Supabase) acessado SOMENTE por funções protegidas por login.
// A URL e a chave "anon" não dão acesso a nada sozinhas: tabelas fechadas,
// toda leitura/escrita exige um token de sessão válido emitido no login.
export const SUPABASE_URL = 'https://rgitiysrztfgfdpjcobe.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnaXRpeXNyenRmZ2ZkcGpjb2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0MzY5NjEsImV4cCI6MjExMTAxMjk2MX0.C1LyKolowVtYxdLxCkKuzMoi3ViPFjjMfkU-w07Se5w'

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
}

const MESSAGES = {
  SESSAO_INVALIDA: 'Sua sessão expirou. Entre novamente.',
  SEM_PERMISSAO: 'Seu nível de acesso não permite esta ação.',
  SENHA_CURTA: 'A senha precisa ter no mínimo 8 caracteres.',
  USUARIO_JA_EXISTE: 'Já existe um usuário com esse nome.',
  USUARIO_VAZIO: 'Informe o nome de usuário.',
  SENHA_ATUAL_INCORRETA: 'A senha atual está incorreta.',
  NAO_PODE_REBAIXAR_A_SI_MESMO: 'Você não pode rebaixar ou desativar o próprio usuário.',
  NAO_PODE_EXCLUIR_A_SI_MESMO: 'Você não pode excluir o próprio usuário.',
  JA_CONFIGURADO: 'O administrador já foi criado. Faça login.',
  TAREFA_JA_EXISTE: 'Essa tarefa já existe (já foi restaurada ou o número foi reutilizado).',
  REGISTRO_INVALIDO: 'Registro de exclusão não encontrado.',
}

export class ApiError extends Error {
  constructor(code) {
    const key = Object.keys(MESSAGES).find((k) => code?.startsWith(k))
    super(key ? MESSAGES[key] : 'Falha de comunicação com o servidor.')
    this.expired = key === 'SESSAO_INVALIDA'
  }
}

async function rpc(fn, args = {}) {
  let response
  try {
    response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers, body: JSON.stringify(args), cache: 'no-store' })
  } catch {
    throw new ApiError('REDE')
  }
  const text = await response.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = null }
  if (!response.ok) throw new ApiError(data?.message || '')
  return data
}

// ---- Sessão ----
const SESSION_KEY = 'gaae-session'
export const getSession = () => { try { return JSON.parse(localStorage.getItem(SESSION_KEY)) } catch { return null } }
export const setSession = (s) => { try { if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s)); else localStorage.removeItem(SESSION_KEY) } catch { /* sem armazenamento */ } }

export const needsSetup = () => rpc('app_needs_setup')
export const setupAdmin = (username, password) => rpc('app_setup_admin', { p_username: username, p_password: password })
export async function login(username, password) {
  const result = await rpc('app_login', { p_username: username, p_password: password })
  if (result?.error) throw new Error(result.error)
  return result
}
export const logout = (token) => rpc('app_logout', { p_token: token }).catch(() => {})
export const me = (token) => rpc('app_me', { p_token: token })
export const changePassword = (token, oldPassword, newPassword) => rpc('app_change_password', { p_token: token, p_old: oldPassword, p_new: newPassword })

// ---- Usuários (admin) ----
export const listUsers = (token) => rpc('app_list_users', { p_token: token })
export const createUser = (token, username, password, role) => rpc('app_create_user', { p_token: token, p_username: username, p_password: password, p_role: role })
export const updateUser = (token, id, role, active, newPassword = null) => rpc('app_update_user', { p_token: token, p_id: id, p_role: role, p_active: active, p_new_password: newPassword })
export const deleteUser = (token, id) => rpc('app_delete_user', { p_token: token, p_id: id })

// ---- Histórico ----
export const getHistory = (token, taskId = null, limit = 300) => rpc('app_get_history', { p_token: token, p_task_id: taskId, p_limit: limit })
export const restoreTask = (token, historyId) => rpc('app_restore_task', { p_token: token, p_history_id: historyId })

// ---- Tarefas ----
export function sortItems(items) {
  return [...items].sort((a, b) => {
    if (a.createdAt && b.createdAt) return b.createdAt.localeCompare(a.createdAt)
    if (a.createdAt) return -1
    if (b.createdAt) return 1
    return a.id - b.id
  })
}
export const loadItems = async (token) => sortItems((await rpc('app_get_tasks', { p_token: token })) || [])
export const saveItems = (token, items) => (items.length ? rpc('app_save_tasks', { p_token: token, p_items: items }) : Promise.resolve())
export const deleteItems = (token, ids) => (ids.length ? rpc('app_delete_tasks', { p_token: token, p_ids: ids }) : Promise.resolve())

// Remove cópias antigas das tarefas que ficavam salvas no navegador
try { localStorage.removeItem('gaae-acoes-teca-v1') } catch { /* ignore */ }
