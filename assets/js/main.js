/* Public portfolio rendering. Content is maintained through editor.html. */
(() => {
  'use strict';
  const menu = document.querySelector('.menu-toggle');
  const navigation = document.getElementById('primary-navigation');
  if (menu && navigation) {
    const closeMenu = () => { menu.setAttribute('aria-expanded', 'false'); menu.querySelector('span').textContent = 'Menu'; navigation.classList.remove('is-open'); };
    menu.addEventListener('click', () => {
      const open = menu.getAttribute('aria-expanded') !== 'true';
      menu.setAttribute('aria-expanded', String(open)); menu.querySelector('span').textContent = open ? 'Close' : 'Menu'; navigation.classList.toggle('is-open', open);
    });
    navigation.querySelectorAll('a').forEach(anchor => anchor.addEventListener('click', closeMenu));
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus(); } });
    document.addEventListener('click', event => { if (!event.target.closest('.site-header')) closeMenu(); });
    matchMedia('(min-width: 641px)').addEventListener('change', event => { if (event.matches) closeMenu(); });
  }
  const content = window.PORTFOLIO_CONTENT;
  if (!content) return;
  const profile = content.profile;
  const node = (tag, className = '', text = '') => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };
  const link = (label, url, className = '') => {
    const a = node('a', className, label);
    try { const parsed = new URL(url); if (!['https:', 'http:'].includes(parsed.protocol)) return a; a.href = parsed.href; a.target = '_blank'; a.rel = 'noopener noreferrer'; } catch {}
    return a;
  };
  const paragraphs = (parent, text) => (text || '').split(/\n\s*\n/).filter(Boolean).forEach(copy => parent.append(node('p', '', copy)));
  const socialIcon = platform => {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('class', 'social-icon');
    svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false'); svg.setAttribute('fill', 'currentColor');
    const paths = {
      linkedin: 'M20.45 2H3.55A1.55 1.55 0 0 0 2 3.55v16.9A1.55 1.55 0 0 0 3.55 22h16.9A1.55 1.55 0 0 0 22 20.45V3.55A1.55 1.55 0 0 0 20.45 2ZM8 19H5V9h3ZM6.5 7.7a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5ZM19 19h-3v-5.2c0-1.24-.02-2.83-1.73-2.83-1.73 0-2 1.35-2 2.74V19h-3V9h2.88v1.37h.04a3.16 3.16 0 0 1 2.85-1.57C18.09 8.8 19 10.81 19 13.42Z',
      github: 'M12 .8a11.4 11.4 0 0 0-3.6 22.22c.57.1.78-.25.78-.55v-2.12c-3.17.69-3.84-1.35-3.84-1.35-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.68 1.25 3.33.96.1-.74.4-1.25.73-1.54-2.53-.29-5.19-1.27-5.19-5.64 0-1.25.45-2.26 1.17-3.06-.12-.29-.51-1.45.11-3.02 0 0 .96-.31 3.14 1.17a10.86 10.86 0 0 1 5.71 0c2.18-1.48 3.13-1.17 3.13-1.17.62 1.57.23 2.73.11 3.02a4.4 4.4 0 0 1 1.17 3.06c0 4.38-2.67 5.35-5.21 5.63.41.36.77 1.05.77 2.12v3.13c0 .3.2.66.78.55A11.4 11.4 0 0 0 12 .8Z'
    };
    if (platform === 'medium') {
      [[7, 12, 6.5, 6.5], [17.35, 12, 3.15, 6.1], [22.25, 12, .95, 5.4]].forEach(([cx, cy, rx, ry]) => { const ellipse = document.createElementNS(ns, 'ellipse'); Object.entries({cx, cy, rx, ry}).forEach(([key, value]) => ellipse.setAttribute(key, value)); svg.append(ellipse); });
    } else { const path = document.createElementNS(ns, 'path'); path.setAttribute('d', paths[platform]); svg.append(path); }
    return svg;
  };
  document.querySelectorAll('[data-content]').forEach(element => {
    const value = profile[element.dataset.content] || '';
    if (element.dataset.paragraphs !== undefined) { element.replaceChildren(); paragraphs(element, value); }
    else element.textContent = value;
  });
  document.querySelectorAll('[data-social-links]').forEach(parent => {
    parent.replaceChildren();
    [['linkedin', 'LinkedIn'], ['github', 'GitHub'], ['medium', 'Medium']].forEach(([key, label]) => {
      if (!profile[key]) return;
      const anchor = link('', profile[key], 'social-link social-' + key);
      const arrow = node('span', 'social-arrow', '↗'); arrow.setAttribute('aria-hidden', 'true');
      anchor.append(socialIcon(key), node('span', '', label), arrow); parent.append(anchor);
    });
  });
  const work = document.querySelector('[data-work-list]');
  if (work) { work.replaceChildren(); profile.currentWork.split('\n').filter(Boolean).forEach(text => work.append(node('li', '', text))); }
  const certs = document.querySelector('[data-certifications]');
  if (certs) {
    certs.replaceChildren();
    profile.certifications.forEach((text, i) => {
      const row = node('div', 'qualification'); row.append(node('span', 'qualification-icon', text.toLowerCase().includes('ongoing') ? '◌' : '✓'), node('p', '', text));
      certs.append(row);
    });
  }
  const skills = document.querySelector('[data-skills]');
  if (skills) {
    skills.replaceChildren();
    profile.skills.split('\n').filter(Boolean).forEach((text, i) => {
      const at = text.indexOf(':'); const card = node('div', 'skill-card');
      card.append(node('span', 'step-num', String(i + 1).padStart(2, '0')), node('h3', '', at > -1 ? text.slice(0, at) : text), node('p', '', at > -1 ? text.slice(at + 1).trim() : ''));
      skills.append(card);
    });
  }
  const projectDialog = document.getElementById('project-dialog');
  function openProject(project) {
    document.getElementById('project-dialog-category').textContent = project.category;
    document.getElementById('project-dialog-title').textContent = project.title;
    const body = document.getElementById('project-dialog-content'); body.replaceChildren();
    if (project.image) { const image = node('img', 'case-study-image'); image.src = project.image; image.alt = project.title + ' dashboard'; body.append(image); }
    paragraphs(body, project.summary);
    [['Objective', project.challenge], ['Method', project.approach], ['Findings', project.insights]].forEach(([heading, copy]) => { if (copy) { body.append(node('h3', '', heading)); paragraphs(body, copy); } });
    const tags = node('div', 'tags'); project.tools.forEach(tool => tags.append(node('span', '', tool))); body.append(tags);
    body.append(link('View repository on GitHub ↗', project.url, 'btn btn-primary project-source'));
    projectDialog.showModal();
  }
  function projectCard(project, index) {
    const button = node('button', 'project'); button.type = 'button'; button.dataset.project = project.id; button.dataset.category = project.category; button.setAttribute('aria-label', 'View ' + project.title + ' case study');
    const art = node('div', 'project-art art-' + ['lavender', 'mint', 'peach'][index % 3]);
    if (project.image) { const image = node('img', 'project-cover'); image.src = project.image; image.alt = ''; image.loading = 'lazy'; art.append(image); }
    else { art.append(node('span', 'project-cover-symbol', '▥')); }
    art.setAttribute('aria-hidden', 'true');
    const info = node('div', 'project-info'); const category = node('div', 'project-category', project.category);
    info.append(category, node('h3', '', project.title), node('p', '', project.summary));
    const tags = node('div', 'tags'); project.tools.forEach(tool => tags.append(node('span', '', tool))); info.append(tags, node('span', 'card-action', 'View case study →')); button.append(art, info);
    button.addEventListener('click', () => openProject(project)); return button;
  }
  document.querySelectorAll('[data-project-grid]').forEach(grid => {
    const featured = grid.dataset.projectGrid === 'featured';
    const items = featured ? content.projects.filter(p => p.featured).slice(0, 3) : content.projects;
    grid.replaceChildren(); items.forEach((item, index) => grid.append(projectCard(item, index)));
    if (!items.length) grid.append(node('p', 'empty-state', 'No projects to display.'));
  });
  const filters = document.querySelector('[data-project-filters]');
  if (filters) {
    filters.replaceChildren();
    ['All projects', ...new Set(content.projects.map(project => project.category))].forEach((label, i) => {
      const button = node('button', 'filter', label); button.type = 'button'; button.setAttribute('aria-pressed', String(i === 0));
      button.addEventListener('click', () => {
        filters.querySelectorAll('button').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
        let count = 0; document.querySelectorAll('[data-project-grid="all"] .project').forEach(card => { card.hidden = i !== 0 && card.dataset.category !== label; if (!card.hidden) count++; });
        document.getElementById('filter-status').textContent = count + ' projects shown';
      }); filters.append(button);
    });
  }
  document.querySelectorAll('[data-blog-grid]').forEach(grid => {
    const featured = grid.dataset.blogGrid === 'featured';
    const posts = featured ? content.blogs.filter(post => post.featured).slice(0, 3) : content.blogs;
    grid.replaceChildren();
    posts.forEach((post, i) => {
      const card = link('', post.url, 'blog-card');
      const art = node('div', 'blog-art art-' + ['lavender', 'mint', 'peach'][i % 3]); art.setAttribute('aria-hidden', 'true');
      if (post.image) { const image = node('img', 'blog-cover'); image.src = post.image; image.alt = ''; image.loading = 'lazy'; art.append(image); }
      else art.append(node('span', 'blog-art-label', post.category.toUpperCase()), node('span', 'blog-art-symbol', ['◈', 'ƒ', '▥', '⌁'][i % 4]), node('span', 'blog-art-bottom', 'MEHDI ON MEDIUM ↗'));
      const copy = node('div', 'blog-card-copy'); copy.append(node('div', 'eyebrow', post.category), node('h3', '', post.title), node('p', '', post.summary));
      const date = post.date ? new Date(post.date + 'T12:00:00').toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'}) : 'On Medium';
      const meta = node('div', 'blog-meta', date); meta.append(node('span', '', 'Read on Medium ↗')); copy.append(meta); card.append(art, copy); grid.append(card);
    });
    if (!posts.length) grid.append(node('p', 'empty-state', 'No articles to display.'));
  });
  document.querySelector('.dashboard-zoom')?.addEventListener('click', () => document.getElementById('dashboard-dialog').showModal());
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.querySelectorAll('.close-dialog,.close-dialog-btn').forEach(button => button.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('click', event => { if (event.target !== dialog) return; const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); });
  });
  const form = document.getElementById('contact-form');
  if (form) {
    const id = content.contact?.formId;
    const submitButton = form.querySelector('button[type="submit"]');
    const status = document.getElementById('contact-status');
    const privacy = document.getElementById('contact-privacy');
    function resetSubmission() { submitButton.disabled = !id; submitButton.textContent = 'Send message'; }
    if (id) {
      form.action = 'https://formsubmit.co/' + encodeURIComponent(id);
      status.hidden = true;
      privacy.textContent = 'Your name, email, and message are processed by FormSubmit so I can reply.';
    } else {
      status.textContent = '';
      if (profile.linkedin) status.append(link('Contact me on LinkedIn ↗', profile.linkedin, 'text-link'));
      privacy.hidden = true;
      form.querySelectorAll('.field').forEach(field => { field.hidden = !field.contains(status); });
      form.querySelector('.form-bottom').hidden = true;
      form.querySelectorAll('input:not([type="hidden"]),textarea').forEach(field => field.disabled = true);
    }
    resetSubmission();
    form.addEventListener('submit', event => {
      if (!id) { event.preventDefault(); return; }
      submitButton.disabled = true; submitButton.textContent = 'Submitting…';
    });
    window.addEventListener('pageshow', resetSubmission);
  }
  if (['127.0.0.1', 'localhost'].includes(location.hostname)) {
    fetch('/api/status').then(response => response.ok ? response.json() : null).then(status => { if (status?.localEditor) document.querySelectorAll('[data-editor-link]').forEach(a => { a.hidden = false; }); }).catch(() => {});
  }
})();
