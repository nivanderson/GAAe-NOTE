// Banco de dados online (Supabase) — tabela "tasks" (id bigint, data jsonb, updated_at timestamptz)
// A chave "anon" é pública por natureza; o acesso é controlado pelas policies da tabela.
export const SUPABASE_URL = 'https://rgitiysrztfgfdpjcobe.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnaXRpeXNyenRmZ2ZkcGpjb2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0MzY5NjEsImV4cCI6MjExMTAxMjk2MX0.C1LyKolowVtYxdLxCkKuzMoi3ViPFjjMfkU-w07Se5w'

const TABLE = `${SUPABASE_URL}/rest/v1/tasks`
const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
}

async function check(response) {
  if (!response.ok) throw new Error(`Banco respondeu ${response.status}: ${await response.text()}`)
  return response
}

export function sortItems(items) {
  return [...items].sort((a, b) => {
    if (a.createdAt && b.createdAt) return b.createdAt.localeCompare(a.createdAt)
    if (a.createdAt) return -1
    if (b.createdAt) return 1
    return a.id - b.id
  })
}

export async function loadItems() {
  const response = await check(await fetch(`${TABLE}?select=data`, { headers, cache: 'no-store' }))
  const rows = await response.json()
  return sortItems(rows.map((row) => row.data))
}

export async function saveItems(items) {
  if (!items.length) return
  const body = items.map((item) => ({ id: item.id, data: item, updated_at: new Date().toISOString() }))
  await check(await fetch(TABLE, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(body),
  }))
}

export async function deleteItems(ids) {
  if (!ids.length) return
  await check(await fetch(`${TABLE}?id=in.(${ids.join(',')})`, {
    method: 'DELETE',
    headers: { ...headers, Prefer: 'return=minimal' },
  }))
}
