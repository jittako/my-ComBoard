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
const playbackModeStorageKey = 'aac-playback-mode-v1';

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
const saveFeedback = document.querySelector('#save-feedback');
const undoButton = document.querySelector('#undo-button');
const clearButton = document.querySelector('#clear-button');
const speakButton = document.querySelector('#speak-button');
const voiceStatusText = document.querySelector('#voice-status-text');
const voiceStatusDot = document.querySelector('.status-dot');

let activeCategoryId = categories[0].id;
let selectedWords = [];
let playbackMode = loadPlaybackMode();
let customWords = loadCustomWords();

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
		...category.words.map(([label, emoji]) => ({ label, emoji })),
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
		id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
		label,
		emoji: wordEmojiSelect.value,
		categoryId
	};
	const updatedWords = [...customWords, newWord];

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
	addWordForm.reset();
	wordCategorySelect.value = categoryId;
	saveFeedback.textContent = `「${label}」をこの端末に保存しました。`;
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
