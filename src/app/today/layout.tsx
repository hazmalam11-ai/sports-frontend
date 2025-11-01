import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Mal'abak - Your Football Stadium",
  description: 'All football news and matches in one place',
  openGraph: {
    type: 'website',
    url: '',
    title: 'Mal\'abak - Your Football Stadium',
    description: 'Follow live football match schedules, results, and fixtures for major leagues and world tournaments.',
    images: [''],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mal\'abak - Your Football Stadium',
    description: 'Follow live football match schedules, results, and fixtures for major leagues and world tournaments.',
    images: [''],
  },
};

export default function TodayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Load external resources */}
      <script src="https://cdn.tailwindcss.com" async></script>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet" />
      {children}
    </>
  );
}
