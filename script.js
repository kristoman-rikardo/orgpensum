var STORAGE_KEY = 'pensumkart_tio4102_state_v2';
var saveStatusEl = document.getElementById('save-status');
var contentEl = document.getElementById('content');
var saveTimer = null;
var exerciseCases = [];
var currentCaseIndex = 0;

function showSaveStatus(text) {
  saveStatusEl.textContent = text;
  if (text) {
    setTimeout(function() {
      if (saveStatusEl.textContent === text) saveStatusEl.textContent = '';
    }, 1800);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, contentEl.innerHTML);
    showSaveStatus('Lagret');
  } catch (e) {
    showSaveStatus('Lagring feilet');
  }
}

function debouncedSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveState, 400);
}

function loadState() {
  var saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    contentEl.innerHTML = saved;
  }
}

function initSortable() {
  var columnsEl = document.getElementById('columns');
  if (columnsEl) {
    Sortable.create(columnsEl, {
      animation: 150,
      handle: '.col-header',
      filter: '[contenteditable="true"], .delete-btn',
      preventOnFilter: false,
      draggable: '.column',
      onEnd: saveState
    });
  }
  document.querySelectorAll('.cards-container').forEach(function(container) {
    Sortable.create(container, {
      group: 'cards',
      animation: 150,
      filter: '[contenteditable="true"], .delete-btn',
      preventOnFilter: false,
      onEnd: saveState
    });
  });
  var alwaysRow = document.getElementById('always-row');
  if (alwaysRow) {
    Sortable.create(alwaysRow, {
      animation: 150,
      filter: '[contenteditable="true"], .delete-btn',
      preventOnFilter: false,
      draggable: '.always-card',
      onEnd: saveState
    });
  }
  var skipRow = document.getElementById('skip-row');
  if (skipRow) {
    Sortable.create(skipRow, {
      animation: 150,
      filter: '[contenteditable="true"], .delete-btn',
      preventOnFilter: false,
      draggable: '.skip-card',
      onEnd: saveState
    });
  }
}

function deleteCard(btn) {
  if (confirm('Slett denne carden?')) {
    var card = btn.closest('.card, .always-card, .skip-card');
    if (card) {
      card.remove();
      saveState();
    }
  }
}

function addCard(btn) {
  var container = btn.previousElementSibling;
  if (!container || !container.classList.contains('cards-container')) return;
  var card = document.createElement('div');
  card.className = 'card';
  card.innerHTML =
    '<button class="delete-btn" onclick="deleteCard(this)" title="Slett">×</button>' +
    '<div class="name" contenteditable="true">Ny pensumtekst</div>' +
    '<div class="desc" contenteditable="true">Klikk for å redigere beskrivelse...</div>';
  container.appendChild(card);
  var nameEl = card.querySelector('.name');
  nameEl.focus();
  document.execCommand('selectAll', false, null);
  saveState();
}

