// Tipos y utilidades — seguros para importar desde Client Components

export type ProductVariant = {
  id: string
  product_id: string
  size: string
  stock: number
  created_at: string
  updated_at: string
}

export type PackagingType = {
  id: string
  name: string
  weight_grams: number
  length_cm: number
  width_cm: number
  height_cm: number
  sort_order: number
  created_at: string
  skydropx_package_type: string
  consignment_note: string
}

export type Product = {
  id: string
  name: string
  description: string | null
  price_mxn: number
  weight_grams: number | null
  category: string
  image_url: string | null
  is_published: boolean
  sort_order: number
  packaging_type_id: string | null
  created_at: string
  updated_at: string
  product_variants?: ProductVariant[]
  packaging_types?: PackagingType | null
}

export type StoreCategory = {
  id: string
  name: string
  sort_order: number
  created_at: string
}

export type StoreSize = {
  id: string
  name: string
  sort_order: number
  created_at: string
}

export type StoreSettings = {
  shipping_local_mxn: number
  shipping_national_mxn: number
  shipping_intl_mxn: number
  shipping_free_threshold_mxn: number
  return_policy: string
  shipping_policy: string
  skydropx_enabled: boolean
  skydropx_client_id: string
  skydropx_client_secret: string
  skydropx_markup_pct: number
  skydropx_allowed_carriers: string[]
  origin_name: string
  origin_street: string
  origin_phone: string
  origin_email: string
  origin_zip: string
  origin_state: string
  origin_city: string
  origin_colonia: string
  stripe_test_mode: boolean
  stripe_pk_test: string
  stripe_sk_test: string
  stripe_pk_live: string
  stripe_sk_live: string
  stripe_webhook_secret: string
  stripe_statement_desc: string
  stripe_markup_pct: number
}

export type Show = {
  id: string
  artist_id: string
  venue: string
  city: string
  date: string
  ticket_url: string | null
  price_mxn: number | null
  capacity: number | null
  is_published: boolean
  created_at: string
  updated_at: string
  artists?: { name: string; slug: string; image_url: string | null }
}

export type Ticket = {
  id: string
  show_id: string | null
  user_id: string
  customer_email: string
  customer_name: string | null
  quantity: number
  unit_price_mxn: number
  total_mxn: number
  stripe_payment_id: string | null
  folio_code: string
  status: 'confirmed' | 'cancelled' | 'refunded'
  created_at: string
  shows?: Show
}

export type ArtistSubscription = {
  id: string
  artist_id: string
  user_id: string
  email: string
  created_at: string
  artists?: { id: string; name: string; slug: string; image_url: string | null; genre: string | null; city: string | null }
}

export type CustomerUser = {
  clerk_user_id: string
  email: string
  name: string | null
  role: string
  created_at: string
  orders_count?: number
  tickets_count?: number
  subscriptions_count?: number
}

export function totalStock(variants: ProductVariant[] = []) {
  return variants.reduce((sum, v) => sum + v.stock, 0)
}
