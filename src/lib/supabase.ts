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

export function totalStock(variants: ProductVariant[] = []) {
  return variants.reduce((sum, v) => sum + v.stock, 0)
}
