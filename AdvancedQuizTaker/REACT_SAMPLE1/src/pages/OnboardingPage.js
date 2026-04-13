// src/pages/OnboardingPage.js
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Topbar, SettingsPanel } from '../components/UI';

const SAVED_PROFILES_KEY = 'quizProfiles';

function getSavedProfiles() {
  try { return JSON.parse(localStorage.getItem(SAVED_PROFILES_KEY) || '[]'); }
  catch { return []; }
}

function saveProfile(profile) {
  const profiles = getSavedProfiles();
  const exists = profiles.find(p => p.phone === profile.phone || p.email === profile.email);
  if (!exists) {
    profiles.unshift(profile);
    localStorage.setItem(SAVED_PROFILES_KEY, JSON.stringify(profiles.slice(0, 10)));
  }
}

export default function OnboardingPage() {
  const { setPage, setUserProfile, PAGES, settings, addToast } = useApp();
  const [form, setForm] = useState({ name: '', dob: '', contact: '' });
  const [errors, setErrors] = useState({});
  const [profiles] = useState(getSavedProfiles);
  const [showProfiles, setShowProfiles] = useState(false);

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.dob) e.dob = 'Date of birth is required';
    if (!form.contact.trim()) e.contact = 'Phone or email is required';
    return e;
  }

  function handleContinue() {
    if (!settings.scriptUrl || !settings.folderId) {
      addToast('Please configure Script URL and Folder ID in Settings first', 'error');
      return;
    }
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const profile = { name: form.name.trim(), dob: form.dob, contact: form.contact.trim() };
    saveProfile(profile);
    setUserProfile(profile);
    setPage(PAGES.TOPIC_SELECT);
  }

  function selectProfile(p) {
    setForm({ name: p.name, dob: p.dob, contact: p.contact });
    setShowProfiles(false);
  }

  return (
    <div className="app-shell">
      <Topbar />
      <SettingsPanel />

      <div className="container" style={{ paddingTop: 60, paddingBottom: 80 }}>
        <div className="page-enter">
          {/* Hero */}
          <div className="welcome-hero">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-full)', padding: '6px 16px', marginBottom: 24 }}>
              <span>⚡</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Adaptive Quiz Platform</span>
            </div>
            <h1 className="welcome-title">
              Master Any<br />Subject with <em>Precision</em>
            </h1>
            <p className="welcome-subtitle">
              ACT · DSAT · Competitive Exams · Custom Assessments.<br />
              Personalized quizzes with instant analytics.
            </p>
          </div>

          {/* Form */}
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <div className="card-elevated">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22 }}>
                  Your Details
                </h2>
                {profiles.length > 0 && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowProfiles(!showProfiles)}>
                    👤 Saved Profiles
                  </button>
                )}
              </div>

              {/* Saved profiles dropdown */}
              {showProfiles && profiles.length > 0 && (
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: 20, overflow: 'hidden' }}>
                  {profiles.map((p, i) => (
                    <div
                      key={i}
                      onClick={() => selectProfile(p)}
                      style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: i < profiles.length - 1 ? '1px solid var(--border-color)' : 'none', transition: 'background var(--transition)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.contact}</div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    className={`form-input ${errors.name ? 'error' : ''}`}
                    value={form.name}
                    onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(err => ({ ...err, name: '' })); }}
                    placeholder="Enter your full name"
                    style={errors.name ? { borderColor: 'var(--accent-danger)' } : {}}
                  />
                  {errors.name && <span style={{ fontSize: 12, color: 'var(--accent-danger)' }}>{errors.name}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Date of Birth *</label>
                  <input
                    type="date"
                    className={`form-input ${errors.dob ? 'error' : ''}`}
                    value={form.dob}
                    onChange={e => { setForm(f => ({ ...f, dob: e.target.value })); setErrors(err => ({ ...err, dob: '' })); }}
                    style={errors.dob ? { borderColor: 'var(--accent-danger)' } : {}}
                  />
                  {errors.dob && <span style={{ fontSize: 12, color: 'var(--accent-danger)' }}>{errors.dob}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Phone / Email *</label>
                  <input
                    className={`form-input ${errors.contact ? 'error' : ''}`}
                    value={form.contact}
                    onChange={e => { setForm(f => ({ ...f, contact: e.target.value })); setErrors(err => ({ ...err, contact: '' })); }}
                    placeholder="Phone number or email address"
                    style={errors.contact ? { borderColor: 'var(--accent-danger)' } : {}}
                  />
                  {errors.contact && <span style={{ fontSize: 12, color: 'var(--accent-danger)' }}>{errors.contact}</span>}
                </div>

                <button className="btn btn-primary btn-lg w-full" onClick={handleContinue}>
                  Start Quiz Setup →
                </button>
              </div>
            </div>

            {/* Feature pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 32 }}>
              {['🎯 Adaptive Mode', '⏱ Timed Tests', '📊 Instant Analytics', '📄 PDF Reports', '🔁 Review Mode'].map(f => (
                <span key={f} style={{ fontSize: 13, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-full)', padding: '6px 14px' }}>{f}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}