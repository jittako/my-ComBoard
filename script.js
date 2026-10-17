'use strict';

const categories = [
	{
		id: 'feelings',
		label: 'きもち',
		words: [
			['うれしい', '🙂'], ['かなしい', '😢'], ['いや', '🙅'], ['こまった', '😟'],
			['つかれた', '😴'], ['だいじょうぶ', '👍'], ['こわい', '😨'], ['たのしい', '🎉']
		]
	},
	{
		id: 'needs',
		label: 'したい',
		words: [
			['トイレ', '🚻'], ['やすみたい', '🛋️'], ['てつだって', '🆘'], ['おわり', '🛑'],
			['もういちど', '🔁'], ['みて', '👀'], ['いきたい', '🚶'], ['のみたい', '🥤']
		]
	},
	{
		id: 'people',
		label: 'ひと・あいさつ',
		words: [
			['せんせい', '🧑‍🏫'], ['ともだち', '🧒'], ['かぞく', '🏠'], ['いっしょに', '🤝'],
			['ありがとう', '💐'], ['ごめんなさい', '🙇'], ['おはよう', '🌅'], ['さようなら', '👋']
		]
	},
	{
		id: 'things',
		label: 'もの',
		words: [
			['みず', '💧'], ['ごはん', '🍚'], ['おもちゃ', '🧸'], ['ほん', '📖'],
			['えんぴつ', '✏️'], ['ボール', '⚽'], ['おんがく', '🎵'], ['もっと', '➕']
		]
	},
	{
		id: 'class',
		label: 'がくしゅう',
		words: [
			['わからない', '❓'], ['おしえて', '🙋'], ['できた', '🌟'], ['よみたい', '📚'],
			['かきたい', '✍️'], ['ききたい', '👂'], ['みずをください', '🥛'], ['もうすこし', '⏳']
		]
	}
];

const customWordsStorageKey = 'aac-custom-words-v1';
const removedDefaultWordsStorageKey = 'aac-removed-default-words-v1';
const playbackModeStorageKey = 'aac-playback-mode-v1';

function getDefaultWords() {
	return categories.flatMap((category) =>
		category.words.map(([label, emoji]) => ({
			id: `default:${category.id}:${label}`,
			label,
			emoji,
			categoryId: category.id
		}))
	);
}

function loadCustomWords() {
	try {
		const savedWords = JSON.parse(localStorage.getItem(customWordsStorageKey) || '[]');
		if (!Array.isArray(savedWords)) {
			return [];
		}

		return savedWords.filter((word) =>
			typeof word?.id === 'string' &&
			typeof word.label === 'string' && word.label.trim().length > 0 &&
			typeof word.emoji === 'string' &&
			categories.some((category) => category.id === word.categoryId)
		);
	} catch {
		return [];
	}
}

function loadRemovedDefaultWordIds() {
	try {
		const savedIds = JSON.parse(localStorage.getItem(removedDefaultWordsStorageKey) || '[]');
		if (!Array.isArray(savedIds)) {
			return [];
		}

		const defaultWordIds = new Set(getDefaultWords().map((word) => word.id));
		return savedIds.filter((id) => typeof id === 'string' && defaultWordIds.has(id));
	} catch {
		return [];
	}
}

function loadPlaybackMode() {
	try {
		return localStorage.getItem(playbackModeStorageKey) === 'direct' ? 'direct' : 'compose';
	} catch {
		return 'compose';
	}
}

