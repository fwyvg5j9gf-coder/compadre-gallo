import { redirect } from 'next/navigation'

export default async function CuentaLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>
}) {
  const { redirect_url } = await searchParams
  const back = redirect_url ?? 'https://compadregallo.com/cuenta'
  redirect(`https://accounts.compadregallo.com/sign-in?redirect_url=${encodeURIComponent(back)}`)
}
