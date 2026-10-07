// The Kitchen Index — Application Logic & PWA Controller
(function () {
  'use strict';

  // State
  let recipes = [];
  let state = {
    search: '',
    category: 'all',
    status: 'all',
    rating: 'all',
    tag: 'all',
    scale: 1,
    selectedRecipe: null
  };

  // PWA Install Prompt reference
  let deferredInstallPrompt = null;

  // DOM Elements
  const searchInput = document.getElementById('search-input');
  const searchClearBtn = document.getElementById('search-clear-btn');
  const categoryChipsContainer = document.getElementById('category-chips');
  const recipesGrid = document.getElementById('recipes-grid');
  const resultsCount = document.getElementById('results-count');
  const btnResetFilters = document.getElementById('btn-reset-filters');
  const modalBackdrop = document.getElementById('modal-backdrop');
  const modalContainer = document.getElementById('modal-container');
  const randomBtn = document.getElementById('btn-random');
  const favoritesBtn = document.getElementById('btn-favorites');
  const staplesBtn = document.getElementById('btn-staples');
  const statsSummary = document.getElementById('stats-summary');
  const pwaInstallBtn = document.getElementById('btn-pwa-install');
  const toastContainer = document.getElementById('toast-container');

  // Register PWA Service Worker
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js', { scope: './' })
          .then((registration) => {
            console.log('Kitchen Index Service Worker registered with scope:', registration.scope);
          })
          .catch((error) => {
            console.warn('Service Worker registration failed:', error);
          });
      });
    }

    // Capture PWA installation prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      if (pwaInstallBtn) {
        pwaInstallBtn.style.display = 'inline-flex';
      }
    });

    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      if (pwaInstallBtn) {
        pwaInstallBtn.style.display = 'none';
      }
      showToast('The Kitchen Index installed on your device! 🍳');
    });
  }

  // Toast Notification System
  function showToast(message) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>✓</span><span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.2s ease-out';
      setTimeout(() => toast.remove(), 250);
    }, 2500);
  }

  // Load Recipes (Synchronous RECIPES_DATA or fetch recipes.json fallback)
  async function loadData() {
    if (typeof RECIPES_DATA !== 'undefined' && Array.isArray(RECIPES_DATA) && RECIPES_DATA.length > 0) {
      recipes = RECIPES_DATA;
      finishInit();
      return;
    }

    try {
      const response = await fetch('./recipes.json');
      if (!response.ok) throw new Error('Network response not ok: ' + response.statusText);
      recipes = await response.json();
      finishInit();
    } catch (err) {
      console.error('Failed to load recipes.json:', err);
      if (resultsCount) {
        resultsCount.textContent = 'Error loading recipe archive. Please refresh.';
      }
    }
  }

  // Finish Initialization
  function finishInit() {
    renderStats();
    renderCategories();
    setupEventListeners();
    handleHashChange();
    render();
  }

  // Render Stats Banner
  function renderStats() {
    if (!statsSummary) return;
    const total = recipes.length;
    const tried = recipes.filter(r => r.status === 'tried').length;
    const staples = recipes.filter(r => r.status === 'staple').length;
    const favorites = recipes.filter(r => r.rating === 'family-favorite' || r.rating === 'loved' || r.rating === 'they-liked' || r.rating === 'worked-well').length;
    const highProtein = recipes.filter(r => r.tags && r.tags.includes('High-Protein')).length;

    statsSummary.innerHTML = `
      <div class="stats-item"><strong>${total}</strong> Total Recipes</div>
      <span class="stats-divider">•</span>
      <div class="stats-item"><strong>${tried}</strong> Tested in Kitchen</div>
      <span class="stats-divider">•</span>
      <div class="stats-item"><strong>${staples}</strong> Core Staples</div>
      <span class="stats-divider">•</span>
      <div class="stats-item"><strong>${favorites}</strong> Family Favorites</div>
      <span class="stats-divider">•</span>
      <div class="stats-item"><strong>${highProtein}</strong> High-Protein</div>
    `;
  }

  // Render Category Filter Chips
  function renderCategories() {
    if (!categoryChipsContainer) return;
    const categoriesMap = {};
    recipes.forEach(r => {
      const cat = r.category || 'Other';
      categoriesMap[cat] = (categoriesMap[cat] || 0) + 1;
    });

    const categories = Object.keys(categoriesMap).sort();
    
    let html = `<button class="category-chip ${state.category === 'all' ? 'active' : ''}" data-category="all" role="tab" aria-selected="${state.category === 'all'}">All (${recipes.length})</button>`;
    
    categories.forEach(cat => {
      const count = categoriesMap[cat];
      const isSelected = state.category === cat;
      html += `<button class="category-chip ${isSelected ? 'active' : ''}" data-category="${escapeHtml(cat)}" role="tab" aria-selected="${isSelected}">${escapeHtml(cat)} (${count})</button>`;
    });

    categoryChipsContainer.innerHTML = html;
  }

  // Filter recipes based on current state
  function getFilteredRecipes() {
    const q = state.search.trim().toLowerCase();

    return recipes.filter(r => {
      // Category filter
      if (state.category !== 'all' && r.category !== state.category) {
        return false;
      }

      // Status filter
      if (state.status !== 'all' && r.status !== state.status) {
        return false;
      }

      // Rating filter
      if (state.rating === 'loved') {
        const isLoved = r.rating === 'family-favorite' || r.rating === 'loved' || r.rating === 'they-liked' || r.rating === 'worked-well';
        if (!isLoved) return false;
      }

      // Tag filter
      if (state.tag !== 'all') {
        if (!r.tags || !r.tags.includes(state.tag)) return false;
      }

      // Full-text Search
      if (q) {
        const titleMatch = (r.title || '').toLowerCase().includes(q);
        const tagMatch = r.tags && r.tags.some(t => t.toLowerCase().includes(q));
        const notesMatch = (r.notes || '').toLowerCase().includes(q);
        const categoryMatch = (r.category || '').toLowerCase().includes(q);
        const ingredientMatch = r.ingredients && r.ingredients.some(ing => (ing.item || '').toLowerCase().includes(q));
        const instructionMatch = r.conciseInstructions && r.conciseInstructions.some(inst => inst.toLowerCase().includes(q));
        
        return titleMatch || tagMatch || notesMatch || categoryMatch || ingredientMatch || instructionMatch;
      }

      return true;
    });
  }

  // Check if any non-default filters are active
  function isAnyFilterActive() {
    return state.search !== '' || state.category !== 'all' || state.status !== 'all' || state.rating !== 'all' || state.tag !== 'all';
  }

  // Reset all filters
  function resetAllFilters() {
    state.search = '';
    state.category = 'all';
    state.status = 'all';
    state.rating = 'all';
    state.tag = 'all';
    if (searchInput) searchInput.value = '';
    if (searchClearBtn) searchClearBtn.style.display = 'none';
    render();
  }

  // Render Recipe Cards Grid
  function render() {
    const filtered = getFilteredRecipes();
    const hasFilters = isAnyFilterActive();

    // Results count & reset button
    if (resultsCount) {
      resultsCount.textContent = `Showing ${filtered.length} of ${recipes.length} recipes`;
    }
    if (btnResetFilters) {
      btnResetFilters.style.display = hasFilters ? 'inline-block' : 'none';
    }

    // Update search clear button
    if (searchClearBtn) {
      searchClearBtn.style.display = state.search ? 'inline-block' : 'none';
    }

    // Category chip active state
    document.querySelectorAll('.category-chip').forEach(chip => {
      const active = chip.dataset.category === state.category;
      chip.classList.toggle('active', active);
      chip.setAttribute('aria-selected', active);
    });

    // Toggle pill active state
    document.querySelectorAll('.toggle-pill').forEach(pill => {
      const filterType = pill.dataset.filterType;
      const filterValue = pill.dataset.filterValue;
      pill.classList.toggle('active', state[filterType] === filterValue);
    });

    if (filtered.length === 0) {
      recipesGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <h3>No recipes match your criteria</h3>
          <p>Try searching for a different keyword, clearing filters, or browsing by category.</p>
          <button class="btn btn-secondary" style="margin-top: 14px;" id="btn-empty-clear">Reset All Filters</button>
        </div>
      `;
      const emptyClearBtn = document.getElementById('btn-empty-clear');
      if (emptyClearBtn) {
        emptyClearBtn.addEventListener('click', resetAllFilters);
      }
      return;
    }

    recipesGrid.innerHTML = filtered.map(recipe => createCardHtml(recipe)).join('');

    // Attach click listener to each card
    document.querySelectorAll('.recipe-card').forEach(card => {
      card.addEventListener('click', () => {
        const recipeId = card.dataset.id;
        openRecipe(recipeId);
      });
    });
  }

  // Generate Card HTML
  function createCardHtml(r) {
    let statusBadge = '';
    if (r.status === 'tried') {
      statusBadge = `<span class="badge badge-status-tried">✓ Tried</span>`;
    } else if (r.status === 'staple') {
      statusBadge = `<span class="badge badge-status-staple">★ Staple</span>`;
    } else if (r.status === 'want-to-try') {
      statusBadge = `<span class="badge badge-status-want-to-try">⏳ Want to Try</span>`;
    }

    let ratingBadge = '';
    if (r.rating === 'family-favorite' || r.rating === 'loved') {
      ratingBadge = `<span class="badge badge-rating-loved">♥ Loved</span>`;
    } else if (r.rating === 'they-liked' || r.rating === 'worked-well') {
      ratingBadge = `<span class="badge badge-rating-liked">👍 Liked</span>`;
    }

    // Quick ingredient preview
    const sampleIngs = (r.ingredients || [])
      .filter(i => i.item && !i.item.startsWith('---'))
      .slice(0, 4)
      .map(i => i.item)
      .join(', ');

    // Highlight specs
    const timeOrTemp = [];
    if (r.temp) timeOrTemp.push(`🌡️ ${escapeHtml(r.temp)}`);
    if (r.cookTime) timeOrTemp.push(`⏱️ ${escapeHtml(r.cookTime)}`);
    if (r.yield) timeOrTemp.push(`🥣 ${escapeHtml(r.yield)}`);

    return `
      <article class="recipe-card" data-id="${escapeHtml(r.id)}" tabindex="0" role="button" aria-label="${escapeHtml(r.title)}">
        <div class="card-top">
          <div class="card-badges">
            ${statusBadge}
            ${ratingBadge}
          </div>
          <h2 class="card-title">${escapeHtml(r.title)}</h2>
          ${timeOrTemp.length ? `<div class="card-meta"><span>${timeOrTemp.join(' • ')}</span></div>` : ''}
          ${sampleIngs ? `<div class="card-preview-ingredients">${escapeHtml(sampleIngs)}…</div>` : ''}
        </div>
        <div class="card-bottom">
          <span class="card-category-tag">${escapeHtml(r.category || 'General')}</span>
          <span class="card-ratio-hint">${(r.ingredients || []).length} items</span>
        </div>
      </article>
    `;
  }

  // Open Recipe Modal
  function openRecipe(recipeId) {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return;

    state.selectedRecipe = recipe;
    state.scale = 1;
    window.location.hash = `recipe=${recipe.id}`;
    renderModal();
    modalBackdrop.classList.add('open');
    modalBackdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  // Close Recipe Modal
  function closeRecipe() {
    state.selectedRecipe = null;
    modalBackdrop.classList.remove('open');
    modalBackdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (window.location.hash.startsWith('#recipe=')) {
      history.pushState("", document.title, window.location.pathname + window.location.search);
    }
  }

  // Render Modal Content
  function renderModal() {
    const r = state.selectedRecipe;
    if (!r) return;

    let statusLabel = '';
    if (r.status === 'tried') statusLabel = `<span class="badge badge-status-tried">✓ Tested in Kitchen</span>`;
    if (r.status === 'staple') statusLabel = `<span class="badge badge-status-staple">★ Family Staple</span>`;
    if (r.status === 'want-to-try') statusLabel = `<span class="badge badge-status-want-to-try">⏳ Want to Try</span>`;
    if (r.rating === 'family-favorite' || r.rating === 'loved') statusLabel += ` <span class="badge badge-rating-loved">♥ Family Favorite</span>`;
    if (r.rating === 'they-liked' || r.rating === 'worked-well') statusLabel += ` <span class="badge badge-rating-liked">👍 Family Approved</span>`;

    // Specs bar
    const specsItems = [];
    if (r.temp) specsItems.push(`<div class="spec-item"><span class="spec-label">Oven / Heat</span><span class="spec-value">${escapeHtml(r.temp)}</span></div>`);
    if (r.cookTime) specsItems.push(`<div class="spec-item"><span class="spec-label">Cook Time</span><span class="spec-value">${escapeHtml(r.cookTime)}</span></div>`);
    if (r.prepTime) specsItems.push(`<div class="spec-item"><span class="spec-label">Prep Time</span><span class="spec-value">${escapeHtml(r.prepTime)}</span></div>`);
    if (r.yield) specsItems.push(`<div class="spec-item"><span class="spec-label">Batch / Yield</span><span class="spec-value">${escapeHtml(r.yield)}</span></div>`);

    // Scale-adjusted ingredients
    const ingredientsHtml = (r.ingredients || []).map(ing => {
      if (!ing.item) return '';
      if (ing.item.startsWith('---')) {
        return `<li class="ingredient-row heading-row">${escapeHtml(ing.item.replace(/---/g, '').trim())}</li>`;
      }

      const scaledAmount = scaleQuantity(ing.amount, state.scale);
      return `
        <li class="ingredient-row">
          <span class="ingredient-name">${escapeHtml(ing.item)}</span>
          <span class="ingredient-amount">
            ${escapeHtml(scaledAmount)}
            ${ing.ratio ? `<span class="ingredient-ratio">(${escapeHtml(ing.ratio)})</span>` : ''}
          </span>
        </li>
      `;
    }).join('');

    // Instructions
    const instructionsHtml = (r.conciseInstructions || []).map((step, idx) => `
      <li class="instruction-step">
        <span class="step-num">${idx + 1}.</span>
        <span class="step-text">${formatInstructionText(step)}</span>
      </li>
    `).join('');

    // Macros callout
    let macrosHtml = '';
    if (r.macros) {
      macrosHtml = `
        <div class="macros-callout">
          <strong>📊 MACROS:</strong> ${escapeHtml(r.macros.perServing || r.macros.total)}
        </div>
      `;
    }

    // Notes
    let notesHtml = '';
    if (r.notes) {
      notesHtml = `
        <div class="recipe-notes-box">
          <strong>Chef's Note:</strong> ${escapeHtml(r.notes)}
        </div>
      `;
    }

    // Source link
    let sourceLinkHtml = '';
    if (r.sourceUrl) {
      sourceLinkHtml = `
        <div class="source-link-box">
          <a href="${escapeHtml(r.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="source-link">
            ↗ View Original Source / Video
          </a>
        </div>
      `;
    }

    modalContainer.innerHTML = `
      <div class="modal-header">
        <div class="modal-title-area">
          <div class="card-badges">${statusLabel}</div>
          <h2 class="modal-title">${escapeHtml(r.title)}</h2>
        </div>
        <button class="modal-close-btn" id="modal-close-btn" title="Close (Esc)" aria-label="Close modal">✕</button>
      </div>

      <div class="modal-body">
        ${specsItems.length ? `<div class="specs-bar">${specsItems.join('')}</div>` : ''}
        ${macrosHtml}

        <section>
          <div class="section-heading">
            <span>Ingredients &amp; Proportions</span>
            <div class="scale-controls" role="group" aria-label="Scale Servings">
              <button class="scale-btn ${state.scale === 0.5 ? 'active' : ''}" data-scale="0.5">0.5x</button>
              <button class="scale-btn ${state.scale === 1 ? 'active' : ''}" data-scale="1">1x</button>
              <button class="scale-btn ${state.scale === 2 ? 'active' : ''}" data-scale="2">2x</button>
            </div>
          </div>
          <ul class="ingredients-list">
            ${ingredientsHtml}
          </ul>
        </section>

        <section>
          <div class="section-heading">
            <span>Concise Technique &amp; Execution</span>
          </div>
          <ol class="instructions-list">
            ${instructionsHtml}
          </ol>
        </section>

        ${notesHtml}
        ${sourceLinkHtml}
      </div>

      <div class="modal-footer">
        <div style="font-size: 0.8rem; color: var(--text-subtle);">
          Category: <strong>${escapeHtml(r.category || 'General')}</strong>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary btn-sm" id="btn-copy-link">🔗 Share Link</button>
          <button class="btn btn-secondary btn-sm" id="btn-copy-text">📋 Copy Clean Recipe</button>
        </div>
      </div>
    `;

    // Modal close button
    document.getElementById('modal-close-btn').addEventListener('click', closeRecipe);

    // Scale buttons
    modalContainer.querySelectorAll('.scale-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.scale = parseFloat(btn.dataset.scale);
        renderModal();
      });
    });

    // Copy link
    document.getElementById('btn-copy-link').addEventListener('click', () => {
      const shareUrl = window.location.origin + window.location.pathname + `#recipe=${r.id}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast('Direct recipe link copied to clipboard!');
      }).catch(() => {
        showToast('Link: ' + shareUrl);
      });
    });

    // Copy clean recipe
    document.getElementById('btn-copy-text').addEventListener('click', () => {
      const text = formatRecipeForClipboard(r, state.scale);
      navigator.clipboard.writeText(text).then(() => {
        showToast('Clean recipe text copied to clipboard!');
      }).catch(() => {
        showToast('Failed to copy to clipboard');
      });
    });
  }

  // Highlight temps and times in instructions
  function formatInstructionText(text) {
    return escapeHtml(text)
      .replace(/(\d+°F|\d+°C|\d+F|\d+C)/g, '<strong>$1</strong>')
      .replace(/(\d+[-–]\d+\s*(?:min|minutes|hours|sec)|(?:\d+)\s*(?:min|minutes|hours|sec))/g, '<strong>$1</strong>');
  }

  // Quantity scaling helper
  function scaleQuantity(amountStr, multiplier) {
    if (!amountStr || multiplier === 1) return amountStr;
    
    return amountStr.replace(/(\d+(?:\.\d+)?|\d+\/\d+)/g, match => {
      let val = 0;
      if (match.includes('/')) {
        const parts = match.split('/');
        val = parseFloat(parts[0]) / parseFloat(parts[1]);
      } else {
        val = parseFloat(match);
      }
      if (isNaN(val)) return match;

      const scaled = val * multiplier;
      return (Math.round(scaled * 100) / 100).toString();
    });
  }

  // Plain text export for messaging apps / notes
  function formatRecipeForClipboard(r, scale) {
    let out = `${r.title.toUpperCase()}\n`;
    if (r.yield) out += `Yield: ${r.yield}\n`;
    if (r.temp) out += `Heat/Temp: ${r.temp}\n`;
    if (r.cookTime) out += `Cook Time: ${r.cookTime}\n`;
    out += `\n--- INGREDIENTS (${scale}x) ---\n`;
    (r.ingredients || []).forEach(i => {
      if (!i.item) return;
      if (i.item.startsWith('---')) {
        out += `\n${i.item}\n`;
      } else {
        out += `• ${scaleQuantity(i.amount, scale)} ${i.item} ${i.ratio ? `(${i.ratio})` : ''}\n`;
      }
    });
    out += `\n--- INSTRUCTIONS ---\n`;
    (r.conciseInstructions || []).forEach((inst, idx) => {
      out += `${idx + 1}. ${inst}\n`;
    });
    if (r.notes) {
      out += `\nNote: ${r.notes}\n`;
    }
    return out.trim();
  }

  // Setup Event Listeners
  function setupEventListeners() {
    // Search input
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        state.search = e.target.value;
        render();
      });
    }

    // Search clear button
    if (searchClearBtn) {
      searchClearBtn.addEventListener('click', () => {
        state.search = '';
        if (searchInput) {
          searchInput.value = '';
          searchInput.focus();
        }
        render();
      });
    }

    // Reset button in header
    if (btnResetFilters) {
      btnResetFilters.addEventListener('click', resetAllFilters);
    }

    // Category click
    if (categoryChipsContainer) {
      categoryChipsContainer.addEventListener('click', e => {
        const chip = e.target.closest('.category-chip');
        if (chip) {
          state.category = chip.dataset.category;
          render();
        }
      });
    }

    // Filter toggles
    document.querySelectorAll('.toggle-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const filterType = pill.dataset.filterType;
        const filterValue = pill.dataset.filterValue;

        if (state[filterType] === filterValue) {
          state[filterType] = 'all';
        } else {
          state[filterType] = filterValue;
        }
        render();
      });
    });

    // Random Recipe Button
    if (randomBtn) {
      randomBtn.addEventListener('click', () => {
        const pool = recipes.filter(r => r.status === 'tried' || r.status === 'staple');
        const chosen = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : recipes[Math.floor(Math.random() * recipes.length)];
        if (chosen) openRecipe(chosen.id);
      });
    }

    // Quick Favorites Button
    if (favoritesBtn) {
      favoritesBtn.addEventListener('click', () => {
        state.rating = state.rating === 'loved' ? 'all' : 'loved';
        render();
      });
    }

    // Quick Staples Button
    if (staplesBtn) {
      staplesBtn.addEventListener('click', () => {
        state.status = state.status === 'staple' ? 'all' : 'staple';
        render();
      });
    }

    // PWA Install Button
    if (pwaInstallBtn) {
      pwaInstallBtn.addEventListener('click', async () => {
        if (!deferredInstallPrompt) return;
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          showToast('Installing The Kitchen Index...');
        }
        deferredInstallPrompt = null;
        pwaInstallBtn.style.display = 'none';
      });
    }

    // Modal backdrop click
    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', e => {
        if (e.target === modalBackdrop) closeRecipe();
      });
    }

    // Keyboard handlers
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && state.selectedRecipe) {
        closeRecipe();
      }
    });

    // Listen to hash change
    window.addEventListener('hashchange', handleHashChange);
  }

  // Handle URL hash changes
  function handleHashChange() {
    const hash = window.location.hash;
    if (hash.startsWith('#recipe=')) {
      const id = hash.replace('#recipe=', '');
      if (recipes.some(r => r.id === id)) {
        openRecipe(id);
      }
    } else if (state.selectedRecipe) {
      closeRecipe();
    }
  }

  // Helper escape
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // App bootstrap
  registerServiceWorker();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadData);
  } else {
    loadData();
  }
})();
