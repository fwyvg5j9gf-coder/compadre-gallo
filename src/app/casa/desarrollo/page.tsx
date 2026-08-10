import { requireAdmin } from '@/lib/auth.server'
import DesarrolloPanel from './DesarrolloPanel'
import { fetchCommits, fetchTree, REPO_SLUG } from './github'
import { listDevTasks } from './actions'

export const dynamic = 'force-dynamic'

export default async function DesarrolloPage() {
  await requireAdmin()

  const [commitsRes, treeRes, tasks] = await Promise.all([
    fetchCommits(60),
    fetchTree(),
    listDevTasks(),
  ])

  return (
    <DesarrolloPanel
      repo={REPO_SLUG}
      commits={commitsRes.commits}
      commitsError={commitsRes.error}
      files={treeRes.files}
      filesTruncated={treeRes.truncated}
      filesError={treeRes.error}
      tasks={tasks}
    />
  )
}
