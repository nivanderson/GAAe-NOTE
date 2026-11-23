import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { deleteItems, loadItems, saveItems, sortItems } from './db'

const STORAGE_KEY = 'gaae-acoes-teca-v1'
const STATUSES = [
  { id: 'todo', label: 'Não iniciado', color: '#8995a8' },
  { id: 'doing', label: 'Em andamento', color: '#3858ed' },
  { id: 'review', label: 'Em homologação', color: '#f2b735' },
  { id: 'done', label: 'Concluído', color: '#20b887' },
]

const seedTitles = [
  'Portal do Cliente',
  'Portal do cliente',
  'Identificação por tipo de bloqueio (MAPA, RF e serviços) para demonstração e visualização, no Portal do Cliente',
  'Permitir a visualização do tipo de embalagem na Tela do cliente',
  'Ajustes na consulta de processos de importação',
  'Atualização de cadastro de clientes',
  'Melhorias na tela de acompanhamento de cargas',
  'Ajustar relatório de cargas recebidas',
  'Validação de documentos do processo',
  'Integração de dados com o sistema financeiro',
  'Entrega de carga parcial em mais de um termo',
  'Segregação de Faturamento correntista por processo (exemplo VALGROUP)',
  'Relatórios MAPA: cargas bloqueadas (a inspecionar), condenadas, liberadas e histórico de bloqueio de cargas',
  'SISTEMA GAAe deve aceitar a utilização de notas fiscais de presenças de cargas que foram devolvidas ao cliente',
  'Tarifação automática com Rateio pelo Peso Bruto Recebido, para cargas importadas em mais de um TERMO',
  'Revisar fluxo de recebimento de cargas',
  'Exibir histórico de movimentações',
  'Ajustes no painel de acompanhamento',
  'Atualizar documentação operacional',
  'Conferência de dados do manifesto',
  'Melhorar busca por número de chamado',
  'Disponibilizar novos filtros para relatórios',
  'Revisar permissões de acesso',
  'Ajuste de cálculo de armazenagem',
  'Notificação de atualização de atividade',
  'Otimizar carregamento da tela de processos',
  'Incluir novos campos no cadastro',
  'Ajustes de impressão de documentos',
  'Revisão do fluxo de homologação',
  'Adequação de dados para exportação',
]

const fronts = [
  'OPERAÇÕES TECA MAO',
  'CAC',
  'COMERCIAL / CAC',
  'FINANCEIRO VAB',
  'CAC MAO',
  'VAB',
  'FINANCEIRO MAO',
  'FINANCEIRO / COMERCIAL - VAB',
  'FINANCEIRO / COMERCIAL',
  'COMERCIAL',
  'COMERCIAL / CAC / Operacional',
  'Regulatório',
]
const classifications = ['Portal do Cliente', 'Importação', 'Recebimento', 'Financeiro', 'Relatórios', 'Operações']

function makeSeed() {
  return seedTitles.map((title, index) => ({
    id: index + 1,
    title,
    status: index === 2 ? 'doing' : 'todo',
    front: fronts[index % fronts.length],
    classification: classifications[index % classifications.length],
    modality: index === 0 || index === 1 ? 'Todos' : index % 2 ? 'Importação' : 'Internação',
    ticket: index === 11 ? '289' : index === 14 ? '333' : '',
    forecast: '',
    completed: '',
    priority: index === 11 ? 12 : index + 1,
    urgency: index === 11 ? 'high' : 'medium',
    owner: '',
    description: index === 11
      ? '1. Alinhar prazo para configuração de faturamento com ponto de corte no sistema (antes do fechamento da quinzena); Item obrigatório de reforma tributária, precisa estar disponível antes de 31/12/2026.'
      : '',
    blocked: false,
    comments: [],
    updatedAt: '',
  }))
}

function loadInitialItems() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.every((item) => item && Number.isInteger(item.id) && item.title)) return parsed
      throw new Error('Os dados salvos não estão no formato esperado.')
    }
  } catch (error) {
    console.error('Não foi possível carregar os dados locais:', error)
  }
  return makeSeed()
}

