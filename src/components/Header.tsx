'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { user, token, loading, login, signup, logout, refresh } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [country, setCountry] = useState('');
  const [fullName, setFullName] = useState('');
  const [countries, setCountries] = useState<{ name: string; code: string; flag: string }[]>([]);
  const [countryOpen, setCountryOpen] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5050';
  const pathname = usePathname();
  const router = useRouter();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const openLogin = () => { setAuthMode('login'); setIsLoginOpen(true); };
  const closeLogin = () => setIsLoginOpen(false);
  const openSignupInline = () => { setAuthMode('signup'); setIsLoginOpen(true); };

  function handleLogout() {
    logout();
    setUserMenuOpen(false);
    setIsMobileMenuOpen(false);
    router.push('/');
  }

  useEffect(() => { 
    // Only refresh if we don't have user data yet
    if (!user && token) {
      refresh().catch(() => {}); 
    }
  }, [user, token]);

  // Listen for custom event to open login modal
  useEffect(() => {
    const handleOpenLoginModal = () => {
      setAuthMode('login');
      setIsLoginOpen(true);
    };

    window.addEventListener('openLoginModal', handleOpenLoginModal);
    
    return () => {
      window.removeEventListener('openLoginModal', handleOpenLoginModal);
    };
  }, []);

  // Handle mobile menu overlay and body scroll
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Handle swipe gestures for mobile menu
  useEffect(() => {
    if (!isMobileMenuOpen) return;

    let startX = 0;
    let startY = 0;
    let isSwipe = false;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isSwipe = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSwipe) {
        const deltaX = e.touches[0].clientX - startX;
        const deltaY = e.touches[0].clientY - startY;
        
        // Check if it's a horizontal swipe
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
          isSwipe = true;
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isSwipe) {
        const deltaX = e.changedTouches[0].clientX - startX;
        // Swipe right to close (since menu is on the right)
        if (deltaX > 100) {
          setIsMobileMenuOpen(false);
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobileMenuOpen]);

  // Fetch countries list (name + SVG flag) once
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,flags');
        const data = await res.json();
        if (!mounted || !Array.isArray(data)) return;
        const list = data
          .map((c: any) => ({ name: c?.name?.common as string, code: c?.cca2 as string, flag: c?.flags?.svg as string }))
          .filter((c: any) => c.name && c.code && c.flag)
          .sort((a: any, b: any) => a.name.localeCompare(b.name));
        setCountries(list);
      } catch {}
    }
    load();
    return () => { mounted = false; };
  }, []);

  async function onLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      await login(email, password);
      setIsLoginOpen(false);
      setIsMobileMenuOpen(false);
    } catch (err: any) {
      setLoginError(err?.message || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  }

  async function onSignupSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSignupLoading(true);
    setSignupError(null);
    try {
      await signup(username, email, password, country, fullName);
      setAuthMode('login');
      setIsLoginOpen(true);
    } catch (err: any) {
      setSignupError(err?.message || 'Signup failed');
    } finally {
      setSignupLoading(false);
    }
  }

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Live', path: '/matches' },
    { name: 'Today', path: '/today' },
    { name: 'News', path: '/news' },
    { name: 'Leagues', path: '/leagues' },
    { name: 'Teams', path: '/teams' },
    { name: 'Top Players', path: '/players' }
  ];

  return (
    <>
      <style jsx global>{`
        .glass-morphism {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .glass-morphism-light {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(0, 0, 0, 0.2);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .mobile-menu-overlay {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          background: rgba(0, 0, 0, 0.5) !important;
          backdrop-filter: blur(4px) !important;
          z-index: 9999 !important;
          animation: fadeIn 0.3s ease-out !important;
        }
        
        .mobile-menu-panel {
          animation: slideInRight 0.3s ease-out !important;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideInRight {
          from { 
            transform: translateX(100%);
            opacity: 0;
          }
          to { 
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .mobile-menu-item {
          transition: all 0.2s ease-in-out;
        }
        
        .mobile-menu-item:hover {
          transform: translateX(4px);
        }
        
        .mobile-menu-item:active {
          transform: scale(0.98);
        }
        
        /* Custom scrollbar for modal */
        .modal-scroll::-webkit-scrollbar {
          width: 6px;
        }
        
        .modal-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .modal-scroll::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.3);
          border-radius: 3px;
        }
        
        .modal-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.5);
        }
        
        /* Dark theme scrollbar */
        .dark .modal-scroll::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.4);
        }
        
        .dark .modal-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 0.6);
        }
        
        /* Firefox scrollbar */
        .modal-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 163, 184, 0.3) transparent;
        }
        
        .dark .modal-scroll {
          scrollbar-color: rgba(100, 116, 139, 0.4) transparent;
        }
      `}</style>
      
    <header className="relative w-full h-[80px] flex items-center justify-between px-4 md:px-16 bg-slate-900/95 backdrop-blur-md border-b border-white/10 z-30">
      {/* Logo Section */}
      <div className="flex items-center flex-shrink-0">
        <Link href="/" className="relative w-[120px] h-[44px] md:w-[173px] md:h-[64px] rounded-[11px] overflow-hidden bg-blur-sm">
          <Image
            src="/logo.png"
            alt="ملعبك - Mal'abak"
            fill
            sizes="(max-width: 768px) 120px, 173px"
            className="object-cover"
            priority
          />
        </Link>
      </div>

      {/* Desktop Navigation Links */}
      <nav className="hidden md:flex items-center gap-1 lg:gap-2">
        {navItems.map((item, index) => (
          <Link
            key={item.name}
            href={item.path}
            className={`relative px-2 lg:px-4 py-2 text-white font-heading font-medium transition-all duration-300 cursor-pointer rounded-lg text-sm lg:text-base ${
              pathname === item.path
                ? 'bg-gradient-to-r from-green-600/20 to-emerald-600/20 text-white border border-green-500/30 shadow-lg' 
                : 'hover:bg-white/10 hover:text-gray-100 hover:border border-white/20 hover:shadow-md'
            } backdrop-blur-sm`}
          >
            <span className="relative z-10">{item.name}</span>
            {pathname === item.path && (
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg animate-pulse"></div>
            )}
          </Link>
        ))}
      </nav>

      {/* Right Side Actions */}
      <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4 flex-shrink-0">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 sm:p-3 text-white hover:text-gray-300 transition-all duration-300 rounded-lg glass-morphism border border-white/20 hover:border-white/30 hover:shadow-lg hover:scale-105 backdrop-blur-sm"
          aria-label="Toggle cards theme"
        >
          {theme === 'dark' ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
        {/* Auth area */}
        {loading ? (
          <div className="hidden md:flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 animate-pulse"></div>
          </div>
        ) : user ? (
          <div className="hidden md:flex items-center gap-3 relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="p-2 text-white hover:text-gray-300"
              aria-label="User menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </button>
            {userMenuOpen && (
              <div className={`absolute right-0 top-12 w-56 rounded-2xl glass-morphism border border-white/20 ${theme === 'dark' ? 'bg-slate-800/95' : 'bg-white/95'} shadow-2xl backdrop-blur-md z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200`}>
                {/* User Info Header */}
                <div className={`px-4 py-4 border-b ${theme === 'dark' ? 'border-slate-700/50' : 'border-gray-200/50'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm border-2 border-white/20">
                      {user?.avatar ? (
                        <img 
                          src={`${API_BASE}${user.avatar}`} 
                          alt={user.username}
                          className="w-10 h-10 object-cover rounded-full border-2 border-white/20"
                        />
                      ) : (
                        user?.username?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {user?.fullName || user?.username || user?.email || 'User'}
                      </p>
                      <p className={`text-xs truncate ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                        {user?.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  {user.role === 'admin' && (
                    <Link 
                      href="/admin" 
                      className={`group flex items-center gap-3 px-4 py-3 text-sm transition-all duration-200 ${theme === 'dark' ? 'text-slate-200 hover:bg-slate-700/50 hover:text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 ${theme === 'dark' ? 'bg-slate-700/50 group-hover:bg-blue-600/20' : 'bg-gray-100 group-hover:bg-blue-100'}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="18" height="18" x="3" y="3" rx="2"/>
                          <path d="M9 3v18"/>
                          <path d="M14 9h4"/>
                          <path d="M14 13h4"/>
                          <path d="M14 17h4"/>
                        </svg>
                      </div>
                      <span className="font-medium">Admin Dashboard</span>
                      <div className={`ml-auto text-xs px-2 py-1 rounded-full ${theme === 'dark' ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                        Admin
                      </div>
                    </Link>
                  )}
                  
                  <Link 
                    href="/profile" 
                    className={`group flex items-center gap-3 px-4 py-3 text-sm transition-all duration-200 ${theme === 'dark' ? 'text-slate-200 hover:bg-slate-700/50 hover:text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 ${theme === 'dark' ? 'bg-slate-700/50 group-hover:bg-green-600/20' : 'bg-gray-100 group-hover:bg-green-100'}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                    </div>
                    <span className="font-medium">Profile</span>
                  </Link>

                  <div className={`mx-4 my-2 h-px ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-200/50'}`}></div>

                  <button 
                    onClick={handleLogout} 
                    className={`group w-full flex items-center gap-3 px-4 py-3 text-sm transition-all duration-200 ${theme === 'dark' ? 'text-slate-200 hover:bg-red-600/20 hover:text-red-400' : 'text-gray-700 hover:bg-red-50 hover:text-red-600'}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 ${theme === 'dark' ? 'bg-slate-700/50 group-hover:bg-red-600/20' : 'bg-gray-100 group-hover:bg-red-100'}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16,17 21,12 16,7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                      </svg>
                    </div>
                    <span className="font-medium">Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={openLogin}
            className={`hidden md:block px-6 py-2 rounded-full font-semibold transition-all duration-300 text-sm ${
              theme === 'dark'
                ? 'border-slate-600 bg-slate-700 text-white hover:bg-slate-600'
                : 'border-gray-300 bg-gray-800 text-white hover:bg-gray-700'
            } border`}
          >
            Login
          </button>
        )}

        {/* Mobile Menu Button */}
        <button
          onClick={toggleMobileMenu}
          className="md:hidden p-2 sm:p-3 text-white hover:text-gray-300 transition-all duration-300 rounded-lg glass-morphism border border-white/20 hover:border-white/30 hover:shadow-lg hover:scale-105 backdrop-blur-sm"
          aria-label="Toggle mobile menu"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {isMobileMenuOpen ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <path d="M3 12h18M3 6h18M3 18h18" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-menu-overlay lg:hidden" onClick={toggleMobileMenu}>
          <div className={`mobile-menu-panel absolute right-0 top-0 h-full w-80 sm:w-96 ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} shadow-2xl z-[10000] border-l ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`} onClick={(e) => e.stopPropagation()}>
            <div className="h-full flex flex-col">
              {/* Mobile Header */}
              <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="relative w-[120px] h-[44px] rounded-[11px] overflow-hidden">
                    <Image
                      src="/logo.png"
                      alt="ملعبك - Mal'abak"
                      fill
                      sizes="120px"
                      className="object-cover"
                    />
                  </div>
                  <button
                    onClick={toggleMobileMenu}
                    className={`p-2 rounded-full transition-colors duration-200 ${theme === 'dark' ? 'hover:bg-slate-700 text-gray-300' : 'hover:bg-gray-100 text-gray-500'}`}
                    aria-label="Close menu"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Mobile Navigation Links */}
              <div className="flex-1 px-4 py-3">
                <nav className="grid grid-cols-1 gap-2">
                  {navItems.map((item, index) => (
                    <Link
                      key={item.name}
                      href={item.path}
                      className={`mobile-menu-item block font-heading font-medium py-3 px-4 rounded-lg transition-all duration-200 cursor-pointer text-sm ${
                        pathname === item.path
                          ? `${theme === 'dark' ? 'bg-slate-800 border-2 border-green-500 text-white' : 'bg-gray-100 border-2 border-green-500 text-gray-900'}` 
                          : `${theme === 'dark' ? 'text-white hover:bg-slate-700/50 hover:text-gray-100' : 'text-gray-800 hover:bg-gray-100 hover:text-gray-900'}`
                      }`}
                      onClick={toggleMobileMenu}
                    >
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </nav>
              </div>

              {/* Mobile auth: show login or logout */}
              <div className="flex-shrink-0 p-3 border-t border-gray-200 dark:border-slate-700">
                {loading ? (
                  <div className="w-full h-12 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse"></div>
                ) : user ? (
                  <div className="space-y-4">
                    {/* User Info */}
                    <div className={`p-4 rounded-2xl border border-white/10 glass-morphism ${
                      theme === 'dark' 
                        ? 'bg-gradient-to-r from-blue-600/10 to-purple-600/10' 
                        : 'bg-gradient-to-r from-blue-50/50 to-purple-50/50'
                    }`}>
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg border-2 border-white/20 shadow-lg">
                          {user?.avatar ? (
                            <img 
                              src={`${API_BASE}${user.avatar}`} 
                              alt={user.username}
                              className="w-12 h-12 object-cover rounded-full border-2 border-white/20"
                            />
                          ) : (
                            user?.username?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-base truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {user?.username || user?.email || 'User'}
                          </p>
                          <p className={`text-sm truncate ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                            {user?.email}
                          </p>
                          {user?.role === 'admin' && (
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                              theme === 'dark' 
                                ? 'bg-blue-600/20 text-blue-400' 
                                : 'bg-blue-100 text-blue-600'
                            }`}>
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                              Admin
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      {user.role === 'admin' && (
                        <Link
                          href="/admin"
                          className="mobile-menu-item group flex items-center space-x-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-4 rounded-2xl font-semibold text-center transition-all duration-200 shadow-lg hover:shadow-xl border border-blue-500/20"
                          onClick={toggleMobileMenu}
                        >
                          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-400/30 transition-colors duration-200">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <rect width="18" height="18" x="3" y="3" rx="2"/>
                              <path d="M9 3v18"/>
                              <path d="M14 9h4"/>
                              <path d="M14 13h4"/>
                              <path d="M14 17h4"/>
                            </svg>
                          </div>
                          <div className="flex-1 text-left">
                            <div className="text-base font-bold">Admin Dashboard</div>
                            <div className="text-xs opacity-90">Manage system settings</div>
                          </div>
                          <svg className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      )}
                      
                      <Link
                        href="/profile"
                        className={`mobile-menu-item group flex items-center space-x-3 px-4 py-4 rounded-2xl font-semibold text-center transition-all duration-200 border ${
                          theme === 'dark' 
                            ? 'bg-slate-700/50 hover:bg-slate-600/50 text-white border-slate-600/50 hover:border-slate-500/50' 
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={toggleMobileMenu}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200 ${
                          theme === 'dark' 
                            ? 'bg-slate-600/50 group-hover:bg-green-600/20' 
                            : 'bg-gray-200 group-hover:bg-green-100'
                        }`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div className="flex-1 text-left">
                          <div className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Profile</div>
                          <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>View and edit profile</div>
                        </div>
                        <svg className={`w-5 h-5 opacity-60 group-hover:opacity-100 transition-opacity ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                      
                      <button 
                        onClick={handleLogout}
                        className="mobile-menu-item group flex items-center space-x-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 py-4 rounded-2xl font-semibold transition-all duration-200 cursor-pointer text-center shadow-lg hover:shadow-xl border border-red-500/20"
                      >
                        <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center group-hover:bg-red-400/30 transition-colors duration-200">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-base font-bold">Logout</div>
                          <div className="text-xs opacity-90">Sign out of your account</div>
                        </div>
                        <svg className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={openLogin}
                    className={`mobile-menu-item flex items-center justify-center space-x-2 w-full px-4 py-3 rounded-lg font-medium transition-all duration-300 text-center ${
                      theme === 'dark'
                        ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'
                        : 'bg-gray-800 hover:bg-gray-700 text-white'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    <span className="text-sm">Login</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>

    {/* Auth Modal (Login/Signup) */}
    {isLoginOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" onClick={closeLogin} />
        <div className={`relative w-full max-w-sm sm:max-w-md rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto modal-scroll ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} ${theme === 'dark' ? 'text-white' : 'text-gray-900'} border ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{authMode === 'login' ? 'Log in' : 'Sign up'}</h2>
              <button onClick={closeLogin} aria-label="Close" className={`${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>✕</button>
            </div>
            {authMode === 'login' && (
              <>
                <form onSubmit={onLoginSubmit} className="space-y-3">
                  <div>
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className={`w-full rounded-full border px-3 sm:px-4 py-2 sm:py-3 outline-none transition-colors text-sm sm:text-base ${
                        theme === 'dark' 
                          ? 'border-slate-600 bg-slate-700 text-white placeholder-gray-400 focus:border-blue-500 hover:bg-slate-600' 
                          : 'border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-500 focus:border-blue-500 hover:bg-gray-100'
                      }`}
                    />
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className={`w-full rounded-full border px-3 sm:px-4 py-2 sm:py-3 pr-10 outline-none transition-colors text-sm sm:text-base ${
                        theme === 'dark' 
                          ? 'border-slate-600 bg-slate-700 text-white placeholder-gray-400 focus:border-blue-500 hover:bg-slate-600' 
                          : 'border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-500 focus:border-blue-500 hover:bg-gray-100'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                    <div className={`text-right text-xs mt-1 cursor-pointer ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>forget password</div>
                  </div>
                  {loginError && (
                    <div className="rounded-lg border border-red-500/50 bg-red-500/10 text-red-200 px-3 py-2 text-sm">{loginError}</div>
                  )}
                  <button type="submit" disabled={loginLoading} className={`w-full rounded-full py-2 sm:py-3 font-semibold disabled:opacity-60 transition-all duration-300 text-sm sm:text-base ${
                    theme === 'dark'
                      ? 'border-slate-600 bg-slate-700 text-white hover:bg-slate-600'
                      : 'border-gray-300 bg-gray-50 text-gray-900 hover:bg-gray-100'
                  }`}>
                    {loginLoading ? 'Logging in...' : 'Login'}
                  </button>
                </form>
                <div className={`text-center text-xs sm:text-sm mt-2 sm:mt-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  don't have account ? <button onClick={() => setAuthMode('signup')} className="text-blue-600 hover:text-blue-500">Sign up</button>
                </div>
              </>
            )}

            {authMode === 'signup' && (
              <>
                <form onSubmit={onSignupSubmit} className="space-y-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={`w-full rounded-full border px-3 sm:px-4 py-2 sm:py-3 outline-none transition-colors text-sm sm:text-base ${
                        theme === 'dark' 
                          ? 'border-slate-600 bg-slate-700 text-white placeholder-gray-400 focus:border-blue-500 hover:bg-slate-600' 
                          : 'border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-500 focus:border-blue-500 hover:bg-gray-100'
                      }`}
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className={`w-full rounded-full border px-3 sm:px-4 py-2 sm:py-3 outline-none transition-colors text-sm sm:text-base ${
                        theme === 'dark' 
                          ? 'border-slate-600 bg-slate-700 text-white placeholder-gray-400 focus:border-blue-500 hover:bg-slate-600' 
                          : 'border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-500 focus:border-blue-500 hover:bg-gray-100'
                      }`}
                    />
                  </div>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setCountryOpen((v) => !v)}
                      className={`w-full rounded-full border px-3 sm:px-4 py-2 sm:py-3 text-left flex items-center justify-between transition-colors text-sm sm:text-base ${
                        theme === 'dark' 
                          ? 'border-slate-600 bg-slate-700 text-white hover:bg-slate-600' 
                          : 'border-gray-300 bg-gray-50 text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {country ? (
                          (() => {
                            const sel = countries.find((x) => x.name === country);
                            return sel ? (<img src={sel.flag} alt="flag" className="w-5 h-5" />) : null;
                          })()
                        ) : null}
                        {country || 'Select country'}
                      </span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </button>
                    {countryOpen && (
                      <div className={`absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border shadow-lg ${
                        theme === 'dark' 
                          ? 'border-slate-600 bg-slate-800 text-white' 
                          : 'border-gray-300 bg-white text-black'
                      }`}>
                        {countries.map((c) => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => { setCountry(c.name); setCountryOpen(false); }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                              theme === 'dark'
                                ? `hover:bg-slate-700 ${country === c.name ? 'bg-slate-700' : ''}`
                                : `hover:bg-gray-100 ${country === c.name ? 'bg-gray-100' : ''}`
                            }`}
                          >
                            <img src={c.flag} alt="flag" className="w-5 h-5" />
                            <span>{c.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className={`w-full rounded-full border px-3 sm:px-4 py-2 sm:py-3 outline-none transition-colors text-sm sm:text-base ${
                        theme === 'dark' 
                          ? 'border-slate-600 bg-slate-700 text-white placeholder-gray-400 focus:border-blue-500 hover:bg-slate-600' 
                          : 'border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-500 focus:border-blue-500 hover:bg-gray-100'
                      }`}
                    />
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className={`w-full rounded-full border px-3 sm:px-4 py-2 sm:py-3 pr-10 outline-none transition-colors text-sm sm:text-base ${
                        theme === 'dark' 
                          ? 'border-slate-600 bg-slate-700 text-white placeholder-gray-400 focus:border-blue-500 hover:bg-slate-600' 
                          : 'border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-500 focus:border-blue-500 hover:bg-gray-100'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {signupError && (
                    <div className="rounded-lg border border-red-500/50 bg-red-500/10 text-red-200 px-3 py-2 text-sm">{signupError}</div>
                  )}
                  <button type="submit" disabled={signupLoading} className={`w-full rounded-full py-2 sm:py-3 font-semibold disabled:opacity-60 transition-all duration-300 text-sm sm:text-base ${
                    theme === 'dark'
                      ? 'border-slate-600 bg-slate-700 text-white hover:bg-slate-600'
                      : 'border-gray-300 bg-gray-50 text-gray-900 hover:bg-gray-100'
                  }`}>
                    {signupLoading ? 'Signing up...' : 'Sign up'}
                  </button>
                </form>
                <div className={`text-center text-xs sm:text-sm mt-2 sm:mt-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Already have an account? <button onClick={() => setAuthMode('login')} className="text-blue-600 hover:text-blue-500">Log in</button>
                </div>
              </>
            )}

            <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
              <button className={`w-full flex items-center gap-2 sm:gap-3 rounded-full h-9 sm:h-11 px-3 sm:px-4 border transition-colors text-sm sm:text-base ${
                theme === 'dark' 
                  ? 'border-slate-600 bg-slate-700 text-white hover:bg-slate-600' 
                  : 'border-gray-300 bg-gray-50 text-gray-900 hover:bg-gray-100'
              }`}>
                <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.26-1.66 3.7-5.5 3.7-3.31 0-6-2.73-6-6.1s2.69-6.1 6-6.1c1.89 0 3.16.8 3.88 1.49l2.64-2.55C16.81 3.1 14.62 2 12 2 6.99 2 3 6.03 3 11.1S6.99 20.2 12 20.2c6.94 0 8.25-5.9 7.68-9.02H12z"/>
                </svg>
                <span className="text-sm">Sign up with Google</span>
              </button>
              <button className={`w-full flex items-center gap-2 sm:gap-3 rounded-full h-9 sm:h-11 px-3 sm:px-4 border transition-colors text-sm sm:text-base ${
                theme === 'dark' 
                  ? 'border-slate-600 bg-slate-700 text-white hover:bg-slate-600' 
                  : 'border-gray-300 bg-gray-50 text-gray-900 hover:bg-gray-100'
              }`}>
                <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#1877F2" d="M22.675 0h-21.35C.595 0 0 .593 0 1.326v21.348C0 23.406.595 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.657-4.788 1.324 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.796.715-1.796 1.763v2.313h3.59l-.467 3.622h-3.123V24h6.116C23.406 24 24 23.406 24 22.674V1.326C24 .593 23.406 0 22.675 0z"/>
                </svg>
                <span className="text-sm">Sign up with Facebook</span>
              </button>
              <button className={`w-full flex items-center gap-2 sm:gap-3 rounded-full h-9 sm:h-11 px-3 sm:px-4 border transition-colors text-sm sm:text-base ${
                theme === 'dark' 
                  ? 'border-slate-600 bg-slate-700 text-white hover:bg-slate-600' 
                  : 'border-gray-300 bg-gray-50 text-gray-900 hover:bg-gray-100'
              }`}>
                <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#000" d="M16.365 1.43c0 1.14-.438 2.232-1.169 3.051-.748.836-1.983 1.486-3.135 1.401-.135-1.101.416-2.28 1.133-3.033.779-.81 2.138-1.387 3.171-1.419zm4.043 16.005c-.088.204-.17.41-.275.606-.527.981-1.064 1.956-1.905 2.746-.744.697-1.757 1.339-2.807 1.344-1.072.005-1.352-.638-2.812-.63-1.46.007-1.766.641-2.84.636-1.05-.004-1.854-.596-2.599-1.293-1.8-1.69-3.198-4.787-2.99-7.636.141-2.003 1.12-3.846 2.496-4.871 1.06-.79 2.357-1.2 3.607-1.219 1.087-.018 2.114.661 2.812.661.69 0 1.927-.816 3.245-.696.553.023 2.313.223 3.406 1.823-3.08 1.666-2.588 6.008.504 7.329z"/>
                </svg>
                <span className="text-sm">Sign up with Apple</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
