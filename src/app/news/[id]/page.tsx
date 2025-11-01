"use client";
import Header from "@/components/Header";
import { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { API_BASE } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

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

type Comment = {
  _id: string;
  body: string;
  author: Author;
  createdAt: string;
  likesCount?: number;
  likedByUser?: boolean;
  replies?: Comment[];
  repliesCount?: number;
  parent?: string | null;
};

async function fetchNewsById(id: string): Promise<NewsItem> {
  const res = await fetch(`${API_BASE}/news/${id}`);
  if (!res.ok) throw new Error("Failed to load news article");
  return res.json();
}

// Fetch comments for a news article
async function fetchCommentsForNews(newsId: string): Promise<Comment[]> {
  const res = await fetch(`${API_BASE}/news-comments/news/${newsId}`);
  if (!res.ok) throw new Error("Failed to load comments");
  const data = await res.json();
  return data.comments || [];
}

// Add a comment to a news article
async function addCommentToNews(newsId: string, body: string, authToken: string, parentId?: string): Promise<Comment> {
  if (!authToken) {
    throw new Error("You must be logged in to comment");
  }

  const res = await fetch(`${API_BASE}/news-comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      news: newsId,
      body: body.trim(),
      ...(parentId && { parent: parentId })
    })
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Failed to add comment");
  }

  const data = await res.json();
  return data.comment;
}

// Like/unlike a comment
async function toggleCommentLike(commentId: string, authToken: string): Promise<{ likesCount: number; likedByUser: boolean }> {
  if (!authToken) {
    throw new Error("You must be logged in to like comments");
  }

  const res = await fetch(`${API_BASE}/news-comments/${commentId}/like`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Failed to toggle like");
  }

  return await res.json();
}

// Delete a comment
async function deleteComment(commentId: string, authToken: string): Promise<void> {
  if (!authToken) {
    throw new Error("You must be logged in to delete comments");
  }

  const res = await fetch(`${API_BASE}/news-comments/${commentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Failed to delete comment");
  }
}

// Toggle like on a news article
async function toggleNewsLike(newsId: string, authToken: string): Promise<{ likesCount: number; likedByUser: boolean }> {
  if (!authToken) {
    throw new Error("You must be logged in to like articles");
  }

  const res = await fetch(`${API_BASE}/news/${newsId}/like`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Failed to toggle like");
  }

  return await res.json();
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

export default function NewsDetailPage() {
  const { theme } = useTheme();
  const { user, token } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [newsItem, setNewsItem] = useState<NewsItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState<boolean>(true);
  const [newComment, setNewComment] = useState<string>('');
  const [submittingComment, setSubmittingComment] = useState<boolean>(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [submittingReply, setSubmittingReply] = useState<boolean>(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [commentToDelete, setCommentToDelete] = useState<{id: string, isReply: boolean, parentId?: string} | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchNewsById(params.id as string)
        .then(setNewsItem)
        .catch((e) => setError(e?.message || "Failed to load"))
        .finally(() => setLoading(false));

      // Fetch comments for this news article
      fetchCommentsForNews(params.id as string)
        .then(setComments)
        .catch((e) => console.error("Failed to load comments:", e))
        .finally(() => setCommentsLoading(false));
    }
  }, [params.id]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showEmojiPicker && !(event.target as Element).closest('.emoji-picker')) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  // Close reply form when user logs out
  useEffect(() => {
    if (!user && replyTo) {
      setReplyTo(null);
      setReplyText('');
    }
  }, [user, replyTo]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !params.id || !token) return;

    setSubmittingComment(true);
    try {
      const comment = await addCommentToNews(params.id as string, newComment.trim(), token);
      setComments(prev => [comment, ...prev]);
      setNewComment('');
    } catch (error) {
      console.error("Failed to submit comment:", error);
      alert(error instanceof Error ? error.message : "Failed to submit comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!token) return;
    
    try {
      const result = await toggleCommentLike(commentId, token);
      
      setComments(prev => prev.map(comment => {
        // Check if this is a main comment
        if (comment._id === commentId) {
          return { ...comment, likesCount: result.likesCount, likedByUser: result.likedByUser };
        }
        
        // Check if this is a reply within this comment
        const updatedReplies = comment.replies?.map(reply => 
          reply._id === commentId 
            ? { ...reply, likesCount: result.likesCount, likedByUser: result.likedByUser }
            : reply
        );
        
        if (updatedReplies && updatedReplies !== comment.replies) {
          return { ...comment, replies: updatedReplies };
        }
        
        return comment;
      }));
    } catch (error) {
      console.error("Failed to toggle like:", error);
      alert(error instanceof Error ? error.message : "Failed to toggle like");
    }
  };

  const handleSubmitReply = async (parentCommentId: string) => {
    if (!replyText.trim() || !params.id || !token) return;

    setSubmittingReply(true);
    try {
      const reply = await addCommentToNews(params.id as string, replyText.trim(), token, parentCommentId);
      setComments(prev => prev.map(comment => 
        comment._id === parentCommentId 
          ? { ...comment, replies: [...(comment.replies || []), reply] }
          : comment
      ));
      setReplyText('');
      setReplyTo(null);
    } catch (error) {
      console.error("Failed to submit reply:", error);
      alert(error instanceof Error ? error.message : "Failed to submit reply");
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDeleteComment = async (commentId: string, isReply: boolean = false, parentCommentId?: string) => {
    if (!token) return;
    
    // Show advanced delete modal instead of basic confirm
    setCommentToDelete({ id: commentId, isReply, parentId: parentCommentId });
    setShowDeleteModal(true);
  };

  const confirmDeleteComment = async () => {
    if (!token || !commentToDelete) return;

    try {
      await deleteComment(commentToDelete.id, token);
      
      if (commentToDelete.isReply && commentToDelete.parentId) {
        // Remove reply from parent comment's replies array
        setComments(prev => prev.map(comment => 
          comment._id === commentToDelete.parentId 
            ? { 
                ...comment, 
                replies: comment.replies?.filter(reply => reply._id !== commentToDelete.id) || [],
                repliesCount: (comment.repliesCount || 0) - 1
              }
            : comment
        ));
      } else {
        // Remove top-level comment
        setComments(prev => prev.filter(comment => comment._id !== commentToDelete.id));
      }
      
      // Close modal and reset state
      setShowDeleteModal(false);
      setCommentToDelete(null);
    } catch (error) {
      console.error("Failed to delete comment:", error);
      alert(error instanceof Error ? error.message : "Failed to delete comment");
    }
  };

  const cancelDeleteComment = () => {
    setShowDeleteModal(false);
    setCommentToDelete(null);
  };

  const handleLikeArticle = async () => {
    if (!token || !params.id) return;
    
    try {
      const result = await toggleNewsLike(params.id as string, token);
      setNewsItem(prev => prev ? {
        ...prev,
        likesCount: result.likesCount,
        likedByUser: result.likedByUser
      } : null);
    } catch (error) {
      console.error("Failed to toggle like:", error);
      alert(error instanceof Error ? error.message : "Failed to toggle like");
    }
  };

  // Simple emoji picker function
  const insertEmoji = (emoji: string) => {
    setNewComment(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Common emojis for quick access
  const commonEmojis = ['😀', '😂', '😍', '👍', '👎', '❤️', '🔥', '💯', '🎉', '😊', '😢', '😮', '😡', '🤔', '👏', '🙏'];

  const isDark = theme === "dark";
  const bgColor = isDark ? 'bg-slate-900' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-slate-300' : 'text-gray-700';
  const textSubtle = isDark ? 'text-slate-400' : 'text-gray-600';

  if (loading) {
    return (
      <div className={`min-h-screen ${bgColor}`}>
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className={`text-sm ${textMuted}`}>Loading article...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !newsItem) {
    return (
      <div className={`min-h-screen ${bgColor}`}>
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center py-16">
            <div className={`w-24 h-24 mx-auto mb-6 ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.709M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className={`text-xl font-semibold ${textColor} mb-2`}>Article Not Found</h3>
            <p className={`${textMuted} mb-6`}>
              The news article you're looking for doesn't exist or has been removed.
            </p>
            <Link 
              href="/news"
              className={`px-4 py-2 rounded-full font-semibold transition-all duration-300 text-sm ${
                isDark 
                  ? 'border-slate-600 bg-slate-700 text-white hover:bg-slate-600' 
                  : 'border-gray-300 bg-gray-50 text-gray-900 hover:bg-gray-100'
              } border`}
            >
              ← Back to News
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        .glass-morphism {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
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

        <main className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 mb-6 text-sm">
            <Link 
              href="/news" 
              className={`${textMuted} hover:${textColor} transition-colors`}
            >
              News
            </Link>
            <span className={textSubtle}>/</span>
            <span className={textColor}>Article</span>
          </nav>

          {/* Article Header */}
          <header className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              {newsItem.isFeatured && (
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-semibold">
                  FEATURED
                </span>
              )}
              <span className={`text-sm ${textSubtle}`}>
                {formatDate(newsItem.publishedAt || newsItem.createdAt)}
              </span>
            </div>
            
            <h1 
              className={`text-3xl sm:text-4xl lg:text-5xl font-bold ${textColor} mb-6 leading-tight ${
                isArabic(newsItem.title) ? 'text-right' : 'text-left'
              }`}
              dir={getTextDirection(newsItem.title)}
              style={{
                fontFamily: isArabic(newsItem.title) ? 'Arial, sans-serif' : 'inherit',
                lineHeight: isArabic(newsItem.title) ? '1.6' : '1.4'
              }}
            >
              {newsItem.title}
            </h1>
            
            <div className={`flex items-center justify-between mb-6`}>
              <div className={`flex items-center gap-4 text-sm ${textSubtle}`}>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>By {newsItem.author?.username || 'Unknown Author'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{formatDate(newsItem.publishedAt || newsItem.createdAt)}</span>
                </div>
              </div>
              
              {/* Like & Comments Buttons */}
              <div className="flex items-center gap-3">
                {/* Like Button */}
                {user ? (
                  <button
                    onClick={handleLikeArticle}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
                      newsItem.likedByUser
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : isDark
                        ? 'bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600'
                        : 'bg-gray-50 border border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <svg 
                      className={`w-4 h-4 ${newsItem.likedByUser ? 'fill-current' : ''}`} 
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
                    <span className="text-sm font-medium">
                      {newsItem.likesCount || 0}
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('openLoginModal'))}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
                      isDark
                        ? 'bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600'
                        : 'bg-gray-50 border border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                      />
                    </svg>
                    <span className="text-sm font-medium">
                      {newsItem.likesCount || 0}
                    </span>
                  </button>
                )}
                
                {/* Comments Count */}
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                  isDark
                    ? 'bg-slate-700 border border-slate-600 text-slate-300'
                    : 'bg-gray-50 border border-gray-300 text-gray-700'
                }`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
                    />
                  </svg>
                  <span className="text-sm font-medium">
                    {newsItem.commentsCount || 0}
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Article Content & Comments - Unified Section */}
          <section className={`${cardBg} rounded-lg p-6 sm:p-8 mb-8 shadow-lg`}>
            {/* Article Content */}
            <div className="mb-8">
              {/* Featured Image */}
              {newsItem.imageUrl && (
                <div className="mb-6">
                  <div className="relative w-full h-64 sm:h-80 lg:h-96 overflow-hidden rounded-lg">
                    <img
                      src={absoluteImage(newsItem.imageUrl)}
                      alt={newsItem.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Article Text Content */}
              <div className={`prose prose-slate dark:prose-invert max-w-none ${isDark ? textMuted : 'text-gray-800'} leading-relaxed`}>
                <div 
                  className={`whitespace-pre-wrap text-base sm:text-lg ${
                    isArabic(newsItem.content) ? 'text-right' : 'text-left'
                  }`}
                  dir={getTextDirection(newsItem.content)}
                  style={{
                    fontFamily: isArabic(newsItem.content) ? 'Arial, sans-serif' : 'inherit',
                    lineHeight: isArabic(newsItem.content) ? '1.8' : '1.6',
                    fontWeight: isDark ? 'normal' : '450'
                  }}
                >
                  {newsItem.content}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1 h-6 bg-purple-500 rounded"></div>
              <h2 className={`text-xl font-bold ${textColor}`}>Comments ({comments.length})</h2>
            </div>

            {/* Comment Form */}
            {user ? (
              <form onSubmit={handleSubmitComment} className="mb-6">
                <div className="mb-4">
                  <div className="relative">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Share your thoughts on this article... 😊"
                      className={`w-full p-4 pr-12 rounded-lg border ${
                        isDark ? 'border-slate-600 bg-slate-700 text-white' : 'border-gray-300 bg-white text-gray-900'
                      } focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none`}
                      rows={4}
                      maxLength={500}
                    />
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className={`emoji-picker absolute top-3 right-3 p-2 rounded-lg transition-colors ${
                        isDark ? 'hover:bg-slate-600 text-slate-300' : 'hover:bg-gray-100 text-gray-500'
                      }`}
                      title="Add emoji"
                    >
                      <span className="text-lg">😊</span>
                    </button>
                  </div>
                  
                  {/* Emoji Picker */}
                  {showEmojiPicker && (
                    <div className={`emoji-picker mt-2 p-3 rounded-lg border ${
                      isDark ? 'border-slate-600 bg-slate-700' : 'border-gray-300 bg-white'
                    }`}>
                      <div className="grid grid-cols-8 gap-2">
                        {commonEmojis.map((emoji, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => insertEmoji(emoji)}
                            className="p-2 text-lg hover:bg-gray-100 dark:hover:bg-slate-600 rounded transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className={`text-xs ${textSubtle} mt-1 text-right`}>
                    {newComment.length}/500 characters
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!newComment.trim() || submittingComment}
                  className={`px-6 py-2 rounded-lg font-medium transition-all duration-300 ${
                    !newComment.trim() || submittingComment
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : isDark
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                      : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white'
                  } shadow-lg hover:shadow-xl hover:scale-105`}
                >
                  {submittingComment ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Posting...
                    </span>
                  ) : (
                    'Post Comment'
                  )}
                </button>
              </form>
            ) : (
              <div className={`mb-6 p-4 rounded-lg text-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                <p className={`${isDark ? textMuted : 'text-gray-700'} mb-3`}>Please log in to comment on this article</p>
                <button 
                  onClick={() => {
                    // Dispatch custom event to trigger login modal
                    window.dispatchEvent(new CustomEvent('openLoginModal'));
                  }}
                  className={`px-4 py-2 rounded-full font-semibold transition-all duration-300 text-sm ${
                    isDark
                      ? 'border-slate-600 bg-slate-700 text-white hover:bg-slate-600'
                      : 'border-gray-300 bg-gray-50 text-gray-900 hover:bg-gray-100'
                  } border`}
                >
                  Log In to Comment
                </button>
              </div>
            )}

            {/* Divider */}
            <div className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-200'} my-6`}></div>

            {/* Comments List */}
            {commentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className={`text-sm ${textMuted}`}>Loading comments...</p>
                </div>
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8">
                <div className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className={`text-lg ${isDark ? textMuted : 'text-gray-700'}`}>No comments yet</p>
                <p className={`text-sm ${isDark ? textSubtle : 'text-gray-600'}`}>Be the first to share your thoughts!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {comments.map((comment) => (
                  <div key={comment._id} className={`border-b ${isDark ? 'border-slate-700' : 'border-gray-200'} pb-6 last:border-b-0`}>
                    <div className="flex items-start gap-3">
                      {/* User Avatar */}
                        {comment.author?.avatar ? (
                          <img 
                            src={`${API_BASE}${comment.author.avatar}`} 
                            alt={comment.author?.username || 'User'} 
                            className="w-10 h-10 rounded-full object-cover"
                            onError={(e) => {
                              // Fallback to letter avatar if image fails to load
                              e.currentTarget.style.display = 'none';
                              (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                          isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-700'
                        }`} style={{ display: comment.author?.avatar ? 'none' : 'flex' }}>
                          {(comment.author?.username || 'U').charAt(0).toUpperCase()}
                        </div>
                      
                      {/* Comment Content */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`font-semibold ${textColor}`}>{comment.author?.username || 'Unknown User'}</span>
                          <span className={`text-xs ${isDark ? textSubtle : 'text-gray-600'}`}>
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        <p className={`${isDark ? textMuted : 'text-gray-700'} leading-relaxed mb-3`}>
                          {comment.body}
                        </p>
                        
                        {/* Comment Actions */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <button 
                              onClick={() => handleLikeComment(comment._id)}
                              className={`flex items-center gap-1 text-sm transition-colors ${
                                comment.likedByUser 
                                  ? 'text-red-500' 
                                  : isDark 
                                  ? 'text-slate-400 hover:text-red-500' 
                                  : 'text-gray-500 hover:text-red-500'
                              }`}
                            >
                              <svg className="w-4 h-4" fill={comment.likedByUser ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                              </svg>
                              <span>{comment.likesCount || 0}</span>
                            </button>
                            <button 
                              onClick={() => {
                                if (!user) {
                                  // Dispatch custom event to trigger login modal
                                  window.dispatchEvent(new CustomEvent('openLoginModal'));
                                  return;
                                }
                                setReplyTo(replyTo === comment._id ? null : comment._id);
                              }}
                              className={`text-sm transition-colors ${
                                isDark 
                                  ? 'text-slate-400 hover:text-slate-300' 
                                  : 'text-gray-500 hover:text-gray-700'
                              }`}
                            >
                              Reply
                            </button>
                            {(comment.repliesCount ?? 0) > 0 && (
                              <span className={`text-xs ${textSubtle}`}>
                                {comment.repliesCount} {comment.repliesCount === 1 ? 'reply' : 'replies'}
                              </span>
                            )}
                          </div>
                          
                          {/* Delete Button - Show for owner or roles: admin/moderator/editor */}
                          {user && (comment.author._id === user._id || ['admin','moderator','editor'].includes((user as any).role)) && (
                            <button
                              onClick={() => handleDeleteComment(comment._id)}
                              className={`text-sm transition-colors hover:text-red-500 ${
                                isDark 
                                  ? 'text-slate-400 hover:text-red-500' 
                                  : 'text-gray-500 hover:text-red-500'
                              }`}
                              title="Delete comment"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>

                        {/* Reply Form */}
                        {replyTo === comment._id && user && (
                          <div className={`mt-4 p-4 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                            <div className="relative">
                              <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Write a reply... 😊"
                                className={`w-full p-3 pr-10 rounded-lg border ${
                                  isDark ? 'border-slate-600 bg-slate-800 text-white' : 'border-gray-300 bg-white text-gray-900'
                                } focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none`}
                                rows={3}
                                maxLength={300}
                              />
                              <button
                                type="button"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className={`emoji-picker absolute top-2 right-2 p-1 rounded transition-colors ${
                                  isDark ? 'hover:bg-slate-600 text-slate-300' : 'hover:bg-gray-100 text-gray-500'
                                }`}
                                title="Add emoji"
                              >
                                <span className="text-sm">😊</span>
                              </button>
                            </div>
                            
                            {/* Emoji Picker for Reply */}
                            {showEmojiPicker && (
                              <div className={`emoji-picker mt-2 p-2 rounded-lg border ${
                                isDark ? 'border-slate-600 bg-slate-800' : 'border-gray-300 bg-white'
                              }`}>
                                <div className="grid grid-cols-8 gap-1">
                                  {commonEmojis.map((emoji, index) => (
                                    <button
                                      key={index}
                                      type="button"
                                      onClick={() => {
                                        setReplyText(prev => prev + emoji);
                                        setShowEmojiPicker(false);
                                      }}
                                      className={`p-1 text-sm rounded transition-colors ${isDark ? 'hover:bg-slate-600' : 'hover:bg-gray-100'}`}
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="flex justify-between items-center mt-2">
                              <span className={`text-xs ${textSubtle}`}>
                                {replyText.length}/300 characters
                              </span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setReplyTo(null);
                                    setReplyText('');
                                  }}
                                  className={`px-3 py-1 rounded text-sm transition-colors ${
                                    isDark 
                                      ? 'text-slate-400 hover:text-slate-300' 
                                      : 'text-gray-500 hover:text-gray-700'
                                  }`}
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSubmitReply(comment._id)}
                                  disabled={!replyText.trim() || submittingReply}
                                  className={`px-4 py-1 rounded text-sm font-medium transition-all ${
                                    !replyText.trim() || submittingReply
                                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                      : isDark
                                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                                  }`}
                                >
                                  {submittingReply ? 'Posting...' : 'Reply'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="mt-4 space-y-3 pl-6 border-l-2 border-slate-200 dark:border-slate-600">
                            {comment.replies.map((reply) => (
                              <div key={reply._id} className="flex items-start gap-3">
                                {reply.author?.avatar ? (
                                  <img 
                                    src={`${API_BASE}${reply.author.avatar}`} 
                                    alt={reply.author?.username || 'User'} 
                                    className="w-8 h-8 rounded-full object-cover"
                                    onError={(e) => {
                                      // Fallback to letter avatar if image fails to load
                                      e.currentTarget.style.display = 'none';
                                      const nextEl = e.currentTarget.nextElementSibling as HTMLElement | null;
                                    if (nextEl) nextEl.style.display = 'flex'; }}
                                  />
                                ) : null}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                                  isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-700'
                                }`} style={{ display: reply.author?.avatar ? 'none' : 'flex' }}>
                                  {(reply.author?.username || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-sm font-semibold ${textColor}`}>{reply.author?.username || 'Unknown User'}</span>
                                    <span className={`text-xs ${isDark ? textSubtle : 'text-gray-600'}`}>
                                      {formatDate(reply.createdAt)}
                                    </span>
                                  </div>
                                  <p className={`text-sm ${isDark ? textMuted : 'text-gray-700'} leading-relaxed mb-2`}>
                                    {reply.body}
                                  </p>
                                  <div className="flex items-center justify-between">
                                    <button 
                                      onClick={() => handleLikeComment(reply._id)}
                                      className={`flex items-center gap-1 text-xs transition-colors ${
                                        reply.likedByUser 
                                          ? 'text-red-500' 
                                          : isDark 
                                          ? 'text-slate-400 hover:text-red-500' 
                                          : 'text-gray-500 hover:text-red-500'
                                      }`}
                                    >
                                      <svg className="w-3 h-3" fill={reply.likedByUser ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                      </svg>
                                      <span>{reply.likesCount || 0}</span>
                                    </button>
                                    
                                    {/* Delete Button for Reply - Show for owner or roles: admin/moderator/editor */}
                                    {user && (reply.author._id === user._id || ['admin','moderator','editor'].includes((user as any).role)) && (
                                      <button
                                        onClick={() => handleDeleteComment(reply._id, true, comment._id)}
                                        className={`text-xs transition-colors hover:text-red-500 ${
                                          isDark 
                                            ? 'text-slate-400 hover:text-red-500' 
                                            : 'text-gray-500 hover:text-red-500'
                                        }`}
                                        title="Delete reply"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Back to News Button */}
          <div className="flex justify-center mt-8">
            <Link 
              href="/news"
              className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 text-sm ${
                isDark 
                  ? 'border-slate-600 bg-slate-700 text-white hover:bg-slate-600' 
                  : 'border-gray-300 bg-gray-50 text-gray-900 hover:bg-gray-100'
              } border`}
            >
              Back to News
            </Link>
          </div>
        </main>

        {/* Advanced Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`${cardBg} rounded-xl shadow-2xl max-w-md w-full border ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    isDark ? 'bg-red-900/20 text-red-400' : 'bg-red-100 text-red-600'
                  }`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className={`text-lg font-semibold ${textColor}`}>
                      {commentToDelete?.isReply ? 'Delete Reply' : 'Delete Comment'}
                    </h3>
                    <p className={`text-sm ${textMuted}`}>
                      This action cannot be undone
                    </p>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="mb-6">
                  <p className={`${textMuted} leading-relaxed`}>
                    {commentToDelete?.isReply 
                      ? 'Are you sure you want to permanently delete this reply? This action will remove the reply from the conversation and cannot be undone.'
                      : 'Are you sure you want to permanently delete this comment? This action will remove the comment and all its replies from the conversation and cannot be undone.'
                    }
                  </p>
                  
                  {/* Additional warning for comments with replies */}
                  {!commentToDelete?.isReply && (
                    <div className={`mt-3 p-3 rounded-lg ${isDark ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'}`}>
                      <div className="flex items-start gap-2">
                        <svg className={`w-4 h-4 mt-0.5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <p className={`text-sm ${isDark ? 'text-yellow-300' : 'text-yellow-800'}`}>
                          <strong>Warning:</strong> If this comment has replies, they will also be permanently deleted.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Actions */}
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={cancelDeleteComment}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      isDark 
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteComment}
                    className="px-4 py-2 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {commentToDelete?.isReply ? 'Delete Reply' : 'Delete Comment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
