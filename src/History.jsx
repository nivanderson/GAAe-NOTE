import { useEffect, useState } from 'react'
import * as api from './db'

const FIELD_LABELS = {
  title: 'Título', status: 'Status', front: 'Frente', classification: 'Classificação', modality: 'Modalidade',
  ticket: 'Chamado', forecast: 'Data de previsão', completed: 'Data de conclusão', priority: 'Prioridade',
  urgency: 'Urgência', owner: 'Responsável', description: 'Descrição', blocked: 'Bloqueada', createdAt: 'Criação',
}
const STATUS_LABELS = { todo: 'Não iniciado', doing: 'Em andamento', review: 'Em homologação', done: 'Concluído' }
const URGENCY_LABELS = { high: 'Alta', medium: 'Média', low: 'Baixa' }

function formatValue(field, value) {
  if (value === null || value === undefined || value === '') return '(vazio)'
  if (field === 'status') return STATUS_LABELS[value] || value
  if (field === 'urgency') return URGENCY_LABELS[value] || value
  if (field === 'blocked') return value ? 'Sim' : 'Não'
  if ((field === 'forecast' || field === 'completed') && /^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR')
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  return text.length > 120 ? `${text.slice(0, 120)}…` : text
}

const when = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

function Entry({ entry, showTask, onRestore }) {
  let body
  if (entry.action === 'create') body = entry.field === 'restaurada' ? <>restaurou a tarefa</> : <>criou a tarefa</>
  else if (entry.action === 'delete') body = <><span className="hist-del">excluiu a tarefa</span>{onRestore && <button type="button" className="hist-restore" onClick={() => onRestore(entry)}>Restaurar</button>}</>
  else if (entry.action === 'comment') body = <>comentou: <q>{formatValue('', entry.new_value)}</q></>
  else body = <>alterou <strong>{FIELD_LABELS[entry.field] || entry.field}</strong>: <span className="hist-old">{formatValue(entry.field, entry.old_value)}</span> → <span className="hist-new">{formatValue(entry.field, entry.new_value)}</span></>
  return <li className={`hist-item hist-${entry.action}`}>
    <div className="hist-meta"><strong>{entry.username}</strong><time>{when(entry.created_at)}</time></div>
    {showTask && <div className="hist-task">#{String(entry.task_id).padStart(2, '0')} · {entry.task_title}</div>}
    <div className="hist-body">{body}</div>
  </li>
}

export function TaskHistory({ session, taskId, refreshKey, onExpired }) {
  const [entries, setEntries] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      api.getHistory(session.token, taskId, 100)
        .then((rows) => { if (active) { setEntries(rows); setError('') } })
        .catch((err) => { if (!active) return; if (err.expired) onExpired(); else setError(err.message) })
    }, 700)
    return () => { active = false; window.clearTimeout(timer) }
  }, [session.token, taskId, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps
  return <section className="history-section">
    <div className="field-label">Histórico de alterações{entries ? ` · ${entries.length}` : ''}</div>
    {error ? <p className="no-comments">{error}</p>
      : !entries ? <p className="no-comments">Carregando…</p>
        : entries.length ? <ul className="hist-list">{entries.map((entry) => <Entry key={entry.id} entry={entry} />)}</ul>
          : <p className="no-comments">Nenhuma alteração registrada desde a ativação do histórico.</p>}
  </section>
}

export function HistoryModal({ session, onClose, onExpired, onRestored }) {
  const [entries, setEntries] = useState(null)
  const [filter, setFilter] = useState('')
  const [action, setAction] = useState('')
  const [msg, setMsg] = useState(null)
  const load = () => api.getHistory(session.token, null, 1000).then(setEntries).catch((err) => { if (err.expired) onExpired(); else setMsg({ error: true, text: err.message }) })
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const restore = async (entry) => {
    if (!window.confirm(`Restaurar a tarefa #${entry.task_id} "${entry.task_title}"?`)) return
    try { await api.restoreTask(session.token, entry.id); setMsg({ text: 'Tarefa restaurada.' }); load(); onRestored() }
    catch (err) { if (err.expired) onExpired(); else setMsg({ error: true, text: err.message }) }
  }

  const term = filter.trim().toLowerCase()
  const visible = (entries || []).filter((e) => (!action || e.action === action)
    && (!term || `${e.username} ${e.task_title} ${e.task_id} ${FIELD_LABELS[e.field] || ''}`.toLowerCase().includes(term)))

  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
    <div className="modal-card modal-wide" role="dialog" aria-label="Histórico geral">
      <div className="modal-head"><h2>Histórico geral de alterações</h2><button type="button" className="icon-button" onClick={onClose} aria-label="Fechar">✕</button></div>
      <div className="user-create">
        <input placeholder="Filtrar por usuário, tarefa ou campo…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <select value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">Todas as ações</option><option value="update">Alterações</option><option value="comment">Comentários</option>
          <option value="create">Criações</option><option value="delete">Exclusões</option>
        </select>
      </div>
      {msg && <div className={msg.error ? 'auth-error' : 'auth-ok'}>{msg.text}</div>}
      {!entries ? <p className="no-comments">Carregando…</p>
        : visible.length ? <ul className="hist-list">{visible.map((entry) => <Entry key={entry.id} entry={entry} showTask onRestore={restore} />)}</ul>
          : <p className="no-comments">Nenhum registro encontrado.</p>}
    </div>
  </div>
}
