/**
 * Tutorial Overlay Component
 * Composant de Superposition de Tutoriel
 * 
 * Interactive step-by-step tutorials with:
 * - Highlight UI elements
 * - Progress tracking
 * - Skip/restart options
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import './TutorialOverlay.css';

const TutorialOverlay = ({ 
  tutorialId, 
  steps, 
  onComplete, 
  onSkip,
  autoStart = false 
}) => {
  const { language } = useLanguage();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState(null);

  const translations = {
    en: {
      next: 'Next',
      previous: 'Previous',
      skip: 'Skip Tutorial',
      finish: 'Finish',
      restart: 'Restart',
      step: 'Step',
      of: 'of',
      welcome: 'Welcome!',
      letsGetStarted: 'Let\'s get you started with a quick tour.',
      startTutorial: 'Start Tutorial',
      maybeLater: 'Maybe Later'
    },
    fr: {
      next: 'Suivant',
      previous: 'Précédent',
      skip: 'Passer le Tutoriel',
      finish: 'Terminer',
      restart: 'Recommencer',
      step: 'Étape',
      of: 'sur',
      welcome: 'Bienvenue!',
      letsGetStarted: 'Commençons par une visite rapide.',
      startTutorial: 'Démarrer le Tutoriel',
      maybeLater: 'Plus Tard'
    }
  };

  const text = translations[language];

  // Check if tutorial has been completed before
  useEffect(() => {
    const completedTutorials = JSON.parse(localStorage.getItem('completedTutorials') || '[]');
    if (!completedTutorials.includes(tutorialId) && autoStart) {
      setIsActive(true);
    }
  }, [tutorialId, autoStart]);

  // Highlight element when step changes
  useEffect(() => {
    if (!isActive || !steps[currentStep]) return;

    const step = steps[currentStep];
    if (step.target) {
      const element = document.querySelector(step.target);
      if (element) {
        setHighlightedElement(element);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      setHighlightedElement(null);
    }

    return () => {
      setHighlightedElement(null);
    };
  }, [currentStep, isActive, steps]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, steps.length]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleComplete = useCallback(() => {
    const completedTutorials = JSON.parse(localStorage.getItem('completedTutorials') || '[]');
    if (!completedTutorials.includes(tutorialId)) {
      completedTutorials.push(tutorialId);
      localStorage.setItem('completedTutorials', JSON.stringify(completedTutorials));
    }
    setIsActive(false);
    setCurrentStep(0);
    if (onComplete) onComplete();
  }, [tutorialId, onComplete]);

  const handleSkip = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    if (onSkip) onSkip();
  }, [onSkip]);

  const handleRestart = useCallback(() => {
    setCurrentStep(0);
  }, []);

  const startTutorial = useCallback(() => {
    setIsActive(true);
    setCurrentStep(0);
  }, []);

  // Calculate highlight position
  const getHighlightStyle = () => {
    if (!highlightedElement) return {};

    const rect = highlightedElement.getBoundingClientRect();
    const padding = 8;

    return {
      top: rect.top - padding + window.scrollY,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2
    };
  };

  // Calculate tooltip position
  const getTooltipPosition = () => {
    if (!highlightedElement) {
      return { position: 'center' };
    }

    const rect = highlightedElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Determine best position
    if (rect.bottom < viewportHeight / 2) {
      return { position: 'bottom', top: rect.bottom + 20 + window.scrollY, left: rect.left };
    } else if (rect.top > viewportHeight / 2) {
      return { position: 'top', bottom: viewportHeight - rect.top + 20, left: rect.left };
    } else if (rect.right < viewportWidth / 2) {
      return { position: 'right', top: rect.top + window.scrollY, left: rect.right + 20 };
    } else {
      return { position: 'left', top: rect.top + window.scrollY, right: viewportWidth - rect.left + 20 };
    }
  };

  if (!isActive) {
    return null;
  }

  const currentStepData = steps[currentStep];
  const highlightStyle = getHighlightStyle();
  const tooltipPosition = getTooltipPosition();

  return (
    <div className="tutorial-overlay" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="tutorial-backdrop" onClick={handleSkip} />

      {/* Highlight */}
      {highlightedElement && (
        <div 
          className="tutorial-highlight"
          style={highlightStyle}
        />
      )}

      {/* Tooltip */}
      <div 
        className={`tutorial-tooltip ${tooltipPosition.position}`}
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          right: tooltipPosition.right,
          bottom: tooltipPosition.bottom
        }}
      >
        {/* Progress */}
        <div className="tutorial-progress">
          <span>{text.step} {currentStep + 1} {text.of} {steps.length}</span>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="tutorial-content">
          {currentStepData.icon && (
            <span className="step-icon">{currentStepData.icon}</span>
          )}
          <h3>{currentStepData.title?.[language] || currentStepData.title}</h3>
          <p>{currentStepData.content?.[language] || currentStepData.content}</p>
        </div>

        {/* Actions */}
        <div className="tutorial-actions">
          <button 
            className="skip-btn"
            onClick={handleSkip}
          >
            {text.skip}
          </button>
          <div className="nav-buttons">
            {currentStep > 0 && (
              <button 
                className="prev-btn"
                onClick={handlePrevious}
              >
                ← {text.previous}
              </button>
            )}
            <button 
              className="next-btn"
              onClick={handleNext}
            >
              {currentStep === steps.length - 1 ? text.finish : text.next} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Welcome Modal for first-time users
 */
