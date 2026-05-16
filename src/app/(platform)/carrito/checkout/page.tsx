import { auth, currentUser } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase.server'
import CheckoutMerch from './CheckoutMerch'
import type { PackagingType } from '@/lib/supabase'

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

  const [{ data: settings }, { data: packaging }] = await Promise.all([
    supabaseAdmin
      .from('store_settings')
      .select('skydropx_enabled, shipping_local_mxn, shipping_national_mxn, shipping_free_threshold_mxn, stripe_test_mode, stripe_pk_test, stripe_pk_live')
      .single(),
    supabaseAdmin
      .from('packaging_types')
      .select('*')
      .order('sort_order', { ascending: true }),
  ])

  // Publishable key: prefer DB value, fall back to env var
  const useTest = settings?.stripe_test_mode ?? true
  const dbPk = useTest ? settings?.stripe_pk_test : settings?.stripe_pk_live
  const stripePublishableKey = (dbPk && dbPk.length > 10)
    ? dbPk
    : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!

  return (
    <CheckoutMerch
      packaging={(packaging ?? []) as PackagingType[]}
      skydropxEnabled={settings?.skydropx_enabled ?? false}
      shippingLocalMxn={settings?.shipping_local_mxn ?? 8900}
      shippingNationalMxn={settings?.shipping_national_mxn ?? 14900}
      freeThresholdMxn={settings?.shipping_free_threshold_mxn ?? 0}
      savedAddress={savedAddress}
      userEmail={userEmail}
      stripePublishableKey={stripePublishableKey}
    />
  )
}
