import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Smartphone, 
  ArrowRight,
  Instagram,
  Youtube,
  Image as ImageIcon
} from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#f5f7f9] text-[#1a1d1f] font-['Plus_Jakarta_Sans']">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-black/5 bg-white/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#33b1ff] flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-extrabold tracking-tight">Sortd</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-[13px] font-bold text-black/40 hover:text-black transition-colors">Sign In</Link>
            <Link 
              to="/signup" 
              className="px-5 py-2 bg-black text-white text-[13px] font-bold rounded-full hover:bg-zinc-800 transition-all active:scale-95"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="text-[52px] md:text-[72px] font-black tracking-tight mb-6 leading-[1.1]">
              Capture everything. <br /> 
              <span className="text-[#33b1ff]">Organize easily.</span>
            </h1>
            <p className="text-[17px] text-black/50 mb-10 max-w-xl mx-auto font-medium leading-relaxed">
              Your personal library for everything you find online. From recipes on Reels to tutorials on YouTube—Sortd keeps it all in one place.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link 
                to="/signup" 
                className="w-full sm:w-auto px-8 py-4 bg-[#33b1ff] text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 transition-all hover:bg-[#1a9fe8] active:scale-95 shadow-xl shadow-blue-500/20"
              >
                Create your account
                <ArrowRight className="w-5 h-5" />
              </Link>
              <button className="w-full sm:w-auto px-8 py-4 bg-white text-black font-extrabold rounded-2xl border border-black/5 transition-all active:scale-95 neo-shadow">
                See how it works
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<Instagram className="w-6 h-6 text-pink-500" />}
              title="Social Saver"
              description="Instantly save Instagram Reels and TikToks. We extract the core info so you never lose a cool idea again."
            />
            <FeatureCard 
              icon={<Youtube className="w-6 h-6 text-red-500" />}
              title="Video Summaries"
              description="Don't have time to watch the whole video? We'll give you the highlights and key takeaways in seconds."
            />
            <FeatureCard 
              icon={<ImageIcon className="w-6 h-6 text-[#33b1ff]" />}
              title="Screenshot OCR"
              description="Snap it, save it. Every screenshot becomes searchable text, making your images more useful than ever."
            />
          </div>
        </div>
      </section>

      {/* App Preview Section */}
      <section className="py-24 px-6 bg-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1">
            <h2 className="text-[32px] font-black mb-6 leading-tight">Install it everywhere.</h2>
            <p className="text-black/50 text-[16px] mb-8 font-medium leading-relaxed">
              Sortd works on your phone exactly like an app. Save content directly from your browser's share menu and access it anywhere.
            </p>
            <div className="flex items-center gap-8">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase text-black/20 tracking-widest">Supports</span>
                <div className="flex gap-4 opacity-30">
                  <Smartphone className="w-6 h-6" />
                  <span className="font-bold">iOS • Android • Desktop</span>
                </div>
              </div>
            </div>
          </div>
          <div className="w-full max-w-sm aspect-[9/16] bg-[#f5f7f9] rounded-[48px] border-[12px] border-white neo-shadow relative overflow-hidden">
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-6 bg-white rounded-full z-10" />
            <div className="p-8 pt-16 flex flex-col gap-4">
              <div className="w-full h-32 bg-white rounded-2xl animate-pulse" />
              <div className="w-3/4 h-6 bg-white rounded-lg animate-pulse" />
              <div className="w-full h-4 bg-white/50 rounded-lg animate-pulse" />
              <div className="w-full h-4 bg-white/50 rounded-lg animate-pulse" />
              <div className="w-full h-32 bg-white rounded-2xl animate-pulse opacity-50" />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 bg-[#f5f7f9] border-t border-black/5">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#33b1ff] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-black">Sortd</span>
          </div>
          <div className="flex gap-8 text-[13px] font-bold text-black/30">
            <a href="#" className="hover:text-black transition-colors">Privacy</a>
            <a href="#" className="hover:text-black transition-colors">Terms</a>
            <a href="#" className="hover:text-black transition-colors">Twitter</a>
          </div>
          <p className="text-[13px] font-bold text-black/20">© 2026 Sortd. Happy organizing.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="p-8 rounded-[32px] bg-white border border-black/5 neo-shadow transition-all hover:-translate-y-1">
      <div className="w-12 h-12 rounded-2xl bg-[#f5f7f9] flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-lg font-black mb-3">{title}</h3>
      <p className="text-[14px] text-black/40 font-medium leading-relaxed">{description}</p>
    </div>
  );
}
