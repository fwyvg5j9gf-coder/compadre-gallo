import type { Artist, Tag } from './data'

type DbShow = {
  venue: string; city: string; date: string
  price_mxn: number | null; capacity: number | null; is_published: boolean
}

type DbArtist = {
  slug: string; name: string; bio: string | null
  city: string | null; genre: string | null
  bg_color: string; stripe_color: string; fg_color: string
  shows: DbShow[]
}

function fmtShort(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

export function mapArtist(a: DbArtist): Artist {
  const now = new Date()
  const upcoming = a.shows
    .filter(s => s.is_published && new Date(s.date + 'T12:00:00') >= now)
    .sort((x, y) => new Date(x.date).getTime() - new Date(y.date).getTime())
  const next = upcoming[0]

  return {
    slug:           a.slug,
    name:           a.name,
    city:           a.city  ?? '',
    genre:          a.genre ?? '',
    date:           next ? fmtShort(next.date) : '',
    dateLabel:      next ? `${fmtShort(next.date)} · ${next.venue} ${next.city}` : '',
    bg:             a.bg_color,
    stripe:         a.stripe_color,
    fg:             a.fg_color,
    tag:            (next ? 'preventa' : null) as Tag,
    bio:            a.bio ?? '',
    tracks:         [],
    shows: a.shows
      .filter(s => s.is_published)
      .map(s => ({
        venue:     s.venue,
        city:      s.city,
        date:      fmtShort(s.date),
        price:     Math.round((s.price_mxn ?? 0) / 100),
        available: s.capacity ?? 99,
        tag: (new Date(s.date + 'T12:00:00') >= now ? 'preventa' : null) as Tag,
      })),
    previewTimestamp: next
      ? new Date(next.date + 'T12:00:00').getTime()
      : Date.now() + 86400000 * 30,
  }
}