function Icon({ name, size = 16 }) {
  const paths = {
    board: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M15 4v16" /></>,
    list: <><path d="M9 6h12M9 12h12M9 18h12" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></>,
    chart: <><path d="M4 19V5M4 19h17" /><path d="M8 16v-4M13 16V8M18 16V4" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4 4" /></>,
    download: <><path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M4 17v3h16v-3" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    chevron: <path d="m6 9 6 6 6-6" />,
    trash: <><path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" /></>,
    restore: <><path d="M3 11a9 9 0 1 1 2.5 6.2M3 4v7h7" /><path d="M12 7v5l3 2" /></>,
    dots: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    comment: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 4a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" /></>,
    filter: <><path d="M4 6h16M7 12h10M10 18h4" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3" /></>,
  }
  return <svg aria-hidden="true" className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name] || paths.dots}</svg>
}

function LogoMark() {
  return <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 28 28"><path d="m5 21 18-7-8-2 2-7-4-1-2 8-6 2 4 3z" fill="currentColor" /><path d="M5 23h18" stroke="currentColor" strokeWidth="2" /></svg></span>
}

function StatusDot({ status }) {
  const item = STATUSES.find((entry) => entry.id === status) || STATUSES[0]
  return <span className="status-dot" style={{ backgroundColor: item.color }} />
}

function formatNow() {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date()).toUpperCase()
}

