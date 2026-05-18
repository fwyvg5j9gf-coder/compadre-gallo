import Anthropic from '@anthropic-ai/sdk'
import { auth } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/auth.server'
import { supabaseAdmin } from '@/lib/supabase.server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `Eres el asistente del panel de administración de GALLO, una productora musical independiente en México.
Ayudas al equipo admin con preguntas sobre ventas, inventario, órdenes y operaciones.
Responde siempre en español mexicano, tono directo y de confianza — como compadre, no como corporativo.
Cuando des cifras de dinero: los valores en DB están en CENTAVOS — divide entre 100 para mostrarlos.
Formato de dinero: $1,250 MXN. Folios de orden: GALLO-00001.
Si el usuario pide algo que requiere datos, úsalos herramientas antes de responder.
Respuestas concisas — el admin está ocupado.`

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_dashboard_summary',
    description: 'Ingresos, total de órdenes y conteo por estado en los últimos N días',
    input_schema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Días hacia atrás a analizar (default 7)' },
      },
      required: [],
    },
  },
  {
    name: 'get_inventory_status',
    description: 'Productos agotados (stock 0) y con stock bajo (≤ reorder_point)',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_orders',
    description: 'Lista u órdenes. Filtra por estado y/o nombre/email del cliente',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'paid | shipped | delivered | pending | refunded | failed' },
        customer: { type: 'string', description: 'Nombre o email parcial del cliente' },
        limit: { type: 'number', description: 'Cuántas órdenes (max 20, default 10)' },
      },
      required: [],
    },
  },
  {
    name: 'get_products',
    description: 'Busca productos por nombre o categoría. Devuelve precio, stock, SKU y estado de publicación',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Nombre o categoría a buscar (vacío = todos)' },
        published_only: { type: 'boolean', description: 'Solo productos publicados' },
      },
      required: [],
    },
  },
]

async function runTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'get_dashboard_summary': {
      const days = (input.days as number) ?? 7
      const since = new Date(Date.now() - days * 86400000).toISOString()

      const { data } = await supabaseAdmin
        .from('orders')
        .select('total_mxn, status')
        .gte('created_at', since)
        .eq('is_test', false)

      const list = data ?? []
      const byStatus = list.reduce<Record<string, number>>((acc, o) => {
        acc[o.status] = (acc[o.status] ?? 0) + 1
        return acc
      }, {})
      const revenue = list
        .filter(o => ['paid', 'shipped', 'delivered'].includes(o.status))
        .reduce((s, o) => s + o.total_mxn, 0)

      return {
        periodo: `últimos ${days} días`,
        total_ordenes: list.length,
        ingresos_centavos: revenue,
        por_estado: byStatus,
        pendientes_envio: byStatus['paid'] ?? 0,
      }
    }

    case 'get_inventory_status': {
      const { data } = await supabaseAdmin
        .from('product_variants')
        .select('size, stock, reorder_point, products!inner(name, category, is_published, sku)')

      const variants = (data ?? []) as unknown as Array<{
        size: string; stock: number; reorder_point: number
        products: { name: string; category: string; is_published: boolean; sku: string | null }
      }>

      return {
        agotados: variants
          .filter(v => v.stock === 0)
          .map(v => ({ producto: v.products.name, talla: v.size, publicado: v.products.is_published, sku: v.products.sku })),
        stock_bajo: variants
          .filter(v => v.stock > 0 && v.reorder_point > 0 && v.stock <= v.reorder_point)
          .map(v => ({ producto: v.products.name, talla: v.size, stock: v.stock, reorder_point: v.reorder_point })),
      }
    }

    case 'get_orders': {
      const status = input.status as string | undefined
      const customer = input.customer as string | undefined
      const limit = Math.min((input.limit as number) ?? 10, 20)

      let q = supabaseAdmin
        .from('orders')
        .select('folio_number, customer_name, customer_email, total_mxn, status, created_at, is_test')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (status) q = q.eq('status', status)
      if (customer) q = q.or(`customer_name.ilike.%${customer}%,customer_email.ilike.%${customer}%`)

      const { data } = await q
      return (data ?? []).map(o => ({
        folio: `GALLO-${String(o.folio_number).padStart(5, '0')}`,
        cliente: o.customer_name ?? o.customer_email,
        total_centavos: o.total_mxn,
        estado: o.status,
        fecha: new Date(o.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }),
        prueba: o.is_test,
      }))
    }

    case 'get_products': {
      const query = input.query as string | undefined
      const publishedOnly = input.published_only as boolean | undefined

      let q = supabaseAdmin
        .from('products')
        .select('name, category, price_mxn, sku, is_published, product_variants(size, stock)')
        .order('name')

      if (publishedOnly) q = q.eq('is_published', true)
      if (query) q = q.or(`name.ilike.%${query}%,category.ilike.%${query}%`)

      const { data } = await q
      return (data ?? []).map(p => ({
        nombre: p.name,
        categoria: p.category,
        sku: p.sku,
        precio_centavos: p.price_mxn,
        publicado: p.is_published,
        stock_total: ((p.product_variants ?? []) as { stock: number }[]).reduce((s, v) => s + v.stock, 0),
        variantes: (p.product_variants ?? []) as { size: string; stock: number }[],
      }))
    }

    default:
      return { error: `herramienta desconocida: ${name}` }
  }
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId || !(await isAdmin(userId))) {
    return Response.json({ error: 'no autorizado' }, { status: 401 })
  }

  const { messages } = (await req.json()) as { messages: Anthropic.MessageParam[] }

  // Agentic loop — máx 5 rondas
  let history: Anthropic.MessageParam[] = [...messages]

  for (let round = 0; round < 5; round++) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM,
      tools: TOOLS,
      messages: history,
    })

    if (response.stop_reason === 'end_turn') {
      const text = (response.content.find(c => c.type === 'text') as Anthropic.TextBlock | undefined)?.text ?? ''
      return Response.json({ reply: text })
    }

    if (response.stop_reason === 'tool_use') {
      const toolUses = response.content.filter((c): c is Anthropic.ToolUseBlock => c.type === 'tool_use')
      const results = await Promise.all(toolUses.map(t => runTool(t.name, t.input as Record<string, unknown>)))

      history = [
        ...history,
        { role: 'assistant', content: response.content },
        {
          role: 'user',
          content: toolUses.map((t, i) => ({
            type: 'tool_result' as const,
            tool_use_id: t.id,
            content: JSON.stringify(results[i]),
          })),
        },
      ]
      continue
    }

    break
  }

  return Response.json({ error: 'no se pudo generar respuesta' }, { status: 500 })
}
