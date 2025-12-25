
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import EditorPage from './EditorPage';
import EditorPage from './EditorPage';
import { BrainConsole } from './features/brain_console/BrainConsole';
import { LandingPage } from './features/landing/LandingPage';

const App: React.FC = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/editor" element={<EditorPage />} />
                <Route path="/brain" element={<BrainConsole />} />
            </Routes>
        </Router>
    );
};

export default App;
