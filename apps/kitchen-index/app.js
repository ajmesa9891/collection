// The Kitchen Index — Application Logic & Tree Controller
(function () {
  'use strict';

  // State
  let recipes = [];
  let state = {
    search: '',
    selectedTags: new Set(),
    scale: 1,
    selectedRecipe: null,
    expandedCategories: new Set()
  };

  // Temp state while filter modal is open
  let tempSelectedTags = new Set();

  // DOM Elements
  const searchInput = document.getElementById('search-input');
  const searchClearBtn = document.getElementById('search-clear-btn');
  const btnOpenFilters = document.getElementById('btn-open-filters');
  const filterBadge = document.getElementById('filter-badge');
  const resultsCount = document.getElementById('results-count');
  const btnToggleAllTree = document.getElementById('btn-toggle-all-tree');
  const btnResetFilters = document.getElementById('btn-reset-filters');
  const categoryTree = document.getElementById('category-tree');

  // Modals
  const modalBackdrop = document.getElementById('modal-backdrop');
  const modalContainer = document.getElementById('modal-container');
  const filterModalBackdrop = document.getElementById('filter-modal-backdrop');
  const filterModalCloseBtn = document.getElementById('filter-modal-close-btn');
  const modalTagsGrid = document.getElementById('modal-tags-grid');
  const btnModalResetAll = document.getElementById('btn-modal-reset-all');
  const btnModalApply = document.getElementById('btn-modal-apply');
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
    setupEventListeners();
    buildFilterModalTags();
    handleHashChange();
    render();
  }

  // Calculate active filter count
  function getActiveFilterCount() {
    return state.selectedTags.size;
  }

  // Update Filter Button Badge
  function updateFilterBadge() {
    const count = getActiveFilterCount();
    if (filterBadge) {
      if (count > 0) {
        filterBadge.textContent = count;
        filterBadge.style.display = 'inline-block';
        btnOpenFilters.classList.add('has-active-filters');
      } else {
        filterBadge.style.display = 'none';
        btnOpenFilters.classList.remove('has-active-filters');
      }
    }
    if (btnResetFilters) {
      btnResetFilters.style.display = (count > 0 || state.search) ? 'inline-block' : 'none';
    }
  }

  // Build Tags in Filter Modal
  function buildFilterModalTags() {
    if (!modalTagsGrid) return;
    const tagCounts = {};
    recipes.forEach(r => {
      (r.tags || []).forEach(t => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    });

    const tags = Object.keys(tagCounts).sort((a, b) => a.localeCompare(b));
    const isAll = tempSelectedTags.size === 0;
    let html = `<button class="filter-choice-btn ${isAll ? 'active' : ''}" data-filter-tag="all">All Tags (${recipes.length})</button>`;
    
    tags.forEach(t => {
      const isSelected = tempSelectedTags.has(t);
      html += `<button class="filter-choice-btn ${isSelected ? 'active' : ''}" data-filter-tag="${escapeHtml(t)}">${escapeHtml(t)} (${tagCounts[t]})</button>`;
    });

    modalTagsGrid.innerHTML = html;
  }

  // Filter recipes based on current state
  function getFilteredRecipes() {
    const q = state.search.trim().toLowerCase();

    return recipes.filter(r => {
      // Tags filter
      if (state.selectedTags.size > 0) {
        const recipeTags = r.tags || [];
        const hasMatch = recipeTags.some(t => state.selectedTags.has(t));
        if (!hasMatch) return false;
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

  // Group recipes by Tag (allows recipes with multiple tags to appear under each)
  function groupByTag(recipeList) {
    const groups = new Map();
    recipeList.forEach(r => {
      const tags = (r.tags && r.tags.length > 0) ? r.tags : ['General'];
      tags.forEach(tag => {
        // If specific tag filter is active, only group under active tags
        if (state.selectedTags.size > 0 && !state.selectedTags.has(tag)) {
          return;
        }
        if (!groups.has(tag)) {
          groups.set(tag, []);
        }
        groups.get(tag).push(r);
      });
    });

    // Sort tags alphabetically
    const sortedMap = new Map([...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])));
    return sortedMap;
  }

  // Render the Collapsible Tag Accordion Tree
  function render() {
    const filtered = getFilteredRecipes();
    const hasSearch = state.search.trim() !== '';

    // Results count
    if (resultsCount) {
      resultsCount.textContent = `${filtered.length} recipe${filtered.length === 1 ? '' : 's'}`;
    }

    // Search clear button
    if (searchClearBtn) {
      searchClearBtn.style.display = state.search ? 'inline-block' : 'none';
    }

    // Filter badge
    updateFilterBadge();

    // Empty state
    if (filtered.length === 0) {
      categoryTree.innerHTML = `
        <div class="empty-state">
          <h3>No matching recipes found</h3>
          <p>Try clearing your search query or resetting filters.</p>
          <button class="btn btn-secondary" style="margin-top: 14px;" id="btn-empty-clear">Reset All Filters</button>
        </div>
      `;
      const emptyClearBtn = document.getElementById('btn-empty-clear');
      if (emptyClearBtn) {
        emptyClearBtn.addEventListener('click', resetAllFilters);
      }
      return;
    }

    const grouped = groupByTag(filtered);
    let html = '';

    grouped.forEach((tagRecipes, tagName) => {
      // Auto-expand if search query is active, otherwise use expandedCategories state
      const isExpanded = hasSearch ? true : state.expandedCategories.has(tagName);

      html += `
        <div class="tree-category ${isExpanded ? 'expanded' : ''}" data-category-name="${escapeHtml(tagName)}">
          <div class="tree-category-header" role="button" tabindex="0" aria-expanded="${isExpanded}">
            <div class="tree-category-left">
              <span class="tree-chevron">▶</span>
              <span class="tree-category-title">${escapeHtml(tagName)}</span>
            </div>
            <span class="tree-category-count">${tagRecipes.length}</span>
          </div>
          <div class="tree-category-content">
            <ul class="tree-recipes-list">
              ${tagRecipes.map(r => createTreeRowHtml(r)).join('')}
            </ul>
          </div>
        </div>
      `;
    });

    categoryTree.innerHTML = html;

    // Attach Tag Header click events to toggle expand/collapse
    categoryTree.querySelectorAll('.tree-category-header').forEach(header => {
      header.addEventListener('click', () => {
        const catContainer = header.closest('.tree-category');
        const catName = catContainer.dataset.categoryName;
        
        if (catContainer.classList.contains('expanded')) {
          catContainer.classList.remove('expanded');
          header.setAttribute('aria-expanded', 'false');
          state.expandedCategories.delete(catName);
        } else {
          catContainer.classList.add('expanded');
          header.setAttribute('aria-expanded', 'true');
          state.expandedCategories.add(catName);
        }
        updateToggleAllButtonText();
      });
    });

    // Attach Recipe Row click events to open recipe modal
    categoryTree.querySelectorAll('.tree-recipe-row').forEach(row => {
      row.addEventListener('click', () => {
        const id = row.dataset.id;
        openRecipe(id);
      });
    });

    updateToggleAllButtonText();
  }

  // Create single recipe row in tree
  function createTreeRowHtml(r) {
    let specs = [];
    if (r.temp) {
      specs.push(`<span class="meta-temp">${escapeHtml(r.temp.split(' ')[0])}</span>`);
    } else if (r.cookTime) {
      specs.push(`<span>⏱️ ${escapeHtml(r.cookTime)}</span>`);
    }

    return `
      <li class="tree-recipe-row" data-id="${escapeHtml(r.id)}" tabindex="0" role="treeitem">
        <span class="tree-recipe-title">${escapeHtml(r.title)}</span>
        <div class="tree-recipe-meta">
          ${specs.join('')}
        </div>
      </li>
    `;
  }

  // Update "Expand All / Collapse All" button label
  function updateToggleAllButtonText() {
    if (!btnToggleAllTree) return;
    const allCategories = categoryTree.querySelectorAll('.tree-category');
    if (allCategories.length === 0) return;
    
    const expandedCategories = categoryTree.querySelectorAll('.tree-category.expanded');
    if (expandedCategories.length === allCategories.length) {
      btnToggleAllTree.textContent = 'Collapse All';
    } else {
      btnToggleAllTree.textContent = 'Expand All';
    }
  }

  // Reset all filters
  function resetAllFilters() {
    state.search = '';
    state.selectedTags.clear();
    state.expandedCategories.clear();
    if (searchInput) searchInput.value = '';
    if (searchClearBtn) searchClearBtn.style.display = 'none';
    buildFilterModalTags();
    syncModalChoices();
    render();
  }

  // Open Recipe Modal
  function openRecipe(recipeId) {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return;

    state.selectedRecipe = recipe;
    state.scale = 1;
    window.location.hash = `recipe=${recipe.id}`;
    renderRecipeModal();
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

  // Render Recipe Detail Modal
  function renderRecipeModal() {
    const r = state.selectedRecipe;
    if (!r) return;

    const tagsHtml = (r.tags || []).map(t => `<span class="badge badge-tag">${escapeHtml(t)}</span>`).join(' ');

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
          <div class="card-badges">${tagsHtml}</div>
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
        <div style="font-size: 0.85rem; color: var(--text-subtle);">
          Tags: <strong>${escapeHtml((r.tags || []).join(', '))}</strong>
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
        renderRecipeModal();
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

  // Open Filter Dialog
  function openFilterModal() {
    tempSelectedTags = new Set(state.selectedTags);
    buildFilterModalTags();
    syncModalChoices();
    filterModalBackdrop.classList.add('open');
    filterModalBackdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  // Close Filter Dialog
  function closeFilterModal() {
    filterModalBackdrop.classList.remove('open');
    filterModalBackdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // Sync active classes inside Filter Modal based on tempSelectedTags
  function syncModalChoices() {
    if (!modalTagsGrid) return;
    const isAll = tempSelectedTags.size === 0;
    modalTagsGrid.querySelectorAll('.filter-choice-btn').forEach(btn => {
      const tagVal = btn.dataset.filterTag;
      if (tagVal === 'all') {
        btn.classList.toggle('active', isAll);
      } else {
        btn.classList.toggle('active', tempSelectedTags.has(tagVal));
      }
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

    // Open filter modal
    if (btnOpenFilters) {
      btnOpenFilters.addEventListener('click', openFilterModal);
    }

    // Close filter modal
    if (filterModalCloseBtn) {
      filterModalCloseBtn.addEventListener('click', closeFilterModal);
    }

    // Filter modal backdrop click
    if (filterModalBackdrop) {
      filterModalBackdrop.addEventListener('click', e => {
        if (e.target === filterModalBackdrop) closeFilterModal();
      });
    }

    // Filter option selection inside modal
    if (filterModalBackdrop) {
      filterModalBackdrop.addEventListener('click', e => {
        const btn = e.target.closest('.filter-choice-btn');
        if (btn) {
          const tagVal = btn.dataset.filterTag;
          if (tagVal === 'all') {
            tempSelectedTags.clear();
          } else {
            if (tempSelectedTags.has(tagVal)) {
              tempSelectedTags.delete(tagVal);
            } else {
              tempSelectedTags.add(tagVal);
            }
          }
          syncModalChoices();
        }
      });
    }

    // Modal: Apply filters
    if (btnModalApply) {
      btnModalApply.addEventListener('click', () => {
        state.selectedTags = new Set(tempSelectedTags);
        closeFilterModal();
        render();
      });
    }

    // Modal: Reset all
    if (btnModalResetAll) {
      btnModalResetAll.addEventListener('click', () => {
        tempSelectedTags.clear();
        syncModalChoices();
      });
    }

    // Tree: Expand / Collapse All button
    if (btnToggleAllTree) {
      btnToggleAllTree.addEventListener('click', () => {
        const allCategories = categoryTree.querySelectorAll('.tree-category');
        const anyCollapsed = categoryTree.querySelector('.tree-category:not(.expanded)');

        if (anyCollapsed) {
          // Expand all
          allCategories.forEach(cat => {
            cat.classList.add('expanded');
            const name = cat.dataset.categoryName;
            state.expandedCategories.add(name);
          });
        } else {
          // Collapse all
          allCategories.forEach(cat => {
            cat.classList.remove('expanded');
          });
          state.expandedCategories.clear();
        }
        updateToggleAllButtonText();
      });
    }

    // Clear filters button in sub-bar
    if (btnResetFilters) {
      btnResetFilters.addEventListener('click', resetAllFilters);
    }

    // Recipe modal backdrop click
    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', e => {
        if (e.target === modalBackdrop) closeRecipe();
      });
    }

    // Keyboard handlers
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (state.selectedRecipe) {
          closeRecipe();
        } else if (filterModalBackdrop && filterModalBackdrop.classList.contains('open')) {
          closeFilterModal();
        }
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
