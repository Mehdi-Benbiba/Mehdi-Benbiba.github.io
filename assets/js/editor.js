/* Local file-backed content editor. No account connection or code editing required. */
(() => {
  'use strict';
  let data, token, section = 'projects', editingId = null, busy = false, confirmAction;
  const $ = id => document.getElementById(id);
  const element = (tag, cls = '', text = '') => { const e = document.createElement(tag); e.className = cls; e.textContent = text; return e; };
  const status = (text, error = false) => { $('editor-save-status').textContent = text; $('editor-save-status').classList.toggle('status-error', error); };
  const clone = value => JSON.parse(JSON.stringify(value));
  async function request(path, body) {
    const response = await fetch(path, {method: body === undefined ? 'GET' : 'POST', headers: {'Content-Type': 'application/json', 'X-Portfolio-Token': token}, body: body === undefined ? undefined : JSON.stringify(body)});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'The change could not be saved.');
    return result;
  }
  async function save(next) {
    if (busy) throw new Error('A save is already in progress. Please wait a moment.');
    busy = true; status('Saving to your portfolio folder…');
    try { data = await request('/api/content', {content: next, expectedRevision: data.revision}); status('Saved to your folder · ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})); }
    catch (error) { status(error.message, true); throw error; }
    finally { busy = false; }
  }
  function download(blob, name) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  function render() {
    $('editor-list-title').textContent = section === 'projects' ? 'Projects' : 'Articles';
    $('editor-list-description').textContent = section === 'projects' ? 'Add a case study, upload a screenshot, and choose what to feature.' : 'Share your published articles with a title, a short introduction, and a link.';
    $('add-entry').textContent = section === 'projects' ? '+ Add new project' : '+ Add new blog';
    const list = $('editor-entries'); list.replaceChildren();
    data[section].forEach((item, i) => {
      const row = element('div', 'editor-entry');
      const cover = element('div', 'editor-entry-cover art-' + ['lavender', 'mint', 'peach'][i % 3]);
      if (item.image) { const img = document.createElement('img'); img.src = item.image; img.alt = ''; cover.append(img); } else cover.append(element('span', '', section === 'projects' ? '▥' : '◈'));
      const info = element('div', 'editor-entry-copy'); const label = element('div', 'eyebrow', item.category); if (item.featured) label.append(element('span', 'featured-badge', 'Featured'));
      info.append(label, element('h3', '', item.title), element('p', '', item.summary));
      const actions = element('div', 'entry-actions');
      const edit = element('button', 'small-btn', 'Edit'); edit.type = 'button'; edit.setAttribute('aria-label', 'Edit ' + item.title); edit.addEventListener('click', () => openEntry(item));
      const up = element('button', 'small-btn', '↑'); up.type = 'button'; up.disabled = i === 0; up.setAttribute('aria-label', 'Move ' + item.title + ' up'); up.addEventListener('click', () => move(i, -1));
      const down = element('button', 'small-btn', '↓'); down.type = 'button'; down.disabled = i === data[section].length - 1; down.setAttribute('aria-label', 'Move ' + item.title + ' down'); down.addEventListener('click', () => move(i, 1));
      const remove = element('button', 'small-btn remove-button', 'Remove'); remove.type = 'button'; remove.setAttribute('aria-label', 'Remove ' + item.title);
      remove.addEventListener('click', () => confirm('Remove this entry?', '“' + item.title + '” will be removed from the website. A copy of the previous content is kept in local history. You can also download a backup first.', async () => { const next = clone(data); next[section] = next[section].filter(entry => entry.id !== item.id); await save(next); render(); }));
      actions.append(edit, up, down, remove); row.append(cover, info, actions); list.append(row);
    });
    if (!data[section].length) list.append(element('div', 'empty-state', 'No entries yet. Add a ' + (section === 'projects' ? 'project' : 'blog post') + ' above.'));
  }
  async function move(index, delta) { const next = clone(data); [next[section][index], next[section][index + delta]] = [next[section][index + delta], next[section][index]]; try { await save(next); render(); } catch {} }
  function chooseSection(nextSection) {
    section = nextSection;
    document.querySelectorAll('[data-editor-tab]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.editorTab === section)));
    $('editor-list-panel').hidden = section === 'profile'; $('editor-profile-panel').hidden = section !== 'profile';
    if (section !== 'profile') render();
  }
  document.querySelectorAll('[data-editor-tab]').forEach(button => button.addEventListener('click', () => chooseSection(button.dataset.editorTab)));
  function openEntry(item = null) {
    editingId = item?.id || null; const project = section === 'projects'; $('entry-form').reset(); $('entry-error').textContent = '';
    $('entry-dialog-title').textContent = (item ? 'Edit ' : 'Add new ') + (project ? 'project' : 'blog post'); $('save-entry').textContent = project ? 'Save project' : 'Save blog post';
    document.querySelectorAll('.project-only').forEach(e => e.hidden = !project); document.querySelectorAll('.blog-only').forEach(e => e.hidden = project);
    ['title', 'category', 'url', 'summary', 'image', 'challenge', 'approach', 'insights', 'date'].forEach(key => $('entry-' + key).value = item?.[key] || '');
    $('entry-project-group').value = item?.projectGroup || 'data-analysis'; $('entry-embed-url').value = item?.embedUrl || ''; $('entry-tools').value = item?.tools?.join(', ') || ''; $('entry-featured').checked = item ? item.featured : true;
    $('entry-image-preview').hidden = !item?.image; if (item?.image) $('entry-image-preview').src = item.image;
    $('entry-dialog').showModal();
  }
  $('add-entry').addEventListener('click', () => openEntry());
  $('entry-image-file').addEventListener('change', event => {
    const file = event.target.files[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { $('entry-error').textContent = 'Choose an image under 5 MB.'; event.target.value = ''; return; }
    const reader = new FileReader(); reader.onload = () => { $('entry-image-preview').src = reader.result; $('entry-image-preview').hidden = false; }; reader.readAsDataURL(file);
  });
  $('entry-form').addEventListener('submit', async event => {
    event.preventDefault(); const button = $('save-entry'); button.disabled = true; $('entry-error').textContent = '';
    try {
      const entry = {id: editingId || crypto.randomUUID(), featured: $('entry-featured').checked};
      ['title', 'category', 'url', 'summary', 'image'].forEach(key => entry[key] = $('entry-' + key).value.trim());
      if (section === 'projects') { entry.projectGroup = $('entry-project-group').value; entry.embedUrl = $('entry-embed-url').value.trim(); entry.tools = $('entry-tools').value.split(',').map(text => text.trim()).filter(Boolean); ['challenge', 'approach', 'insights'].forEach(key => entry[key] = $('entry-' + key).value.trim()); }
      else entry.date = $('entry-date').value;
      const file = $('entry-image-file').files[0];
      if (file) { const encoded = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('The image could not be read.')); reader.readAsDataURL(file); }); entry.image = (await request('/api/upload', {data: encoded})).path; }
      const next = clone(data); const index = next[section].findIndex(item => item.id === editingId); if (index > -1) next[section][index] = entry; else next[section].push(entry);
      await save(next); render(); $('entry-dialog').close();
    } catch (error) { $('entry-error').textContent = error.message; }
    finally { button.disabled = false; }
  });
  function confirm(title, description, callback) { $('confirm-title').textContent = title; $('confirm-description').textContent = description; $('confirm-error').textContent = ''; confirmAction = callback; $('confirm-dialog').showModal(); }
  $('confirm-action').addEventListener('click', async () => { $('confirm-action').disabled = true; try { await confirmAction(); $('confirm-dialog').close(); } catch (error) { $('confirm-error').textContent = error.message; } finally { $('confirm-action').disabled = false; } });
  $('download-backup').addEventListener('click', () => download(new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'}), 'mehdi-portfolio-content-' + new Date().toISOString().slice(0, 10) + '.json'));
  $('import-backup').addEventListener('change', async event => {
    const file = event.target.files[0]; event.target.value = ''; if (!file) return;
    try { if (file.size > 4 * 1024 * 1024) throw new Error('The backup is too large.'); const imported = JSON.parse(await file.text()); if (imported.version !== 1 || !Array.isArray(imported.projects) || !Array.isArray(imported.blogs) || !imported.profile) throw new Error('Choose a valid portfolio JSON backup.');
      confirm('Import this backup?', `This will replace your current profile, projects, and blogs with ${imported.projects.length} projects and ${imported.blogs.length} blog posts. A previous copy is kept in local history. Keep your image files in the portfolio folder.`, async () => { await save(imported); fillProfile(); if (section !== 'profile') render(); });
    } catch (error) { status(error.message, true); }
  });
  $('export-website').addEventListener('click', async () => {
    const button = $('export-website'); button.disabled = true;
    try { const response = await fetch('/api/export', {headers: {'X-Portfolio-Token': token}}); if (!response.ok) throw new Error('The website could not be packaged.'); download(await response.blob(), 'mehdi-portfolio-website.zip'); status('Website downloaded. It includes your saved content and images.'); }
    catch (error) { status(error.message, true); } finally { button.disabled = false; }
  });
  function fillProfile() {
    [...$('profile-form').elements].forEach(field => { if (field.name && field.name !== 'formId') field.value = field.name === 'certifications' ? data.profile.certifications.join('\n') : data.profile[field.name] || ''; });
    $('contact-form-id').value = data.contact?.formId || ''; $('delivery-status').textContent = data.contact?.formId ? 'Form ID saved. Send a message from the Contact page to verify delivery.' : 'Mailbox activation is still required before visitors can send messages.';
  }
  $('profile-form').addEventListener('submit', async event => {
    event.preventDefault(); const next = clone(data); const form = new FormData(event.currentTarget); $('save-profile').disabled = true;
    form.forEach((value, key) => { if (key === 'formId') return; next.profile[key] = key === 'certifications' ? value.split('\n').map(text => text.trim()).filter(Boolean) : value.trim(); }); next.contact = {formId: form.get('formId').trim()};
    try { await save(next); fillProfile(); document.querySelectorAll('[data-content="name"]').forEach(e => e.textContent = data.profile.name); } catch {} finally { $('save-profile').disabled = false; }
  });
  $('activation-form').addEventListener('submit', async event => {
    event.preventDefault(); const form = event.currentTarget; const email = $('owner-email').value.trim();
    try { await request('/api/owner', {email}); form.action = 'https://formsubmit.co/' + encodeURIComponent(email); form.submit(); $('activation-status').textContent = 'Complete verification in the FormSubmit tab, then check your inbox for the activation email.'; }
    catch (error) { $('activation-status').textContent = error.message; }
  });
  async function start() {
    try {
      const response = await fetch('/api/status'); if (!response.ok) throw new Error('Local editor is unavailable.'); const result = await response.json(); if (!result.localEditor) throw new Error('Local editor is unavailable.'); token = result.token;
      data = await request('/api/content'); const owner = await request('/api/owner'); $('owner-email').value = owner.email || '';
      $('editor-workspace').hidden = false; status('All changes saved in your portfolio folder'); fillProfile();
      const create = new URLSearchParams(location.search).get('new'); chooseSection(create === 'blog' ? 'blogs' : 'projects'); if (['project', 'blog'].includes(create)) { openEntry(); history.replaceState(null, '', location.pathname); }
    } catch { $('editor-unavailable').hidden = false; }
  }
  start();
})();
