document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('.picabench-gallery');
  if (!root) {
    return;
  }

  const refs = {
    root,
    modeButtons: Array.from(root.querySelectorAll('.picabench-mode-button')),
    lawButtonsEl: root.querySelector('#picabench-law-buttons'),
    caseControlsEl: root.querySelector('#picabench-case-controls'),
    caseStatusEl: root.querySelector('#picabench-case-status'),
    prevButton: root.querySelector('[data-case-nav="prev"]'),
    nextButton: root.querySelector('[data-case-nav="next"]'),
    gridEl: root.querySelector('#picabench-grid'),
    caseTitleEl: root.querySelector('#picabench-case-title'),
    instructionEl: root.querySelector('#picabench-instruction')
  };

  const dataUrl = 'static/data/picabench-results.json';
  refs.gridEl.innerHTML = '<p class="picabench-placeholder">Loading visual comparisons…</p>';

  fetch(dataUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load data: ${response.status}`);
      }
      return response.json();
    })
    .then((payload) => {
      initialiseGallery(refs, payload || {});
    })
    .catch((error) => {
      console.error(error);
      refs.gridEl.innerHTML = '<p class="picabench-placeholder">Unable to load results. Please refresh the page.</p>';
    });
});

function initialiseGallery(refs, payload) {
  const state = {
    laws: Array.isArray(payload.laws) ? payload.laws : [],
    currentLawKey: '',
    currentCaseIndex: 0,
    currentMode: 'auto',
    autoFlipTimer: null,
    autoFlipState: false,
    imageRefs: []
  };

  const interaction = {
    attached: false
  };

  if (state.laws.length === 0) {
    refs.gridEl.innerHTML = '<p class="picabench-placeholder">PICABench examples will appear here soon.</p>';
    return;
  }

  state.currentLawKey = state.laws[0].key;
  refs.root.dataset.galleryMode = state.currentMode;

  refs.modeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const mode = button.dataset.mode;
      if (!mode || mode === state.currentMode) {
        return;
      }
      setMode(mode);
    });
  });

  renderLawButtons();
  selectLaw(state.currentLawKey);

  function getLawByKey(key) {
    return state.laws.find((law) => law.key === key);
  }

  function setMode(nextMode) {
    state.currentMode = nextMode;
    refs.root.dataset.galleryMode = nextMode;
    refs.modeButtons.forEach((button) => {
      if (button.dataset.mode === nextMode) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
    updateGrid();
  }

  function renderLawButtons() {
    refs.lawButtonsEl.innerHTML = '';
    state.laws.forEach((law) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'picabench-law-button';
      button.textContent = law.label;
      button.dataset.lawKey = law.key;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', law.key === state.currentLawKey ? 'true' : 'false');
      button.tabIndex = law.key === state.currentLawKey ? 0 : -1;
      button.addEventListener('click', () => selectLaw(law.key));
      refs.lawButtonsEl.appendChild(button);
    });
  }

  function updateLawButtons() {
    const buttons = refs.lawButtonsEl.querySelectorAll('button.picabench-law-button');
    buttons.forEach((button) => {
      const isActive = button.dataset.lawKey === state.currentLawKey;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');
      button.tabIndex = isActive ? 0 : -1;
    });
  }

  if (refs.prevButton) {
    refs.prevButton.addEventListener('click', () => navigateCase(-1));
  }

  if (refs.nextButton) {
    refs.nextButton.addEventListener('click', () => navigateCase(1));
  }

  window.addEventListener('keydown', handleKeyNavigation, { passive: false });

  function selectLaw(lawKey) {
    if (!lawKey) {
      return;
    }
    state.currentLawKey = lawKey;
    state.currentCaseIndex = 0;
    updateLawButtons();
    setCase(0, { force: true });
  }

  function navigateCase(delta, options = {}) {
    setCase(state.currentCaseIndex + delta, options);
  }

  function setCase(index, options = {}) {
    const law = getLawByKey(state.currentLawKey);
    if (!law || !Array.isArray(law.cases) || law.cases.length === 0) {
      state.currentCaseIndex = 0;
      refs.caseTitleEl.textContent = '';
      refs.instructionEl.textContent = '';
      refs.gridEl.innerHTML = '<p class="picabench-placeholder">No visuals available for this selection.</p>';
      setNavigationDisabled(true);
      stopAutoFlip();
      return;
    }
    const total = law.cases.length;
    const normalised = ((index % total) + total) % total;
    const previousIndex = state.currentCaseIndex;
    state.currentCaseIndex = normalised;
    if (options.force || total <= 1 || previousIndex !== normalised) {
      updateGrid();
    }
  }

  function updateCaseStatus() {
    const law = getLawByKey(state.currentLawKey);
    const cases = law && Array.isArray(law.cases) ? law.cases : [];
    const total = cases.length;
    const disableNav = total <= 1;
    setNavigationDisabled(disableNav);
    if (disableNav) {
      stopAutoFlip();
    }
  }

  function setNavigationDisabled(disabled) {
    [refs.prevButton, refs.nextButton].forEach((button) => {
      if (!button) {
        return;
      }
      button.disabled = disabled;
      button.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    });
  }

  function handleKeyNavigation(event) {
    if (event.defaultPrevented) {
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
      return;
    }
    const targetTag = event.target && event.target.tagName;
    if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT') {
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      navigateCase(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      navigateCase(1);
    }
  }

  function updateGrid() {
    state.imageRefs = [];
    const law = getLawByKey(state.currentLawKey);
    if (!law) {
      setNavigationDisabled(true);
      removeInteractionListeners();
      stopAutoFlip();
      refs.caseTitleEl.textContent = '';
      refs.instructionEl.textContent = '';
      refs.gridEl.innerHTML = '<p class="picabench-placeholder">No physics law selected.</p>';
      return;
    }
    const cases = Array.isArray(law.cases) ? law.cases : [];
    if (cases.length === 0) {
      setNavigationDisabled(true);
      removeInteractionListeners();
      stopAutoFlip();
      refs.caseTitleEl.textContent = '';
      refs.instructionEl.textContent = '';
      refs.gridEl.innerHTML = '<p class="picabench-placeholder">No curated examples for this law yet.</p>';
      return;
    }
    updateCaseStatus();
    const caseData = cases[Math.min(state.currentCaseIndex, cases.length - 1)];
    state.currentCaseIndex = Math.min(state.currentCaseIndex, cases.length - 1);
    refs.caseTitleEl.textContent = '';
    refs.instructionEl.textContent = caseData.instruction || '';

    const inputImage = caseData.input_image || '';
    const imageEntries = Array.isArray(caseData.images) ? caseData.images : [];
    if (imageEntries.length === 0) {
      removeInteractionListeners();
      stopAutoFlip();
      refs.gridEl.innerHTML = '<p class="picabench-placeholder">No visual assets found for this case.</p>';
      return;
    }

    const maxCards = 8;
    const ordered = buildCardList(imageEntries, maxCards);
    refs.gridEl.innerHTML = '';

    state.imageRefs = [];

    ordered.forEach((entry) => {
      const card = document.createElement('div');
      card.className = 'picabench-card';
      card.dataset.methodId = entry.id;

      const wrapper = document.createElement('div');
      wrapper.className = 'picabench-image-wrapper';

      const img = document.createElement('img');
      img.loading = 'lazy';
      img.alt = `${entry.label} result`;
      img.dataset.outputSrc = entry.path;
      img.dataset.inputSrc = inputImage || entry.path;
      const isInput = entry.id && entry.id.toLowerCase() === 'input';
      img.src = state.currentMode === 'interactive' ? (inputImage || entry.path) : entry.path;

      wrapper.appendChild(img);
      card.appendChild(wrapper);

      const caption = document.createElement('p');
      caption.className = 'picabench-caption';
      caption.textContent = entry.label;
      card.appendChild(caption);

      card.tabIndex = isInput ? -1 : 0;
      if (!isInput) {
        card.setAttribute('role', 'button');
      } else {
        card.removeAttribute('role');
      }

      state.imageRefs.push({ img, isInput });

      refs.gridEl.appendChild(card);
    });

    applyModeVisuals();
  }

  function buildCardList(entries, limit) {
    const filtered = entries.filter((entry) => {
      if (!entry || !entry.id) {
        return false;
      }
      const idLower = entry.id.toLowerCase();
      if (idLower === 'input') {
        return false;
      }
      if (idLower.startsWith('005')) {
        return false;
      }
      return true;
    });
    return filtered.slice(0, limit);
  }

  function applyModeVisuals() {
    if (state.currentMode === 'interactive') {
      ensureInteractionListeners();
      stopAutoFlip();
      showAllInputs();
    } else {
      removeInteractionListeners();
      showAllInputs();
      startAutoFlip();
    }
  }

  function ensureInteractionListeners() {
    if (interaction.attached) {
      return;
    }
    refs.gridEl.addEventListener('pointerover', handlePointerOver);
    refs.gridEl.addEventListener('pointerleave', handlePointerLeave);
    refs.gridEl.addEventListener('focusin', handleFocusIn);
    refs.gridEl.addEventListener('focusout', handleFocusOut);
    interaction.attached = true;
  }

  function removeInteractionListeners() {
    if (!interaction.attached) {
      return;
    }
    refs.gridEl.removeEventListener('pointerover', handlePointerOver);
    refs.gridEl.removeEventListener('pointerleave', handlePointerLeave);
    refs.gridEl.removeEventListener('focusin', handleFocusIn);
    refs.gridEl.removeEventListener('focusout', handleFocusOut);
    interaction.attached = false;
  }

  function handlePointerOver(event) {
    if (state.currentMode !== 'interactive') {
      return;
    }
    if (!event.target.closest('.picabench-card')) {
      return;
    }
    showAllOutputs();
  }

  function handlePointerLeave() {
    if (state.currentMode !== 'interactive') {
      return;
    }
    showAllInputs();
  }

  function handleFocusIn(event) {
    if (state.currentMode !== 'interactive') {
      return;
    }
    if (!event.target.closest('.picabench-card')) {
      return;
    }
    showAllOutputs();
  }

  function handleFocusOut(event) {
    if (state.currentMode !== 'interactive') {
      return;
    }
    if (event.relatedTarget && refs.gridEl.contains(event.relatedTarget)) {
      return;
    }
    showAllInputs();
  }

  function showAllOutputs() {
    state.imageRefs.forEach(({ img, isInput }) => {
      if (!img) {
        return;
      }
      img.src = isInput ? img.dataset.inputSrc : img.dataset.outputSrc;
    });
  }

  function showAllInputs() {
    state.imageRefs.forEach(({ img }) => {
      if (!img) {
        return;
      }
      img.src = img.dataset.inputSrc;
    });
  }

  function startAutoFlip() {
    stopAutoFlip();
    state.autoFlipState = false;
    if (state.imageRefs.length === 0) {
      return;
    }
    state.autoFlipTimer = window.setInterval(() => {
      state.autoFlipState = !state.autoFlipState;
      if (state.autoFlipState) {
        showAllOutputs();
      } else {
        showAllInputs();
      }
    }, 1200);
  }

  function stopAutoFlip() {
    if (state.autoFlipTimer) {
      window.clearInterval(state.autoFlipTimer);
      state.autoFlipTimer = null;
    }
    state.autoFlipState = false;
  }
}
