// Lee el estado real del repo desde la API de GitHub.
//
// El repo es público, así que esto funciona sin token. Si GITHUB_TOKEN está en
// el entorno se usa para subir el límite de peticiones (60/h por IP anónima →
// 5000/h autenticado). Todo se cachea 5 min: el panel no necesita tiempo real
// y así una IP compartida de Vercel no quema el límite.

const REPO = process.env.GITHUB_REPO ?? 'fwyvg5j9gf-coder/compadre-gallo'
const API  = `https://api.github.com/repos/${REPO}`
const REVALIDATE = 300

export const REPO_SLUG = REPO

export type CommitType = 'feature' | 'fix' | 'security' | 'doc' | 'chore'

export type Commit = {
  sha: string
  shortSha: string
  title: string
  body: string
  author: string
  date: string
  url: string
  type: CommitType
}

export type RepoFile = { path: string; size: number }

function ghHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
  }
  const token = process.env.GITHUB_TOKEN
  if (token) h.authorization = `Bearer ${token}`
  return h
}

// Clasifica por prefijo de commit convencional; si no hay prefijo, cae a
// palabras clave. Es para pintar una etiqueta de color, no para auditar.
function classify(title: string): CommitType {
  const t = title.toLowerCase()
  if (/^(feat|feature)[(!:]/.test(t))                          return 'feature'
  if (/^(sec|security)[(!:]/.test(t))                          return 'security'
  if (/^fix[(!:]/.test(t))                                     return 'fix'
  if (/^docs?[(!:]/.test(t))                                   return 'doc'
  if (/^(chore|refactor|style|perf|build|ci|test)[(!:]/.test(t)) return 'chore'
  if (/\b(vulnerab|xss|csrf|inyecc|injection|secreto|credencial)/.test(t)) return 'security'
  if (/\b(fix|arregl|bug|corrig|repar)/.test(t))               return 'fix'
  if (/\b(doc|readme)/.test(t))                                return 'doc'
  return 'feature'
}

type GhCommit = {
  sha: string
  html_url: string
  commit: { message: string; author: { name: string; date: string } | null }
  author: { login: string } | null
}

export async function fetchCommits(limit = 60): Promise<{ commits: Commit[]; error: string | null }> {
  try {
    const res = await fetch(`${API}/commits?sha=main&per_page=${limit}`, {
      headers: ghHeaders(),
      next: { revalidate: REVALIDATE },
    })
    if (!res.ok) {
      return {
        commits: [],
        error: res.status === 403
          ? 'GitHub limitó las peticiones (sin GITHUB_TOKEN son 60 por hora). Vuelve a intentar en un rato.'
          : `GitHub respondió ${res.status} al pedir los commits.`,
      }
    }
    const raw = (await res.json()) as GhCommit[]
    const commits = raw.map(c => {
      const message = c.commit.message ?? ''
      const nl = message.indexOf('\n')
      const title = (nl === -1 ? message : message.slice(0, nl)).trim()
      const body  = (nl === -1 ? '' : message.slice(nl + 1)).trim()
      return {
        sha: c.sha,
        shortSha: c.sha.slice(0, 7),
        title,
        body,
        author: c.author?.login ?? c.commit.author?.name ?? 'desconocido',
        date: c.commit.author?.date ?? '',
        url: c.html_url,
        type: classify(title),
      }
    })
    return { commits, error: null }
  } catch {
    return { commits: [], error: 'No se pudo contactar a GitHub.' }
  }
}

type GhTree = { tree: { path: string; type: string; size?: number }[]; truncated: boolean }

export async function fetchTree(): Promise<{ files: RepoFile[]; truncated: boolean; error: string | null }> {
  try {
    const res = await fetch(`${API}/git/trees/main?recursive=1`, {
      headers: ghHeaders(),
      next: { revalidate: REVALIDATE },
    })
    if (!res.ok) {
      return { files: [], truncated: false, error: `GitHub respondió ${res.status} al pedir el árbol del repo.` }
    }
    const raw = (await res.json()) as GhTree
    const files = raw.tree
      .filter(n => n.type === 'blob')
      .map(n => ({ path: n.path, size: n.size ?? 0 }))
    return { files, truncated: Boolean(raw.truncated), error: null }
  } catch {
    return { files: [], truncated: false, error: 'No se pudo contactar a GitHub.' }
  }
}
