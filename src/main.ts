import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	MarkdownView,
	Menu
} from 'obsidian';
import { StateEffect, StateField, RangeSetBuilder } from '@codemirror/state';
import { EditorView, Decoration, DecorationSet } from '@codemirror/view';
import { SearchQuery } from '@codemirror/search';

interface RfrPluginSettings {
	findText: string;
	replaceText: string;
	useRegEx: boolean;
	selOnly: boolean;
	caseInsensitive: boolean;
	processLineBreak: boolean;
	processTab: boolean;
	prefillFind: boolean;
	history: string[];
}

const DEFAULT_SETTINGS: RfrPluginSettings = {
	findText: '',
	replaceText: '',
	useRegEx: true,
	selOnly: false,
	caseInsensitive: false,
	processLineBreak: false,
	processTab: false,
	prefillFind: false,
	history: []
}

// logThreshold: 0 ... only error messages
//               9 ... verbose output
// logThreshold: 0 ... only error messages
//               9 ... verbose output
const logThreshold = 9;
const logger = (logString: string, logLevel=0): void => {if (logLevel <= logThreshold) console.log ('RegexFiRe: ' + logString)};

// Define StateEffect for updating the highlight pattern with SearchQuery config
const setHighlightEffect = StateEffect.define<{ query: SearchQuery | null, range: {from: number, to: number} | null }>();

interface HighlightState {
	decorations: DecorationSet;
	query: SearchQuery | null;
	range: {from: number, to: number} | null;
}

// Define StateField for managing decorations
const highlightField = StateField.define<HighlightState>({
	create() { 
		return { decorations: Decoration.none, query: null, range: null }; 
	},
	update(value, tr) {
		let { decorations, query, range } = value;
		
		// 1. Handle effects (new search query)
		let hasNewQuery = false;
		for (const e of tr.effects) {
			if (e.is(setHighlightEffect)) {
				query = e.value.query;
				range = e.value.range;
				hasNewQuery = true;
			}
		}

		// 2. Map existing decorations
		decorations = decorations.map(tr.changes);

		// 3. Re-calculate if query changed OR document changed
		if (hasNewQuery || (tr.docChanged && query)) {
			const builder = new RangeSetBuilder<Decoration>();
			if (query) {
				try {
					const cursor = query.getCursor(tr.state);
					let item = cursor.next();
					while (!item.done) {
						const { from, to } = item.value;
						// If selection restricted, check bounds
						if (range && (from < range.from || to > range.to)) {
							item = cursor.next();
							continue;
						}
						builder.add(from, to, Decoration.mark({ class: 'rfr-match-highlight' }));
						item = cursor.next();
					}
			} catch {
				// console.error("Regex preview error", err);
			}
			}
			decorations = builder.finish();
		}

		return { decorations, query, range };
	},
	provide: (f) => EditorView.decorations.from(f, val => val.decorations),
});

export default class RegexFindReplacePlugin extends Plugin {
	settings: RfrPluginSettings;

	async onload() {
		logger('Loading Plugin...', 9);
		await this.loadSettings();
		
		this.registerEditorExtension(highlightField);

		this.addSettingTab(new RegexFindReplaceSettingTab(this.app, this));


		this.addCommand({
			id: 'obsidian-regex-replace',
			name: 'Find and Replace using regular expressions',
			hotkeys: [{ modifiers: ["Mod", "Alt"], key: "f" }],
			editorCallback: (editor) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (view) {
					new FindAndReplaceBar(this.app, view, this.settings, this).show();
				}
			},
		});
	}

	onunload() {
		logger('Bye!', 9);
	}

	async loadSettings() {
		logger('Loading Settings...', 6);
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<RfrPluginSettings>);
		logger('   findVal:         ' + this.settings.findText, 6);
		logger('   replaceText:     ' + this.settings.replaceText, 6);
		logger('   caseInsensitive: ' + this.settings.caseInsensitive, 6);
		logger('   processLineBreak: ' + this.settings.processLineBreak, 6);

	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

}

