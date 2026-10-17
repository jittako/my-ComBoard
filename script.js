'use strict';

const defaultCategories = [
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

const customCategoriesStorageKey = 'aac-custom-categories-v1';
const customWordsStorageKey = 'aac-custom-words-v1';
const playbackModeStorageKey = 'aac-playback-mode-v1';

function loadCustomCategories() {
	try {
		const savedCategories = JSON.parse(localStorage.getItem(customCategoriesStorageKey) || '[]');
		if (!Array.isArray(savedCategories)) {
			return [];
		}

		const categoryIds = new Set(defaultCategories.map((category) => category.id));
		const categoryLabels = new Set(defaultCategories.map((category) => category.label.trim().normalize('NFKC')));
		return savedCategories.filter((category) => {
			if (
				typeof category?.id !== 'string' || !category.id.startsWith('custom-') ||
				typeof category.label !== 'string' || !category.label.trim() || category.label.trim().length > 20 ||
				categoryIds.has(category.id) ||
				categoryLabels.has(category.label.trim().normalize('NFKC'))
			) {
				return false;
			}
			categoryIds.add(category.id);
			categoryLabels.add(category.label.trim().normalize('NFKC'));
			return true;
		}).map(({ id, label }) => ({ id, label: label.trim(), words: [] }));
	} catch {
		return [];
	}
}

const customCategories = loadCustomCategories();
const categories = [...defaultCategories, ...customCategories];

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
			(word.imageDataUrl === undefined ||
				(typeof word.imageDataUrl === 'string' && /^data:image\/jpeg;base64,/.test(word.imageDataUrl))) &&
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
const categoryNameInput = document.querySelector('#category-name-input');
const addCategoryButton = document.querySelector('#add-category-button');
const customCategoryList = document.querySelector('#custom-category-list');
const customCategoryEmpty = document.querySelector('#custom-category-empty');
const categoryFeedback = document.querySelector('#category-feedback');
const addWordForm = document.querySelector('#add-word-form');
const wordLabelInput = document.querySelector('#word-label');
const wordCategorySelect = document.querySelector('#word-category');
const wordEmojiSelect = document.querySelector('#word-emoji');
const wordImageInput = document.querySelector('#word-image');
const wordImagePreview = document.querySelector('#word-image-preview');
const removeWordImageButton = document.querySelector('#remove-word-image');
const saveWordButton = document.querySelector('#save-word-button');
const cancelEditWordButton = document.querySelector('#cancel-edit-word');
const saveFeedback = document.querySelector('#save-feedback');
const customWordList = document.querySelector('#custom-word-list');
const customWordEmpty = document.querySelector('#custom-word-empty');
const undoButton = document.querySelector('#undo-button');
const clearButton = document.querySelector('#clear-button');
const speakButton = document.querySelector('#speak-button');
const voiceStatusText = document.querySelector('#voice-status-text');
const voiceStatusDot = document.querySelector('.status-dot');

let activeCategoryId = categories[0].id;
let selectedWords = [];
let playbackMode = loadPlaybackMode();
let customWords = loadCustomWords();
let editingCustomWordId = null;
let removeCurrentImage = false;
let imagePreviewObjectUrl = null;

const maxWordImageFileSize = 10 * 1024 * 1024;
const maxWordImageDimension = 512;

function renderCategoryOptions() {
	const selectedCategoryId = wordCategorySelect.value;
	wordCategorySelect.replaceChildren();
	categories.forEach((category) => {
		const option = document.createElement('option');
		option.value = category.id;
		option.textContent = category.label;
		wordCategorySelect.append(option);
	});
	wordCategorySelect.value = categories.some((category) => category.id === selectedCategoryId)
		? selectedCategoryId
		: categories[0].id;
}

function renderCustomCategories() {
	customCategoryList.replaceChildren();
	customCategoryList.hidden = customCategories.length === 0;
	customCategoryEmpty.hidden = customCategories.length > 0;

	customCategories.forEach((category) => {
		const item = document.createElement('li');
		item.className = 'custom-category-item';

		const name = document.createElement('span');
		name.className = 'custom-category-name';
		name.textContent = category.label;

		const actions = document.createElement('span');
		actions.className = 'custom-category-actions';

		const renameButton = document.createElement('button');
		renameButton.className = 'management-button';
		renameButton.type = 'button';
		renameButton.textContent = '名前を変更';
		renameButton.setAttribute('aria-label', `${category.label}の名前を変更`);
		renameButton.addEventListener('click', () => renameCustomCategory(category));

		const deleteButton = document.createElement('button');
		deleteButton.className = 'management-button delete';
		deleteButton.type = 'button';
		deleteButton.textContent = '削除';
		deleteButton.setAttribute('aria-label', `${category.label}を削除`);
		deleteButton.addEventListener('click', () => deleteCustomCategory(category));

		actions.append(renameButton, deleteButton);
		item.append(name, actions);
		customCategoryList.append(item);
	});
}

function persistCategoryChanges(updatedCategories, updatedWords) {
	const keysAndValues = [[
		customCategoriesStorageKey,
		JSON.stringify(updatedCategories.map(({ id, label }) => ({ id, label })))
	]];
	if (updatedWords) {
		keysAndValues.push([customWordsStorageKey, JSON.stringify(updatedWords)]);
	}
	const previousValues = new Map();
	const attemptedKeys = [];
	try {
		keysAndValues.forEach(([key]) => previousValues.set(key, localStorage.getItem(key)));
		for (const [key, value] of keysAndValues) {
			attemptedKeys.push(key);
			localStorage.setItem(key, value);
		}
		return true;
	} catch {
		let rollbackFailed = false;
		attemptedKeys.reverse().forEach((key) => {
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
		categoryFeedback.textContent = rollbackFailed
			? 'カテゴリを保存できませんでした。ページを再読み込みして状態を確認してください。'
			: 'カテゴリを保存できませんでした。ブラウザーの保存容量や設定を確認してください。';
		return false;
	}
}

function categoryLabelAlreadyExists(label, exceptId = null) {
	const normalizedLabel = label.trim().normalize('NFKC');
	return categories.some((category) =>
		category.id !== exceptId && category.label.trim().normalize('NFKC') === normalizedLabel
	);
}

function addCustomCategory() {
	const label = categoryNameInput.value.trim();
	if (!label) {
		categoryFeedback.textContent = 'カテゴリ名を入力してください。';
		categoryNameInput.focus();
		return;
	}
	if (categoryLabelAlreadyExists(label)) {
		categoryFeedback.textContent = '同じ名前のカテゴリがすでにあります。';
		categoryNameInput.focus();
		return;
	}

	const category = {
		id: `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		label,
		words: []
	};
	if (!persistCategoryChanges([...customCategories, category])) {
		return;
	}

	customCategories.push(category);
	categories.push(category);
	activeCategoryId = category.id;
	renderCustomCategories();
	renderCategories();
	renderCategoryOptions();
	renderWords();
	wordCategorySelect.value = category.id;
	categoryNameInput.value = '';
	categoryFeedback.textContent = `「${label}」カテゴリを追加しました。`;
}

function renameCustomCategory(category) {
	const enteredLabel = window.prompt('新しいカテゴリ名を入力してください。', category.label);
	if (enteredLabel === null) {
		return;
	}
	const label = enteredLabel.trim();
	if (!label) {
		categoryFeedback.textContent = 'カテゴリ名を入力してください。';
		return;
	}
	if (label.length > 20) {
		categoryFeedback.textContent = 'カテゴリ名は20文字以内で入力してください。';
		return;
	}
	if (categoryLabelAlreadyExists(label, category.id)) {
		categoryFeedback.textContent = '同じ名前のカテゴリがすでにあります。';
		return;
	}

	const updatedCategories = customCategories.map((item) =>
		item.id === category.id ? { ...item, label } : item
	);
	if (!persistCategoryChanges(updatedCategories)) {
		return;
	}

	category.label = label;
	renderCustomCategories();
	renderCategories();
	renderCategoryOptions();
	renderCustomWords();
	categoryFeedback.textContent = `カテゴリ名を「${label}」に変更しました。`;
}

function deleteCustomCategory(category) {
	const categoryWords = customWords.filter((word) => word.categoryId === category.id);
	const wordNotice = categoryWords.length > 0
		? `\nこのカテゴリの追加したことば${categoryWords.length}こも削除されます。`
		: '';
	if (!window.confirm(`「${category.label}」カテゴリを削除しますか？${wordNotice}\nこの操作は取り消せません。`)) {
		return;
	}

	const updatedCategories = customCategories.filter((item) => item.id !== category.id);
	const updatedWords = customWords.filter((word) => word.categoryId !== category.id);
	if (!persistCategoryChanges(updatedCategories, updatedWords)) {
		return;
	}

	customCategories.splice(customCategories.indexOf(category), 1);
	categories.splice(categories.indexOf(category), 1);
	customWords = updatedWords;
	if (activeCategoryId === category.id) {
		activeCategoryId = defaultCategories[0].id;
	}
	if (wordCategorySelect.value === category.id) {
		wordCategorySelect.value = defaultCategories[0].id;
	}
	if (editingCustomWordId && !customWords.some((word) => word.id === editingCustomWordId)) {
		resetWordForm();
	}
	renderCustomCategories();
	renderCategories();
	renderCategoryOptions();
	renderWords();
	renderCustomWords();
	categoryFeedback.textContent = `「${category.label}」カテゴリを削除しました。`;
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

	words.forEach(({ label, emoji, imageDataUrl }) => {
		const button = document.createElement('button');
		button.className = 'word-button';
		button.type = 'button';
		button.setAttribute('aria-label', label);

		const symbol = createWordSymbol(emoji, imageDataUrl);

		const word = document.createElement('span');
		word.textContent = label;

		button.append(symbol, word);
		button.addEventListener('click', () => {
			if (playbackMode === 'direct') {
				speakText(label);
				return;
			}

			addWord(label, emoji, imageDataUrl);
		});
		wordGrid.append(button);
	});
}

function renderCustomWords() {
	customWordList.replaceChildren();
	customWordList.hidden = customWords.length === 0;
	customWordEmpty.hidden = customWords.length > 0;

	customWords.forEach((customWord) => {
		const item = document.createElement('li');
		item.className = 'custom-word-item';

		const symbol = createWordSymbol(customWord.emoji, customWord.imageDataUrl, 'custom-word-symbol');

		const details = document.createElement('span');
		details.className = 'custom-word-details';
		const name = document.createElement('span');
		name.className = 'custom-word-name';
		name.textContent = customWord.label;
		const category = categories.find((entry) => entry.id === customWord.categoryId);
		const categoryName = document.createElement('span');
		categoryName.className = 'custom-word-category';
		categoryName.textContent = category.label;
		details.append(name, categoryName);

		const actions = document.createElement('span');
		actions.className = 'custom-word-actions';
		const editButton = document.createElement('button');
		editButton.className = 'management-button';
		editButton.type = 'button';
		editButton.textContent = '編集';
		editButton.setAttribute('aria-label', `${customWord.label}を編集`);
		editButton.addEventListener('click', () => beginEditCustomWord(customWord.id));

		const deleteButton = document.createElement('button');
		deleteButton.className = 'management-button delete';
		deleteButton.type = 'button';
		deleteButton.textContent = '削除';
		deleteButton.setAttribute('aria-label', `${customWord.label}を削除`);
		deleteButton.addEventListener('click', () => deleteCustomWord(customWord.id));
		actions.append(editButton, deleteButton);

		item.append(symbol, details, actions);
		customWordList.append(item);
	});
}

function createWordSymbol(emoji, imageDataUrl, className = 'word-emoji') {
	const symbol = document.createElement('span');
	symbol.className = className;
	symbol.setAttribute('aria-hidden', 'true');
	if (imageDataUrl) {
		const image = document.createElement('img');
		image.className = 'word-image';
		image.src = imageDataUrl;
		image.alt = '';
		symbol.append(image);
	} else {
		symbol.textContent = emoji;
	}
	return symbol;
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
	wordImageInput.value = '';
	removeCurrentImage = false;
	setWordImagePreview(customWord.imageDataUrl || '');
	saveWordButton.textContent = '変更を保存';
	cancelEditWordButton.hidden = false;
	saveFeedback.textContent = `「${customWord.label}」を編集中です。`;
	wordLabelInput.focus();
}

function resetWordForm() {
	addWordForm.reset();
	editingCustomWordId = null;
	removeCurrentImage = false;
	setWordImagePreview('');
	saveWordButton.textContent = '追加して保存';
	cancelEditWordButton.hidden = true;
}

function setWordImagePreview(source) {
	if (imagePreviewObjectUrl) {
		URL.revokeObjectURL(imagePreviewObjectUrl);
		imagePreviewObjectUrl = null;
	}
	wordImagePreview.src = source;
	wordImagePreview.hidden = !source;
	removeWordImageButton.hidden = !source;
}

function compressWordImage(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(new Error('写真を読み込めませんでした。別の写真を選んでください。'));
		reader.onload = () => {
			const image = new Image();
			image.onerror = () => reject(new Error('写真を開けませんでした。別の画像ファイルを選んでください。'));
			image.onload = () => {
				const scale = Math.min(1, maxWordImageDimension / Math.max(image.width, image.height));
				const canvas = document.createElement('canvas');
				canvas.width = Math.max(1, Math.round(image.width * scale));
				canvas.height = Math.max(1, Math.round(image.height * scale));
				const context = canvas.getContext('2d');
				if (!context) {
					reject(new Error('写真を処理できませんでした。このブラウザーでは写真を保存できません。'));
					return;
				}
				context.drawImage(image, 0, 0, canvas.width, canvas.height);
				try {
					resolve(canvas.toDataURL('image/jpeg', 0.78));
				} catch {
					reject(new Error('写真を圧縮できませんでした。別の写真を選んでください。'));
				}
			};
			image.src = reader.result;
		};
		reader.readAsDataURL(file);
	});
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

	selectedWords.forEach(({ label, emoji, imageDataUrl }) => {
		const item = document.createElement('span');
		item.className = 'message-word';

		const symbol = createWordSymbol(emoji, imageDataUrl);

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

function addWord(label, emoji, imageDataUrl) {
	selectedWords.push({ label, emoji, imageDataUrl });
	renderMessage();
}

async function saveCustomWord(event) {
	event.preventDefault();
	const label = wordLabelInput.value.trim();
	const categoryId = wordCategorySelect.value;
	if (!label || !categories.some((category) => category.id === categoryId)) {
		return;
	}

	const imageFile = wordImageInput.files[0];
	if (imageFile && (!imageFile.type.startsWith('image/') || imageFile.size > maxWordImageFileSize)) {
		saveFeedback.textContent = imageFile.size > maxWordImageFileSize
			? '写真は10MB以下のファイルを選んでください。'
			: '画像ファイルを選んでください。';
		return;
	}

	saveWordButton.disabled = true;
	try {
		const existingWord = customWords.find((word) => word.id === editingCustomWordId);
		let imageDataUrl = removeCurrentImage ? undefined : existingWord?.imageDataUrl;
		if (imageFile) {
			imageDataUrl = await compressWordImage(imageFile);
		}

		const newWord = {
			id: editingCustomWordId || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
			label,
			emoji: wordEmojiSelect.value,
			categoryId,
			...(imageDataUrl ? { imageDataUrl } : {})
		};
		const wasEditing = editingCustomWordId !== null;
		const updatedWords = wasEditing
			? customWords.map((word) => word.id === editingCustomWordId ? newWord : word)
			: [...customWords, newWord];

		try {
			localStorage.setItem(customWordsStorageKey, JSON.stringify(updatedWords));
		} catch {
			saveFeedback.textContent = 'この端末に保存できませんでした。保存容量を空けてから、もう一度お試しください。';
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
	} catch (error) {
		saveFeedback.textContent = error instanceof Error
			? error.message
			: '写真を処理できませんでした。別の写真を選んでください。';
	} finally {
		saveWordButton.disabled = false;
	}
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
addCategoryButton.addEventListener('click', addCustomCategory);
categoryNameInput.addEventListener('keydown', (event) => {
	if (event.key === 'Enter') {
		event.preventDefault();
		addCustomCategory();
	}
});
closeSettingsButton.addEventListener('click', () => {
	settingsDialog.close();
});
addWordForm.addEventListener('submit', saveCustomWord);
wordImageInput.addEventListener('change', () => {
	const imageFile = wordImageInput.files[0];
	removeCurrentImage = false;
	if (!imageFile) {
		const currentWord = customWords.find((word) => word.id === editingCustomWordId);
		setWordImagePreview(currentWord?.imageDataUrl || '');
		return;
	}
	if (!imageFile.type.startsWith('image/') || imageFile.size > maxWordImageFileSize) {
		saveFeedback.textContent = imageFile.size > maxWordImageFileSize
			? '写真は10MB以下のファイルを選んでください。'
			: '画像ファイルを選んでください。';
		wordImageInput.value = '';
		return;
	}
	if (imagePreviewObjectUrl) {
		URL.revokeObjectURL(imagePreviewObjectUrl);
	}
	imagePreviewObjectUrl = URL.createObjectURL(imageFile);
	wordImagePreview.src = imagePreviewObjectUrl;
	wordImagePreview.hidden = false;
	removeWordImageButton.hidden = false;
	saveFeedback.textContent = '';
});
removeWordImageButton.addEventListener('click', () => {
	wordImageInput.value = '';
	removeCurrentImage = true;
	setWordImagePreview('');
});
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
renderCustomCategories();
renderWords();
renderMessage();
renderCustomWords();
