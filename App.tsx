
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import EditorPage from './EditorPage';
import { BrainConsole } from './features/brain_console/BrainConsole';

const App: React.FC = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<EditorPage />} />
                <Route path="/brain" element={<BrainConsole />} />
            </Routes>
        </Router>
    );
};

export default App;
