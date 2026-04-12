/**
 * DataVault v2
 * localStorage under key "dv2_data" / "dv2_theme"
 * Graceful in-memory fallback for sandboxed environments.
 */

const DataVault = (function ($) {
  'use strict';

  const STORAGE_KEY = 'dv2_data';
  const THEME_KEY   = 'dv2_theme';
  const WARN_DAYS   = 30;

  // ── STATE ────────────────────────────────────────────────────────────────────
  let state = { sections: [], items: [] };
  let activeSectionId  = null;
  let currentView      = 'card';    // card | table | list
  let reorderMode      = false;
  let dragSrcId        = null;
  let editItemId       = null;
  let editSectionId    = null;
  let confirmCallback  = null;
  let importBuffer     = null;
  let activeTagFilters = [];
  let advancedOpen     = false;

  // ── STORAGE ──────────────────────────────────────────────────────────────────
  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) { const p = JSON.parse(raw); state.sections = p.sections||[]; state.items = p.items||[]; }
    } catch(e) {}
    if (!state.sections.length) {
      state.sections = [
        { id: uid(), name: 'Personal Details', icon: '◈' },
        { id: uid(), name: 'Accounts & Logs',  icon: '⬡' },
        { id: uid(), name: 'Notes',            icon: '◻' },
      ];
      saveData();
    }
  }

  function saveData() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
  }

  // ── UTILS ─────────────────────────────────────────────────────────────────────
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
  function esc(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function today() { return new Date().toISOString().slice(0,10); }

  function expiryStatus(d) {
    if (!d) return null;
    const now = new Date(); now.setHours(0,0,0,0);
    const exp = new Date(d);
    const diff = Math.floor((exp - now) / 86400000);
    if (diff < 0)          return { label: `Expired ${Math.abs(diff)}d ago`, cls: 'expired' };
    if (diff === 0)        return { label: 'Expires today',                  cls: 'warn' };
    if (diff <= WARN_DAYS) return { label: `Expires in ${diff}d`,            cls: 'warn' };
    return                        { label: d,                                 cls: 'ok' };
  }

  function toast(msg, type='info', dur=2600) {
    const $t = $(`<div class="toast ${type}">${esc(msg)}</div>`);
    $('#toast-container').append($t);
    setTimeout(() => $t.fadeOut(280, () => $t.remove()), dur);
  }

  function copyText(text) {
    navigator.clipboard.writeText(text).then(() => toast('Copied','success')).catch(() => {
      const el = document.createElement('textarea');
      el.value = text; document.body.appendChild(el); el.select(); document.execCommand('copy');
      document.body.removeChild(el); toast('Copied','success');
    });
  }

  // ── GETTERS ───────────────────────────────────────────────────────────────────
  function secById(id) { return state.sections.find(s => s.id === id); }
  function itemCount(secId) { return state.items.filter(i => i.sectionId === secId).length; }

  function allTags() {
    const set = new Set();
    state.items.forEach(i => (i.tags||[]).forEach(t => set.add(t)));
    return [...set].sort();
  }

  // ── FILTERED / SORTED ITEMS ───────────────────────────────────────────────────
  function getDisplayItems() {
    const gq = $('#global-search').val().trim().toLowerCase();
    const sq = $('#section-search').val().trim().toLowerCase();
    const sort = $('#sort-select').val();
    const expiryF = $('#expiry-filter').val();
    const pinnedF = $('#pinned-filter').val();

    let items = gq
      ? state.items
      : state.items.filter(i => i.sectionId === activeSectionId);

    // text search
    const q = gq || sq;
    if (q) {
      items = items.filter(i => {
        return [i.title,
          ...(i.fields||[]).map(f => f.key+' '+f.value),
          i.notes||'', ...(i.tags||[])
        ].join(' ').toLowerCase().includes(q);
      });
    }

    // tag filter
    if (activeTagFilters.length) {
      items = items.filter(i => activeTagFilters.every(t => (i.tags||[]).includes(t)));
    }

    // expiry filter
    if (expiryF) {
      items = items.filter(i => {
        const s = expiryStatus(i.expiry);
        if (expiryF === 'expired') return s?.cls === 'expired';
        if (expiryF === 'soon')    return s?.cls === 'warn';
        if (expiryF === 'none')    return !i.expiry;
        return true;
      });
    }

    // pinned filter
    if (pinnedF === 'yes') items = items.filter(i => i.pinned);
    if (pinnedF === 'no')  items = items.filter(i => !i.pinned);

    // sort
    items = [...items];
    switch(sort) {
      case 'newest':    items.sort((a,b) => b.createdAt - a.createdAt); break;
      case 'oldest':    items.sort((a,b) => a.createdAt - b.createdAt); break;
      case 'alpha-asc': items.sort((a,b) => a.title.localeCompare(b.title)); break;
      case 'alpha-desc':items.sort((a,b) => b.title.localeCompare(a.title)); break;
      case 'expiry':
        items.sort((a,b) => {
          if (!a.expiry && !b.expiry) return 0;
          if (!a.expiry) return 1; if (!b.expiry) return -1;
          return a.expiry.localeCompare(b.expiry);
        });
        break;
    }

    // pinned always float to top
    items.sort((a,b) => (b.pinned?1:0) - (a.pinned?1:0));

    return { items, globalSearch: !!gq };
  }

  // ── ACTIVE FILTER COUNT ────────────────────────────────────────────────────────
  function updateFilterBadge() {
    let n = 0;
    if (activeTagFilters.length) n += activeTagFilters.length;
    if ($('#expiry-filter').val()) n++;
    if ($('#pinned-filter').val()) n++;
    if ($('#section-search').val().trim()) n++;
    const $b = $('#filter-active-count');
    if (n > 0) { $b.text(n).removeClass('hidden'); $('#advanced-filter-btn').addClass('active'); }
    else       { $b.addClass('hidden');             $('#advanced-filter-btn').removeClass('active'); }
  }

  // ── TAG CHIPS IN ADVANCED FILTER ─────────────────────────────────────────────
  function renderTagChips() {
    const $wrap = $('#tag-chips').empty();
    allTags().forEach(t => {
      const sel = activeTagFilters.includes(t);
      $wrap.append(`<span class="tag-chip ${sel?'selected':''}" data-tag="${esc(t)}">${esc(t)}</span>`);
    });
  }

  // ── RENDER SIDEBAR ────────────────────────────────────────────────────────────
  function renderSidebar() {
    const $ul = $('#section-list').empty();
    state.sections.forEach(sec => {
      const cnt = itemCount(sec.id);
      $ul.append(`
        <li data-sec-id="${esc(sec.id)}" class="${sec.id===activeSectionId?'active':''}">
          <button class="section-nav-btn" data-sec-id="${esc(sec.id)}">
            <span class="sec-icon">${esc(sec.icon||'◈')}</span>
            <span class="sec-name">${esc(sec.name)}</span>
            <span class="sec-count">${cnt}</span>
          </button>
          <div class="section-actions">
            <button class="edit-sec" data-sec-id="${esc(sec.id)}" title="Rename">✎</button>
            <button class="del-sec"  data-sec-id="${esc(sec.id)}" title="Delete">✕</button>
          </div>
        </li>`);
    });
    updateExportScope();
  }

  // ── RENDER ITEMS ──────────────────────────────────────────────────────────────
  function renderItems() {
    const { items, globalSearch } = getDisplayItems();
    const sec = secById(activeSectionId);

    $('#section-title').text(globalSearch ? 'Search Results' : (sec?.name || '—'));
    $('#item-count').text(`${items.length} item${items.length!==1?'s':''}`);

    if (currentView === 'card') renderCardView(items, globalSearch);
    else if (currentView === 'table') renderTableView(items);
    else renderListView(items);

    if (items.length === 0) { $('#empty-state').removeClass('hidden'); }
    else                    { $('#empty-state').addClass('hidden'); }

    renderExpiryBanner();
    updateFilterBadge();
  }

  // ── CARD VIEW ─────────────────────────────────────────────────────────────────
  function renderCardView(items, globalSearch) {
    $('#items-grid').show().empty();
    $('#items-table-wrap, #items-list').hide();

    if (globalSearch) {
      const grouped = {};
      items.forEach(i => { if (!grouped[i.sectionId]) grouped[i.sectionId]=[]; grouped[i.sectionId].push(i); });
      Object.entries(grouped).forEach(([sid, grp]) => {
        const s = secById(sid);
        $('#items-grid').append(`<div class="search-section-header">${esc(s?s.icon+' '+s.name:'Unknown')}</div>`);
        grp.forEach(item => $('#items-grid').append(buildCard(item)));
      });
    } else {
      items.forEach(item => $('#items-grid').append(buildCard(item)));
    }

    if (reorderMode) attachDrag();
  }

  function buildCard(item) {
    const status = expiryStatus(item.expiry);
    const cls = ['item-card',
      item.pinned ? 'pinned':'',
      status?.cls==='expired'?'expired':'',
      status?.cls==='warn'?'expiry-warn':'',
    ].filter(Boolean).join(' ');

    let fieldsHtml = '';
    (item.fields||[]).slice(0,4).forEach(f => {
      fieldsHtml += `
        <div class="card-field">
          <span class="field-key">${esc(f.key)}</span>
          <span class="field-val ${f.sensitive?'masked':''}" data-raw="${esc(f.value)}">${esc(f.value)}</span>
          <span class="copy-icon" data-copy="${esc(f.value)}" title="Copy">⊕</span>
        </div>`;
    });

    let notesHtml = item.notes ? `<div class="card-notes">${esc(item.notes)}</div>` : '';
    let tagsHtml  = (item.tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('');
    let expiryHtml= status ? `<span class="expiry-pill ${status.cls}">${esc(status.label)}</span>` : '';

    return `
      <div class="${cls}" data-item-id="${esc(item.id)}" draggable="false">
        <div class="drag-handle">⣿</div>
        <div class="card-header">
          <div class="card-title-wrap">
            ${item.pinned?'<span class="pin-dot">▲</span>':''}
            <span class="card-title">${esc(item.title)}</span>
          </div>
          <div class="card-actions">
            <button class="card-action-btn pin-btn ${item.pinned?'on':''}" data-id="${esc(item.id)}" title="${item.pinned?'Unpin':'Pin'}">▲</button>
            <button class="card-action-btn dup-btn" data-id="${esc(item.id)}" title="Duplicate">⧉</button>
            <button class="card-action-btn edit-btn" data-id="${esc(item.id)}" title="Edit">✎</button>
            <button class="card-action-btn del-btn" data-id="${esc(item.id)}" title="Delete">✕</button>
          </div>
        </div>
        <div class="card-fields">${fieldsHtml}</div>
        ${notesHtml}
        <div class="card-footer">
          <div class="card-tags">${tagsHtml}</div>
          ${expiryHtml}
        </div>
      </div>`;
  }

  // ── TABLE VIEW ────────────────────────────────────────────────────────────────
  function renderTableView(items) {
    $('#items-grid').hide();
    $('#items-list').hide();
    $('#items-table-wrap').show();
    const $tb = $('#items-tbody').empty();
    items.forEach(item => {
      const status = expiryStatus(item.expiry);
      const cls = [
        item.pinned?'pinned':'',
        status?.cls==='expired'?'expired':'',
        status?.cls==='warn'?'expiry-warn':''
      ].filter(Boolean).join(' ');
      let fieldsHtml = (item.fields||[]).slice(0,3).map(f => `
        <div class="td-field-line">
          <span class="td-key">${esc(f.key)}</span>
          <span class="td-val ${f.sensitive?'masked':''}" data-raw="${esc(f.value)}">${esc(f.value)}</span>
        </div>`).join('');
      let tagsHtml = (item.tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('');
      let expiryHtml = status ? `<span class="expiry-pill ${status.cls}">${esc(status.label)}</span>` : '—';
      $tb.append(`
        <tr class="${cls}" data-item-id="${esc(item.id)}">
          <td class="td-pin">${item.pinned?'▲':''}</td>
          <td class="td-title">${esc(item.title)}</td>
          <td class="td-fields">${fieldsHtml}</td>
          <td><div class="td-tags">${tagsHtml}</div></td>
          <td class="td-expiry">${expiryHtml}</td>
          <td>
            <div class="td-actions">
              <button class="tbl-action-btn pin-btn ${item.pinned?'on':''}" data-id="${esc(item.id)}" title="Pin">▲</button>
              <button class="tbl-action-btn dup-btn" data-id="${esc(item.id)}" title="Duplicate">⧉</button>
              <button class="tbl-action-btn edit-btn" data-id="${esc(item.id)}" title="Edit">✎</button>
              <button class="tbl-action-btn del-btn" data-id="${esc(item.id)}" title="Delete">✕</button>
            </div>
          </td>
        </tr>`);
    });
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────────
  function renderListView(items) {
    $('#items-grid').hide();
    $('#items-table-wrap').hide();
    const $list = $('#items-list').show().empty();
    items.forEach(item => {
      const status = expiryStatus(item.expiry);
      const cls = ['list-item',
        item.pinned?'pinned':'',
        status?.cls==='expired'?'expired':'',
        status?.cls==='warn'?'expiry-warn':''
      ].filter(Boolean).join(' ');
      const preview = (item.fields||[]).slice(0,2).map(f => `${f.key}: ${f.value}`).join(' · ');
      const tagsHtml = (item.tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('');
      const expiryHtml = status ? `<span class="expiry-pill ${status.cls}">${esc(status.label)}</span>` : '';
      $list.append(`
        <div class="${cls}" data-item-id="${esc(item.id)}">
          ${item.pinned?'<span class="li-pin">▲</span>':''}
          <span class="li-title">${esc(item.title)}</span>
          <span class="li-preview">${esc(preview)}</span>
          <div class="li-tags">${tagsHtml}</div>
          <div class="li-expiry">${expiryHtml}</div>
          <div class="li-actions">
            <button class="li-action-btn pin-btn ${item.pinned?'on':''}" data-id="${esc(item.id)}" title="Pin">▲</button>
            <button class="li-action-btn dup-btn" data-id="${esc(item.id)}" title="Duplicate">⧉</button>
            <button class="li-action-btn edit-btn" data-id="${esc(item.id)}" title="Edit">✎</button>
            <button class="li-action-btn del-btn" data-id="${esc(item.id)}" title="Delete">✕</button>
          </div>
        </div>`);
    });
  }

  // ── EXPIRY BANNER ─────────────────────────────────────────────────────────────
  function renderExpiryBanner() {
    const exp  = state.items.filter(i => expiryStatus(i.expiry)?.cls === 'expired').length;
    const warn = state.items.filter(i => expiryStatus(i.expiry)?.cls === 'warn').length;
    const $b = $('#expiry-banner');
    const parts = [];
    if (exp)  parts.push(`⚑ ${exp} expired`);
    if (warn) parts.push(`⚐ ${warn} expiring soon`);
    parts.length ? $b.text(parts.join('  ·  ')).removeClass('hidden') : $b.addClass('hidden');
  }

  // ── DRAG & DROP REORDER ────────────────────────────────────────────────────────
  function attachDrag() {
    $('#items-grid .item-card').each(function () {
      this.draggable = true;
      $(this).on('dragstart', function (e) {
        dragSrcId = $(this).data('item-id');
        e.originalEvent.dataTransfer.effectAllowed = 'move';
        setTimeout(() => $(this).css('opacity', '0.5'), 0);
      });
      $(this).on('dragend', function () { $(this).css('opacity', ''); });
      $(this).on('dragover', function (e) {
        e.preventDefault();
        e.originalEvent.dataTransfer.dropEffect = 'move';
        $('#items-grid .item-card').removeClass('drag-over');
        $(this).addClass('drag-over');
      });
      $(this).on('dragleave', function () { $(this).removeClass('drag-over'); });
      $(this).on('drop', function (e) {
        e.preventDefault();
        $(this).removeClass('drag-over');
        const targetId = $(this).data('item-id');
        if (dragSrcId && targetId && dragSrcId !== targetId) {
          swapItems(dragSrcId, targetId);
        }
        dragSrcId = null;
      });
    });
  }

  function swapItems(aId, bId) {
    const ai = state.items.findIndex(i => i.id === aId);
    const bi = state.items.findIndex(i => i.id === bId);
    if (ai < 0 || bi < 0) return;
    [state.items[ai], state.items[bi]] = [state.items[bi], state.items[ai]];
    saveData();
    renderItems();
  }

  // ── SECTION MODAL ─────────────────────────────────────────────────────────────
  function openSectionModal(secId = null) {
    editSectionId = secId;
    const sec = secId ? secById(secId) : null;
    $('#section-modal-title').text(sec ? 'Edit Section' : 'New Section');
    $('#section-name-input').val(sec?.name || '');
    $('#section-icon-input').val(sec?.icon || '');
    $('#section-modal').removeClass('hidden');
    setTimeout(() => $('#section-name-input').focus(), 60);
  }

  function saveSectionModal() {
    const name = $('#section-name-input').val().trim();
    const icon = $('#section-icon-input').val().trim() || '◈';
    if (!name) { toast('Section name required', 'error'); return; }
    if (editSectionId) {
      const s = secById(editSectionId);
      s.name = name; s.icon = icon;
      toast('Section updated', 'success');
    } else {
      const ns = { id: uid(), name, icon };
      state.sections.push(ns);
      activeSectionId = ns.id;
      toast('Section created', 'success');
    }
    saveData(); renderSidebar(); renderItems(); closeModals();
  }

  // ── ITEM MODAL ────────────────────────────────────────────────────────────────
  function populateSectionSelect(selectId, selectedId) {
    const $s = $(selectId).empty();
    state.sections.forEach(sec => {
      $s.append($('<option>').val(sec.id).text(`${sec.icon} ${sec.name}`)
        .prop('selected', sec.id === selectedId));
    });
  }

  function addDynField(key='', value='', sensitive=false) {
    const id = uid();
    $('#dynamic-fields').append(`
      <div class="dyn-field-row" id="dfr-${id}">
        <input type="text" class="fk-input" placeholder="Field name" value="${esc(key)}">
        <input type="text" class="fv-input" placeholder="Value" value="${esc(value)}">
        <label class="sens-label" title="Mask this field">
          <input type="checkbox" class="sens-check" ${sensitive?'checked':''}>
          mask
        </label>
        <button class="remove-dyn-btn" data-row="${id}">✕</button>
      </div>`);
  }

  function openItemModal(itemId = null) {
    editItemId = itemId;
    $('#dynamic-fields').empty();
    const item = itemId ? state.items.find(i => i.id === itemId) : null;
    $('#item-modal-title').text(item ? 'Edit Item' : 'New Item');
    $('#item-title-input').val(item?.title || '');
    populateSectionSelect('#item-section-select', item?.sectionId || activeSectionId);
    (item?.fields || []).forEach(f => addDynField(f.key, f.value, f.sensitive));
    if (!itemId) addDynField(); // start with one empty row
    $('#item-tags-input').val((item?.tags||[]).join(', '));
    $('#item-notes-input').val(item?.notes || '');
    $('#item-modal').removeClass('hidden');
    setTimeout(() => $('#item-title-input').focus(), 60);
  }

  function collectItemData() {
    const title = $('#item-title-input').val().trim();
    if (!title) { toast('Title is required', 'error'); return null; }
    const sectionId = $('#item-section-select').val();
    const fields = [];
    $('#dynamic-fields .dyn-field-row').each(function () {
      const key = $(this).find('.fk-input').val().trim();
      const val = $(this).find('.fv-input').val().trim();
      const sens = $(this).find('.sens-check').is(':checked');
      if (key) fields.push({ key, value: val, sensitive: sens });
    });
    const tags  = $('#item-tags-input').val().split(',').map(t=>t.trim()).filter(Boolean);
    const notes = $('#item-notes-input').val().trim() || null;
    return { title, sectionId, fields, tags, notes };
  }

  function saveItemModal() {
    const data = collectItemData();
    if (!data) return;
    if (editItemId) {
      const item = state.items.find(i => i.id === editItemId);
      Object.assign(item, data, { updatedAt: Date.now() });
      toast('Item updated', 'success');
    } else {
      state.items.unshift({ id: uid(), createdAt: Date.now(), updatedAt: Date.now(), pinned: false, expiry: null, ...data });
      toast('Item saved', 'success');
    }
    saveData(); renderSidebar(); renderItems(); closeModals();
  }

  // ── BULK ADD MODAL ────────────────────────────────────────────────────────────
  function addBulkRow(rowNum) {
    const id = uid();
    const n = rowNum || ($('#bulk-rows tr').length + 1);
    $('#bulk-rows').append(`
      <tr id="br-${id}">
        <td class="bulk-row-num">${n}</td>
        <td><input type="text" class="bulk-input b-title" placeholder="Title…"></td>
        <td><input type="text" class="bulk-input b-fk1" placeholder="e.g. Username"></td>
        <td><input type="text" class="bulk-input b-fv1" placeholder="Value"></td>
        <td><input type="text" class="bulk-input b-fk2" placeholder="e.g. Password"></td>
        <td><input type="text" class="bulk-input b-fv2" placeholder="Value"></td>
        <td><input type="text" class="bulk-input b-tags" placeholder="tag1, tag2"></td>
        <td><input type="text" class="bulk-input b-notes" placeholder="Notes"></td>
        <td><button class="bulk-del-btn" data-row="${id}">✕</button></td>
      </tr>`);
  }

  function openBulkModal() {
    $('#bulk-rows').empty();
    populateSectionSelect('#bulk-section-select', activeSectionId);
    for (let i = 0; i < 5; i++) addBulkRow(i+1);
    $('#bulk-status').text('');
    $('#bulk-modal').removeClass('hidden');
  }

  function saveBulkItems() {
    const sectionId = $('#bulk-section-select').val();
    let added = 0;
    $('#bulk-rows tr').each(function () {
      const title = $(this).find('.b-title').val().trim();
      if (!title) return; // skip blank rows
      const fk1 = $(this).find('.b-fk1').val().trim();
      const fv1 = $(this).find('.b-fv1').val().trim();
      const fk2 = $(this).find('.b-fk2').val().trim();
      const fv2 = $(this).find('.b-fv2').val().trim();
      const fields = [];
      if (fk1) fields.push({ key: fk1, value: fv1, sensitive: false });
      if (fk2) fields.push({ key: fk2, value: fv2, sensitive: false });
      const tags  = $(this).find('.b-tags').val().split(',').map(t=>t.trim()).filter(Boolean);
      const notes = $(this).find('.b-notes').val().trim() || null;
      state.items.unshift({ id: uid(), createdAt: Date.now(), updatedAt: Date.now(),
        pinned: false, expiry: null, title, sectionId, fields, tags, notes });
      added++;
    });
    if (added === 0) { toast('No valid rows to add', 'error'); return; }
    saveData(); renderSidebar(); renderItems();
    closeModals();
    toast(`${added} item${added!==1?'s':''} added`, 'success');
  }

  // ── ITEM ACTIONS ──────────────────────────────────────────────────────────────
  function deleteItem(id) {
    showConfirm('Delete Item', 'Permanently delete this item?', () => {
      state.items = state.items.filter(i => i.id !== id);
      saveData(); renderSidebar(); renderItems(); toast('Deleted', 'info');
    });
  }

  function duplicateItem(id) {
    const orig = state.items.find(i => i.id === id);
    const copy = JSON.parse(JSON.stringify(orig));
    copy.id = uid(); copy.title += ' (copy)';
    copy.createdAt = Date.now(); copy.pinned = false;
    state.items.unshift(copy);
    saveData(); renderSidebar(); renderItems(); toast('Duplicated', 'success');
  }

  function togglePin(id) {
    const item = state.items.find(i => i.id === id);
    if (!item) return;
    item.pinned = !item.pinned;
    saveData(); renderItems();
  }

  // ── DELETE SECTION ────────────────────────────────────────────────────────────
  function deleteSection(secId) {
    const cnt = itemCount(secId);
    showConfirm('Delete Section',
      cnt > 0 ? `This section has ${cnt} item(s) — all will be deleted. Continue?` : 'Delete this section?',
      () => {
        state.sections = state.sections.filter(s => s.id !== secId);
        state.items    = state.items.filter(i => i.sectionId !== secId);
        if (activeSectionId === secId) activeSectionId = state.sections[0]?.id || null;
        saveData(); renderSidebar(); renderItems(); toast('Section deleted', 'info');
      });
  }

  // ── CONFIRM MODAL ─────────────────────────────────────────────────────────────
  function showConfirm(title, msg, cb) {
    confirmCallback = cb;
    $('#confirm-title').text(title);
    $('#confirm-message').text(msg);
    $('#confirm-modal').removeClass('hidden');
  }

  // ── EXPORT ────────────────────────────────────────────────────────────────────
  function updateExportScope() {
    const $s = $('#export-scope');
    const cur = $s.val();
    $s.find('option:not([value="all"])').remove();
    state.sections.forEach(sec => $s.append($('<option>').val(sec.id).text(`${sec.icon} ${sec.name}`)));
    if (cur) $s.val(cur);
  }

  function doExport() {
    const scope = $('#export-scope').val();
    const fmt   = $('input[name="export-fmt"]:checked').val();
    const items   = scope === 'all' ? state.items : state.items.filter(i => i.sectionId === scope);
    const sections= scope === 'all' ? state.sections : state.sections.filter(s => s.id === scope);

    if (fmt === 'json') {
      downloadBlob(new Blob([JSON.stringify({sections,items},null,2)],{type:'application/json'}), 'datavault.json');
    } else if (fmt === 'csv') {
      const rows = [['ID','Title','Section','Fields','Tags','Expiry','Notes','Created']];
      items.forEach(i => {
        const s = secById(i.sectionId);
        rows.push([i.id, i.title, s?.name||'', (i.fields||[]).map(f=>`${f.key}:${f.value}`).join('|'),
          (i.tags||[]).join(', '), i.expiry||'', (i.notes||'').replace(/\n/g,' '),
          new Date(i.createdAt).toISOString()]);
      });
      const csv = rows.map(r => r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
      downloadBlob(new Blob([csv],{type:'text/csv'}), 'datavault.csv');
    } else {
      printExport(sections, items);
    }
    closeModals(); toast('Export complete', 'success');
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function printExport(sections, items) {
    const secMap = {}; sections.forEach(s => { secMap[s.id] = s; });
    const grouped = {};
    items.forEach(i => { if (!grouped[i.sectionId]) grouped[i.sectionId]=[]; grouped[i.sectionId].push(i); });

    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>DataVault Export</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'IBM Plex Sans',sans-serif;font-size:13px;color:#111;padding:32px;max-width:960px;margin:auto;background:#fff}
      header{border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:baseline}
      header h1{font-family:'IBM Plex Mono',monospace;font-size:18px;letter-spacing:0.06em}
      header span{font-size:11px;color:#666}
      h2{font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#666;margin:24px 0 10px;border-bottom:1px solid #ddd;padding-bottom:5px}
      .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;margin-bottom:8px}
      .card{border:1px solid #ddd;border-radius:8px;padding:12px 14px;page-break-inside:avoid}
      .card.pinned{border-left:3px solid #c84b2f}
      .card.expired{background:#fff5f5;border-color:#f0aaaa}
      .card.warn{background:#fffbf0;border-color:#f0d070}
      .c-title{font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:13px;margin-bottom:8px}
      .c-field{display:flex;gap:10px;font-size:11px;margin:3px 0}
      .c-key{color:#888;min-width:70px;flex-shrink:0}
      .c-val{color:#333;word-break:break-all}
      .c-notes{font-size:11px;color:#777;font-style:italic;border-top:1px solid #eee;margin-top:8px;padding-top:6px}
      .c-footer{display:flex;justify-content:space-between;align-items:center;margin-top:8px;flex-wrap:wrap;gap:4px}
      .tags{display:flex;gap:3px;flex-wrap:wrap}
      .tag{font-family:'IBM Plex Mono',monospace;font-size:9px;background:#eee;padding:2px 7px;border-radius:20px}
      .expiry{font-family:'IBM Plex Mono',monospace;font-size:10px;color:#888}
      .expiry.expired{color:#c0201e} .expiry.warn{color:#8a5200}
      @media print{body{padding:12px}.card{break-inside:avoid}}
    </style></head><body>
    <header><h1>◈ DataVault</h1><span>Exported ${new Date().toLocaleString()}</span></header>`;

    Object.entries(grouped).forEach(([sid, grp]) => {
      const s = secMap[sid];
      html += `<h2>${s ? s.icon+' '+s.name : 'Unknown'}</h2><div class="grid">`;
      grp.forEach(item => {
        const st = expiryStatus(item.expiry);
        const cls = [item.pinned?'pinned':'', st?.cls==='expired'?'expired':'', st?.cls==='warn'?'warn':''].filter(Boolean).join(' ');
        let flds = (item.fields||[]).map(f =>
          `<div class="c-field"><span class="c-key">${esc(f.key)}</span><span class="c-val">${f.sensitive?'••••••':esc(f.value)}</span></div>`
        ).join('');
        let notes = item.notes ? `<div class="c-notes">${esc(item.notes)}</div>` : '';
        let tags = (item.tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('');
        let expiry = st ? `<span class="expiry ${st.cls}">${esc(st.label)}</span>` : '';
        html += `<div class="card ${cls}"><div class="c-title">${esc(item.title)}</div>${flds}${notes}<div class="c-footer"><div class="tags">${tags}</div>${expiry}</div></div>`;
      });
      html += `</div>`;
    });
    html += `</body></html>`;
    const w = window.open('','_blank');
    w.document.write(html); w.document.close();
    setTimeout(() => w.print(), 500);
  }

  // ── IMPORT ────────────────────────────────────────────────────────────────────
  function openImportModal() {
    importBuffer = null;
    $('#import-file-input').val('');
    $('#import-preview').addClass('hidden').empty();
    $('#do-import-btn').prop('disabled', true);
    $('#import-modal').removeClass('hidden');
  }

  function handleImportFile(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();
    reader.onload = e => {
      try {
        if (ext === 'json') {
          const p = JSON.parse(e.target.result);
          validateImport(p);
        } else if (ext === 'csv') {
          validateImport(parseCSV(e.target.result));
        } else { toast('Unsupported format','error'); }
      } catch(err) { toast('Parse error: '+err.message,'error'); }
    };
    reader.readAsText(file);
  }

  function validateImport(data) {
    const secs = data.sections||[];
    const items = data.items||[];
    if (!Array.isArray(items)) throw new Error('Missing items array');
    importBuffer = { sections: secs, items };
    $('#import-preview').removeClass('hidden').html(`<strong>Ready to import:</strong><br>${secs.length} section(s) · ${items.length} item(s)`);
    $('#do-import-btn').prop('disabled', false);
  }

  function parseCSV(csv) {
    const lines = csv.split('\n').map(l=>l.trim()).filter(Boolean);
    const header = parseCSVRow(lines[0]);
    const items = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVRow(lines[i]);
      const row = {}; header.forEach((h,idx) => { row[h] = cols[idx]||''; });
      const fields = (row['Fields']||'').split('|').map(f => {
        const [k,...rest] = f.split(':');
        return { key: k?.trim(), value: rest.join(':').trim(), sensitive: false };
      }).filter(f=>f.key);
      items.push({
        id: row['ID']||uid(), title: row['Title']||'(untitled)',
        sectionId: row['Section']||(state.sections[0]?.id||uid()),
        fields, tags: (row['Tags']||'').split(',').map(t=>t.trim()).filter(Boolean),
        expiry: null, notes: row['Notes']||null,
        createdAt: row['Created'] ? new Date(row['Created']).getTime() : Date.now(),
        updatedAt: Date.now(), pinned: false
      });
    }
    return { sections: [], items };
  }

  function parseCSVRow(line) {
    const result=[]; let cur=''; let inQ=false;
    for (let i=0;i<line.length;i++) {
      const ch=line[i];
      if (ch==='"') { inQ=!inQ; }
      else if (ch===','&&!inQ) { result.push(cur); cur=''; }
      else cur+=ch;
    }
    result.push(cur);
    return result.map(s=>s.replace(/^"|"$/g,'').replace(/""/g,'"'));
  }

  function doImport() {
    if (!importBuffer) return;
    let newSecs=0, newItems=0, updItems=0;
    importBuffer.sections.forEach(s => {
      if (!secById(s.id)) { state.sections.push(s); newSecs++; }
    });
    importBuffer.items.forEach(imp => {
      if (!secById(imp.sectionId)) {
        const byName = state.sections.find(s=>s.name===imp.sectionId);
        imp.sectionId = byName?.id || (state.sections[0]?.id || uid());
      }
      const ex = state.items.find(i=>i.id===imp.id);
      if (ex) { Object.assign(ex, imp, {updatedAt:Date.now()}); updItems++; }
      else { state.items.unshift(imp); newItems++; }
    });
    saveData(); renderSidebar(); renderItems(); closeModals();
    toast(`Imported: ${newItems} added, ${updItems} updated, ${newSecs} sections`, 'success', 4000);
  }

  // ── MODAL UTILITIES ───────────────────────────────────────────────────────────
  function closeModals() {
    $('.modal').addClass('hidden');
    editItemId = editSectionId = confirmCallback = importBuffer = null;
  }

  // ── THEME ─────────────────────────────────────────────────────────────────────
  function applyTheme(t) {
    $('html').attr('data-theme', t);
    try { localStorage.setItem(THEME_KEY, t); } catch(e) {}
  }

  // ── EVENT BINDINGS ────────────────────────────────────────────────────────────
  function bindEvents() {

    // Sidebar collapse
    $('#sidebar-collapse-btn, #sidebar-tab').on('click', () => {
      $('body').toggleClass('sidebar-collapsed');
      const collapsed = $('body').hasClass('sidebar-collapsed');
      $('#sidebar-tab').text(collapsed ? '›' : '‹');
    });

    // Section nav
    $(document).on('click', '.section-nav-btn', function () {
      activeSectionId = $(this).data('sec-id');
      activeTagFilters = [];
      $('#section-search').val('');
      $('#global-search').val('');
      $('#expiry-filter, #pinned-filter').val('');
      renderSidebar(); renderItems(); renderTagChips();
    });

    $(document).on('click', '.edit-sec', function(e) { e.stopPropagation(); openSectionModal($(this).data('sec-id')); });
    $(document).on('click', '.del-sec',  function(e) { e.stopPropagation(); deleteSection($(this).data('sec-id')); });
    $('#add-section-btn').on('click', () => openSectionModal());
    $('#section-save-btn').on('click', saveSectionModal);
    $('#section-name-input').on('keydown', e => { if(e.key==='Enter') saveSectionModal(); });

    // Item add/edit
    $('#add-item-btn, #empty-add-btn').on('click', () => openItemModal());
    $('#bulk-add-btn').on('click', openBulkModal);
    $('#item-save-btn').on('click', saveItemModal);
    $('#item-title-input').on('keydown', e => { if(e.key==='Enter') saveItemModal(); });
    $('#add-field-btn').on('click', () => addDynField());
    $(document).on('click', '.remove-dyn-btn', function() {
      $(`#dfr-${$(this).data('row')}`).remove();
    });

    // Bulk add
    $('#add-bulk-row-btn').on('click', () => addBulkRow($('#bulk-rows tr').length + 1));
    $(document).on('click', '.bulk-del-btn', function() { $(`#br-${$(this).data('row')}`).remove(); });
    $('#bulk-save-btn').on('click', saveBulkItems);

    // Item actions (card / table / list)
    $(document).on('click', '.edit-btn', function(e) { e.stopPropagation(); openItemModal($(this).data('id')); });
    $(document).on('click', '.del-btn',  function(e) { e.stopPropagation(); deleteItem($(this).data('id')); });
    $(document).on('click', '.dup-btn',  function(e) { e.stopPropagation(); duplicateItem($(this).data('id')); });
    $(document).on('click', '.pin-btn',  function(e) { e.stopPropagation(); togglePin($(this).data('id')); });
    $(document).on('click', '.copy-icon', function(e) { e.stopPropagation(); copyText($(this).data('copy')); });
    $(document).on('click', '.field-val.masked, .td-val.masked', function() { $(this).toggleClass('revealed'); });

    // View switcher
    $('.view-btn').on('click', function() {
      currentView = $(this).data('view');
      $('.view-btn').removeClass('active');
      $(this).addClass('active');
      renderItems();
    });

    // Reorder
    $('#reorder-btn').on('click', function() {
      reorderMode = !reorderMode;
      $('body').toggleClass('reorder-mode', reorderMode);
      $(this).toggleClass('active', reorderMode);
      renderItems();
      toast(reorderMode ? 'Drag cards to reorder' : 'Reorder off', 'info', 1600);
    });

    // Search & filters
    $('#global-search').on('input', function() { if($(this).val()) $('#section-search').val(''); renderItems(); });
    $('#section-search').on('input', () => { renderItems(); updateFilterBadge(); });
    $('#sort-select').on('change', () => renderItems());

    // Advanced filter toggle
    $('#advanced-filter-btn').on('click', function() {
      advancedOpen = !advancedOpen;
      $('#advanced-filters').toggleClass('hidden', !advancedOpen);
      if (advancedOpen) renderTagChips();
    });

    // Tag chip selection
    $(document).on('click', '.tag-chip', function() {
      const tag = $(this).data('tag');
      if (activeTagFilters.includes(tag)) {
        activeTagFilters = activeTagFilters.filter(t => t !== tag);
      } else {
        activeTagFilters.push(tag);
      }
      renderTagChips(); renderItems();
    });

    // Expiry / pinned filter change
    $('#expiry-filter, #pinned-filter').on('change', () => renderItems());

    // Clear all filters
    $('#clear-all-filters').on('click', () => {
      activeTagFilters = [];
      $('#expiry-filter, #pinned-filter').val('');
      $('#section-search').val('');
      renderTagChips(); renderItems();
    });

    // Theme
    $('#theme-toggle').on('click', () => {
      const cur = $('html').attr('data-theme');
      applyTheme(cur === 'dark' ? 'light' : 'dark');
    });

    // Export / Import
    $('#export-btn').on('click', () => { updateExportScope(); $('#export-modal').removeClass('hidden'); });
    $('#do-export-btn').on('click', doExport);
    $('#import-btn').on('click', openImportModal);
    $('#file-drop-zone').on('click', () => $('#import-file-input').click());
    $('#import-file-input').on('change', function() { handleImportFile(this.files[0]); });
    $('#file-drop-zone').on('dragover', function(e) { e.preventDefault(); $(this).addClass('dragover'); });
    $('#file-drop-zone').on('dragleave drop', function(e) {
      e.preventDefault(); $(this).removeClass('dragover');
      if (e.type === 'drop') handleImportFile(e.originalEvent.dataTransfer.files[0]);
    });
    $('#do-import-btn').on('click', doImport);

    // Confirm
    $('#confirm-ok-btn').on('click', () => { if(confirmCallback) confirmCallback(); closeModals(); });

    // Close modals
    $(document).on('click', '.modal-close, .modal-cancel, .modal-overlay', closeModals);

    // Keyboard shortcuts
    $(document).on('keydown', function(e) {
      if ($('.modal:not(.hidden)').length) { if(e.key==='Escape') closeModals(); return; }
      if ((e.ctrlKey||e.metaKey) && e.key==='n') { e.preventDefault(); openItemModal(); }
      if (e.key==='/' && !$(e.target).is('input,textarea,select')) { e.preventDefault(); $('#global-search').focus(); }
    });
  }

  // ── INIT ──────────────────────────────────────────────────────────────────────
  function init() {
    let theme = 'dark';
    try { theme = localStorage.getItem(THEME_KEY) || 'dark'; } catch(e) {}
    applyTheme(theme);
    loadData();
    activeSectionId = state.sections[0]?.id || null;
    bindEvents();
    renderSidebar();
    renderItems();
    renderTagChips();
  }

  return { init };

})(jQuery);

$(document).ready(() => DataVault.init());