function App() {
  const [items, setItems] = useState(loadInitialItems)
  const [view, setView] = useState('board')
  const [selectedId, setSelectedId] = useState(null)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ front: '', classification: '', modality: '', urgency: '', owner: '' })
  const [toast, setToast] = useState('')
  const [storageError, setStorageError] = useState('')
  const [commentText, setCommentText] = useState('')
  const [draggedId, setDraggedId] = useState(null)

  const [sync, setSync] = useState('loading') // loading | saved | saving | error
  const itemsRef = useRef(items)
  const pendingRef = useRef(0)

  const cacheLocal = (list) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch { /* cache opcional */ }
  }

  const persistItems = (nextItems) => {
    const previous = itemsRef.current
    const before = new Map(previous.map((item) => [item.id, item]))
    const nextIds = new Set(nextItems.map((item) => item.id))
    const changed = nextItems.filter((item) => before.get(item.id) !== item)
    const removed = previous.filter((item) => !nextIds.has(item.id)).map((item) => item.id)
    itemsRef.current = nextItems
    setItems(nextItems)
    cacheLocal(nextItems)
    if (!changed.length && !removed.length) return
    pendingRef.current += 1
    setSync('saving')
    Promise.all([saveItems(changed), deleteItems(removed)])
      .then(() => { setStorageError(''); if (pendingRef.current === 1) setSync('saved') })
      .catch((error) => {
        console.error('Falha ao salvar no banco:', error)
        setSync('error')
        setStorageError('Não foi possível salvar no banco online. Verifique a conexão — a alteração pode ser perdida.')
      })
      .finally(() => { pendingRef.current -= 1 })
  }

  useEffect(() => {
    let active = true
    const refresh = async (first) => {
      if (pendingRef.current > 0) return
      try {
        const remote = await loadItems()
        if (!active || pendingRef.current > 0) return
        if (first && !remote.length) {
          // Banco vazio: envia os dados atuais (locais ou de demonstração) como carga inicial
          await saveItems(itemsRef.current)
          setSync('saved')
          return
        }
        itemsRef.current = remote
        setItems(remote)
        cacheLocal(remote)
        setSync('saved')
        setStorageError('')
      } catch (error) {
        console.error('Falha ao carregar do banco:', error)
        if (active) { setSync('error'); setStorageError('Sem conexão com o banco online. Exibindo a última cópia salva neste navegador.') }
      }
    }
    refresh(true)
    const timer = window.setInterval(() => refresh(false), 10000)
    const onFocus = () => refresh(false)
    window.addEventListener('focus', onFocus)
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', onFocus) }
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(''), 3500)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        event.preventDefault()
        document.querySelector('.search-input')?.focus()
      }
      if (event.key === 'Escape') setSelectedId(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const filteredItems = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR')
    return items.filter((item) => {
      const searchable = `${item.title} ${item.ticket} ${item.front} ${item.classification} ${item.owner}`.toLocaleLowerCase('pt-BR')
      return (!term || searchable.includes(term))
        && (!filters.front || item.front === filters.front)
        && (!filters.classification || item.classification === filters.classification)
        && (!filters.modality || item.modality === filters.modality)
        && (!filters.urgency || item.urgency === filters.urgency)
        && (!filters.owner || Boolean(item.owner))
    })
  }, [items, query, filters])

  const selectedItem = items.find((item) => item.id === selectedId)
  const counts = STATUSES.map((status) => ({ ...status, count: items.filter((item) => item.status === status.id).length }))
  const completedPercent = items.length ? Math.round((counts.find((item) => item.id === 'done').count / items.length) * 100) : 0
  const overdueCount = items.filter((item) => item.forecast && item.status !== 'done' && new Date(`${item.forecast}T23:59:59`) < new Date()).length

  const updateItem = (id, patch) => {
    persistItems(itemsRef.current.map((item) => item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item))
  }

  const createItem = () => {
    const nextId = Math.max(0, ...items.map((item) => item.id)) + 1
    const freshItem = {
      id: nextId, title: 'Nova atividade', status: 'todo', front: fronts[0], classification: classifications[0],
      modality: 'Importação', ticket: '', forecast: '', completed: '', priority: nextId, urgency: 'medium',
      owner: '', description: '', blocked: false, comments: [], updatedAt: new Date().toISOString(), createdAt: new Date().toISOString(),
    }
    persistItems(sortItems([freshItem, ...items]))
    setSelectedId(nextId)
    setToast('Atividade criada')
  }


  const exportCsv = () => {
    const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const rows = [
      ['ID', 'Atividade', 'Status', 'Frente', 'Classificação', 'Modalidade', 'Chamado', 'Responsável', 'Previsão', 'Urgência'],
      ...filteredItems.map((item) => [
        item.id, item.title, STATUSES.find((status) => status.id === item.status)?.label, item.front,
        item.classification, item.modality, item.ticket, item.owner, item.forecast, item.urgency,
      ]),
    ]
    const csv = `\uFEFF${rows.map((row) => row.map(escape).join(';')).join('\r\n')}`
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'acoes-gaae-teca.csv'
    anchor.click()
    URL.revokeObjectURL(url)
    setToast('Arquivo exportado')
  }

  const addComment = () => {
    if (!selectedItem || !commentText.trim()) return
    const comment = { id: Date.now(), text: commentText.trim(), author: 'NC', createdAt: new Date().toISOString() }
    updateItem(selectedItem.id, { comments: [...(selectedItem.comments || []), comment] })
    setCommentText('')
  }

  const changeStatus = (id, status) => {
    updateItem(id, { status })
    const label = STATUSES.find((entry) => entry.id === status)?.label
    setToast(`Movida para ${label}`)
  }

  const filterOptions = {
    front: ['Frente', ...new Set(items.map((item) => item.front).filter(Boolean))],
    classification: ['Classificação', ...new Set(items.map((item) => item.classification).filter(Boolean))],
    modality: ['Modalidade', ...new Set(items.map((item) => item.modality).filter(Boolean))],
    urgency: ['Urgência', 'high', 'medium', 'low'],
    owner: ['Responsável'],
  }
  const filterLabels = { front: 'Frente', classification: 'Classificação', modality: 'Modalidade', urgency: 'Urgência' }

  return (
    <div className="app-shell">
      <div className="demo-banner">
        <span>{sync === 'loading' ? 'Carregando dados do banco…' : sync === 'saving' ? 'Salvando…' : sync === 'error' ? '⚠ Sem conexão com o banco — alterações podem não ser salvas' : '✓ Todas as alterações salvas no banco online'}</span>
      </div>

      <header className="topbar">
        <div className="brand">
          <LogoMark />
          <div className="brand-copy">
            <h1>GAAe · AÇÕES TECA</h1>
            <p>Melhorias do sistema GAAe para o terminal de cargas de Manaus e VAB</p>
          </div>
        </div>
        <div className="header-actions">
          <span className="online-indicator"><i /> só você online</span>
          <span className="avatar avatar-small">NC</span>
          <button type="button" className="icon-button notification-button" aria-label="Notificações" onClick={() => setToast('Você está em dia com as notificações')}><Icon name="bell" /></button>
          <span className="avatar">NC</span>
        </div>
      </header>

      <main className="main-content">
        <section className="summary-panel" aria-label="Resumo das atividades">
          <div className="summary-heading">
            <div className="project-tabs"><strong>TECA MAO</strong><span>·</span><span>AÇÕES GAAE</span><span>·</span><span>REV2</span></div>
            <time>{formatNow()}</time>
          </div>
          <div className="summary-grid">
            <SummaryStat label="Total" value={items.length} hint={`${items.filter((item) => !item.owner).length} sem responsável`} />
            {counts.map((status) => <SummaryStat key={status.id} label={status.label} value={status.id === 'done' ? completedPercent : status.count} color={status.color} hint={status.id === 'todo' ? 'na fila' : status.id === 'doing' ? 'em desenvolvimento' : status.id === 'review' ? 'em validação' : `${status.count} de ${items.length} entregues`} />)}
            <SummaryStat label="Atrasadas" value={overdueCount} hint={overdueCount ? 'prazo vencido' : 'nenhuma vencida'} />
          </div>
          <div className="summary-progress"><span style={{ width: `${items.length ? counts.reduce((sum, item) => sum + item.count, 0) ? (counts[1].count + counts[2].count + counts[3].count) / items.length * 100 : 0 : 0}%` }} /></div>
        </section>

        <section className="toolbar" aria-label="Ferramentas de atividades">
          <div className="view-switch" role="tablist" aria-label="Modo de visualização">
            <ViewButton id="board" current={view} onClick={setView} icon="board" label="Quadro" />
            <ViewButton id="list" current={view} onClick={setView} icon="list" label="Lista" />
            <ViewButton id="dashboard" current={view} onClick={setView} icon="chart" label="Painel" />
          </div>
          <label className="search-box">
            <Icon name="search" size={17} />
            <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ação, chamado, frente..." aria-label="Buscar atividades" />
            {query ? <button type="button" className="clear-search" onClick={() => setQuery('')} aria-label="Limpar busca"><Icon name="close" size={14} /></button> : <kbd>/</kbd>}
          </label>
          <button type="button" className="button button-secondary export-button" onClick={exportCsv}><Icon name="download" /> <span>Exportar</span></button>
          <button type="button" className="button button-primary new-button" onClick={createItem}><Icon name="plus" /> <span>Nova atividade</span></button>
        </section>

        <section className="filter-row" aria-label="Filtros">
          {Object.entries(filterOptions).map(([key, options]) => (
            <label key={key} className="filter-select">
              <span className="sr-only">{filterLabels[key] || 'Responsável'}</span>
              <select value={filters[key]} onChange={(event) => setFilters((current) => ({ ...current, [key]: event.target.value }))}>
                {key === 'urgency'
                  ? <><option value="">Urgência</option><option value="high">Alta</option><option value="medium">Média</option><option value="low">Baixa</option></>
                  : key === 'owner'
                    ? <><option value="">Responsável</option><option value="assigned">Com responsável</option></>
                    : options.map((option, index) => <option key={option} value={index === 0 ? '' : option}>{index === 0 ? option : option}</option>)}
              </select>
              <Icon name="chevron" size={14} />
            </label>
          ))}
          <button type="button" className={`mine-filter ${filters.owner ? 'active' : ''}`} onClick={() => setFilters((current) => ({ ...current, owner: current.owner ? '' : 'assigned' }))}><Icon name="user" size={15} /> Minhas</button>
          <span className="activity-count">{filteredItems.length} de {items.length} atividades</span>
        </section>

        {view === 'board' && <Board items={filteredItems} draggedId={draggedId} onDragStart={setDraggedId} onDragEnd={() => setDraggedId(null)} onDrop={changeStatus} onOpen={setSelectedId} onCreate={createItem} />}
        {view === 'list' && <ActivityList items={filteredItems} onOpen={setSelectedId} />}
        {view === 'dashboard' && <Dashboard items={filteredItems} counts={counts} completedPercent={completedPercent} onOpen={setSelectedId} />}
      </main>

      {selectedItem && <ActivityDrawer key={selectedItem.id} item={selectedItem} onClose={() => setSelectedId(null)} onChange={(patch) => updateItem(selectedItem.id, patch)} onDelete={() => {
        persistItems(itemsRef.current.filter((item) => item.id !== selectedItem.id))
        setSelectedId(null)
        setToast('Atividade excluída')
      }} onAddComment={addComment} commentText={commentText} setCommentText={setCommentText} />}
      {storageError && <div className="storage-warning" role="alert">{storageError}</div>}
      {toast && <div className="toast"><span className="toast-check">✓</span><span>{toast}</span><button type="button" aria-label="Fechar aviso" onClick={() => setToast('')}><Icon name="close" size={14} /></button></div>}
    </div>
  )
}