class FindAndReplaceBar {
	app: App;
	view: MarkdownView;
	settings: RfrPluginSettings;
	plugin: RegexFindReplacePlugin;
	containerEl: HTMLElement;
	findInput: HTMLInputElement;
	replaceInput: HTMLInputElement;

	constructor(app: App, view: MarkdownView, settings: RfrPluginSettings, plugin: RegexFindReplacePlugin) {
		this.app = app;
		this.view = view;
		this.settings = settings;
		this.plugin = plugin;
	}

	show() {
		// Remove existing search bar if present
		this.hide();

		const editor = this.view.editor;
		const noSelection = editor.getSelection() === '';

		// Create container
		this.containerEl = document.createElement('div');
		this.containerEl.addClass('regex-find-replace-bar');
		
		// ESC to close
		this.containerEl.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				this.hide();
			}
		});

		// --- Left Column (Inputs) ---
		const inputCol = document.createElement('div');
		inputCol.addClass('input-col');

		// Row 1: Find Input + History
		const findRow = document.createElement('div');
		findRow.addClass('input-row');
		
		this.findInput = document.createElement('input');
		this.findInput.type = 'text';
		this.findInput.placeholder = 'Find...';
		this.findInput.addClass('search-input');
		
		if (this.settings.prefillFind && editor.getSelection().indexOf('\n') < 0 && !noSelection) {
			this.findInput.value = editor.getSelection();
		} else {
			this.findInput.value = this.settings.findText;
		}

		this.findInput.addEventListener('input', () => {
			this.updatePreview();
		});

		// Navigation Keybinds in Input
		this.findInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				if (e.shiftKey) this.findPrevious();
				else this.findNext();
			} else if (e.key === 'ArrowDown') {
				// User requested arrow keys for next/prev
				// Only override if not using modifiers that might mean something else?
				// Simple approach: standard arrow down goes to next match
				e.preventDefault();
				this.findNext();
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				this.findPrevious();
			}
		});

		const historyBtn = document.createElement('button');
		historyBtn.addClass('history-btn');
		historyBtn.innerHTML = '▼';
		historyBtn.onclick = (e) => this.showHistoryMenu(e);

		findRow.appendChild(this.findInput);
		findRow.appendChild(historyBtn);

		// Row 2: Replace Input
		const replaceRow = document.createElement('div');
		replaceRow.addClass('input-row');
		
		this.replaceInput = document.createElement('input');
		this.replaceInput.type = 'text';
		this.replaceInput.placeholder = 'Replace...';
		this.replaceInput.addClass('search-input');
		this.replaceInput.value = this.settings.replaceText;
		// Allow Enter to replace? Maybe replace All? 
		// Standard is usually Enter does nothing or moves to next field.
		// Let's keep it simple for now.

		replaceRow.appendChild(this.replaceInput);

		inputCol.appendChild(findRow);
		inputCol.appendChild(replaceRow);

		// --- Right Column (Buttons) ---
		const btnCol = document.createElement('div');
		btnCol.addClass('btn-col');

		// Top Row Buttons (Nav + Options + Close)
		const topBtnRow = document.createElement('div');
		topBtnRow.addClass('btn-row');

		const prevBtn = document.createElement('button');
		prevBtn.addClass('icon-btn');
		prevBtn.innerHTML = '↑';
		prevBtn.setAttribute('aria-label', 'Previous (Up Arrow)');
		prevBtn.onclick = () => this.findPrevious();

		const nextBtn = document.createElement('button');
		nextBtn.addClass('icon-btn');
		nextBtn.innerHTML = '↓';
		nextBtn.setAttribute('aria-label', 'Next (Down Arrow)');
		nextBtn.onclick = () => this.findNext();
		
		const closeBtn = document.createElement('button');
		closeBtn.addClass('icon-btn');
		closeBtn.innerHTML = '×';
		closeBtn.setAttribute('aria-label', 'Close (Esc)');
		closeBtn.onclick = () => this.hide();

		topBtnRow.appendChild(prevBtn);
		topBtnRow.appendChild(nextBtn);
		topBtnRow.appendChild(closeBtn);

		// Bottom Row Buttons (Toggles + Replace Action)
		const botBtnRow = document.createElement('div');
		botBtnRow.addClass('btn-row');

		const regexToggle = document.createElement('button');
		regexToggle.addClass('icon-btn');
		regexToggle.innerHTML = '.*';
		regexToggle.setAttribute('aria-label', 'Use Regex');
		if (this.settings.useRegEx) regexToggle.addClass('is-active');
		regexToggle.onclick = () => {
			this.settings.useRegEx = !this.settings.useRegEx;
			regexToggle.toggleClass('is-active', this.settings.useRegEx);
			this.updatePreview();
		}

		const caseToggle = document.createElement('button');
		caseToggle.addClass('icon-btn');
		caseToggle.innerHTML = 'Aa';
		caseToggle.setAttribute('aria-label', 'Match Case');
		if (!this.settings.caseInsensitive) caseToggle.addClass('is-active');
		caseToggle.onclick = () => {
			this.settings.caseInsensitive = !this.settings.caseInsensitive;
			caseToggle.toggleClass('is-active', !this.settings.caseInsensitive);
			this.updatePreview();
		}

		const selToggle = document.createElement('button');
		selToggle.addClass('icon-btn');
		selToggle.innerHTML = '⊏⊐';
		selToggle.setAttribute('aria-label', 'In Selection');
		if (this.settings.selOnly && !noSelection) selToggle.addClass('is-active');
		if (noSelection) selToggle.disabled = true;
		selToggle.onclick = () => {
			this.settings.selOnly = !this.settings.selOnly;
			selToggle.toggleClass('is-active', this.settings.selOnly);
			this.updatePreview();
		};

		const replaceAllBtn = document.createElement('button');
		replaceAllBtn.addClass('text-btn');
		replaceAllBtn.textContent = 'Replace All';
		replaceAllBtn.onclick = () => { 
			this.addToHistory(this.findInput.value);
			this.replaceAll(); 
		};

		botBtnRow.appendChild(regexToggle);
		botBtnRow.appendChild(caseToggle);
		botBtnRow.appendChild(selToggle);
		botBtnRow.appendChild(replaceAllBtn);

		btnCol.appendChild(topBtnRow);
		btnCol.appendChild(botBtnRow);

		// Assemble
		this.containerEl.appendChild(inputCol);
		this.containerEl.appendChild(btnCol);

		// Insert at top of editor
		const contentEl = this.view.contentEl;
		const editorEl = contentEl.querySelector('.cm-editor');
		if (editorEl && editorEl.parentElement) {
			editorEl.parentElement.insertBefore(this.containerEl, editorEl);
		}

		// Focus find input
		this.findInput.focus();
		this.findInput.select();

		// Trigger initial preview
		this.updatePreview();
	}

	hide() {
		// Clear preview
		this.clearPreview();

		const existing = this.view.contentEl.querySelector('.regex-find-replace-bar');
		if (existing) {
			existing.remove();
		}
	}
	
	private getEditorView(): EditorView | null {
		// @ts-ignore - access internal CM instance
		return (this.view.editor as unknown as { cm: EditorView }).cm;
	}

	clearPreview() {
		const cm = this.getEditorView();
		if (cm) {
			cm.dispatch({ effects: setHighlightEffect.of({ query: null, range: null }) });
		}
	}

	updatePreview() {
		const cm = this.getEditorView();
		if (!cm) return;

		const searchString = this.findInput.value;
		if (!searchString) {
			this.clearPreview();
			return;
		}

		let query: SearchQuery | null = null;
		
		try {
			// Using SearchQuery from @codemirror/search handles regex construction robustly
			query = new SearchQuery({
				search: searchString,
				regexp: this.settings.useRegEx,
				caseSensitive: !this.settings.caseInsensitive
			});
		} catch {
			// Invalid regex
			query = null;
		}

		let range: {from: number, to: number} | null = null;
		if (this.settings.selOnly) {
			const editor = this.view.editor;
			// Get the first selection range
			const selections = editor.listSelections();
			if (selections && selections.length > 0) {
				const sel = selections[0];
				
				// Standardize standard Obsidian {line, ch} to offset
				const startPos = sel.anchor.line < sel.head.line || (sel.anchor.line === sel.head.line && sel.anchor.ch < sel.head.ch) 
					? sel.anchor 
					: sel.head;
				const endPos = sel.anchor.line < sel.head.line || (sel.anchor.line === sel.head.line && sel.anchor.ch < sel.head.ch)
					? sel.head 
					: sel.anchor;
					
				const from = editor.posToOffset(startPos);
				const to = editor.posToOffset(endPos);
				range = { from, to };
			}
		}

		cm.dispatch({ effects: setHighlightEffect.of({ query, range }) });
	}

	showHistoryMenu(event: MouseEvent) {
		const menu = new Menu();
		const history = this.settings.history;

		if (history.length === 0) {
			menu.addItem((item) => {
				item.setTitle('No history').setDisabled(true);
			});
		} else {
			history.forEach((term) => {
				menu.addItem((item) => {
					item.setTitle(term)
						.onClick(() => {
							this.findInput.value = term;
							this.updatePreview();
							this.findInput.focus();
						});
				});
			});
		}
		
		menu.addItem((item) => {
			item.setTitle('Clear history')
			.setIcon('trash')
			.onClick(async () => {
				this.settings.history = [];
				await this.plugin.saveSettings();
			});
		});

		menu.showAtMouseEvent(event);
	}

	addToHistory(term: string) {
		if (!term || term.trim() === '') return;
		const history = this.settings.history;
		// Remove if exists to move to top
		const index = history.indexOf(term);
		if (index > -1) {
			history.splice(index, 1);
		}
		history.unshift(term);
		// Limit to 10
		if (history.length > 10) {
			history.pop();
		}
		this.settings.history = history;
		void this.plugin.saveSettings();
	}

	getSearchQuery(): SearchQuery | null {
		const searchString = this.findInput.value;
		if (!searchString) return null;
		try {
			return new SearchQuery({
				search: searchString,
				regexp: this.settings.useRegEx,
				caseSensitive: !this.settings.caseInsensitive
			});
		} catch {
			return null;
		}
	}

	findNext() {
		const cm = this.getEditorView();
		const query = this.getSearchQuery();
		if (!cm || !query) return;

		this.addToHistory(this.findInput.value);

		const cursor = query.getCursor(cm.state);
		const currentSel = cm.state.selection.main;
		const currentPos = currentSel.to; // Search from end of current selection

		let firstMatch: {from: number, to: number} | null = null;
		let nextMatch: {from: number, to: number} | null = null;
		
		let item = cursor.next();
		while (!item.done) {
			const { from, to } = item.value;
			if (!firstMatch) firstMatch = { from, to };
			
			if (from >= currentPos) {
				nextMatch = { from, to };
				break;
			}
			item = cursor.next();
		}

		// Wrap around
		if (!nextMatch && firstMatch) {
			nextMatch = firstMatch;
			new Notice('Search wrapped to top');
		}

		if (nextMatch) {
			cm.dispatch({
				selection: { anchor: nextMatch.from, head: nextMatch.to },
				scrollIntoView: true
			});
		} else {
			new Notice('No matches found');
		}
	}

	findPrevious() {
		const cm = this.getEditorView();
		const query = this.getSearchQuery();
		if (!cm || !query) return;

		this.addToHistory(this.findInput.value);

		const cursor = query.getCursor(cm.state);
		const currentSel = cm.state.selection.main;
		const currentPos = currentSel.from; // Search backwards from start of current selection

		let lastMatch: {from: number, to: number} | null = null;
		let prevMatch: {from: number, to: number} | null = null;

		let item = cursor.next();
		while (!item.done) {
			const { from, to } = item.value;
			
			if (to <= currentPos) {
				prevMatch = { from, to };
			} else {
				// We passed the current position, so the previous match was the one we want
				// unless we haven't found any match before cursor
			}
			
			lastMatch = { from, to };
			item = cursor.next();
		}

		// If no prev match found but there are matches, wrap to bottom (lastMatch)
		if (!prevMatch && lastMatch) {
			prevMatch = lastMatch;
			new Notice('Search wrapped to bottom');
		}

		if (prevMatch) {
			cm.dispatch({
				selection: { anchor: prevMatch.from, head: prevMatch.to },
				scrollIntoView: true
			});
		} else {
			new Notice('No matches found');
		}
	}

	replaceAll() {
		const editor = this.view.editor;
		const searchString = this.findInput.value;
		let replaceString = this.replaceInput.value;
		const selectedText = editor.getSelection();
		const noSelection = selectedText === '';

		if (searchString === '') {
			new Notice('Nothing to search for!');
			return;
		}

		// Process line breaks if enabled
		if (this.settings.processLineBreak) {
			logger('Replacing linebreaks in replace-field', 9);
			replaceString = replaceString.replace(/\\n/gm, '\n');
		}

		// Process tabs if enabled
		if (this.settings.processTab) {
			logger('Replacing tabs in replace-field', 9);
			replaceString = replaceString.replace(/\\t/gm, '\t');
		}

		let resultString = 'No match';
		let regexFlags = 'gm';
		if (this.settings.caseInsensitive) regexFlags += 'i';

		// Check if regular expressions should be used
		if (this.settings.useRegEx) {
			logger('USING regex with flags: ' + regexFlags, 8);

			const searchRegex = new RegExp(searchString, regexFlags);
			if (!this.settings.selOnly || noSelection) {
				logger('   SCOPE: Full document', 9);
				const documentText = editor.getValue();
				const rresult = documentText.match(searchRegex);
				if (rresult) {
					editor.setValue(documentText.replace(searchRegex, replaceString));
					resultString = `Made ${rresult.length} replacement(s) in document`;
				}
			} else {
				logger('   SCOPE: Selection', 9);
				const rresult = selectedText.match(searchRegex);
				if (rresult) {
					editor.replaceSelection(selectedText.replace(searchRegex, replaceString));
					resultString = `Made ${rresult.length} replacement(s) in selection`;
				}
			}
		} else {
			logger('NOT using regex', 8);
			let nrOfHits = 0;
			if (!this.settings.selOnly || noSelection) {
				logger('   SCOPE: Full document', 9);
				const documentText = editor.getValue();
				const documentSplit = documentText.split(searchString);
				nrOfHits = documentSplit.length - 1;
				editor.setValue(documentSplit.join(replaceString));
				resultString = `Made ${nrOfHits} replacement(s) in document`;
			} else {
				logger('   SCOPE: Selection', 9);
				const selectedSplit = selectedText.split(searchString);
				nrOfHits = selectedSplit.length - 1;
				editor.replaceSelection(selectedSplit.join(replaceString));
				resultString = `Made ${nrOfHits} replacement(s) in selection`;
			}
		}

		// Save settings
		this.settings.findText = searchString;
		this.settings.replaceText = replaceString;
		this.plugin.saveData(this.settings).catch(() => {});

		new Notice(resultString);
	}
}

