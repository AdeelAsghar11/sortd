import { NavLink } from 'react-router-dom';
import { Inbox, FolderOpen, Plus, Star, User } from 'lucide-react';

export default function BottomNav({ onAddClick }) {
  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-[58px] left-1/2 -translate-x-1/2 z-[60]">
        <button 
          onClick={onAddClick}
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all border-4 border-[#f5f7f9] bg-black text-white"
        >
          <Plus size={32} />
        </button>
      </div>

      {/* Navigation Dock */}
      <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center">
        <nav className="mx-4 w-full max-w-md h-[72px] bg-white rounded-[32px] neo-shadow grid grid-cols-5 items-center border border-black/5 overflow-hidden">
          <NavLink 
            to="/" 
            end
            className={({ isActive }) => `flex justify-center transition-colors ${isActive ? 'text-[#33b1ff]' : 'text-black/20'}`}
          >
            {({ isActive }) => <Inbox size={24} strokeWidth={isActive ? 2.5 : 2} />}
          </NavLink>

          <NavLink 
            to="/lists" 
            className={({ isActive }) => `flex justify-center transition-colors ${isActive ? 'text-[#33b1ff]' : 'text-black/20'}`}
          >
            {({ isActive }) => <FolderOpen size={24} strokeWidth={isActive ? 2.5 : 2} />}
          </NavLink>

          <div className="flex-1" /> {/* Spacer for FAB */}

          <NavLink 
            to="/favorites" 
            className={({ isActive }) => `flex justify-center transition-colors ${isActive ? 'text-[#33b1ff]' : 'text-black/20'}`}
          >
            {({ isActive }) => <Star size={24} strokeWidth={isActive ? 2.5 : 2} />}
          </NavLink>

          <NavLink 
            to="/settings" 
            className={({ isActive }) => `flex justify-center transition-colors ${isActive ? 'text-[#33b1ff]' : 'text-black/20'}`}
          >
            {({ isActive }) => <User size={24} strokeWidth={isActive ? 2.5 : 2} />}
          </NavLink>
        </nav>
      </div>
    </>
  );
}
