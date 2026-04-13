// src/components/QuestionTypes.js
import React, { useState, useRef } from 'react';

const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

// ============================================================
// MULTICHOICE (single correct)
// ============================================================
export function MultiChoice({ question, options, answer, onChange, disabled }) {
  const selected = Array.isArray(answer) ? answer[0] : answer;
  return (
    <div className="flex flex-col" style={{ gap: 10 }}>
      {options.map((opt, i) => (
        <button
          key={i}
          className={`option-button ${selected === opt ? 'selected' : ''}`}
          onClick={() => !disabled && onChange(opt)}
          disabled={disabled}
        >
          <span className="option-letter">{letters[i]}</span>
          <span>{opt}</span>
        </button>
      ))}
    </div>
  );
}

// ============================================================
// MULTI MULTICHOICE (multiple correct)
// ============================================================
export function MultiMultiChoice({ question, options, answer, onChange, disabled }) {
  const selected = Array.isArray(answer) ? answer : [];
  function toggle(opt) {
    if (disabled) return;
    const next = selected.includes(opt)
      ? selected.filter(s => s !== opt)
      : [...selected, opt];
    onChange(next);
  }
  return (
    <div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>Select all that apply</p>
      <div className="flex flex-col" style={{ gap: 10 }}>
        {options.map((opt, i) => (
          <button
            key={i}
            className={`option-button ${selected.includes(opt) ? 'selected' : ''}`}
            onClick={() => toggle(opt)}
            disabled={disabled}
          >
            <span className="option-letter" style={{ borderRadius: 4 }}>
              {selected.includes(opt) ? '✓' : letters[i]}
            </span>
            <span>{opt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// TRUE / FALSE
// ============================================================
export function TrueFalse({ answer, onChange, disabled }) {
  const selected = Array.isArray(answer) ? answer[0] : answer;
  return (
    <div className="flex gap-md">
      {['TRUE', 'FALSE'].map(opt => (
        <button
          key={opt}
          className={`option-button ${selected === opt ? 'selected' : ''}`}
          style={{ flex: 1, justifyContent: 'center', fontSize: 18, fontWeight: 700, padding: '24px 20px' }}
          onClick={() => !disabled && onChange(opt)}
          disabled={disabled}
        >
          {opt === 'TRUE' ? '✓ True' : '✗ False'}
        </button>
      ))}
    </div>
  );
}

// ============================================================
// SHORT ANSWER
// ============================================================
export function ShortAnswer({ answer, onChange, disabled }) {
  const val = Array.isArray(answer) ? answer[0] : (answer || '');
  return (
    <div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>Type your answer below</p>
      <textarea
        className="form-input"
        rows={4}
        value={val}
        onChange={e => !disabled && onChange(e.target.value)}
        disabled={disabled}
        placeholder="Enter your answer..."
        style={{ resize: 'vertical', fontFamily: 'var(--font-body)' }}
      />
    </div>
  );
}

// ============================================================
// FILL IN THE BLANKS
// ============================================================
export function FillInBlanks({ question, answer, onChange, disabled }) {
  const parts = (question.Question || '').split(/\[blank\]/gi);
  const values = Array.isArray(answer) ? answer : (answer ? [answer] : []);
  function handleChange(idx, val) {
    if (disabled) return;
    const next = [...values];
    next[idx] = val;
    onChange(next.length === 1 ? next[0] : next);
  }
  if (parts.length <= 1) return <ShortAnswer answer={answer} onChange={onChange} disabled={disabled} />;
  return (
    <div style={{ fontSize: 18, lineHeight: 2, color: 'var(--text-primary)' }}>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          <span>{part}</span>
          {i < parts.length - 1 && (
            <input
              className="blank-input"
              value={values[i] || ''}
              onChange={e => handleChange(i, e.target.value)}
              disabled={disabled}
              placeholder="___"
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ============================================================
// MULTI BLANKS
// ============================================================
export function MultiBlanks({ question, answer, onChange, disabled }) {
  const blankCount = (question.correctAnswers || []).length || 2;
  const values = Array.isArray(answer) ? answer : [];
  function handleChange(idx, val) {
    if (disabled) return;
    const next = [...values];
    next[idx] = val;
    onChange(next);
  }
  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      {Array.from({ length: blankCount }, (_, i) => (
        <div key={i} className="flex items-center gap-md">
          <span className="option-letter" style={{ width: 30, height: 30, minWidth: 30 }}>{i + 1}</span>
          <input
            className="form-input"
            value={values[i] || ''}
            onChange={e => handleChange(i, e.target.value)}
            disabled={disabled}
            placeholder={`Answer ${i + 1}...`}
          />
        </div>
      ))}
    </div>
  );
}

// ============================================================
// SEQUENCE (drag to order)
// ============================================================
export function Sequence({ options, answer, onChange, disabled }) {
  const [items, setItems] = useState(answer?.length ? answer : [...options]);
  const dragIndex = useRef(null);

  function onDragStart(i) { dragIndex.current = i; }
  function onDragOver(e) { e.preventDefault(); }
  function onDrop(i) {
    if (disabled) return;
    const newItems = [...items];
    const dragged = newItems.splice(dragIndex.current, 1)[0];
    newItems.splice(i, 0, dragged);
    setItems(newItems);
    onChange(newItems);
  }
  return (
    <div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>Drag items to arrange in correct order</p>
      <div className="flex flex-col" style={{ gap: 8 }}>
        {items.map((item, i) => (
          <div
            key={item}
            className="drag-item"
            draggable={!disabled}
            onDragStart={() => onDragStart(i)}
            onDragOver={onDragOver}
            onDrop={() => onDrop(i)}
            style={{ display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <span className="option-letter" style={{ width: 28, height: 28, minWidth: 28, cursor: 'grab' }}>⠿</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MATCHING
// ============================================================
export function Matching({ question, answer, onChange, disabled }) {
  const pairs = (question.choices || []).map(c => {
    const [left, right] = c.split('-');
    return { left: left?.trim(), right: right?.trim() };
  });
  const [selected, setSelected] = useState(null);
  const [matched, setMatched] = useState(Array.isArray(answer) ? answer : []);

  const rights = pairs.map(p => p.right);

  function handleLeft(left) {
    if (disabled) return;
    if (selected === left) setSelected(null);
    else setSelected(left);
  }

  function handleRight(right) {
    if (disabled || !selected) return;
    const newMatch = [...matched.filter(m => !m.startsWith(selected + '-')), `${selected}-${right}`];
    setMatched(newMatch);
    onChange(newMatch);
    setSelected(null);
  }

  function isLeftMatched(left) { return matched.some(m => m.startsWith(left + '-')); }
  function getRightForLeft(left) { const m = matched.find(m => m.startsWith(left + '-')); return m?.split('-')[1] || ''; }
  function isRightMatched(right) { return matched.some(m => m.endsWith('-' + right)); }

  return (
    <div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
        {selected ? `Selected: "${selected}" — now click a match on the right` : 'Click an item on the left, then click its match on the right'}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', gap: 12, alignItems: 'start' }}>
        <div className="flex flex-col" style={{ gap: 8 }}>
          {pairs.map((p, i) => (
            <div
              key={i}
              className={`match-item ${selected === p.left ? 'selected' : ''} ${isLeftMatched(p.left) ? 'matched' : ''}`}
              onClick={() => handleLeft(p.left)}
            >
              {p.left}
              {isLeftMatched(p.left) && <span style={{ fontSize: 11, color: 'var(--accent-success)', marginLeft: 8 }}>→ {getRightForLeft(p.left)}</span>}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingTop: 14 }}>
          {pairs.map((_, i) => <span key={i} style={{ color: 'var(--text-muted)' }}>→</span>)}
        </div>
        <div className="flex flex-col" style={{ gap: 8 }}>
          {rights.map((r, i) => (
            <div
              key={i}
              className={`match-item ${isRightMatched(r) ? 'matched' : ''} ${selected && !isRightMatched(r) ? 'selected' : ''}`}
              onClick={() => handleRight(r)}
              style={{ cursor: selected && !isRightMatched(r) ? 'pointer' : 'default' }}
            >
              {r}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DRAG AND DROP
// ============================================================
export function DragDrop({ question, answer, onChange, disabled }) {
  const items = question.choices || [];
  const categories = [...new Set(items.map(c => c.split('-')[1]?.trim()).filter(Boolean))];
  const [dropZones, setDropZones] = useState(() => {
    const init = {};
    categories.forEach(c => init[c] = []);
    return init;
  });
  const [available, setAvailable] = useState(() => items.map(c => c.split('-')[0]?.trim()).filter(Boolean));
  const dragging = useRef(null);

  function onDragStart(item, from) { dragging.current = { item, from }; }
  function onDrop(zone) {
    if (disabled || !dragging.current) return;
    const { item, from } = dragging.current;
    if (from === 'available') {
      setAvailable(prev => prev.filter(i => i !== item));
    } else {
      setDropZones(prev => ({ ...prev, [from]: prev[from].filter(i => i !== item) }));
    }
    setDropZones(prev => {
      const next = { ...prev, [zone]: [...prev[zone], item] };
      const ans = Object.entries(next).flatMap(([cat, items]) => items.map(i => `${i}-${cat}`));
      onChange(ans);
      return next;
    });
    dragging.current = null;
  }

  return (
    <div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Drag items to the correct category</p>
      <div className="drop-zone" style={{ marginBottom: 16, background: 'var(--bg-elevated)' }}
        onDragOver={e => e.preventDefault()}
        onDrop={() => {
          if (!dragging.current) return;
          const { item, from } = dragging.current;
          if (from !== 'available') {
            setDropZones(prev => ({ ...prev, [from]: prev[from].filter(i => i !== item) }));
            setAvailable(prev => [...prev, item]);
            dragging.current = null;
          }
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 8 }}>Available:</span>
        {available.map(item => (
          <div key={item} className="drag-item" draggable={!disabled}
            onDragStart={() => onDragStart(item, 'available')}>{item}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(categories.length, 2)}, 1fr)`, gap: 12 }}>
        {categories.map(cat => (
          <div key={cat}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>{cat}</div>
            <div className="drop-zone" onDragOver={e => e.preventDefault()} onDrop={() => onDrop(cat)}>
              {dropZones[cat].map(item => (
                <div key={item} className="drag-item" draggable={!disabled}
                  onDragStart={() => onDragStart(item, cat)}>{item}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// RANGE SLIDER
// ============================================================
export function RangeSlider({ question, answer, onChange, disabled }) {
  const correctStr = question.correctAnswers?.[0] || '0-10';
  const [min, max] = correctStr.replace(/["']/g, '').split('-').map(Number);
  const val = Array.isArray(answer) ? answer[0] : (answer || (min || 0));
  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Select a value in range</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-primary)', fontSize: 20 }}>{val}</span>
      </div>
      <input
        type="range"
        min={min || 0} max={max || 100}
        value={val}
        onChange={e => !disabled && onChange(e.target.value)}
        disabled={disabled}
        style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
        <span>{min || 0}</span><span>{max || 100}</span>
      </div>
    </div>
  );
}

// ============================================================
// DISPATCHER - renders correct question type
// ============================================================
export function QuestionRenderer({ question, options, answer, onChange, disabled }) {
  const type = question['Question Type'] || 'Multichoice';
  const props = { question, options, answer, onChange, disabled };

  if (type === 'Multichoice' || type === 'Multichoice Anycorrect') return <MultiChoice {...props} />;
  if (type === 'Multi Multichoice') return <MultiMultiChoice {...props} />;
  if (type === 'True/False') return <TrueFalse {...props} />;
  if (type === 'Short Answer') return <ShortAnswer {...props} />;
  if (type === 'Fill in the Blanks' || type === 'Inline Blank') return <FillInBlanks {...props} />;
  if (type === 'Multi Blanks') return <MultiBlanks {...props} />;
  if (type === 'Sequence') return <Sequence {...props} />;
  if (type === 'Matching' || type === 'Multi Matching') return <Matching {...props} />;
  if (type === 'Drag & Drop') return <DragDrop {...props} />;
  if (type === 'Range') return <RangeSlider {...props} />;
  return <MultiChoice {...props} />;
}