function resetToDefault() {
  if (confirm('Tilbakestille alt til original? Dine endringer vil bli slettet.')) {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
}

function exportHtml() {
  var clone = document.documentElement.cloneNode(true);
  clone.querySelectorAll('script').forEach(function(s) { s.remove(); });
  clone.querySelectorAll('.delete-btn, .add-card-btn, .topbar .actions, .hint').forEach(function(el) { el.remove(); });
  clone.querySelectorAll('[contenteditable]').forEach(function(el) { el.removeAttribute('contenteditable'); });
  var topbar = clone.querySelector('.topbar');
  if (topbar) {
    var sub = topbar.querySelector('.sub');
    if (sub) sub.textContent = 'Organisert etter case-arketyper og deres primære pensum';
  }
  var html = '<!DOCTYPE html>\n' + clone.outerHTML;
  var blob = new Blob([html], { type: 'text/html' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'pensumkart_redigert.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

document.addEventListener('input', function(e) {
  if (e.target.isContentEditable) debouncedSave();
});

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function normalizeText(s) {
  return s.toLowerCase().replace(/[^a-z0-9æøå]/gi, ' ').replace(/\s+/g, ' ').trim();
}

function getCardName(cardEl) {
  var nameEl = cardEl.querySelector('.name');
  if (!nameEl) return '';
  var clone = nameEl.cloneNode(true);
  var pill = clone.querySelector('.pill');
  if (pill) pill.remove();
  return clone.textContent.trim().replace(/\s+/g, ' ');
}

// ENDRET: Denne funksjonen legger nå alt i én bolk uten kolonner
function rebuildChecklist() {
  var checklist = document.getElementById('pensum-checklist');
  if (!checklist) return;
  checklist.innerHTML = '';

  // Samle alle pensumkort fra alle områder i én liste
  var allCards = [];
  
  // Hent fra "Alltid relevante"
  document.querySelectorAll('#always-row .always-card').forEach(c => allCards.push(c));
  
  // Hent fra alle case-arketyper (kolonnene)
  document.querySelectorAll('#columns .card').forEach(c => allCards.push(c));

  // Lag sjekkbokser for hvert kort og legg dem direkte i beholderen
  allCards.forEach(function(card) {
    var name = getCardName(card);
    if (!name) return;
    
    var label = document.createElement('label');
    label.className = 'checklist-item';
    
    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.name = name;
    
    var span = document.createElement('span');
    span.textContent = name;
    
    label.appendChild(checkbox);
    label.appendChild(span);
    
    // Legges rett i checklist-beholderen, ingen mellomliggende div-er
    checklist.appendChild(label);
  });
}

function loadExerciseCase(index) {
  if (exerciseCases.length === 0) return;
  if (index < 0) index = exerciseCases.length - 1;
  if (index >= exerciseCases.length) index = 0;
  currentCaseIndex = index;
  var c = exerciseCases[index];
  document.getElementById('case-title').textContent = (index + 1) + '. ' + c.title;
  document.getElementById('case-text').textContent = c.text;
  document.getElementById('case-counter').textContent = (index + 1) + ' / ' + exerciseCases.length;
  document.getElementById('case-select').value = index;
  rebuildChecklist();
  document.getElementById('exercise-feedback').innerHTML = '';
}

function populateCaseSelect() {
  var select = document.getElementById('case-select');
  if (!select) return;
  select.innerHTML = '';
  exerciseCases.forEach(function(c, i) {
    var option = document.createElement('option');
    option.value = i;
    option.textContent = (i + 1) + '. ' + c.title;
    select.appendChild(option);
  });
}

function checkExerciseAnswers() {
  var checkboxes = document.querySelectorAll('#pensum-checklist .checklist-item input');
  var expected = exerciseCases[currentCaseIndex].expected;
  var diagnosis = exerciseCases[currentCaseIndex].diagnosis;

  var correctCount = 0;
  var wrongCount = 0;
  var missedCount = 0;

  var matchedExpected = {};
  expected.forEach(function(exp) { matchedExpected[exp] = false; });

  checkboxes.forEach(function(cb) {
    var item = cb.parentElement;
    var name = cb.dataset.name || '';
    var isChecked = cb.checked;
    var normName = normalizeText(name);
    var isExpected = false;

    expected.forEach(function(exp) {
      if (normName.indexOf(normalizeText(exp)) !== -1) {
        isExpected = true;
        matchedExpected[exp] = true;
      }
    });

    item.classList.remove('correct', 'wrong', 'missed');

    if (isChecked && isExpected) {
      item.classList.add('correct');
      correctCount++;
    } else if (isChecked && !isExpected) {
      item.classList.add('wrong');
      wrongCount++;
    } else if (!isChecked && isExpected) {
      item.classList.add('missed');
      missedCount++;
    }
  });

  var feedback = document.getElementById('exercise-feedback');
  var summary = '<div class="feedback-summary"><strong>Du traff ' + correctCount + ' av ' + expected.length + ' kjernekilder.</strong>';
  if (wrongCount > 0) summary += ' ' + wrongCount + ' av valgene er ikke kjernepensum for dette caset (rødt).';
  if (missedCount > 0) summary += ' Manglende kilder er gulmerket.';
  summary += '</div>';

  if (diagnosis) {
    summary += '<div class="feedback-diagnosis"><strong>Diagnose:</strong> ' + escapeHtml(diagnosis) + '</div>';
  }

  feedback.innerHTML = summary;
}

function resetExerciseCheckboxes() {
  document.querySelectorAll('#pensum-checklist .checklist-item input').forEach(function(cb) {
    cb.checked = false;
  });
  document.querySelectorAll('#pensum-checklist .checklist-item').forEach(function(item) {
    item.classList.remove('correct', 'wrong', 'missed');
  });
  document.getElementById('exercise-feedback').innerHTML = '';
}

function nextCase() { loadExerciseCase(currentCaseIndex + 1); }
function prevCase() { loadExerciseCase(currentCaseIndex - 1); }

// INIT
loadState();
if (typeof Sortable !== 'undefined') {
  initSortable();
} else {
  showSaveStatus('Drag-bibliotek ikke lastet');
}

fetch('cases.json')
  .then(response => response.json())
  .then(data => {
    exerciseCases = data;
    populateCaseSelect();
    loadExerciseCase(0);
  })
  .catch(error => {
    console.error('Feil ved lasting av cases.json:', error);
  });