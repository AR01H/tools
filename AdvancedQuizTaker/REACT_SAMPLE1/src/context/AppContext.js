// src/context/AppContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AppContext = createContext(null);

export const PAGES = {
  ONBOARDING: 'ONBOARDING',
  SETUP: 'SETUP',
  TOPIC_SELECT: 'TOPIC_SELECT',
  FILTER_SELECT: 'FILTER_SELECT',
  CONFIG_SELECT: 'CONFIG_SELECT',
  QUIZ: 'QUIZ',
  RESULT: 'RESULT',
  HISTORY: 'HISTORY',
};

const DEFAULT_SETTINGS = {
  scriptUrl: '',
  folderId: '',
  theme: 'dark',
  template: 'classic',
};

export function AppProvider({ children }) {
  const [page, setPage] = useState(PAGES.ONBOARDING);
  const [settings, setSettings] = useState(() => {
    try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('quizSettings') || '{}') }; }
    catch { return DEFAULT_SETTINGS; }
  });
  const [userProfile, setUserProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem('quizProfile') || 'null'); }
    catch { return null; }
  });
  const [quizState, setQuizState] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.documentElement.setAttribute('data-template', settings.template);
  }, [settings.theme, settings.template]);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('quizSettings', JSON.stringify(settings));
  }, [settings]);

  // Persist profile
  useEffect(() => {
    if (userProfile) localStorage.setItem('quizProfile', JSON.stringify(userProfile));
  }, [userProfile]);

  // Toast system
  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  // API call
  const apiCall = useCallback(async (action, params = {}, body = null) => {
    const url = settings.scriptUrl;
    if (!url) throw new Error('Script URL not configured. Please open Settings.');
    const queryParams = new URLSearchParams({ action, ...params }).toString();
    const options = { method: body ? 'POST' : 'GET' };
    if (body) {
      options.method = 'POST';
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify({ action, folderId: settings.folderId, ...body });
    }
    const res = await fetch(`${url}${body ? '' : '?' + queryParams}`, options);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'API error');
    return json.data;
  }, [settings.scriptUrl, settings.folderId]);

  const updateSettings = useCallback((updates) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    addToast('Settings reset to defaults', 'info');
  }, [addToast]);

  const value = {
    page, setPage,
    settings, updateSettings, resetSettings,
    userProfile, setUserProfile,
    quizState, setQuizState,
    resultData, setResultData,
    toasts, addToast,
    settingsPanelOpen, setSettingsPanelOpen,
    loading, setLoading,
    apiCall,
    PAGES,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}