function SummaryStat({ label, value, hint, color }) {
  const formatted = String(value).padStart(2, '0')
  return <div className="summary-stat">
    <div className="stat-label">{color && <i style={{ background: color }} />}{label}</div>
    <div className="stat-number"><span>{formatted[0]}</span><span>{formatted[1]}</span>{label === 'Concluído' && <small>%</small>}</div>
    <div className="stat-hint">{hint}</div>
  </div>
}

function ViewButton({ id, current, onClick, icon, label }) {
  return <button type="button" role="tab" aria-selected={current === id} className={`view-button ${current === id ? 'selected' : ''}`} onClick={() => onClick(id)}><Icon name={icon} size={15} /><span>{label}</span></button>
}

function Board({ items, draggedId, onDragStart, onDragEnd, onDrop, onOpen, onCreate }) {
  return <section className="board-grid" aria-label="Quadro Kanban">
    {STATUSES.map((status) => {
      const columnItems = items.filter((item) => item.status === status.id).sort((a, b) => a.priority - b.priority)
      return <div
        className={`board-column ${draggedId ? 'drop-ready' : ''}`}
        key={status.id}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => { event.preventDefault(); if (draggedId) onDrop(draggedId, status.id) }}
      >
        <div className="column-heading"><div><StatusDot status={status.id} /><h2>{status.label}</h2><span className="column-count">{columnItems.length}</span></div><button type="button" className="column-add" aria-label={`Adicionar em ${status.label}`} onClick={onCreate}><Icon name="plus" /></button></div>
        <div className="card-list">
          {columnItems.length ? columnItems.map((item) => <ActivityCard key={item.id} item={item} onOpen={onOpen} onDragStart={onDragStart} onDragEnd={onDragEnd} />) : <div className="empty-column">Arraste uma atividade para cá</div>}
        </div>
      </div>
    })}
  </section>
}

