import type { Artist, Tag, PageSection, DEFAULT_SECTIONS } from './data'
import { DEFAULT_SECTIONS as DEF } from './data'

type DbShow = {
  venue: string; city: string; date: string
  price_mxn: number | null; capacity: number | null; is_published: boolean
}

type DbArtist = {
  id: string; slug: string; name: string; bio: string | null
  city: string | null; genre: string | null; image_url: string | null
  bg_color: string; stripe_color: string; fg_color: string
  page_sections?: PageSection[] | null
  shows: DbShow[]
  instagram?: string | null
  tiktok?: string | null
  spotify?: string | null
  youtube?: string | null
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
    id:             a.id,
    slug:           a.slug,
    name:           a.name,
    city:           a.city  ?? '',
    genre:          a.genre ?? '',
    date:           next ? fmtShort(next.date) : '',
    dateLabel:      next ? `${fmtShort(next.date)} · ${next.venue} ${next.city}` : '',
    bg:             a.bg_color,
    stripe:         a.stripe_color,
    fg:             a.fg_color,
    image_url:      a.image_url,
    page_sections:  (a.page_sections as PageSection[]) ?? DEF,
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
    instagram: a.instagram ?? null,
    tiktok:    a.tiktok    ?? null,
    spotify:   a.spotify   ?? null,
    youtube:   a.youtube   ?? null,
  }
}
