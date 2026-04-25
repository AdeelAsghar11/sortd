import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Inbox from './pages/Inbox';
import Lists from './pages/Lists';
import ListView from './pages/ListView';
import NoteDetail from './pages/NoteDetail';
import Settings from './pages/Settings';
import Favorites from './pages/Favorites';
import BottomNav from './components/BottomNav';
import QueueStatus from './components/QueueStatus';
import AddContentSheet from './components/AddContentSheet';

function App() {
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);

  return (
    <Router>
      <div style={{ background: '#f5f7f9', minHeight: '100vh', position: 'relative' }}>
        <main style={{ paddingBottom: '140px' }}>
          <Routes>
            <Route index element={<Inbox />} />
            <Route path="lists" element={<Lists />} />
            <Route path="lists/:id" element={<ListView />} />
            <Route path="notes/:id" element={<NoteDetail />} />
            <Route path="settings" element={<Settings />} />
            <Route path="favorites" element={<Favorites />} />
          </Routes>
        </main>

        <QueueStatus />
        <BottomNav onAddClick={() => setIsAddSheetOpen(true)} />

        {isAddSheetOpen && (
          <AddContentSheet onClose={() => setIsAddSheetOpen(false)} />
        )}
      </div>
    </Router>
  );
}

export default App;
