import { redirect } from 'next/navigation'

export default async function CuentaRegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>
}) {
  const { redirect_url } = await searchParams
  const back = redirect_url ?? 'https://compadregallo.com/cuenta'
  redirect(`https://accounts.compadregallo.com/sign-up?redirect_url=${encodeURIComponent(back)}`)
}
