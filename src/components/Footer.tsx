'use client';

import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-slate-900/95 backdrop-blur-md border-t border-white/10 border-b border-white/10 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 via-transparent to-purple-900/20 pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          
          {/* Logo and Tagline Section */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center mb-4">
              <div className="relative w-[120px] h-[44px] md:w-[173px] md:h-[64px] rounded-[11px] overflow-hidden">
                <Image
                  src="/logo.png"
                  alt="ملعبك - Mal'abak"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            <p className="text-slate-300 text-sm">
              All football News in One place
            </p>
          </div>

          {/* Company Links */}
          <div className="sm:col-span-1 lg:col-span-1">
            <h3 className="text-white font-heading font-semibold mb-4 text-sm md:text-base">Company</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-slate-300 hover:text-blue-400 transition-colors duration-200 text-sm">
                  Home
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-300 hover:text-blue-400 transition-colors duration-200 text-sm">
                  Matches
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-300 hover:text-blue-400 transition-colors duration-200 text-sm">
                  Champions
                </a>
              </li>
            </ul>
          </div>

          {/* Support Links */}
          <div className="sm:col-span-1 lg:col-span-1">
            <h3 className="text-white font-heading font-semibold mb-4 text-sm md:text-base">Support</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-slate-300 hover:text-blue-400 transition-colors duration-200 text-sm">
                  FAQs
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-300 hover:text-blue-400 transition-colors duration-200 text-sm">
                  Contact
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-300 hover:text-blue-400 transition-colors duration-200 text-sm">
                  Terms & Conditions
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-300 hover:text-blue-400 transition-colors duration-200 text-sm">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>

          {/* Social Media Section */}
          <div className="sm:col-span-2 lg:col-span-1">
            <h3 className="text-white font-heading font-semibold mb-4 text-sm md:text-base">Follow Us</h3>
            <div className="flex flex-wrap gap-3">
              {/* Facebook */}
              <a 
                href="https://web.facebook.com/Mal3bak/" 
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center text-white transition-colors duration-200"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>


              {/* X (Twitter) */}
              <a 
                href="https://x.com/mal3abak1?t=NbTyl_ncKQnsZTPFtGb43Q&s=09" 
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-black hover:bg-gray-800 rounded-lg flex items-center justify-center text-white transition-colors duration-200"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>

              {/* YouTube */}
              <a 
                href="https://www.youtube.com/@mal3abak" 
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-red-600 hover:bg-red-700 rounded-lg flex items-center justify-center text-white transition-colors duration-200"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Copyright Section */}
        <div className="border-t border-slate-700 mt-6 md:mt-8 pt-6 md:pt-8">
          <div className="text-center">
            <p className="text-slate-300 text-xs md:text-sm">
              © {new Date().getFullYear()} All Rights Reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