const categoryList = document.querySelector('#category-list');
const wordGrid = document.querySelector('#word-grid');
const messageSection = document.querySelector('.message-section');
const messageBoard = document.querySelector('#message-board');
const messagePlaceholder = document.querySelector('#message-placeholder');
const messageCount = document.querySelector('#message-count');
const modeHint = document.querySelector('#mode-hint');
const modeButtons = document.querySelectorAll('.mode-button');
const settingsDialog = document.querySelector('#settings-dialog');
const openSettingsButton = document.querySelector('#open-settings');
const closeSettingsButton = document.querySelector('#close-settings');
const addWordForm = document.querySelector('#add-word-form');
const wordLabelInput = document.querySelector('#word-label');
const wordCategorySelect = document.querySelector('#word-category');
const wordEmojiSelect = document.querySelector('#word-emoji');
const saveWordButton = document.querySelector('#save-word-button');
const cancelEditWordButton = document.querySelector('#cancel-edit-word');
const saveFeedback = document.querySelector('#save-feedback');
const customWordList = document.querySelector('#custom-word-list');
const customWordEmpty = document.querySelector('#custom-word-empty');
const deleteSelectedWordsButton = document.querySelector('#delete-selected-words');
const selectedWordCount = document.querySelector('#selected-word-count');
const undoButton = document.querySelector('#undo-button');
const clearButton = document.querySelector('#clear-button');
const speakButton = document.querySelector('#speak-button');
const voiceStatusText = document.querySelector('#voice-status-text');
const voiceStatusDot = document.querySelector('.status-dot');

let activeCategoryId = categories[0].id;
let selectedWords = [];
let playbackMode = loadPlaybackMode();
let customWords = loadCustomWords();
let removedDefaultWordIds = loadRemovedDefaultWordIds();
let editingCustomWordId = null;
const selectedManagedWordIds = new Set();

function renderCategoryOptions() {
	wordCategorySelect.replaceChildren();
	categories.forEach((category) => {
		const option = document.createElement('option');
		option.value = category.id;
		option.textContent = category.label;
		wordCategorySelect.append(option);
	});
}

function renderCategories() {
	categoryList.replaceChildren();

	categories.forEach((category) => {
		const tab = document.createElement('button');
		tab.className = 'category-tab';
		tab.type = 'button';
		tab.id = `tab-${category.id}`;
		tab.textContent = category.label;
		tab.setAttribute('aria-pressed', String(category.id === activeCategoryId));
		tab.addEventListener('click', () => {
			activeCategoryId = category.id;
			renderCategories();
			renderWords();
		});
		categoryList.append(tab);
	});
}

function renderWords() {
	const category = categories.find((item) => item.id === activeCategoryId);
	wordGrid.replaceChildren();
	wordGrid.setAttribute('aria-labelledby', `tab-${category.id}`);
	const words = [
		...category.words
			.map(([label, emoji]) => ({ label, emoji, id: `default:${category.id}:${label}` }))
			.filter((word) => !removedDefaultWordIds.includes(word.id)),
		...customWords.filter((word) => word.categoryId === category.id)
	];

	words.forEach(({ label, emoji }) => {
		const button = document.createElement('button');
		button.className = 'word-button';
		button.type = 'button';
		button.setAttribute('aria-label', label);

		const symbol = document.createElement('span');
		symbol.className = 'word-emoji';
		symbol.setAttribute('aria-hidden', 'true');
		symbol.textContent = emoji;

		const word = document.createElement('span');
		word.textContent = label;

		button.append(symbol, word);
		button.addEventListener('click', () => {
			if (playbackMode === 'direct') {
				speakText(label);
				return;
			}

			addWord(label, emoji);
		});
		wordGrid.append(button);
	});
}

