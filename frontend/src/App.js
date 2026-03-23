import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import BatchGeocode from './pages/BatchGeocode';
import AdvancedSearch from './pages/AdvancedSearch';
import AdvancedSearchResults from './pages/AdvancedSearchResults';
import Results from './pages/Results';
import SearchHistory from './pages/SearchHistory';
import ApiDocs from './pages/ApiDocs';
import UserGuide from './pages/UserGuide';
import AdminDashboard from './pages/AdminDashboard';
import Dashboard from './components/Dashboard';
import About from './pages/About';
import { WelcomeModal } from './components/TutorialOverlay';
import './App.css';

function App() {
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    // Check if first-time user
    const hasVisited = localStorage.getItem('hasVisitedBefore');
    if (!hasVisited) {
      setShowWelcome(true);
    }
  }, []);

  const handleWelcomeStart = () => {
    localStorage.setItem('hasVisitedBefore', 'true');
    setShowWelcome(false);
    setShowTutorial(true);
  };

  const handleWelcomeSkip = () => {
    localStorage.setItem('hasVisitedBefore', 'true');
    setShowWelcome(false);
  };

  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/batch" element={<BatchGeocode />} />
          <Route path="/search" element={<AdvancedSearch />} />
          <Route path="/advanced-search-results" element={<AdvancedSearchResults />} />
          <Route path="/results" element={<Results />} />
          <Route path="/history" element={<SearchHistory />} />
          <Route path="/api-docs" element={<ApiDocs />} />
          <Route path="/user-guide" element={<UserGuide />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>
      <footer className="footer">
        <div className="container footer-inner">
          <span className="footer-brand">Village<strong>Point</strong></span>
          <span className="footer-copy">© {new Date().getFullYear()} VillagePoint. All rights reserved.</span>
        </div>
      </footer>

      {/* Welcome Modal for first-time users */}
      {showWelcome && (
        <WelcomeModal 
          onStart={handleWelcomeStart}
          onSkip={handleWelcomeSkip}
        />
      )}
    </div>
  );
}

export default App;