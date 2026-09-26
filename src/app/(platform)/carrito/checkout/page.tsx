import { auth, currentUser } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase.server'
import CheckoutMerch from './CheckoutMerch'

export default async function CheckoutPage() {
  const { userId } = await auth()

  let savedAddress: Record<string, string> | null = null
  let userEmail: string | null = null

  if (userId) {
    const [{ data: userRecord }, clerkUser] = await Promise.all([
      supabaseAdmin.from('users').select('shipping_address').eq('clerk_user_id', userId).single(),
      currentUser(),
    ])
    savedAddress = (userRecord?.shipping_address as Record<string, string>) ?? null
    userEmail = clerkUser?.emailAddresses[0]?.emailAddress ?? null
  }

  // El envío se cotiza y se firma en el servidor (shipping.server.ts): aquí
  // ya no hace falta mandar tarifas ni embalajes al navegador.
  const { data: settings } = await supabaseAdmin
    .from('store_settings')
    .select('stripe_test_mode, stripe_pk_test, stripe_pk_live')
    .single()

  // Publishable key: prefer DB value, fall back to env var
  const useTest = settings?.stripe_test_mode ?? true
  const dbPk = useTest ? settings?.stripe_pk_test : settings?.stripe_pk_live
  const stripePublishableKey = (dbPk && dbPk.length > 10)
    ? dbPk
    : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!

  return (
    <CheckoutMerch
      savedAddress={savedAddress}
      userEmail={userEmail}
      stripePublishableKey={stripePublishableKey}
    />
  )
}