function renderCustomWords() {
	customWordList.replaceChildren();
	const words = [
		...getDefaultWords()
			.filter((word) => !removedDefaultWordIds.includes(word.id))
			.map((word) => ({ ...word, isDefault: true })),
		...customWords.map((word) => ({ ...word, isDefault: false }))
	];
	const availableIds = new Set(words.map((word) => `${word.isDefault ? 'default' : 'custom'}:${word.id}`));
	selectedManagedWordIds.forEach((id) => {
		if (!availableIds.has(id)) {
			selectedManagedWordIds.delete(id);
		}
	});
	customWordList.hidden = words.length === 0;
	customWordEmpty.hidden = words.length > 0;

	words.forEach((managedWord) => {
		const item = document.createElement('li');
		item.className = 'custom-word-item';

		const selectionId = `${managedWord.isDefault ? 'default' : 'custom'}:${managedWord.id}`;
		const selectionLabel = document.createElement('label');
		selectionLabel.className = 'custom-word-selection';
		const checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		checkbox.checked = selectedManagedWordIds.has(selectionId);
		checkbox.setAttribute('aria-label', `${managedWord.label}を選択`);
		checkbox.addEventListener('change', () => {
			if (checkbox.checked) {
				selectedManagedWordIds.add(selectionId);
			} else {
				selectedManagedWordIds.delete(selectionId);
			}
			updateBulkDeleteControls();
		});
		selectionLabel.append(checkbox);

		const symbol = document.createElement('span');
		symbol.className = 'custom-word-symbol';
		symbol.setAttribute('aria-hidden', 'true');
		symbol.textContent = managedWord.emoji;

		const details = document.createElement('span');
		details.className = 'custom-word-details';
		const name = document.createElement('span');
		name.className = 'custom-word-name';
		name.textContent = managedWord.label;
		const category = categories.find((entry) => entry.id === managedWord.categoryId);
		const categoryName = document.createElement('span');
		categoryName.className = 'custom-word-category';
		categoryName.textContent = category.label;
		details.append(name, categoryName);

		const actions = document.createElement('span');
		actions.className = 'custom-word-actions';
		if (!managedWord.isDefault) {
			const editButton = document.createElement('button');
			editButton.className = 'management-button';
			editButton.type = 'button';
			editButton.textContent = '編集';
			editButton.setAttribute('aria-label', `${managedWord.label}を編集`);
			editButton.addEventListener('click', () => beginEditCustomWord(managedWord.id));
			actions.append(editButton);
		}

		const deleteButton = document.createElement('button');
		deleteButton.className = 'management-button delete';
		deleteButton.type = 'button';
		deleteButton.textContent = '削除';
		deleteButton.setAttribute('aria-label', `${managedWord.label}を削除`);
		deleteButton.addEventListener('click', () => managedWord.isDefault
			? deleteDefaultWord(managedWord)
			: deleteCustomWord(managedWord.id));
		actions.append(deleteButton);

		item.append(selectionLabel, symbol, details, actions);
		customWordList.append(item);
	});
	updateBulkDeleteControls();
}

function updateBulkDeleteControls() {
	const count = selectedManagedWordIds.size;
	deleteSelectedWordsButton.disabled = count === 0;
	selectedWordCount.textContent = `選択中：${count}こ`;
}

