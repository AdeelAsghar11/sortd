import { useState } from 'react';
import { 
  Camera, 
  Bell, 
  Lock, 
  LogOut, 
  Globe, 
  Smartphone,
  ChevronRight
} from 'lucide-react';

export default function Settings() {
  const [user, setUser] = useState({
    name: 'Alex Rivera',
    email: 'alex@sortd.io',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sortd'
  });

  const [editing, setEditing] = useState(false);
  const [tempUser, setTempUser] = useState({...user});

  const handleSave = () => {
    setUser(tempUser);
    setEditing(false);
  };

  const avatars = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Sortd',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Jasper',
  ];

  return (
    <div className="px-6 pt-12 pb-32 max-w-[680px] mx-auto">
      <h1 className="text-[28px] font-extrabold tracking-tight mb-8">Profile</h1>

      <div className="bg-white rounded-[32px] p-8 neo-shadow flex flex-col items-center mb-6">
        <div className="relative mb-4">
          <img 
            src={tempUser.avatar} 
            className="w-24 h-24 rounded-full border-4 border-[#f5f7f9] shadow-inner" 
            alt="profile" 
          />
          <div className="absolute bottom-0 right-0 p-2 bg-black text-white rounded-full border-2 border-white">
            <Camera size={14} />
          </div>
        </div>
        
        {editing ? (
          <div className="w-full space-y-4 mt-4">
            <div className="flex gap-2 justify-center mb-4">
              {avatars.map(av => (
                <button 
                  key={av} 
                  onClick={() => setTempUser({...tempUser, avatar: av})}
                  className={`w-10 h-10 rounded-full border-2 transition-all ${tempUser.avatar === av ? 'border-[#33b1ff] scale-110' : 'border-transparent opacity-50'}`}
                >
                  <img src={av} alt="avatar option" className="rounded-full" />
                </button>
              ))}
            </div>
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
            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditing(false)} className="flex-1 py-4 bg-[#f5f7f9] rounded-2xl font-bold text-sm">Cancel</button>
              <button onClick={handleSave} className="flex-1 btn-primary text-sm">Save Changes</button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <h2 className="text-xl font-extrabold tracking-tight">{user.name}</h2>
            <p className="text-sm font-bold text-black/30 mt-1">{user.email}</p>
            <button 
              onClick={() => setEditing(true)} 
              className="mt-6 px-6 py-2 bg-[#f5f7f9] rounded-full text-xs font-bold uppercase tracking-widest text-black/50 hover:bg-black hover:text-white transition-all"
            >
              Edit Profile
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-black/30 ml-2 mb-4">Account Settings</h3>
        
        {[
          { icon: <Bell size={18} />, label: 'Notifications', value: 'On', color: 'bg-blue-50 text-blue-500' },
          { icon: <Lock size={18} />, label: 'Privacy & Security', color: 'bg-orange-50 text-orange-500' },
          { icon: <Smartphone size={18} />, label: 'Connected Devices', value: '2', color: 'bg-purple-50 text-purple-500' },
          { icon: <Globe size={18} />, label: 'Language', value: 'English', color: 'bg-green-50 text-green-500' },
          { icon: <LogOut size={18} />, label: 'Logout', color: 'bg-red-50 text-red-500' }
        ].map((item, idx) => (
          <button 
            key={idx} 
            className="w-full bg-white rounded-[24px] p-5 flex items-center justify-between neo-shadow active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${item.color}`}>
                {item.icon}
              </div>
              <span className="font-extrabold text-[15px]">{item.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {item.value && <span className="text-xs font-bold text-black/20">{item.value}</span>}
              <ChevronRight size={16} className="text-black/10" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
