import { notFound } from 'next/navigation';
import { getArtistBySlug, ARTISTS } from '@/lib/data';
import CheckoutClient from './CheckoutClient';

export function generateStaticParams() {
  return ARTISTS.map(a => ({ slug: a.slug }));
}

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artist = getArtistBySlug(slug);
  if (!artist) notFound();
  return <CheckoutClient artist={artist} />;
}