function deleteSelectedWords() {
	const selectedWords = [
		...getDefaultWords()
			.filter((word) => selectedManagedWordIds.has(`default:${word.id}`))
			.map((word) => ({ ...word, isDefault: true })),
		...customWords
			.filter((word) => selectedManagedWordIds.has(`custom:${word.id}`))
			.map((word) => ({ ...word, isDefault: false }))
	];
	if (selectedWords.length === 0) {
		return;
	}

	const labels = selectedWords.slice(0, 3).map((word) => `「${word.label}」`).join('、');
	const remainingCount = selectedWords.length - 3;
	const summary = remainingCount > 0 ? `${labels}など${selectedWords.length}こ` : labels;
	if (!window.confirm(`${summary}を削除しますか？この操作は取り消せません。`)) {
		return;
	}

	const selectedDefaultIds = selectedWords.filter((word) => word.isDefault).map((word) => word.id);
	const selectedCustomIds = new Set(selectedWords.filter((word) => !word.isDefault).map((word) => word.id));
	const updatedCustomWords = customWords.filter((word) => !selectedCustomIds.has(word.id));
	const updatedRemovedDefaultWordIds = [...new Set([...removedDefaultWordIds, ...selectedDefaultIds])];
	const updates = [];
	if (selectedCustomIds.size > 0) {
		updates.push([customWordsStorageKey, JSON.stringify(updatedCustomWords)]);
	}
	if (selectedDefaultIds.length > 0) {
		updates.push([removedDefaultWordsStorageKey, JSON.stringify(updatedRemovedDefaultWordIds)]);
	}

	const previousValues = new Map();
	const attemptedUpdates = [];
	try {
		updates.forEach(([key]) => previousValues.set(key, localStorage.getItem(key)));
		for (const [key, value] of updates) {
			attemptedUpdates.push(key);
			localStorage.setItem(key, value);
		}
	} catch {
		let rollbackFailed = false;
		attemptedUpdates.reverse().forEach((key) => {
			try {
				const previousValue = previousValues.get(key);
				if (previousValue === null) {
					localStorage.removeItem(key);
				} else {
					localStorage.setItem(key, previousValue);
				}
			} catch {
				rollbackFailed = true;
			}
		});
		saveFeedback.textContent = rollbackFailed
			? '削除を保存できませんでした。ページを再読み込みして、ことばの状態を確認してください。'
			: '削除を保存できませんでした。ブラウザーの設定を確認してください。';
		return;
	}

	customWords = updatedCustomWords;
	removedDefaultWordIds = updatedRemovedDefaultWordIds;
	selectedManagedWordIds.clear();
	if (selectedCustomIds.has(editingCustomWordId)) {
		resetWordForm();
	}
	renderWords();
	renderCustomWords();
	saveFeedback.textContent = `${selectedWords.length}このことばを削除しました。`;
}

function deleteDefaultWord(word) {
	if (!window.confirm(`「${word.label}」を削除しますか？この操作は取り消せません。`)) {
		return;
	}

	const updatedIds = [...removedDefaultWordIds, word.id];
	try {
		localStorage.setItem(removedDefaultWordsStorageKey, JSON.stringify(updatedIds));
	} catch {
		saveFeedback.textContent = '削除を保存できませんでした。ブラウザーの設定を確認してください。';
		return;
	}

	removedDefaultWordIds = updatedIds;
	renderWords();
	renderCustomWords();
	saveFeedback.textContent = `「${word.label}」を削除しました。`;
}

function beginEditCustomWord(wordId) {
	const customWord = customWords.find((word) => word.id === wordId);
	if (!customWord) {
		return;
	}

	editingCustomWordId = wordId;
	wordLabelInput.value = customWord.label;
	wordCategorySelect.value = customWord.categoryId;
	wordEmojiSelect.value = customWord.emoji;
	saveWordButton.textContent = '変更を保存';
	cancelEditWordButton.hidden = false;
	saveFeedback.textContent = `「${customWord.label}」を編集中です。`;
	wordLabelInput.focus();
}

function resetWordForm() {
	addWordForm.reset();
	editingCustomWordId = null;
	saveWordButton.textContent = '追加して保存';
	cancelEditWordButton.hidden = true;
}

function deleteCustomWord(wordId) {
	const customWord = customWords.find((word) => word.id === wordId);
	if (!customWord || !window.confirm(`「${customWord.label}」を削除しますか？この操作は取り消せません。`)) {
		return;
	}

	const updatedWords = customWords.filter((word) => word.id !== wordId);
	try {
		localStorage.setItem(customWordsStorageKey, JSON.stringify(updatedWords));
	} catch {
		saveFeedback.textContent = '削除を保存できませんでした。ブラウザーの設定を確認してください。';
		return;
	}

	customWords = updatedWords;
	if (editingCustomWordId === wordId) {
		resetWordForm();
	}
	renderWords();
	renderCustomWords();
	saveFeedback.textContent = `「${customWord.label}」を削除しました。`;
}

function setPlaybackMode(mode) {
	playbackMode = mode;
	try {
		localStorage.setItem(playbackModeStorageKey, mode);
	} catch {
	}
	messageSection.hidden = mode === 'direct';
	modeHint.textContent = mode === 'direct'
		? 'おすと、そのことばをすぐに再生します'
		: 'えらんだことばをつなげて再生できます';
	modeButtons.forEach((button) => {
		button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
	});
}

