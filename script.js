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

const categoryList = document.querySelector('#category-list');
const wordGrid = document.querySelector('#word-grid');
const messageSection = document.querySelector('.message-section');
const messageBoard = document.querySelector('#message-board');
const messagePlaceholder = document.querySelector('#message-placeholder');
const messageCount = document.querySelector('#message-count');
const modeHint = document.querySelector('#mode-hint');
const modeButtons = document.querySelectorAll('.mode-button');
const undoButton = document.querySelector('#undo-button');
const clearButton = document.querySelector('#clear-button');
const speakButton = document.querySelector('#speak-button');
const voiceStatusText = document.querySelector('#voice-status-text');
const voiceStatusDot = document.querySelector('.status-dot');

let activeCategoryId = categories[0].id;
let selectedWords = [];
let playbackMode = 'compose';

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

	category.words.forEach(([label, emoji]) => {
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

if ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
	voiceStatusText.textContent = '音声でつたえられます';
} else {
	voiceStatusText.textContent = 'この端末では音声を使えません';
	voiceStatusDot.classList.add('unavailable');
}

renderCategories();
renderWords();
renderMessage();