function ActivityCard({ item, onOpen, onDragStart, onDragEnd }) {
  return <article className="activity-card" draggable onDragStart={() => onDragStart(item.id)} onDragEnd={onDragEnd} onClick={() => onOpen(item.id)} onKeyDown={(event) => { if (event.key === 'Enter') onOpen(item.id) }} tabIndex={0} role="button" aria-label={`Abrir atividade ${item.id}: ${item.title}`}>
    <div className="card-eyebrow"><span className="number-tag">#{String(item.id).padStart(2, '0')}</span><span>{item.classification}</span>{item.urgency === 'high' && <span className="urgency-mark">Ⅲ</span>}</div>
    <h3>{item.title}</h3>
    <div className="card-tags"><span>{item.front}</span><span>{item.modality}</span>{item.ticket && <span>{item.ticket}</span>}</div>
    <div className="card-footer">{item.blocked && <span className="blocked-tag"><Icon name="lock" size={12} /> Bloqueada</span>}<span>{item.owner || 'sem responsável'}</span></div>
  </article>
}

function ActivityList({ items, onOpen }) {
  return <section className="list-panel">
    <div className="list-header"><span>Atividade</span><span>Frente</span><span>Responsável</span><span>Previsão</span><span>Status</span></div>
    {items.length ? items.slice().sort((a, b) => a.priority - b.priority).map((item) => {
      const status = STATUSES.find((entry) => entry.id === item.status)
      return <button type="button" className="list-row" key={item.id} onClick={() => onOpen(item.id)}>
        <span className="list-title"><span className="number-tag">#{String(item.id).padStart(2, '0')}</span><span>{item.title}</span></span>
        <span className="list-front">{item.front}</span><span>{item.owner || 'sem responsável'}</span>
        <span>{item.forecast ? new Date(`${item.forecast}T00:00:00`).toLocaleDateString('pt-BR') : '—'}</span>
        <span className="list-status"><StatusDot status={item.status} />{status?.label}</span>
      </button>
    }) : <div className="no-results">Nenhuma atividade encontrada com esses filtros.</div>}
  </section>
}