function renderMessage() {
	messageBoard.querySelectorAll('.message-word').forEach((word) => word.remove());
	messagePlaceholder.hidden = selectedWords.length > 0;

	selectedWords.forEach(({ label, emoji }) => {
		const item = document.createElement('span');
		item.className = 'message-word';

		const symbol = document.createElement('span');
		symbol.className = 'word-emoji';
		symbol.setAttribute('aria-hidden', 'true');
		symbol.textContent = emoji;

		const word = document.createElement('span');
		word.textContent = label;
		item.append(symbol, word);
		messageBoard.append(item);
	});

	messageCount.textContent = `${selectedWords.length}こ`;
	undoButton.disabled = selectedWords.length === 0;
	clearButton.disabled = selectedWords.length === 0;
	speakButton.disabled = selectedWords.length === 0;
}

function addWord(label, emoji) {
	selectedWords.push({ label, emoji });
	renderMessage();
}

function saveCustomWord(event) {
	event.preventDefault();
	const label = wordLabelInput.value.trim();
	const categoryId = wordCategorySelect.value;
	if (!label || !categories.some((category) => category.id === categoryId)) {
		return;
	}

	const newWord = {
		id: editingCustomWordId || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
		label,
		emoji: wordEmojiSelect.value,
		categoryId
	};
	const wasEditing = editingCustomWordId !== null;
	const updatedWords = wasEditing
		? customWords.map((word) => word.id === editingCustomWordId ? newWord : word)
		: [...customWords, newWord];

	try {
		localStorage.setItem(customWordsStorageKey, JSON.stringify(updatedWords));
	} catch {
		saveFeedback.textContent = 'この端末に保存できませんでした。ブラウザーの設定を確認してください。';
		return;
	}

	customWords = updatedWords;
	activeCategoryId = categoryId;
	renderCategories();
	renderWords();
	renderCustomWords();
	resetWordForm();
	wordCategorySelect.value = categoryId;
	saveFeedback.textContent = wasEditing
		? `「${label}」を更新しました。`
		: `「${label}」をこの端末に保存しました。`;
	wordLabelInput.focus();
}

function speakText(text) {
	if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
		return;
	}

	window.speechSynthesis.cancel();
	const utterance = new SpeechSynthesisUtterance(text);
	utterance.lang = 'ja-JP';
	utterance.rate = 0.9;
	window.speechSynthesis.speak(utterance);
}

function speakMessage() {
	if (selectedWords.length === 0) {
		return;
	}

	speakText(selectedWords.map(({ label }) => label).join(' '));
}

undoButton.addEventListener('click', () => {
	selectedWords.pop();
	renderMessage();
});

clearButton.addEventListener('click', () => {
	selectedWords = [];
	window.speechSynthesis?.cancel();
	renderMessage();
});

speakButton.addEventListener('click', speakMessage);
modeButtons.forEach((button) => {
	button.addEventListener('click', () => setPlaybackMode(button.dataset.mode));
});
openSettingsButton.addEventListener('click', () => {
	settingsDialog.showModal();
});
closeSettingsButton.addEventListener('click', () => {
	settingsDialog.close();
});
addWordForm.addEventListener('submit', saveCustomWord);
deleteSelectedWordsButton.addEventListener('click', deleteSelectedWords);
cancelEditWordButton.addEventListener('click', () => {
	resetWordForm();
	saveFeedback.textContent = '';
	wordLabelInput.focus();
});
setPlaybackMode(playbackMode);

if ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
	voiceStatusText.textContent = '音声でつたえられます';
} else {
	voiceStatusText.textContent = 'この端末では音声を使えません';
	voiceStatusDot.classList.add('unavailable');
}

renderCategories();
renderCategoryOptions();
renderWords();
renderMessage();
renderCustomWords();
