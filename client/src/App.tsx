import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './components/Landing';
import Room from './components/Room';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/room/:roomId" element={<Room />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
