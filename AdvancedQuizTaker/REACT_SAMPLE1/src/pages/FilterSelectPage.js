// src/pages/FilterSelectPage.js
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Topbar, SettingsPanel, LoadingScreen, ChipSelect, StepIndicator } from '../components/UI';

export default function FilterSelectPage() {
  const { setPage, PAGES, apiCall, settings, quizState, setQuizState, addToast } = useApp();
  const [allQuestions, setAllQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedCats, setSelectedCats] = useState(quizState?.filters?.categories || ['ALL']);
  const [selectedSubs, setSelectedSubs] = useState(quizState?.filters?.subCategories || ['ALL']);
  const [selectedDiffs, setSelectedDiffs] = useState(quizState?.filters?.difficulties || ['ALL']);
  const [selectedTypes, setSelectedTypes] = useState(quizState?.filters?.questionTypes || ['ALL']);
  const [selectedTags, setSelectedTags] = useState(quizState?.filters?.tags || ['ALL']);
  const [questionCount, setQuestionCount] = useState(quizState?.filters?.questionCount || '');

  useEffect(() => {
    const topics = quizState?.selectedTopics || ['ALL'];
    apiCall(null, {}, {
      action: 'getQuestions',
      folderId: settings.folderId,
      topics,
      filters: {}
    })
      .then(data => setAllQuestions(data.questions || []))
      .catch(e => addToast('Failed to load questions: ' + e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  // Derive available options
  const categories = useMemo(() => [...new Set(allQuestions.map(q => q.Category).filter(Boolean))].sort(), [allQuestions]);

  const subCategories = useMemo(() => {
    const filtered = selectedCats.includes('ALL')
      ? allQuestions
      : allQuestions.filter(q => selectedCats.includes(q.Category));
    return [...new Set(filtered.map(q => q['Sub Category']).filter(Boolean))].sort();
  }, [allQuestions, selectedCats]);

  const difficulties = useMemo(() => [...new Set(allQuestions.map(q => q.Difficulty).filter(Boolean))].sort(), [allQuestions]);
  const questionTypes = useMemo(() => [...new Set(allQuestions.map(q => q['Question Type']).filter(Boolean))].sort(), [allQuestions]);
  const tags = useMemo(() => {
    const all = allQuestions.flatMap(q => (q.Tags || '').split(',').map(t => t.trim()).filter(Boolean));
    return [...new Set(all)].sort();
  }, [allQuestions]);

  // Reset sub-categories when categories change
  function handleCatChange(vals) {
    setSelectedCats(vals);
    setSelectedSubs(['ALL']);
  }

  // Live filtered count
  const filteredCount = useMemo(() => {
    return allQuestions.filter(q => {
      if (!selectedCats.includes('ALL') && !selectedCats.includes(q.Category)) return false;
      if (!selectedSubs.includes('ALL') && !selectedSubs.includes(q['Sub Category'])) return false;
      if (!selectedDiffs.includes('ALL') && !selectedDiffs.includes(q.Difficulty)) return false;
      if (!selectedTypes.includes('ALL') && !selectedTypes.includes(q['Question Type'])) return false;
      if (!selectedTags.includes('ALL')) {
        const qTags = (q.Tags || '').split(',').map(t => t.trim());
        if (!selectedTags.some(t => qTags.includes(t))) return false;
      }
      return true;
    }).length;
  }, [allQuestions, selectedCats, selectedSubs, selectedDiffs, selectedTypes, selectedTags]);

  function handleContinue() {
    if (filteredCount === 0) { addToast('No questions match your filters', 'error'); return; }
    setQuizState(prev => ({
      ...prev,
      filters: {
        categories: selectedCats,
        subCategories: selectedSubs,
        difficulties: selectedDiffs,
        questionTypes: selectedTypes,
        tags: selectedTags,
        questionCount: questionCount || String(filteredCount),
      }
    }));
    setPage(PAGES.CONFIG_SELECT);
  }

  if (loading) return <div className="app-shell"><Topbar /><LoadingScreen message="Loading questions..." /></div>;

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div className="app-shell">
      <Topbar showBack onBack={() => setPage(PAGES.TOPIC_SELECT)} />
      <SettingsPanel />
      <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <div className="page-enter">
          <StepIndicator steps={['Topic', 'Filters', 'Config', 'Quiz']} current={1} />

          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28 }}>Customize Filters</h2>
                <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Narrow down the question pool for your quiz</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: 'var(--accent-primary)' }}>{filteredCount}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>questions match</div>
              </div>
            </div>

            <div className="card-elevated">
              <Section title="Category">
                <ChipSelect options={categories} selected={selectedCats} onChange={handleCatChange} />
              </Section>

              <Section title={`Sub Category ${selectedCats.includes('ALL') ? '' : '(filtered by category)'}`}>
                {subCategories.length === 0 ? (
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No sub-categories available</span>
                ) : (
                  <ChipSelect options={subCategories} selected={selectedSubs} onChange={setSelectedSubs} />
                )}
              </Section>

              <Section title="Difficulty">
                <ChipSelect options={difficulties} selected={selectedDiffs} onChange={setSelectedDiffs} />
              </Section>

              <Section title="Question Type">
                <ChipSelect options={questionTypes} selected={selectedTypes} onChange={setSelectedTypes} />
              </Section>

              <Section title="Tags">
                <ChipSelect options={tags} selected={selectedTags} onChange={setSelectedTags} />
              </Section>

              <hr style={{ borderColor: 'var(--border-color)', margin: '8px 0 20px' }} />

              <div className="form-group" style={{ maxWidth: 280 }}>
                <label className="form-label">Question Count (max {filteredCount})</label>
                <input
                  type="number"
                  className="form-input"
                  value={questionCount}
                  onChange={e => setQuestionCount(e.target.value)}
                  placeholder={`All (${filteredCount})`}
                  min={1} max={filteredCount}
                />
              </div>

              <button className="btn btn-primary btn-lg w-full" style={{ marginTop: 24 }} onClick={handleContinue}>
                Continue to Quiz Config →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}