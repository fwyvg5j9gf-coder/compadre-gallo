/**
 * SKU format:
 *   Product: {CAT3}-{SEQ4}   e.g.  CAM-0001  REC-0042
 *   Variant:  {PRODUCT_SKU}-{SIZE_CODE}  e.g.  CAM-0001-M  CAM-0001-U
 */

/** 3-letter category code from a free-text category name */
export function categoryCode(category: string): string {
  return category
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // strip accents
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .trim()
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, 'X')
}

/** Size abbreviation used in variant SKUs */
export function sizeCode(size: string): string {
  if (size === 'única' || size === 'unica') return 'U'
  return size
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4)
}

/** Build product SKU from category + sequential number */
export function buildProductSku(category: string, seq: number): string {
  return `${categoryCode(category)}-${String(seq).padStart(4, '0')}`
}

/** Build variant SKU from product SKU + size */
export function buildVariantSku(productSku: string, size: string): string {
  return `${productSku}-${sizeCode(size)}`
}

/** Validate SKU format (lenient — only block clearly malformed) */
export function isValidSku(sku: string): boolean {
  return /^[A-Z0-9][A-Z0-9\-_]{1,29}$/.test(sku.toUpperCase())
}
