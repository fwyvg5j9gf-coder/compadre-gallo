import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase.server'
import type { StoreCategory, StoreSize, StoreSettings, PackagingType } from '@/lib/supabase'
import ConfiguracionAdmin from './ConfiguracionAdmin'

const DEFAULT_SETTINGS: StoreSettings = {
  shipping_local_mxn: 8900, shipping_national_mxn: 14900,
  shipping_intl_mxn: 45000, shipping_free_threshold_mxn: 150000,
  return_policy: '', shipping_policy: '',
  skydropx_enabled: false, skydropx_client_id: '', skydropx_client_secret: '', origin_zip: '', origin_state: '', origin_city: '', origin_colonia: '',
}

export default async function ConfiguracionPage() {
  const { userId } = await auth()
  if (!userId) redirect('/casa/login')

  const [categories, sizes, packaging, settings] = await Promise.all([
    supabaseAdmin.from('store_categories').select('*').order('sort_order'),
    supabaseAdmin.from('store_sizes').select('*').order('sort_order'),
    supabaseAdmin.from('packaging_types').select('*').order('sort_order'),
    supabaseAdmin.from('store_settings').select('*').eq('id', 1).single(),
  ])

  return (
    <ConfiguracionAdmin
      categories={(categories.data ?? []) as StoreCategory[]}
      sizes={(sizes.data ?? []) as StoreSize[]}
      packaging={(packaging.data ?? []) as PackagingType[]}
      settings={(settings.data ?? DEFAULT_SETTINGS) as StoreSettings}
    />
  )
}
