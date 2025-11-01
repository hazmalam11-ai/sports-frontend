"use client";
import Header from "@/components/Header";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { API_BASE } from "@/lib/api";
import Link from "next/link";

type Author = {
  _id: string;
  username: string;
  avatar?: string;
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
  likesCount?: number;
  likedByUser?: boolean;
  commentsCount?: number;
};

async function fetchNewsClient(): Promise<NewsItem[]> {
  const res = await fetch(`${API_BASE}/news`);
  if (!res.ok) throw new Error("Failed to load news");
  return res.json();
}

function formatDate(date?: string) {
  if (!date) return "";
  try {
    return new Date(date).toLocaleString();
  } catch {
    return "";
  }
}

function absoluteImage(url: string) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return `${API_BASE}/${url}`;
}

// Function to detect if text contains Arabic characters
function isArabic(text: string): boolean {
  if (!text) return false;
  // Arabic Unicode range: \u0600-\u06FF
  const arabicRegex = /[\u0600-\u06FF]/;
  return arabicRegex.test(text);
}

// Function to get text direction based on content
function getTextDirection(text: string): 'ltr' | 'rtl' {
  return isArabic(text) ? 'rtl' : 'ltr';
}

export default function NewsPage() {
  const { theme } = useTheme();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchNewsClient()
      .then(setItems)
      .catch((e) => setError(e?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const ad = new Date(a.publishedAt || a.createdAt || 0).getTime();
      const bd = new Date(b.publishedAt || b.createdAt || 0).getTime();
      return bd - ad;
    });
  }, [items]);

  // Pick featured item as hero if exists
  const featured = sorted.filter((n) => n.isFeatured);
  const hero = featured.length > 0 ? featured[0] : sorted[0];
  // Remaining excludes the hero
  const remaining = sorted.filter((n) => n._id !== hero?._id);

  const isDark = theme === "dark";
  const bgColor = isDark ? 'bg-slate-900' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-slate-300' : 'text-gray-600';
  const textSubtle = isDark ? 'text-slate-400' : 'text-gray-500';

  return (
    <>
      <style jsx global>{`
        .news-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px 0px rgba(0,0,0,0.15);
          border-color: #10b981;
        }
        
        /* Advanced styling for modern sports website */
        .glass-morphism {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .gradient-bg {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .sport-gradient {
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
        }
        
        .news-card-gradient {
          background: linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
        }
        
        .floating-animation {
          animation: float 6s ease-in-out infinite;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite alternate;
        }
        
        @keyframes pulse-glow {
          from { box-shadow: 0 0 20px rgba(59, 130, 246, 0.5); }
          to { box-shadow: 0 0 30px rgba(59, 130, 246, 0.8); }
        }
        
        .text-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .sport-text-gradient {
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>
      
      <div className={`min-h-screen ${bgColor} relative`}>
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-purple-50/20 dark:from-blue-900/10 dark:via-transparent dark:to-purple-900/10 pointer-events-none"></div>
        
      <Header />

        <main className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
        <div className="flex items-end justify-between mb-8">
          <div>
              <h1 className={`text-3xl md:text-4xl font-display font-bold sport-text-gradient`}>Latest News</h1>
              <p className={`${textMuted} mt-1`}>Fresh football headlines and stories</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-600/10 border border-red-600 text-red-300 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Layout: Hero (big) on top, then two columns: left small cards, right medium cards */}
        {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        )}

        {!loading && !error && sorted.length > 0 && (
          <>
            {/* Featured Story Section */}
              <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-blue-500 rounded"></div>
                <h2 className={`text-xl font-bold ${textColor}`}>Featured Story</h2>
              </div>
              <Link href={`/news/${hero._id}`}>
              <article
                  className={`group overflow-hidden rounded-lg border ${isDark ? 'border-slate-700' : 'border-gray-200'} ${cardBg} hover:shadow-lg transition-all duration-300 cursor-pointer`}
              >
                <div className="flex flex-col md:grid md:grid-cols-3 gap-0">
                {hero?.imageUrl && (
                    <div className="relative w-full h-48 md:h-auto overflow-hidden md:col-span-1">
                    <img
                      src={absoluteImage(hero.imageUrl)}
                      alt={hero.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                  <div className={`p-3 md:p-4 md:col-span-2 ${!hero?.imageUrl ? 'md:col-span-3' : ''}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
                      <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs font-semibold w-fit">
                        {hero?.isFeatured ? 'FEATURED' : 'LATEST'}
                      </span>
                      <span className={`text-xs ${textSubtle}`}>
                        {formatDate(hero?.publishedAt || hero?.createdAt)}
                      </span>
                    </div>
                    <h2 className={`text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3 ${textColor} line-clamp-2 group-hover:text-blue-500 transition-colors`}>
                      {hero?.title}
                    </h2>
                    <p className={`text-sm sm:text-base ${textMuted} line-clamp-2 sm:line-clamp-3 mb-2 sm:mb-3`}>
                      {hero?.content}
                    </p>
                    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 text-xs sm:text-sm ${textSubtle}`}>
                      <div className="flex items-center gap-4">
                        <span>By {hero?.author?.username || "Unknown"}</span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <svg 
                              className={`w-4 h-4 ${hero?.likedByUser ? 'text-red-500 fill-current' : textSubtle}`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                              />
                            </svg>
                            <span>{hero?.likesCount || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <svg className={`w-4 h-4 ${textSubtle}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
                              />
                            </svg>
                            <span>{hero?.commentsCount || 0}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-blue-500 font-medium">Read More →</span>
                    </div>
                  </div>
                </div>
              </article>
              </Link>
            </section>

            {/* Latest News Grid */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1 h-6 bg-green-500 rounded"></div>
                <h2 className={`text-xl font-bold ${textColor}`}>Latest News</h2>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {remaining.map((item, index) => (
                  <Link key={item._id} href={`/news/${item._id}`}>
                    <article
                      className={`group overflow-hidden rounded-lg border ${isDark ? 'border-slate-700' : 'border-gray-200'} ${cardBg} hover:shadow-lg transition-all duration-300 cursor-pointer`}
                    >
                    {item.imageUrl && (
                      <div className="relative w-full h-32 sm:h-48 overflow-hidden">
                        <img
                          src={absoluteImage(item.imageUrl)}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {item.isFeatured && (
                          <div className="absolute top-1 left-1 bg-red-500 text-white px-1 py-0.5 rounded text-xs font-semibold">
                            HOT
                        </div>
                      )}
                      </div>
                    )}
                    <div className="p-2 sm:p-4">
                      <div className="hidden sm:flex sm:items-center gap-2 mb-2">
                        <span className={`text-xs ${textSubtle}`}>
                          {formatDate(item.publishedAt || item.createdAt)}
                        </span>
                        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                        <span className={`text-xs ${textSubtle}`}>
                          {item.author?.username || "Unknown"}
                        </span>
                      </div>
                      <h3 
                        className={`text-sm sm:text-lg font-bold mb-1 sm:mb-2 ${textColor} line-clamp-2 group-hover:text-blue-500 transition-colors ${
                          isArabic(item.title) ? 'text-right' : 'text-left'
                        }`}
                        dir={getTextDirection(item.title)}
                        style={{
                          fontFamily: isArabic(item.title) ? 'Arial, sans-serif' : 'inherit'
                        }}
                      >
                        {item.title}
                      </h3>
                      <p 
                        className={`text-xs sm:text-sm ${textMuted} line-clamp-2 sm:line-clamp-3 ${
                          isArabic(item.content) ? 'text-right' : 'text-left'
                        }`}
                        dir={getTextDirection(item.content)}
                        style={{
                          fontFamily: isArabic(item.content) ? 'Arial, sans-serif' : 'inherit'
                        }}
                      >
                        {item.content}
                      </p>
                      
                      {/* Like & Comments Count */}
                      <div className="flex items-center justify-between mt-2 sm:mt-3">
                        <div className={`sm:hidden text-xs ${textSubtle}`}>
                          {formatDate(item.publishedAt || item.createdAt)}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <svg 
                              className={`w-3 h-3 sm:w-4 sm:h-4 ${item.likedByUser ? 'text-red-500 fill-current' : textSubtle}`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                              />
                            </svg>
                            <span className={`text-xs sm:text-sm ${textSubtle}`}>
                              {item.likesCount || 0}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <svg className={`w-3 h-3 sm:w-4 sm:h-4 ${textSubtle}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
                              />
                            </svg>
                            <span className={`text-xs sm:text-sm ${textSubtle}`}>
                              {item.commentsCount || 0}
                            </span>
                          </div>
                        </div>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
                </div>
            </section>
          </>
        )}

        {!loading && !error && items.length === 0 && (
            <div className={`text-center ${textMuted} mt-8`}>No news found.</div>
        )}

    </main>
      </div>
    </>
  );
}


