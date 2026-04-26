import { useState, useEffect } from 'react';
import { 
  Bell, 
  Lock, 
  LogOut, 
  ChevronRight,
  Download, 
  Info,
  Star
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

export default function Settings() {
  const { user: authUser, signOut } = useAuth();
  const [user, setUser] = useState({
    name: authUser?.email?.split('@')[0] || 'User',
    email: authUser?.email || '',
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser?.id}`
  });

  const [editing, setEditing] = useState(false);
  const [tempUser, setTempUser] = useState({...user});
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallInfo, setShowInstallInfo] = useState(false);
  const [notifPermission, setNotifPermission] = useState(Notification.permission);
  const [notifsActive, setNotifsActive] = useState(() => {
    return localStorage.getItem('sortd_notifications_active') === 'true';
  });

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const toggleNotifications = async () => {
    if (!notifsActive) {
      if (!("Notification" in window)) {
        alert("This browser does not support desktop notifications");
        return;
      }
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission === 'granted') {
        setNotifsActive(true);
        localStorage.setItem('sortd_notifications_active', 'true');
        new Notification("Notifications Enabled!", {
          body: "You will now receive alerts for your content captures.",
          icon: "/pwa-192.png"
        });
      } else {
        alert("Notification permission was denied. Please enable it in your browser settings.");
      }
    } else {
      setNotifsActive(false);
      localStorage.setItem('sortd_notifications_active', 'false');
    }
  };

  const handleSave = () => {
    setUser(tempUser);
    setEditing(false);
  };

  const avatars = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Sortd',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Jasper',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Lilly',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver',
  ];

  return (
    <div className="px-6 pt-12 pb-32 max-w-[680px] mx-auto">
      <h1 className="text-[28px] font-extrabold tracking-tight mb-8">Profile</h1>

      {/* Profile Card */}
      <div className="bg-white rounded-[32px] p-8 neo-shadow flex flex-col items-center mb-6">
        <div className="relative mb-4">
          <img 
            src={tempUser.avatar} 
            className="w-24 h-24 rounded-full border-4 border-[#f5f7f9] shadow-inner" 
            alt="profile" 
          />
        </div>
        
        {editing ? (
          <div className="w-full space-y-4 mt-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-black/20 mb-4">Choose your Avatar</p>
            <div className="flex gap-2 justify-center flex-wrap mb-6">
              {avatars.map(av => (
                <button 
                  key={av} 
                  onClick={() => setTempUser({...tempUser, avatar: av})}
                  className={`w-12 h-12 rounded-full border-2 transition-all p-0.5 ${tempUser.avatar === av ? 'border-[#33b1ff] scale-110 shadow-md' : 'border-transparent opacity-40 hover:opacity-100'}`}
                >
                  <img src={av} alt="avatar option" className="rounded-full bg-[#f5f7f9]" />
                </button>
              ))}
            </div>
            <div className="space-y-3">
              <input 
                className="input-flat" 
                placeholder="Name" 
                value={tempUser.name} 
                onChange={e => setTempUser({...tempUser, name: e.target.value})}
              />
              <input 
                className="input-flat" 
                placeholder="Email" 
                value={tempUser.email} 
                onChange={e => setTempUser({...tempUser, email: e.target.value})}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <button onClick={() => setEditing(false)} className="flex-1 py-4 bg-[#f5f7f9] rounded-2xl font-bold text-sm text-black/40">Cancel</button>
              <button onClick={handleSave} className="flex-1 btn-primary text-sm shadow-lg shadow-[#33b1ff]/20">Save</button>
            </div>
          </div>
        ) : (
          <div className="text-center flex flex-col items-center">
            <h2 className="text-xl font-extrabold tracking-tight">{user.name}</h2>
            <p className="text-sm font-bold text-black/30 mt-1">{user.email}</p>
            
            <button 
              onClick={() => setEditing(true)} 
              className="mt-6 px-6 py-2 bg-[#f5f7f9] rounded-full text-xs font-bold uppercase tracking-widest text-black/50 hover:bg-[#33b1ff] hover:text-white hover:shadow-lg hover:shadow-[#33b1ff]/20 transition-all"
            >
              Edit Profile
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-black/30 ml-2 mb-4">App Settings</h3>
        
        {/* PWA Install Item */}
        <button 
          onClick={deferredPrompt ? handleInstallClick : () => setShowInstallInfo(!showInstallInfo)}
          className="w-full bg-[#33b1ff] rounded-[24px] p-5 flex items-center justify-between shadow-lg shadow-[#33b1ff]/20 active:scale-[0.98] transition-all text-white"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/20">
              <Download size={20} strokeWidth={2.5} />
            </div>
            <div className="text-left">
              <span className="font-extrabold text-[15px] block">Install Sortd App</span>
              <span className="text-[10px] font-bold opacity-70 uppercase tracking-wider">Fast access from home screen</span>
            </div>
          </div>
          <ChevronRight size={18} className="opacity-40" />
        </button>

        {showInstallInfo && !deferredPrompt && (
          <div className="bg-white rounded-[24px] p-5 neo-shadow animate-in slide-in-from-top-2 duration-300">
            <div className="flex gap-3 mb-2">
              <Info size={18} className="text-[#33b1ff] shrink-0" />
              <p className="text-[13px] font-bold text-black/70 leading-relaxed">
                To install Sortd on your home screen:
              </p>
            </div>
            <ul className="text-[12px] font-bold text-black/40 space-y-2 ml-7 list-disc">
              <li>Chrome/Android: Tap three dots ⋮ → Install app</li>
              <li>iOS Safari: Tap Share button ↑ → Add to Home Screen</li>
              <li>Edge: Tap Settings → Apps → Install this site</li>
            </ul>
          </div>
        )}

        <div className="pt-4" />

        <Link to="/favorites" className="w-full bg-white rounded-[24px] p-5 flex items-center justify-between neo-shadow active:scale-[0.98] transition-all">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-yellow-50 text-yellow-500">
              <Star size={18} />
            </div>
            <span className="font-extrabold text-[15px]">Starred Clips</span>
          </div>
          <ChevronRight size={16} className="text-black/10" />
        </Link>

        <div className="w-full bg-white rounded-[24px] p-5 flex items-center justify-between neo-shadow">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-blue-50 text-blue-500">
              <Bell size={18} />
            </div>
            <span className="font-extrabold text-[15px]">Notifications</span>
          </div>
          
          <button 
            onClick={toggleNotifications}
            className={`w-12 h-6 rounded-full p-1 transition-all duration-300 flex items-center ${notifsActive ? 'bg-[#33b1ff]' : 'bg-black/10'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 transform ${notifsActive ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>

        <button className="w-full bg-white rounded-[24px] p-5 flex items-center justify-between neo-shadow active:scale-[0.98] transition-all">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-orange-50 text-orange-500">
              <Lock size={18} />
            </div>
            <span className="font-extrabold text-[15px]">Privacy & Security</span>
          </div>
          <ChevronRight size={16} className="text-black/10" />
        </button>

        <button 
          onClick={() => signOut()}
          className="w-full bg-white rounded-[24px] p-5 flex items-center justify-between neo-shadow active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-red-50 text-red-500`}>
              <LogOut size={18} />
            </div>
            <span className="font-extrabold text-[15px]">Logout</span>
          </div>
          <ChevronRight size={16} className="text-black/10" />
        </button>
      </div>
    </div>
  );
}
