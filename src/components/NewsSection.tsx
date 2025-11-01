'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';

type Author = {
  _id: string;
  username: string;
  email: string;
  role: string;
};

type NewsItem = {
  _id: string;
  title: string;
  content: string;
  imageUrl: string;
  author?: Author | null;
  publishedAt?: string;
  createdAt?: string;
  isFeatured?: boolean;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5050";

function formatDate(date?: string) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function absoluteImage(url: string) {
  if (url.startsWith("http")) return url;
  // Remove leading slash to avoid double slashes
  const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
  return `${API_BASE}/${cleanUrl}`;
}

export default function NewsSection() {
  const router = useRouter();
  const { theme } = useTheme();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch(`${API_BASE}/news`);
        if (response.ok) {
          const data = await response.json();
          // Get only the first 4 news items
          setNews(data.slice(0, 4));
        } else {
          setError('Failed to load news');
        }
      } catch (err) {
        setError('Error loading news');
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  if (loading) {
    return (
      <div className="relative z-10 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Latest News</h2>
            <div className="animate-pulse bg-white/20 h-8 w-24 rounded"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white/10 rounded-lg h-64"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || news.length === 0) {
    return null; // Don't show anything if no news
  }

  return (
    <div className="relative z-10 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Latest News</h2>
          <button
            onClick={() => router.push('/news')}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium"
          >
            View All
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {news.map((item) => (
            <article
              key={item._id}
              className={`group overflow-hidden rounded-xl border ${
                theme === 'dark' ? 'border-white/10 bg-[#161616]' : 'border-black/10 bg-white'
              } hover:bg-[#D9262D] hover:border-[#D9262D] transition-colors duration-200 cursor-pointer`}
              onClick={() => router.push('/news')}
            >
              {item.imageUrl && (
                <div className="relative w-full h-40 overflow-hidden">
                  <Image
                    src={absoluteImage(item.imageUrl)}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              <div className="p-4">
                <h3 className={`font-semibold line-clamp-2 mb-2 transition-colors duration-200 ${
                  theme === 'dark' ? 'text-white' : 'text-[#111]'
                } group-hover:text-white`}>
                  {item.title}
                </h3>
                <p className={`text-sm line-clamp-3 mb-3 transition-colors duration-200 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                } group-hover:text-white/90`}>
                  {item.content}
                </p>
                <div className={`flex items-center justify-between text-xs transition-colors duration-200 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                } group-hover:text-white/90`}>
                  <span className="transition-colors duration-200">{item.author?.username || "Unknown"}</span>
                  <span className="transition-colors duration-200">{formatDate(item.publishedAt || item.createdAt)}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
