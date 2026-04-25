import { X, Check, Plus } from 'lucide-react';

export default function ManageListsSheet({ lists, onToggle, onClose }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center modal-overlay"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl neo-shadow bottom-sheet-anim"
        style={{ borderRadius: '40px 40px 0 0', padding: '16px 24px 0' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div
          className="mx-auto mb-4"
          style={{ width: '40px', height: '5px', borderRadius: '999px', background: 'rgba(0,0,0,0.05)' }}
        />

        {/* Header */}
        <div className="flex justify-between items-center mb-6 px-2">
          <h3 className="text-[26px] font-extrabold tracking-tight" style={{ color: '#1a1d1f' }}>
            Inbox Lists
          </h3>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: '#f5f7f9' }}
          >
            <X size={20} style={{ color: '#1a1d1f' }} />
          </button>
        </div>

        {/* List rows */}
        <div
          className="no-scrollbar px-2 mb-6"
          style={{ display: 'grid', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}
        >
          {lists.map(l => (
            <button
              key={l.id}
              onClick={() => onToggle(l.id)}
              className="flex items-center justify-between transition-all active:scale-[0.98]"
              style={{
                padding: '16px',
                borderRadius: '24px',
                border: l.showInInbox
                  ? '1px solid rgba(51,177,255,0.3)'
                  : '1px solid rgba(0,0,0,0.05)',
                background: l.showInInbox
                  ? 'rgba(51,177,255,0.05)'
                  : 'white',
              }}
            >
              <div className="flex items-center gap-4">
                {/* Color dot */}
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{ background: (l.color || '#a2d2ff') + '33' }}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: l.color || '#a2d2ff' }}
                  />
                </div>

                <div className="text-left">
                  <span
                    className="font-extrabold block leading-none"
                    style={{ fontSize: '15px', color: '#1a1d1f' }}
                  >
                    {l.name}
                  </span>
                  <span
                    className="font-bold uppercase block mt-1"
                    style={{ fontSize: '10px', color: 'rgba(0,0,0,0.3)', letterSpacing: '0.05em' }}
                  >
                    {l.note_count ?? 0} items
                  </span>
                </div>
              </div>

              {/* Toggle indicator */}
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center transition-all"
                style={{
                  background:  l.showInInbox ? '#33b1ff' : '#f5f7f9',
                  color:       l.showInInbox ? 'white'   : 'rgba(0,0,0,0.15)',
                }}
              >
                {l.showInInbox
                  ? <Check size={14} strokeWidth={3} />
                  : <Plus  size={14} />
                }
              </div>
            </button>
          ))}
        </div>

        {/* Save button */}
        <div className="px-2 pb-8">
          <button
            onClick={onClose}
            className="w-full btn-primary"
            style={{ padding: '16px', fontSize: '16px' }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
