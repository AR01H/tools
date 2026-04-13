// src/App.js
import React from 'react';
import { AppProvider, useApp, PAGES } from './context/AppContext';
import { ToastContainer } from './components/UI';
import OnboardingPage from './pages/OnboardingPage';
import TopicSelectPage from './pages/TopicSelectPage';
import FilterSelectPage from './pages/FilterSelectPage';
import ConfigSelectPage from './pages/ConfigSelectPage';
import QuizPage from './pages/QuizPage';
import ResultPage from './pages/ResultPage';
import HistoryPage from './pages/HistoryPage';
import './styles/global.css';

function Router() {
  const { page } = useApp();
  switch (page) {
    case PAGES.ONBOARDING:      return <OnboardingPage />;
    case PAGES.TOPIC_SELECT:    return <TopicSelectPage />;
    case PAGES.FILTER_SELECT:   return <FilterSelectPage />;
    case PAGES.CONFIG_SELECT:   return <ConfigSelectPage />;
    case PAGES.QUIZ:            return <QuizPage />;
    case PAGES.RESULT:          return <ResultPage />;
    case PAGES.HISTORY:         return <HistoryPage />;
    default:                    return <OnboardingPage />;
  }
}

export default function App() {
  return (
    <AppProvider>
      <Router />
      <ToastContainer />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AppProvider>
  );
}