class RegexFindReplaceSettingTab extends PluginSettingTab {
	plugin: RegexFindReplacePlugin;

	constructor(app: App, plugin: RegexFindReplacePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		new Setting(containerEl).setName('Regular Expression Settings').setHeading();

		new Setting(containerEl)
			.setName('Case Insensitive')
			.setDesc('When using regular expressions, apply the \'/i\' modifier for case insensitive search)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.caseInsensitive)
				.onChange(async (value) => {
					logger('Settings update: caseInsensitive: ' + value);
					this.plugin.settings.caseInsensitive = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl).setName('General Settings').setHeading();


		new Setting(containerEl)
			.setName('Process \\n as line break')
			.setDesc('When \'\\n\' is used in the replace field, a \'line break\' will be inserted accordingly')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.processLineBreak)
				.onChange(async (value) => {
					logger('Settings update: processLineBreak: ' + value);
					this.plugin.settings.processLineBreak = value;
					await this.plugin.saveSettings();
				}));


		new Setting(containerEl)
			.setName('Prefill Find Field')
			.setDesc('Copy the currently selected text (if any) into the \'Find\' text field. This setting is only applied if the selection does not contain linebreaks')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.prefillFind)
				.onChange(async (value) => {
					logger('Settings update: prefillFind: ' + value);
					this.plugin.settings.prefillFind = value;
					await this.plugin.saveSettings();
				}));
	}
}