export const WelcomeModal = ({ onStart, onSkip }) => {
  const { language } = useLanguage();
  const [show, setShow] = useState(false);

  const translations = {
    en: {
      welcome: 'Welcome to Geocoding App!',
      description: 'Find coordinates for villages across 54 African countries. Would you like a quick tour of the features?',
      startTour: 'Start Tour',
      skipTour: 'Skip for Now',
      features: [
        '🔍 Search for any village',
        '📦 Batch process files',
        '🗺️ Interactive map search',
        '🤖 AI-powered suggestions'
      ]
    },
    fr: {
      welcome: 'Bienvenue dans l\'App de Géocodage!',
      description: 'Trouvez les coordonnées des villages dans 54 pays africains. Voulez-vous une visite rapide des fonctionnalités?',
      startTour: 'Commencer la Visite',
      skipTour: 'Passer pour l\'instant',
      features: [
        '🔍 Rechercher n\'importe quel village',
        '📦 Traiter des fichiers par lots',
        '🗺️ Recherche interactive sur carte',
        '🤖 Suggestions alimentées par l\'IA'
      ]
    }
  };

  const text = translations[language];

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      setShow(true);
    }
  }, []);

  const handleStart = () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    setShow(false);
    if (onStart) onStart();
  };

  const handleSkip = () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    setShow(false);
    if (onSkip) onSkip();
  };

  if (!show) return null;

  return (
    <div className="welcome-modal-overlay">
      <div className="welcome-modal">
        <div className="welcome-icon">🌍</div>
        <h2>{text.welcome}</h2>
        <p>{text.description}</p>
        <ul className="feature-list">
          {text.features.map((feature, index) => (
            <li key={index}>{feature}</li>
          ))}
        </ul>
        <div className="welcome-actions">
          <button className="skip-btn" onClick={handleSkip}>
            {text.skipTour}
          </button>
          <button className="start-btn" onClick={handleStart}>
            {text.startTour}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Tooltip component for complex features
 */
export const FeatureTooltip = ({ 
  target, 
  content, 
  position = 'top',
  show = true 
}) => {
  const [visible, setVisible] = useState(false);
  const [targetElement, setTargetElement] = useState(null);

  useEffect(() => {
    if (target) {
      const element = document.querySelector(target);
      setTargetElement(element);
    }
  }, [target]);

  useEffect(() => {
    if (!targetElement || !show) return;

    const handleMouseEnter = () => setVisible(true);
    const handleMouseLeave = () => setVisible(false);

    targetElement.addEventListener('mouseenter', handleMouseEnter);
    targetElement.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      targetElement.removeEventListener('mouseenter', handleMouseEnter);
      targetElement.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [targetElement, show]);

  if (!visible || !targetElement) return null;

  const rect = targetElement.getBoundingClientRect();
  const style = {};

  switch (position) {
    case 'top':
      style.bottom = window.innerHeight - rect.top + 8;
      style.left = rect.left + rect.width / 2;
      style.transform = 'translateX(-50%)';
      break;
    case 'bottom':
      style.top = rect.bottom + 8;
      style.left = rect.left + rect.width / 2;
      style.transform = 'translateX(-50%)';
      break;
    case 'left':
      style.top = rect.top + rect.height / 2;
      style.right = window.innerWidth - rect.left + 8;
      style.transform = 'translateY(-50%)';
      break;
    case 'right':
      style.top = rect.top + rect.height / 2;
      style.left = rect.right + 8;
      style.transform = 'translateY(-50%)';
      break;
  }

  return (
    <div className={`feature-tooltip ${position}`} style={style}>
      {content}
    </div>
  );
};

// Default tutorial steps
export const defaultTutorialSteps = [
  {
    target: '.nav-home',
    icon: '🏠',
    title: { en: 'Home Page', fr: 'Page d\'Accueil' },
    content: { 
      en: 'Start here to access all features and quick actions.',
      fr: 'Commencez ici pour accéder à toutes les fonctionnalités et actions rapides.'
    }
  },
  {
    target: '.nav-search',
    icon: '🔍',
    title: { en: 'Advanced Search', fr: 'Recherche Avancée' },
    content: {
      en: 'Use the map to search for villages within a specific area.',
      fr: 'Utilisez la carte pour rechercher des villages dans une zone spécifique.'
    }
  },
  {
    target: '.nav-batch',
    icon: '📦',
    title: { en: 'Batch Processing', fr: 'Traitement par Lots' },
    content: {
      en: 'Upload Excel or CSV files to geocode multiple villages at once.',
      fr: 'Téléchargez des fichiers Excel ou CSV pour géocoder plusieurs villages à la fois.'
    }
  },
  {
    target: '.nav-history',
    icon: '📜',
    title: { en: 'Search History', fr: 'Historique de Recherche' },
    content: {
      en: 'View your past searches and analyze patterns with AI insights.',
      fr: 'Consultez vos recherches passées et analysez les tendances avec des insights IA.'
    }
  },
  {
    icon: '🎉',
    title: { en: 'You\'re Ready!', fr: 'Vous êtes Prêt!' },
    content: {
      en: 'Start geocoding African villages. Check the User Guide for more details.',
      fr: 'Commencez à géocoder les villages africains. Consultez le Guide Utilisateur pour plus de détails.'
    }
  }
];

export default TutorialOverlay;
