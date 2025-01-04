let currentNoteId = null;
let notes = [];

// Initialize marked with custom renderer
const renderer = new marked.Renderer();
renderer.link = (href, title, text) => {
    return `<a href="${href}" title="${title || ''}" target="_blank" class="text-blue-600 hover:underline">${text}</a>`;
};

marked.setOptions({
    renderer: renderer,
    highlight: function(code, lang) {
        if (Prism.languages[lang]) {
            return Prism.highlight(code, Prism.languages[lang], lang);
        }
        return code;
    },
    breaks: true
});

// Fix bold text parsing
const originalTextRenderer = renderer.text.bind(renderer);
renderer.text = (text) => {
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.*?)__/g, '<strong>$1</strong>');
    return originalTextRenderer(text);
};

function savePreferences() {
    document.getElementById('preferencesModal').style.display = 'none';
    document.getElementById('mainApp').classList.remove('hidden');
    loadNotes();
}

function applyTheme(theme) {
    if (theme === 'system') {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.body.className = `theme-${theme}`;
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

function toggleTheme() {
    const currentTheme = document.body.className.includes('theme-dark') ? 'light' : 'dark';
    applyTheme(currentTheme);
    localStorage.setItem('theme', currentTheme);
}

function updatePreview() {
    const content = editor.value;
    preview.innerHTML = marked.parse(content);
    saveCurrentNote();
}

function createNewNote() {
    const note = {
        id: Date.now(),
        title: 'New Note',
        content: '',
        created: new Date().toISOString()
    };
    notes.unshift(note);
    saveNotes();
    loadNotes();
    selectNote(note.id);
}

function selectNote(id) {
    currentNoteId = id;
    const note = notes.find(n => n.id === id);
    if (note) {
        editor.value = note.content;
        updatePreview();
        // Update active state in sidebar
        document.querySelectorAll('.sidebar-note').forEach(el => {
            el.classList.remove('bg-blue-100', 'dark:bg-blue-900');
        });
        document.querySelector(`[data-note-id="${id}"]`).classList.add('bg-blue-100', 'dark:bg-blue-900');
        // Show delete button
        document.getElementById('deleteButton').style.display = 'block';
    }
}

function saveCurrentNote() {
    if (!currentNoteId) return;
    const note = notes.find(n => n.id === currentNoteId);
    if (note) {
        note.content = editor.value;
        note.title = editor.value.split('\n')[0].replace(/^#\s*/, '') || 'Untitled';
        note.updated = new Date().toISOString();
        saveNotes();
        loadNotes();
    }
}

function saveNotes() {
    localStorage.setItem('notes', JSON.stringify(notes));
}

function loadNotes() {
    notes = JSON.parse(localStorage.getItem('notes') || '[]');
    renderNotesList();
}

function renderNotesList() {
    const notesList = document.getElementById('notesList');
    notesList.innerHTML = notes.map(note => `
        <div 
            class="sidebar-note p-3 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-all ${note.id === currentNoteId ? 'bg-blue-100 dark:bg-blue-900' : ''}"
            data-note-id="${note.id}"
            onclick="selectNote(${note.id})"
        >
            <h3 class="font-medium truncate">${note.title || 'Untitled'}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
                ${new Date(note.updated || note.created).toLocaleDateString()}
            </p>
        </div>
    `).join('');
}

function searchNotes(query) {
    const filteredNotes = notes.filter(note => 
        note.title.toLowerCase().includes(query.toLowerCase()) ||
        note.content.toLowerCase().includes(query.toLowerCase())
    );
    renderFilteredNotes(filteredNotes);
}

function renderFilteredNotes(filteredNotes) {
    const notesList = document.getElementById('notesList');
    notesList.innerHTML = filteredNotes.map(note => `
        <div 
            class="sidebar-note p-3 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-all ${note.id === currentNoteId ? 'bg-blue-100 dark:bg-blue-900' : ''}"
            data-note-id="${note.id}"
            onclick="selectNote(${note.id})"
        >
            <h3 class="font-medium truncate">${note.title || 'Untitled'}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
                ${new Date(note.updated || note.created).toLocaleDateString()}
            </p>
        </div>
    `).join('');
}

function deleteNote() {
    if (!currentNoteId) return;
    if (confirm('Are you sure you want to delete this note?')) {
        notes = notes.filter(note => note.id !== currentNoteId);
        saveNotes();
        currentNoteId = notes.length > 0 ? notes[0].id : null;
        loadNotes();
        if (currentNoteId) {
            selectNote(currentNoteId);
        } else {
            editor.value = '';
            preview.innerHTML = '';
            document.getElementById('deleteButton').style.display = 'none';
        }
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key.toLowerCase()) {
            case 'b':
                e.preventDefault();
                wrapText('**');
                break;
            case 'i':
                e.preventDefault();
                wrapText('*');
                break;
            case 'k':
                e.preventDefault();
                wrapText('[', '](url)');
                break;
            case 's':
                e.preventDefault();
                saveCurrentNote();
                break;
        }
    }
});

function wrapText(wrapper, endWrapper = wrapper) {
    const textarea = document.getElementById('editor');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const newText = wrapper + selectedText + endWrapper;
    
    textarea.value = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
    textarea.selectionStart = start + wrapper.length;
    textarea.selectionEnd = end + wrapper.length;
    textarea.focus();
    updatePreview();
}

// Event listeners
editor.addEventListener('input', updatePreview);

// System theme change detection
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (localStorage.getItem('theme') === 'system') {
        applyTheme('system');
    }
});

// Initialize app
if (!localStorage.getItem('theme')) {
    document.getElementById('preferencesModal').style.display = 'flex';
} else {
    savePreferences();
}

// Add example note if no notes exist
if (!localStorage.getItem('notes')) {
    const welcomeNote = {
        id: Date.now(),
        title: 'Welcome to scribble.md',
        content: `# Welcome to scribble.md! 
> Just Edit in Markdown! 🚀
        `
    };
    notes.push(welcomeNote);
    saveNotes();
}