function Dashboard({ items, counts, completedPercent, onOpen }) {
  const byFront = Object.entries(items.reduce((acc, item) => ({ ...acc, [item.front]: (acc[item.front] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1])
  const byClassification = Object.entries(items.reduce((acc, item) => ({ ...acc, [item.classification]: (acc[item.classification] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1])
  const deadlines = items.filter((item) => item.forecast && item.status !== 'done').sort((a, b) => a.forecast.localeCompare(b.forecast))
  const maxFront = Math.max(1, ...byFront.map((entry) => entry[1]))
  const maxClassification = Math.max(1, ...byClassification.map((entry) => entry[1]))
  return <section className="dashboard-grid">
    <article className="dashboard-card overall-card"><div className="dashboard-title"><h2>Andamento geral</h2><span>{items.length} atividades</span></div><div className="overall-content">
      <div className="donut" style={{ '--percent': `${completedPercent}%` }}><div><strong>{completedPercent}%</strong><span>concluído</span></div></div>
      <div className="legend">{counts.map((item) => <div key={item.id}><StatusDot status={item.id} /><span>{item.label}</span><strong>{items.filter((activity) => activity.status === item.id).length}</strong></div>)}</div>
    </div></article>
    <article className="dashboard-card fronts-card"><div className="dashboard-title"><h2>Por frente</h2><span>empilhado por status</span></div><BarList rows={byFront} max={maxFront} /></article>
    <article className="dashboard-card classification-card"><div className="dashboard-title"><h2>Por classificação</h2><span>{items.length} atividades</span></div><BarList rows={byClassification} max={maxClassification} /></article>
    <article className="dashboard-card deadlines-card"><div className="dashboard-title"><h2>Próximos prazos</h2><span>{items.filter((item) => !item.forecast && item.status !== 'done').length} sem previsão definida</span></div>
      {deadlines.length ? <div className="deadline-list">{deadlines.slice(0, 5).map((item) => <button type="button" key={item.id} onClick={() => onOpen(item.id)}><span className="deadline-date">{new Date(`${item.forecast}T00:00:00`).toLocaleDateString('pt-BR')}</span><span>{item.title}</span><StatusDot status={item.status} /></button>)}</div> : <p className="empty-deadlines">Nenhuma atividade aberta tem data de previsão. Defina prazos na gaveta de cada atividade para acompanhar os próximos vencimentos.</p>}
    </article>
  </section>
}

function BarList({ rows, max }) {
  return <div className="bar-list">{rows.length ? rows.map(([label, count]) => <div className="bar-row" key={label}><span title={label}>{label}</span><div><i style={{ width: `${count / max * 100}%` }} /></div><small>{count}</small></div>) : <div className="no-results">Sem dados para exibir.</div>}</div>
}

function ActivityDrawer({ item, onClose, onChange, onDelete, onAddComment, commentText, setCommentText }) {
  const [titleEditing, setTitleEditing] = useState(false)
  const [title, setTitle] = useState(item.title)
  const saveTitle = () => {
    if (title.trim()) {
      const cleanTitle = title.trim()
      setTitle(cleanTitle)
      onChange({ title: cleanTitle })
    } else {
      setTitle(item.title)
    }
    setTitleEditing(false)
  }
  const status = STATUSES.find((entry) => entry.id === item.status)
  return <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <aside className="activity-drawer" aria-label={`Detalhes da atividade ${item.id}`}>
      <div className="drawer-top"><div className="drawer-status"><span className="number-tag">#{String(item.id).padStart(2, '0')}</span><span className="status-pill"><StatusDot status={item.status} />{status?.label}</span></div><button type="button" className="icon-button drawer-close" onClick={onClose} aria-label="Fechar detalhes"><Icon name="close" /></button></div>
      <div className="drawer-content">
        {titleEditing ? <textarea className="title-editor" value={title} autoFocus onChange={(event) => setTitle(event.target.value)} onBlur={saveTitle} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); saveTitle() } }} /> : <h2 className="drawer-title" tabIndex={0} onClick={() => setTitleEditing(true)} onKeyDown={(event) => { if (event.key === 'Enter') setTitleEditing(true) }} title="Clique para editar">{item.title}</h2>}
        <div className="status-choice">{STATUSES.map((entry) => <button type="button" key={entry.id} className={entry.id === item.status ? 'current' : ''} onClick={() => onChange({ status: entry.id })}><StatusDot status={entry.id} />{entry.label}</button>)}</div>
        <section className="assignees-section"><label className="field-label">Responsáveis</label><div className="assignee-editor"><Icon name="plus" size={13} /><input value={item.owner} onChange={(event) => onChange({ owner: event.target.value })} placeholder="Atribuir pessoa" aria-label="Responsável" /></div><p>Quem é atribuído recebe aviso no sino, e também quando a atividade muda de status ou recebe comentário.</p></section>
        <div className="detail-fields">
          <Field label="Classificação"><input value={item.classification} onChange={(event) => onChange({ classification: event.target.value })} /></Field>
          <Field label="Frente"><input value={item.front} onChange={(event) => onChange({ front: event.target.value })} /></Field>
          <Field label="Modalidade"><select value={item.modality} onChange={(event) => onChange({ modality: event.target.value })}><option>Importação</option><option>Internação</option><option>Exportação</option><option>Todos</option></select></Field>
          <Field label="Chamado"><input value={item.ticket} onChange={(event) => onChange({ ticket: event.target.value })} placeholder="Número do chamado" /></Field>
          <Field label="Data de previsão"><input type="date" value={item.forecast} onChange={(event) => onChange({ forecast: event.target.value })} /></Field>
          <Field label="Data de conclusão"><input type="date" value={item.completed} onChange={(event) => onChange({ completed: event.target.value })} /></Field>
          <Field label="Ordem de prioridade"><input type="number" min="1" value={item.priority} onChange={(event) => onChange({ priority: Number(event.target.value) || 1 })} /></Field>
          <Field label="Nível de urgência"><div className="urgency-options">{[['high', 'Alto'], ['medium', 'Médio'], ['low', 'Baixo']].map(([value, label]) => <button type="button" key={value} className={`${value} ${item.urgency === value ? 'active' : ''}`} onClick={() => onChange({ urgency: value })}>{label}</button>)}</div></Field>
        </div>
        <Field label="Descrição e comentários da planilha"><textarea className="description-input" value={item.description} onChange={(event) => onChange({ description: event.target.value })} placeholder="Adicione contexto, requisitos ou detalhes da atividade..." /></Field>
        <label className="blocked-toggle"><input type="checkbox" checked={item.blocked} onChange={(event) => onChange({ blocked: event.target.checked })} /><span className="toggle-track" /><span>Atividade bloqueada</span></label>
        <section className="comments-section"><div className="field-label">Comentários · {(item.comments || []).length}</div>
          {item.comments?.length ? <div className="comment-list">{item.comments.map((comment) => <article className="comment-item" key={comment.id}><span className="avatar avatar-small">{comment.author}</span><div><strong>{comment.author}</strong><time>{new Date(comment.createdAt).toLocaleString('pt-BR')}</time><p>{comment.text}</p></div></article>)}</div> : <p className="no-comments">Nenhum comentário ainda. Registre decisões, dúvidas e combinados aqui.</p>}
          <div className="comment-compose"><textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Escreva um comentário..." onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); onAddComment() } }} /><button type="button" onClick={onAddComment} disabled={!commentText.trim()}>Comentar</button></div>
        </section>
      </div>
      <footer className="drawer-footer"><span>{item.updatedAt ? `Atualizada ${new Date(item.updatedAt).toLocaleString('pt-BR')}` : 'Atualizada há 4 h por Planilha'}</span><button type="button" className="delete-button" onClick={onDelete}><Icon name="trash" size={14} /> Excluir</button></footer>
    </aside>
  </div>
}

function Field({ label, children }) {
  return <label className="field"><span className="field-label">{label}</span>{children}</label>
}

export default App
