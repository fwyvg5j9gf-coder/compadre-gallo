export type Tag = 'preventa' | 'agotado' | 'en vivo' | null;

export interface Artist {
  slug: string;
  name: string;
  city: string;
  genre: string;
  date: string;
  dateLabel: string;
  bg: string;
  stripe: string;
  fg: string;
  tag: Tag;
  bio: string;
  tracks: Track[];
  shows: Show[];
  previewTimestamp: number;
}

export interface Track {
  id: string;
  title: string;
  duration: string;
  plays: string;
}

export interface Show {
  venue: string;
  city: string;
  date: string;
  price: number;
  available: number;
  tag: Tag;
}

export const ARTISTS: Artist[] = [
  {
    slug: 'paloma',
    name: 'paloma',
    city: 'guadalajara',
    genre: 'electrónica · ambient',
    date: '12 may',
    dateLabel: '12 mayo · palenque gdl',
    bg: '#1a0a0a',
    stripe: '#ff0100',
    fg: '#fff',
    tag: 'preventa',
    bio: 'paloma hace música de madrugada. electrónica suave con influencias de ranchera y ambient japonés. su proyecto nocturno ya tiene tres eps y un fan club que no para de crecer.',
    tracks: [
      { id: 't1', title: 'nocturno I', duration: '3:42', plays: '48k' },
      { id: 't2', title: 'nocturno II', duration: '4:11', plays: '31k' },
      { id: 't3', title: 'entre semana', duration: '2:58', plays: '22k' },
      { id: 't4', title: 'viernes raro', duration: '5:03', plays: '19k' },
    ],
    shows: [
      { venue: 'palenque feria', city: 'guadalajara', date: '12 mayo 2026', price: 350, available: 142, tag: 'preventa' },
      { venue: 'teatro diana', city: 'guadalajara', date: '28 junio 2026', price: 420, available: 0, tag: 'agotado' },
    ],
    previewTimestamp: Date.now() + 86400000 * 5,
  },
  {
    slug: 'flavio',
    name: 'flavio',
    city: 'monterrey',
    genre: 'indie · shoegaze',
    date: '19 may',
    dateLabel: '19 mayo · café iguana mty',
    bg: '#001d47',
    stripe: '#00c4df',
    fg: '#fff',
    tag: null,
    bio: 'flavio toca guitarra como si tuviera prisa. shoegaze con letras en español que no tratan de explicarse. azulado, su último sencillo, pasó de 0 a 80k plays en tres semanas.',
    tracks: [
      { id: 't1', title: 'azulado', duration: '4:28', plays: '80k' },
      { id: 't2', title: 'tú y el ruido', duration: '3:55', plays: '44k' },
      { id: 't3', title: 'no me llames', duration: '3:20', plays: '38k' },
      { id: 't4', title: 'gris matutino', duration: '5:14', plays: '27k' },
    ],
    shows: [
      { venue: 'café iguana', city: 'monterrey', date: '19 mayo 2026', price: 280, available: 67, tag: null },
      { venue: 'foro indie rocks', city: 'ciudad de méxico', date: '3 julio 2026', price: 320, available: 210, tag: null },
    ],
    previewTimestamp: Date.now() + 86400000 * 12,
  },
  {
    slug: 'tetra',
    name: 'tetra',
    city: 'ciudad de méxico',
    genre: 'hip-hop · experimental',
    date: '02 jun',
    dateLabel: '02 junio · foro indie rocks cdmx',
    bg: '#0a0a0a',
    stripe: '#ffe200',
    fg: '#fff',
    tag: 'en vivo',
    bio: 'tetra produce, escribe y graba en su cuarto en tepito. sus sesiones son archivos vivos — los sube como demos, los actualiza, los borra. sesión 03 lleva ya cuatro versiones y la última es la mejor.',
    tracks: [
      { id: 't1', title: 'sesión 03 v4', duration: '2:44', plays: '120k' },
      { id: 't2', title: 'tepito 5am', duration: '3:12', plays: '95k' },
      { id: 't3', title: 'sin crédito', duration: '2:31', plays: '67k' },
      { id: 't4', title: 'loop raro', duration: '1:58', plays: '43k' },
    ],
    shows: [
      { venue: 'foro indie rocks', city: 'ciudad de méxico', date: '2 junio 2026', price: 200, available: 8, tag: 'en vivo' },
    ],
    previewTimestamp: Date.now() + 86400000 * 2,
  },
  {
    slug: 'memo',
    name: 'memo',
    city: 'puebla',
    genre: 'cumbia · electrónica',
    date: '14 jun',
    dateLabel: '14 junio · pasillo fresa pue',
    bg: '#3d2a00',
    stripe: '#ffe200',
    fg: '#fff',
    tag: null,
    bio: 'memo mezcla cumbia norteña con sintetizadores baratos y un drum machine que le costó 300 pesos. la combinación suena a verano aunque llueva. su set de verano 24 sigue siendo lo más pedido.',
    tracks: [
      { id: 't1', title: 'verano 24', duration: '4:02', plays: '55k' },
      { id: 't2', title: 'las doce', duration: '3:38', plays: '41k' },
      { id: 't3', title: 'cumbia rota', duration: '3:50', plays: '33k' },
      { id: 't4', title: 'regresa ya', duration: '4:20', plays: '28k' },
    ],
    shows: [
      { venue: 'pasillo fresa', city: 'puebla', date: '14 junio 2026', price: 180, available: 300, tag: null },
    ],
    previewTimestamp: Date.now() + 86400000 * 30,
  },
  {
    slug: 'lua',
    name: 'lúa',
    city: 'oaxaca',
    genre: 'folk · voz',
    date: '21 jun',
    dateLabel: '21 junio · el refugio oax',
    bg: '#1a0420',
    stripe: '#ffd49a',
    fg: '#fff',
    tag: 'preventa',
    bio: 'lúa canta en zapoteco y español. sus canciones vienen del campo, del mercado, de lo que no se dice en voz alta. cuerpo, su álbum debut, es de los proyectos más esperados del año.',
    tracks: [
      { id: 't1', title: 'cuerpo I', duration: '5:22', plays: '36k' },
      { id: 't2', title: 'tierra roja', duration: '4:15', plays: '29k' },
      { id: 't3', title: 'mercado', duration: '3:40', plays: '21k' },
      { id: 't4', title: 'volver', duration: '6:08', plays: '18k' },
    ],
    shows: [
      { venue: 'el refugio', city: 'oaxaca', date: '21 junio 2026', price: 250, available: 54, tag: 'preventa' },
      { venue: 'centro cultural', city: 'ciudad de méxico', date: '5 agosto 2026', price: 300, available: 180, tag: null },
    ],
    previewTimestamp: Date.now() + 86400000 * 37,
  },
  {
    slug: 'dj-cero',
    name: 'dj cero',
    city: 'tijuana',
    genre: 'techno · ambient',
    date: '28 jun',
    dateLabel: '28 junio · el bunker tij',
    bg: '#001810',
    stripe: '#003a87',
    fg: '#fff',
    tag: null,
    bio: 'dj cero lleva diez años poniendo música en bares de tijuana que cierran tarde y abren temprano. nadie sabe su nombre real. sus sets empiezan suaves y terminan cuando tú ya no puedes más.',
    tracks: [
      { id: 't1', title: 'set · el bunker (live)', duration: '58:00', plays: '14k' },
      { id: 't2', title: 'cero ① — apertura', duration: '9:44', plays: '8k' },
      { id: 't3', title: 'cero ⑦ — cierre', duration: '12:30', plays: '6k' },
    ],
    shows: [
      { venue: 'el bunker', city: 'tijuana', date: '28 junio 2026', price: 150, available: 220, tag: null },
    ],
    previewTimestamp: Date.now() + 86400000 * 44,
  },
  {
    slug: 'valeria',
    name: 'valeria',
    city: 'monterrey',
    genre: 'r&b · soul',
    date: '05 jul',
    dateLabel: '05 julio · bar fundidora mty',
    bg: '#1f0a2e',
    stripe: '#ff0100',
    fg: '#fff',
    tag: 'preventa',
    bio: 'valeria escribe letras que duelen y suenan suave al mismo tiempo. r&b en español con arreglos de cuerdas en vivo. su voz es lo que pasa cuando no aguantas más pero lo dices en calma.',
    tracks: [
      { id: 't1', title: 'ni modo', duration: '3:58', plays: '62k' },
      { id: 't2', title: 'ya no', duration: '4:22', plays: '50k' },
      { id: 't3', title: 'sin ti igual', duration: '3:30', plays: '38k' },
      { id: 't4', title: 'déjame', duration: '4:47', plays: '31k' },
    ],
    shows: [
      { venue: 'bar fundidora', city: 'monterrey', date: '5 julio 2026', price: 320, available: 89, tag: 'preventa' },
    ],
    previewTimestamp: Date.now() + 86400000 * 51,
  },
  {
    slug: 'rio',
    name: 'río',
    city: 'guadalajara',
    genre: 'rock · post-punk',
    date: '12 jul',
    dateLabel: '12 julio · c3 stage gdl',
    bg: '#0d0d0d',
    stripe: '#00c4df',
    fg: '#fff',
    tag: null,
    bio: 'río hace ruido. post-punk de guadalajara que suena a los ramones si los ramones hubieran crecido en tlaquepaque. rápido, directo, sin solos de guitarra innecesarios.',
    tracks: [
      { id: 't1', title: 'adentro', duration: '2:18', plays: '41k' },
      { id: 't2', title: 'no sé ya', duration: '1:55', plays: '35k' },
      { id: 't3', title: 'ruido limpio', duration: '2:44', plays: '28k' },
      { id: 't4', title: 'otra vez', duration: '3:10', plays: '22k' },
    ],
    shows: [
      { venue: 'c3 stage', city: 'guadalajara', date: '12 julio 2026', price: 250, available: 400, tag: null },
    ],
    previewTimestamp: Date.now() + 86400000 * 58,
  },
];

export function getArtistBySlug(slug: string): Artist | undefined {
  return ARTISTS.find(a => a.slug === slug);
}

export function getFeaturedArtists(): Artist[] {
  return ARTISTS.slice(0, 4);
}

export function getPreventaArtists(): Artist[] {
  return ARTISTS.filter(a => a.tag === 'preventa' || a.tag === 'en vivo');
}
