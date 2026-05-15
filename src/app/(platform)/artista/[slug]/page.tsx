import { notFound } from 'next/navigation';
import { getArtistBySlug, ARTISTS } from '@/lib/data';
import ArtistDetailClient from './ArtistDetailClient';

export function generateStaticParams() {
  return ARTISTS.map(a => ({ slug: a.slug }));
}

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artist = getArtistBySlug(slug);
  if (!artist) notFound();
  return <ArtistDetailClient artist={artist} />;
}
