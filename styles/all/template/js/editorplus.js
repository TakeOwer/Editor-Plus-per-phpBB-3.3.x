/**
 * Editor Plus per Advanced BBCode Box
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 * Fase 1: combo caratteri/dimensione, combo immagini, pulsante GHide
 * Fase 2: pulsanti nascosti, BBCode personalizzati raggruppati in menu
 * Fase 3: selettore icone Font Awesome, selettore emoji
 * Fase 4: salvataggio automatico, scorciatoie, annulla/ripeti, schermo intero, contatore, area che si allarga
 */
(function (window, document) {
	'use strict';

	// Lo script può essere incluso più volte (per esempio se un'estensione disegna una seconda barra):
	// si avvia una volta sola
	if (window.__editorPlusStarted) {
		return;
	}

	/*
	 * Alcune estensioni disegnano una seconda barra ABBC3 nella stessa pagina (stesso id "abbc3_buttons").
	 * Si sceglie quella che serve l'area di testo del messaggio: l'ultima barra che la precede nello stesso modulo.
	 */
	function mainTextarea() {
		try {
			if (window.form_name && window.text_name && document.forms[window.form_name]) {
				var t = document.forms[window.form_name].elements[window.text_name];
				if (t && t.tagName === 'TEXTAREA') {
					return t;
				}
			}
		} catch (e) { /* ignora */ }
		return document.querySelector('textarea[name="message"]');
	}

	function pickBar() {
		var bars = Array.prototype.slice.call(document.querySelectorAll('[id="abbc3_buttons"]'));
		if (!bars.length) {
			// senza ABBC3 (o con la sua barra spenta): barra standard di phpBB
			bars = Array.prototype.slice.call(document.querySelectorAll('[id="format-buttons"]')).filter(function (b) {
				return b.querySelector('.ep-tools') || b.nextElementSibling;
			});
		}
		var t = mainTextarea();
		if (bars.length < 2 || !t) {
			return bars[0] || null;
		}
		var best = null;
		bars.forEach(function (b) {
			var sameForm = !t.form || t.form.contains(b);
			var before = b.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING;
			if (sameForm && before) {
				best = b; // l'ultima prima dell'area di testo
			}
		});
		return best || bars[bars.length - 1];
	}

	var bar = pickBar();
	if (!bar || bar.getAttribute('data-ep-ready')) {
		return;
	}
	window.__editorPlusStarted = true;
	bar.setAttribute('data-ep-ready', '1');

	/* Modalità senza ABBC3: le funzioni che lavorano sui pulsanti e sui menu di ABBC3 restano spente */
	var coreBar = bar.id !== 'abbc3_buttons';
	bar.classList.add('ep-bar');
	if (coreBar) {
		bar.classList.add('ep-core');
	}

	/* Elementi disegnati da Editor Plus subito dopo QUESTA barra (non quelli di un'eventuale altra barra) */
	function afterBar(selector) {
		for (var n = bar.nextElementSibling; n; n = n.nextElementSibling) {
			if (n.id === 'abbc3_buttons' || n.id === 'format-buttons') {
				break;
			}
			if (n.matches && n.matches(selector)) {
				return n;
			}
			var inner = n.querySelector && n.querySelector(selector);
			if (inner) {
				return inner;
			}
		}
		return null;
	}

	var cfg = window.EditorPlusConfig || {};
	var epState = {version: '1.0.42', ready: false, config: !!(cfg && cfg.features), errors: []};

	function report(step, err) {
		epState.errors.push(step + ': ' + (err && err.message ? err.message : err));
		if (window.console && console.error) {
			console.error('[Editor Plus] errore in "' + step + '":', err);
		}
	}

	/* Esegue un pezzo dell'avvio: se fallisce, gli altri continuano */
	function safely(step, fn) {
		try {
			fn();
		} catch (err) {
			report(step, err);
		}
	}
	var L = window.EditorPlusLang || {};
	var DATA = window.EditorPlusData || {fa: [], faIt: {}, emoji: {}};
	var dataPromise = null;

	/* I dati di icone ed emoji (circa 120 KB) si scaricano solo quando si apre una delle due finestre */
	function loadData() {
		if (window.EditorPlusData) {
			DATA = window.EditorPlusData;
			return Promise.resolve(DATA);
		}
		if (!dataPromise) {
			dataPromise = new Promise(function (resolve, reject) {
				var script = document.createElement('script');
				script.src = (cfg.rootPath || './') + 'ext/salvocortesiano/editorplus/styles/all/template/js/editorplus_data.js?v=' + epState.version + '&assets_version=' + (cfg.assetsVersion || 0);
				script.onload = function () {
					DATA = window.EditorPlusData || DATA;
					resolve(DATA);
				};
				script.onerror = function () {
					dataPromise = null;
					reject(new Error('editorplus_data'));
				};
				document.head.appendChild(script);
			});
		}
		return dataPromise;
	}
	var F = cfg.features || {};

	/* ------------------------------------------------------------------ */
	/* Utilità                                                             */
	/* ------------------------------------------------------------------ */

	function lang(key) {
		return Object.prototype.hasOwnProperty.call(L, key) ? L[key] : key;
	}

	function format(str, value) {
		return String(str).replace(/%[ds]/, value);
	}

	function el(tag, attrs, children) {
		var node = document.createElement(tag);
		if (attrs) {
			Object.keys(attrs).forEach(function (name) {
				if (name === 'text') {
					node.textContent = attrs[name];
				} else if (name === 'html') {
					node.innerHTML = attrs[name];
				} else if (name === 'className') {
					node.className = attrs[name];
				} else if (attrs[name] !== null && attrs[name] !== undefined && attrs[name] !== false) {
					node.setAttribute(name, attrs[name] === true ? '' : attrs[name]);
				}
			});
		}
		(children || []).forEach(function (child) {
			if (child) {
				node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
			}
		});
		return node;
	}

	var storage = (function () {
		try {
			var probe = '__ep_probe__';
			window.localStorage.setItem(probe, '1');
			window.localStorage.removeItem(probe);
			return window.localStorage;
		} catch (e) {
			return null;
		}
	})();

	function storeGet(key, fallback) {
		if (!storage) {
			return fallback;
		}
		try {
			var raw = storage.getItem(key);
			return raw === null ? fallback : JSON.parse(raw);
		} catch (e) {
			return fallback;
		}
	}

	function storeSet(key, value) {
		if (!storage) {
			return false;
		}
		try {
			storage.setItem(key, JSON.stringify(value));
			return true;
		} catch (e) {
			return false; // memoria del browser piena o bloccata
		}
	}

	function storeRemove(key) {
		if (storage) {
			try {
				storage.removeItem(key);
			} catch (e) { /* ignora */ }
		}
	}

	function isMac() {
		return /Mac|iPhone|iPad/.test(navigator.platform || '');
	}

	/* ------------------------------------------------------------------ */
	/* Area di testo                                                       */
	/* ------------------------------------------------------------------ */

	function findTextarea() {
		var main = mainTextarea();
		if (main && (!main.form || main.form.contains(bar))) {
			return main;
		}

		var form = bar.closest('form');
		return (form && (form.querySelector('textarea[name="message"]') || form.querySelector('textarea'))) || document.querySelector('textarea[name="message"]');
	}

	var ta = findTextarea();
	if (!ta) {
		return;
	}
	var form = ta.form || bar.closest('form');
	var initialValue = ta.value;

	function wrap(open, close) {
		ta.focus();
		if (typeof window.bbfontstyle === 'function') {
			window.bbfontstyle(open, close);
		} else {
			insertText(open + close);
		}
	}

	function insertText(text) {
		ta.focus();
		if (typeof window.insert_text === 'function') {
			window.insert_text(text, false);
		} else {
			var s = ta.selectionStart, e = ta.selectionEnd;
			ta.value = ta.value.slice(0, s) + text + ta.value.slice(e);
			ta.setSelectionRange(s + text.length, s + text.length);
			changed();
		}
	}

	function focusEnd() {
		if (typeof wy !== 'undefined' && wy.on && wy.editor) {
			try {
				wyFocus();
				var body = wy.editor.getBody();
				var doc = body.ownerDocument;
				var range = doc.createRange();
				// se il testo finisce con un blocco (BBCode personalizzato), il browser terrebbe il cursore dentro:
				// si aggiunge dopo un carattere invisibile d'appoggio (tolto da EditorPlusBBClean)
				var last = body.lastChild;
				while (last && last.lastChild && !(last.classList && last.classList.contains('ep-wy-bb'))) {
					last = last.lastChild;
				}
				if (last && last.classList && last.classList.contains('ep-wy-bb')) {
					var anchor = doc.createTextNode('\u200b');
					last.parentNode.insertBefore(anchor, last.nextSibling);
					range.setStartAfter(anchor);
				} else {
					range.selectNodeContents(body);
					range.collapse(false);
				}
				var sel = doc.defaultView.getSelection();
				sel.removeAllRanges();
				sel.addRange(range);
			} catch (e) { /* ignora */ }
			return;
		}
		ta.focus();
		var len = ta.value.length;
		ta.setSelectionRange(len, len);
	}

	/* ------------------------------------------------------------------ */
	/* Annulla / Ripeti (Fase 4)                                           */
	/* ------------------------------------------------------------------ */

	var history = {stack: [], index: -1, timer: null, applying: false};
	var undoBtn = null, redoBtn = null;

	function snapshot() {
		if (!F.undo || history.applying) {
			return;
		}
		var cur = history.stack[history.index];
		if (cur && cur.v === ta.value) {
			cur.s = ta.selectionStart;
			cur.e = ta.selectionEnd;
			return;
		}
		history.stack = history.stack.slice(0, history.index + 1);
		history.stack.push({v: ta.value, s: ta.selectionStart, e: ta.selectionEnd});
		if (history.stack.length > 300) {
			history.stack.shift();
		}
		history.index = history.stack.length - 1;
		updateUndoButtons();
	}

	function flushTyping() {
		if (history.timer) {
			clearTimeout(history.timer);
			history.timer = null;
		}
		snapshot();
	}

	function applyState(state) {
		history.applying = true;
		ta.value = state.v;
		ta.focus();
		ta.setSelectionRange(state.s, state.e);
		history.applying = false;
		changed();
		updateUndoButtons();
	}

	function undo() {
		flushTyping();
		if (history.index > 0) {
			history.index--;
			applyState(history.stack[history.index]);
		}
	}

	function redo() {
		flushTyping();
		if (history.index < history.stack.length - 1) {
			history.index++;
			applyState(history.stack[history.index]);
		}
	}

	function updateUndoButtons() {
		if (undoBtn) {
			undoBtn.disabled = history.index <= 0;
			redoBtn.disabled = history.index >= history.stack.length - 1;
		}
	}

	/* Ogni modifica fatta via script da phpBB, ABBC3 o altre estensioni passa da qui */
	function hookGlobal(name) {
		var original = window[name];
		if (typeof original !== 'function' || original.__ep) {
			return;
		}
		var hooked = function () {
			flushTyping();
			var result = original.apply(this, arguments);
			snapshot();
			changed();
			return result;
		};
		hooked.__ep = true;
		window[name] = hooked;
	}

	/*
	 * Modifiche fatte da script senza avvisare (per esempio phpBB quando si elimina un allegato:
	 * textarea.val(nuovoTesto)): intercettando la scrittura del valore, anteprima, formattazione,
	 * contatore, bozza e annulla restano sempre allineati al testo vero.
	 */
	function watchValue() {
		var desc = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
		if (!desc || !desc.get || !desc.set) {
			return;
		}
		var pending = false;
		Object.defineProperty(ta, 'value', {
			configurable: true,
			enumerable: desc.enumerable,
			get: function () {
				return desc.get.call(this);
			},
			set: function (v) {
				// in modalità visuale ciò che arriva (anche dal motore stesso all'invio) è ripulito
				if (typeof wy !== 'undefined' && wy.on) {
					v = wyClean(String(v));
				}
				var old = desc.get.call(this);
				if (String(v) === old) {
					desc.set.call(this, v);
					return;
				}
				if (!history.applying) {
					flushTyping();
				}
				desc.set.call(this, v);
				if (typeof wy !== 'undefined' && wy.on && !wy.syncing) {
					wyExternal(String(v));
				}
				if (history.applying || pending) {
					return;
				}
				pending = true;
				setTimeout(function () {
					pending = false;
					snapshot();
					changed();
				}, 0);
			}
		});
	}

	/* ------------------------------------------------------------------ */
	/* Reazioni a ogni cambiamento del testo                               */
	/* ------------------------------------------------------------------ */

	/*
	 * 1.0.42: conferme con la finestra integrata di phpBB (stesso aspetto dello stile del forum, come le
	 * conferme di phpBB e delle altre estensioni) invece del riquadro grigio del browser.
	 * Se la pagina non ha la finestra di phpBB si ripiega sul riquadro del browser.
	 * @return Promise<boolean>
	 */
	function niceConfirm(message, opts) {
		opts = opts || {};
		return new Promise(function (resolve) {
			var $ = window.jQuery;
			var box = document.getElementById('phpbb_confirm');
			// il contenitore delle finestre di phpBB (sfondo scuro e finestre stanno lì dentro, affiancati)
			var dark = document.getElementById('darkenwrapper') || (document.getElementById('darken') || {}).parentNode;
			if (!$ || !window.phpbb || typeof window.phpbb.confirm !== 'function' || !box || !dark) {
				resolve(window.confirm(message));
				return;
			}
			var html = '<h3>' + escapeHtml(opts.title || lang('EP_CONFIRM_TITLE')) + '</h3><p>' + escapeHtml(message) + '</p>' +
				'<fieldset class="submit-buttons"><input type="button" name="confirm" value="' + escapeHtml(opts.yes || lang('EP_YES')) + '" class="button2">&nbsp;' +
				'<input type="button" name="cancel" value="' + escapeHtml(opts.no || lang('EP_NO')) + '" class="button2"></fieldset>';
			// Sopra le finestre di Editor Plus. Lo sfondo di phpBB sta dentro il piè di pagina, e un elemento
			// non può superare il livello del suo contenitore: lo si porta per il tempo della conferma
			// direttamente nel corpo della pagina, e poi lo si rimette esattamente dov'era.
			var home = {parent: dark.parentNode, next: dark.nextSibling};
			var oldZ = dark.style.zIndex;
			document.body.appendChild(dark);
			dark.style.zIndex = '100050';
			document.documentElement.classList.add('ep-confirm-open');
			var done = false, seen = false, timer = null;
			var finish = function (ok) {
				if (done) {
					return;
				}
				done = true;
				clearInterval(timer);
				// il segnale si toglie solo dopo che lo stesso tasto (es. Esc) ha finito il suo giro: phpBB lo riceve
				// per primo e chiude la conferma, ma anche gli altri gestori devono vederla ancora aperta
				setTimeout(function () {
					document.documentElement.classList.remove('ep-confirm-open');
				}, 0);
				setTimeout(function () {
					dark.style.zIndex = oldZ;
					if (home.parent && dark.parentNode !== home.parent) {
						home.parent.insertBefore(dark, home.next && home.next.parentNode === home.parent ? home.next : null);
					}
				}, 500);
				resolve(!!ok);
			};
			window.phpbb.confirm(html, function (ok) {
				finish(ok);
			});
			// chiusa senza rispondere (clic fuori o sulla X): phpBB non avvisa, vale come "No"
			timer = setInterval(function () {
				var visible = $(box).is(':visible');
				if (visible) {
					seen = true;
				} else if (seen && !$(box).is(':animated')) {
					finish(false);
				}
			}, 150);
			setTimeout(function () {
				var b = box.querySelector('input[name="cancel"]');
				if (b) {
					b.focus();
				}
			}, 350);
		});
	}

	/* testo sostituito per intero, annullabile con Ctrl+Z (usato dai moduli, es. immagini eliminate) */
	function setText(value) {
		if (value === ta.value) {
			return;
		}
		flushTyping();
		snapshot();
		ta.value = value;
		snapshot();
		changed();
	}

	var changeListeners = [];

	function changed() {
		changeListeners.forEach(function (fn) {
			fn();
		});
	}

	ta.addEventListener('input', function () {
		if (history.applying) {
			return;
		}
		if (F.undo) {
			clearTimeout(history.timer);
			history.timer = setTimeout(function () {
				history.timer = null;
				snapshot();
			}, 400);
		}
		changed();
	});

	/* Qualsiasi clic sulla barra (anche su pulsanti di altre estensioni) viene registrato */
	function watchContainer(node) {
		node.addEventListener('mousedown', flushTyping, true);
		node.addEventListener('click', function () {
			setTimeout(function () {
				snapshot();
				changed();
			}, 0);
		}, true);
		node.addEventListener('change', function () {
			setTimeout(function () {
				snapshot();
				changed();
			}, 0);
		}, true);
	}

	/* ------------------------------------------------------------------ */
	/* Fase 1: combo e GHide                                               */
	/* ------------------------------------------------------------------ */

	function setupSelects() {
		var holder = afterBar('.ep-holder');
		if (holder) {
			var sizeSel = holder.querySelector('.ep-size-select');
			var fontSel = holder.querySelector('.ep-font-select');
			var abbcSize = bar.querySelector('.abbc3_size_menu_btn');
			var abbcFont = bar.querySelector('.abbc3_dropdown_menu_btn:not(.abbc3_size_menu_btn)');

			if (sizeSel && abbcSize) {
				abbcSize.parentNode.replaceChild(sizeSel, abbcSize);
			}
			if (fontSel && abbcFont) {
				abbcFont.parentNode.replaceChild(fontSel, abbcFont);
			}
			// barra standard di phpBB: la dimensione è già la sua; la combo dei caratteri va subito dopo
			if (coreBar && fontSel && F.font_select) {
				var coreSize = bar.querySelector('select[name="addbbcode20"]');
				if (coreSize) {
					coreSize.parentNode.insertBefore(fontSel, coreSize.nextSibling);
				} else {
					var toolsAt = bar.querySelector('.ep-tools');
					bar.insertBefore(fontSel, toolsAt || bar.firstChild);
				}
			}
			holder.parentNode.removeChild(holder);
		}

		// Le combo immagini diventano l'ultima riga della barra (stessa larghezza, seguono lo schermo intero)
		var combos = afterBar('.ep-img-combos');
		if (combos && combos.parentNode !== bar) {
			bar.appendChild(combos);
		}

		document.addEventListener('change', function (e) {
			var sel = e.target;
			if (!sel || !sel.classList || !sel.classList.contains('ep-select')) {
				return;
			}
			var value = sel.value;
			var kind = sel.getAttribute('data-ep-wrap');
			var tag = sel.getAttribute('data-ep-tag');

			if (kind === 'size') {
				wrap('[size=' + value + ']', '[/size]');
				sel.value = '100';
			} else if (kind === 'font') {
				if (value) {
					wrap('[font=' + value + ']', '[/font]');
				}
				sel.selectedIndex = 0;
			} else if (tag) {
				if (value) {
					var code = sel.getAttribute('data-ep-mode') === 'param' ? ['[' + tag + '=' + value + ']', '[/' + tag + ']'] : ['[' + tag + ']' + value, '[/' + tag + ']'];
					if (typeof wy !== 'undefined' && wy.on && wy.editor) {
						// modalità visuale: blocco completo + carattere d'appoggio, così il cursore resta DOPO il blocco
						insertText(code[0] + code[1] + '\u200b');
					} else {
						wrap(code[0], code[1]);
						focusEnd();
					}
				}
				sel.selectedIndex = 0;
			}
		});
	}

	/* [ghide=utenti|gruppi]: ID separati da virgola e SENZA spazi (l'estensione non li riconoscerebbe) */
	function ghideCode(ids) {
		var groups = cfg.ghideGroups || [];
		ids = (ids && ids.length ? ids : [cfg.userId || 0]).filter(function (v, i, a) {
			return a.indexOf(v) === i;
		});
		return '[ghide=' + ids.join(',') + (groups.length ? '|' + groups.join(',') : '') + ']';
	}

	var ghidePop = null;

	/*
	 * Pulsante GHide: rispondendo in un argomento aperto da un altro utente si sceglie a chi rendere
	 * visibile il testo (autore dell'argomento, chi risponde o entrambi). Altrimenti si inserisce subito.
	 */
	function ghideAction(source) {
		var author = cfg.topicAuthor;
		var me = cfg.userId || 0;
		if (!author || !author.id || author.id === me) {
			wrap(ghideCode([me]), '[/ghide]');
			return;
		}

		var anchor = source;
		var panel = source && source.closest ? source.closest('.ep-menu') : null;
		if (panel) {
			anchor = panel.querySelector('.ep-menu-btn');
		}

		if (!ghidePop) {
			ghidePop = makePopover('ep-gh-pop', anchor);
			ghidePop.preferredWidth = 330;
			var choices = [
				{key: 'author', ids: [author.id], title: (author.name || '?') + ' (ID ' + author.id + ')', sub: lang('EP_GHIDE_AUTHOR')},
				{key: 'me', ids: [me], title: (cfg.userName || '?') + ' (ID ' + me + ')', sub: lang('EP_GHIDE_ME')},
				{key: 'both', ids: [author.id, me], title: (author.name || '?') + ' + ' + (cfg.userName || '?'), sub: lang('EP_GHIDE_BOTH')}
			];
			var list = el('div', {className: 'ep-gh-list', role: 'listbox', 'aria-label': lang('EP_GHIDE_FOR')});
			choices.forEach(function (c) {
				var item = el('div', {className: 'ep-gh-item', role: 'option', tabindex: '-1', 'data-key': c.key}, [
					el('span', {className: 'ep-gh-sub', text: c.sub}),
					el('strong', {text: c.title}),
					el('code', {text: ghideCode(c.ids)})
				]);
				item.addEventListener('click', function () {
					ghidePop.close();
					wrap(ghideCode(c.ids), '[/ghide]');
				});
				list.appendChild(item);
			});
			ghidePop.appendChild(el('div', {className: 'ep-gh-head'}, [
				el('i', {className: 'fa fa-eye-slash', 'aria-hidden': 'true'}),
				el('strong', {text: lang('EP_GHIDE_FOR')}),
				(cfg.ghideGroups || []).length ? el('small', {text: lang('EP_GHIDE_GROUPS_TOO')}) : null
			]));
			ghidePop.appendChild(list);

			function items() {
				return Array.prototype.slice.call(list.children);
			}
			function focusItem(item) {
				items().forEach(function (i) {
					i.classList.toggle('ep-gh-active', i === item);
					i.setAttribute('aria-selected', i === item ? 'true' : 'false');
				});
				item.focus();
			}
			ghidePop.addEventListener('keydown', function (e) {
				var all = items();
				var i = all.indexOf(document.activeElement);
				if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
					e.preventDefault();
					focusItem(all[(i + (e.key === 'ArrowDown' ? 1 : all.length - 1)) % all.length]);
				} else if (e.key === 'Enter' && i !== -1) {
					e.preventDefault();
					all[i].click();
				}
			});
			list.addEventListener('mouseover', function (e) {
				var item = e.target.closest('.ep-gh-item');
				if (item) {
					focusItem(item);
				}
			});
			ghidePop.onOpen = function () {
				focusItem(list.querySelector('[data-key="' + (cfg.ghideDefault || 'author') + '"]') || list.firstChild);
			};
		}

		ghidePop.anchor = anchor;
		if (ghidePop.isOpen()) {
			ghidePop.close();
		} else {
			// dopo che il clic in corso ha finito il suo giro (altrimenti lo stesso clic richiuderebbe il menu)
			setTimeout(function () {
				ghidePop.open();
			}, 0);
		}
	}

	/* ------------------------------------------------------------------ */
	/* Fase 2: pulsanti nascosti e menu per categoria                      */
	/* ------------------------------------------------------------------ */

	var CORE_NAMES = {
		addbbcode0: 'b', addbbcode2: 'i', addbbcode4: 'u', addbbcode6: 'quote', addbbcode8: 'code',
		addbbcode10: 'list', addbbcode12: 'list=', addlistitem: '*', addbbcode14: 'img', addbbcode16: 'url',
		addbbcode18: 'flash', addmedia: 'media', abbc3_bbpalette: 'color', copybbcode: 'copy', pastebbcode: 'paste', plainbbcode: 'plain'
	};

	function buttonInfo(btn) {
		var onclick = btn.getAttribute('onclick') || '';
		var m = onclick.match(/bbspecial\(\s*'([^']+)'\s*,\s*\d+\s*\)/);
		if (m) {
			return {tag: m[1].replace(/=$/, '').toLowerCase(), custom: true};
		}
		var name = btn.getAttribute('name') || '';
		if (CORE_NAMES[name]) {
			return {tag: CORE_NAMES[name], custom: false};
		}
		var cls = (btn.className || '').match(/(?:^|\s)bbcode-([a-z0-9_-]+)/i);
		return cls ? {tag: cls[1].toLowerCase(), custom: /bbstyle\(\s*(\d+)/.test(btn.getAttribute('onclick') || '')} : null;
	}

	function hideButtons() {
		var hidden = cfg.hidden || [];
		if (!hidden.length) {
			return;
		}
		Array.prototype.forEach.call(bar.querySelectorAll('button'), function (btn) {
			var info = buttonInfo(btn);
			if (info && hidden.indexOf(info.tag) !== -1) {
				btn.parentNode.removeChild(btn);
			}
		});
	}

	var openMenu = null;

	function closeMenus() {
		if (openMenu) {
			openMenu.classList.remove('ep-open');
			openMenu.querySelector('.ep-menu-btn').setAttribute('aria-expanded', 'false');
			openMenu = null;
		}
	}

	function toggleMenu(menu) {
		var wasOpen = openMenu === menu;
		closeMenus();
		if (wasOpen) {
			return;
		}
		menu.classList.add('ep-open');
		menu.querySelector('.ep-menu-btn').setAttribute('aria-expanded', 'true');
		openMenu = menu;

		var panel = menu.querySelector('.ep-menu-panel');
		menu.classList.remove('ep-menu-right');
		var rect = panel.getBoundingClientRect();
		if (rect.right > (window.innerWidth || document.documentElement.clientWidth) - 8) {
			menu.classList.add('ep-menu-right');
		}
		var first = panel.querySelector('.ep-menu-item');
		if (first) {
			first.focus();
		}
	}

	function buildCategories() {
		var categories = cfg.categories || {};
		var names = Object.keys(categories);
		if (!F.categories || !names.length) {
			return;
		}

		var rows = bar.querySelectorAll('.abbc3_buttons_row');
		var row = null;
		if (coreBar) {
			row = bar;
		}
		Array.prototype.forEach.call(coreBar ? [] : rows, function (r) {
			if (!row && r.querySelector('button[onclick*="bbspecial"]') && Array.prototype.some.call(r.querySelectorAll('button'), function (b) {
				var i = buttonInfo(b);
				return i && i.custom;
			})) {
				row = r;
			}
		});
		if (!row) {
			return;
		}

		var tagToCat = {};
		names.forEach(function (name) {
			categories[name].forEach(function (tag) {
				if (!tagToCat[tag]) {
					tagToCat[tag] = name;
				}
			});
		});

		var buckets = {};
		var other = [];
		Array.prototype.forEach.call(row.querySelectorAll('button'), function (btn) {
			var info = buttonInfo(btn);
			if (!info || !info.custom) {
				return;
			}
			var item = {btn: btn, tag: info.tag};
			if (tagToCat[info.tag]) {
				(buckets[tagToCat[info.tag]] = buckets[tagToCat[info.tag]] || []).push(item);
			} else {
				other.push(item);
			}
		});

		// GHide aggiunto da un'estensione non ha un pulsante ABBC3: lo si mette comunque nella sua categoria
		// se [ghide] non è elencato nelle categorie va con gli altri testi nascosti (o nella prima categoria)
		var ghideCat = tagToCat.ghide || tagToCat.hidden || tagToCat.hhide || tagToCat.hide || tagToCat.spoil || tagToCat.spoiler ||
			(Object.keys(buckets)[0] || null);
		var ghideListed = Object.keys(buckets).some(function (n) {
			return buckets[n].some(function (it) {
				return it.tag === 'ghide';
			});
		});
		if (cfg.ghide && ghideCat && !ghideListed) {
			var gBtn = el('button', {type: 'button', className: 'abbc3_button ep-btn-ghide ep-btn-ghide-menu', 'data-ep-action': 'ghide', title: lang('EP_GHIDE')});
			gBtn.style.backgroundImage = 'url("' + (cfg.iconPath || '') + 'ghide.' + (cfg.iconExt || 'png') + '")';
			(buckets[ghideCat] = buckets[ghideCat] || []).unshift({btn: gBtn, tag: 'ghide'});
		}

		var menus = el('span', {className: 'ep-menus'});
		names.forEach(function (name) {
			if (buckets[name]) {
				menus.appendChild(buildMenu(name, buckets[name]));
			}
		});
		if (other.length) {
			menus.appendChild(buildMenu(lang('EP_MORE'), other));
		}

		if (coreBar) {
			// riga dedicata ai menu, al posto dei pulsanti personalizzati (che finiscono nei menu)
			var holder = el('div', {className: 'ep-core-menus'}, [menus]);
			var first = null;
			Object.keys(buckets).concat(['__other']).some(function (n) {
				var list = n === '__other' ? other : buckets[n];
				return list.some(function (it) {
					if (it.btn.parentNode === bar) {
						first = it.btn;
						return true;
					}
					return false;
				});
			});
			bar.insertBefore(holder, first || null);
			return;
		}
		row.classList.add('ep-cat-row');
		row.appendChild(menus);
	}

	function buildMenu(name, items) {
		var panel = el('div', {className: 'ep-menu-panel', role: 'menu'});
		items.forEach(function (it) {
			var help = it.btn.getAttribute('title') || '';
			// una descrizione rimasta come nome tecnico (es. ABBC3_GLOW_HELPLINE) non si mostra
			if (/^[A-Z0-9_]+$/.test(help)) {
				help = '';
			}
			var label = el('span', {className: 'ep-menu-label'}, [
				el('strong', {text: '[' + it.tag + ']'}),
				help ? el('small', {text: help}) : null
			]);
			var item = el('div', {className: 'ep-menu-item', role: 'menuitem', tabindex: '-1', title: help});
			it.btn.setAttribute('tabindex', '-1');
			if (coreBar && !it.btn.getAttribute('data-ep-action')) {
				var src = (cfg.coreIcons || {})[it.tag];
				item.appendChild(src ? el('img', {className: 'ep-menu-icon', src: (cfg.rootPath || '') + src, alt: ''}) :
					el('i', {className: 'fa fa-code ep-menu-icon ep-menu-icon-fa', 'aria-hidden': 'true'}));
				it.btn.classList.add('ep-core-btn-hidden');
			}
			item.appendChild(it.btn);
			item.appendChild(label);
			item.addEventListener('click', function (e) {
				if (e.target !== it.btn) {
					it.btn.click();
				}
				closeMenus();
			});
			item.addEventListener('keydown', function (e) {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					item.click();
				} else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
					e.preventDefault();
					var sib = e.key === 'ArrowDown' ? item.nextElementSibling : item.previousElementSibling;
					if (sib) {
						sib.focus();
					}
				}
			});
			panel.appendChild(item);
		});

		var trigger = el('button', {type: 'button', className: 'ep-menu-btn', 'aria-haspopup': 'true', 'aria-expanded': 'false', title: lang('EP_MENU_HINT')}, [
			el('span', {text: name}),
			el('span', {className: 'ep-count', text: String(items.length)}),
			el('i', {className: 'fa fa-caret-down', 'aria-hidden': 'true'})
		]);
		var menu = el('span', {className: 'ep-menu'}, [trigger, panel]);
		trigger.addEventListener('click', function (e) {
			e.preventDefault();
			toggleMenu(menu);
		});
		return menu;
	}

	document.addEventListener('click', function (e) {
		if (openMenu && !openMenu.contains(e.target)) {
			closeMenus();
		}
	});

	/* ------------------------------------------------------------------ */
	/* Finestre (icone ed emoji)                                           */
	/* ------------------------------------------------------------------ */

	var openDialog = null;

	function makeDialog(title, extraClass) {
		var closeBtn = el('button', {type: 'button', className: 'ep-dialog-close', title: lang('EP_CLOSE'), 'aria-label': lang('EP_CLOSE')}, [
			el('i', {className: 'fa fa-times', 'aria-hidden': 'true'})
		]);
		var counter = el('span', {className: 'ep-dialog-count'});
		var body = el('div', {className: 'ep-dialog-body'});
		var box = el('div', {className: 'ep-dialog ' + (extraClass || ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': title}, [
			el('div', {className: 'ep-dialog-head'}, [el('strong', {text: title}), counter, closeBtn]),
			body
		]);
		var overlay = el('div', {className: 'ep-overlay', hidden: true}, [box]);
		document.body.appendChild(overlay);

		var dialog = {overlay: overlay, box: box, body: body, counter: counter, onOpen: null};
		closeBtn.addEventListener('click', function () {
			closeDialog();
		});
		overlay.addEventListener('mousedown', function (e) {
			if (e.target === overlay) {
				closeDialog();
			}
		});
		watchContainer(box);
		return dialog;
	}

	function showDialog(dialog) {
		closeMenus();
		closeDialog();
		dialog.overlay.hidden = false;
		document.documentElement.classList.add('ep-dialog-open');
		openDialog = dialog;
		if (dialog.onOpen) {
			dialog.onOpen();
		}
	}

	function closeDialog() {
		if (openDialog) {
			openDialog.overlay.hidden = true;
			document.documentElement.classList.remove('ep-dialog-open');
			openDialog = null;
			ta.focus();
		}
	}

	/* ------------------------------------------------------------------ */
	/* Fase 3a: icone Font Awesome                                         */
	/* ------------------------------------------------------------------ */

	var faDialog = null;

	function buildFaDialog() {
		var saved = storeGet('editorplus:fa', {});
		var dialog = makeDialog(lang('EP_FA_TITLE'), 'ep-fa-dialog');
		var selected = saved.icon || 'star';

		function option(value, label) {
			return el('option', {value: value, text: label});
		}

		var search = el('input', {type: 'search', className: 'inputbox ep-search', placeholder: lang('EP_FA_SEARCH'), 'aria-label': lang('EP_FA_SEARCH')});
		var size = el('select', {'aria-label': lang('EP_FA_SIZE')}, [
			option('', lang('EP_FA_SIZE_NORMAL')), option('lg', '1,3×'), option('2x', '2×'), option('3x', '3×'), option('4x', '4×'), option('5x', '5×')
		]);
		var effect = el('select', {'aria-label': lang('EP_FA_EFFECT')}, [
			option('', lang('EP_NONE')), option('spin', lang('EP_FA_SPIN')), option('pulse', lang('EP_FA_PULSE'))
		]);
		var rotate = el('select', {'aria-label': lang('EP_FA_ROTATE')}, [
			option('', lang('EP_NONE')), option('rotate-90', '90°'), option('rotate-180', '180°'), option('rotate-270', '270°'),
			option('flip-horizontal', lang('EP_FA_FLIP_H')), option('flip-vertical', lang('EP_FA_FLIP_V'))
		]);
		var useColor = el('input', {type: 'checkbox'});
		var color = el('input', {type: 'color', value: saved.color || '#d9534f', 'aria-label': lang('EP_FA_COLOR')});
		var text = el('input', {type: 'text', className: 'inputbox', placeholder: lang('EP_FA_TEXT'), 'aria-label': lang('EP_FA_TEXT'), maxlength: '120'});

		size.value = saved.size || '';
		effect.value = saved.effect || '';
		rotate.value = saved.rotate || '';
		useColor.checked = !!saved.useColor;

		var previewIcon = el('i', {'aria-hidden': 'true'});
		var previewText = el('span', {className: 'ep-fa-preview-text'});
		var previewCode = el('code', {className: 'ep-code'});
		var insertBtn = el('button', {type: 'button', className: 'ep-btn ep-insert'}, [lang('EP_INSERT')]);

		var grid = el('div', {className: 'ep-grid ep-fa-grid', role: 'listbox'});
		var empty = el('p', {className: 'ep-empty', text: lang('EP_NO_RESULTS'), hidden: true});

		function label(textNode, control) {
			return el('label', {className: 'ep-field'}, [el('span', {text: textNode}), control]);
		}

		dialog.body.appendChild(search);
		dialog.body.appendChild(el('div', {className: 'ep-fa-options'}, [
			label(lang('EP_FA_SIZE'), size),
			label(lang('EP_FA_EFFECT'), effect),
			label(lang('EP_FA_ROTATE'), rotate),
			el('label', {className: 'ep-field ep-field-color'}, [el('span', {text: lang('EP_FA_COLOR')}), el('span', {className: 'ep-inline'}, [useColor, color])]),
			label(lang('EP_FA_TEXT'), text)
		]));
		dialog.body.appendChild(grid);
		dialog.body.appendChild(empty);
		dialog.body.appendChild(el('div', {className: 'ep-fa-preview'}, [
			el('span', {className: 'ep-fa-preview-box'}, [previewIcon, previewText]),
			previewCode,
			insertBtn
		]));

		var buttons = [];
		(DATA.fa || []).forEach(function (entry) {
			var name = entry[0];
			var btn = el('button', {type: 'button', className: 'ep-cell', title: name, 'data-name': name, 'data-search': (name + ' ' + (entry[1] || '')).replace(/-/g, ' '), role: 'option'}, [
				el('i', {className: 'fa fa-' + name, 'aria-hidden': 'true'})
			]);
			buttons.push(btn);
			grid.appendChild(btn);
		});

		function classes() {
			var parts = [selected];
			if (size.value) {
				parts.push('fa-' + size.value);
			}
			if (effect.value) {
				parts.push('fa-' + effect.value);
			}
			if (rotate.value) {
				parts.push('fa-' + rotate.value);
			}
			return parts;
		}

		function code() {
			var c = '[fa=' + classes().join(' ') + ']' + text.value.replace(/\[\/fa\]/gi, '') + '[/fa]';
			if (useColor.checked) {
				c = '[color=' + color.value + ']' + c + '[/color]';
			}
			return c;
		}

		function refresh() {
			previewIcon.className = 'fa ' + classes().map(function (p, i) {
				return i === 0 ? 'fa-' + p : p;
			}).join(' ');
			previewIcon.style.color = useColor.checked ? color.value : '';
			previewText.textContent = text.value ? ' ' + text.value : '';
			previewText.style.color = useColor.checked ? color.value : '';
			previewCode.textContent = code();
			buttons.forEach(function (b) {
				var on = b.getAttribute('data-name') === selected;
				b.classList.toggle('ep-selected', on);
				b.setAttribute('aria-selected', on ? 'true' : 'false');
			});
			storeSet('editorplus:fa', {icon: selected, size: size.value, effect: effect.value, rotate: rotate.value, useColor: useColor.checked, color: color.value});
		}

		function filter() {
			var q = search.value.trim().toLowerCase();
			var extra = [];
			if (q) {
				Object.keys(DATA.faIt || {}).forEach(function (word) {
					if (word.indexOf(q) === 0 || (q.length > 3 && q.indexOf(word) === 0)) {
						extra.push(DATA.faIt[word]);
					}
				});
			}
			var shown = 0;
			buttons.forEach(function (b) {
				var name = b.getAttribute('data-name');
				var ok = !q || b.getAttribute('data-search').indexOf(q.replace(/-/g, ' ')) !== -1 || extra.some(function (x) {
					return name === x || name.indexOf(x + '-') === 0;
				});
				b.hidden = !ok;
				if (ok) {
					shown++;
				}
			});
			empty.hidden = shown > 0;
			dialog.counter.textContent = format(lang('EP_FA_COUNT'), shown);
		}

		function doInsert() {
			var c = code();
			closeDialog();
			insertText(c);
		}

		grid.addEventListener('click', function (e) {
			var b = e.target.closest('.ep-cell');
			if (b) {
				selected = b.getAttribute('data-name');
				refresh();
			}
		});
		grid.addEventListener('dblclick', function (e) {
			if (e.target.closest('.ep-cell')) {
				doInsert();
			}
		});
		[size, effect, rotate, useColor, color].forEach(function (c) {
			c.addEventListener('change', refresh);
		});
		color.addEventListener('input', function () {
			useColor.checked = true;
			refresh();
		});
		text.addEventListener('input', refresh);
		search.addEventListener('input', filter);
		search.addEventListener('keydown', function (e) {
			if (e.key === 'Enter') {
				e.preventDefault();
				var first = buttons.filter(function (b) {
					return !b.hidden;
				})[0];
				if (first) {
					selected = first.getAttribute('data-name');
					refresh();
				}
			}
		});
		insertBtn.addEventListener('click', doInsert);

		dialog.onOpen = function () {
			refresh();
			filter();
			search.focus();
			search.select();
		};
		return dialog;
	}

	/* ------------------------------------------------------------------ */
	/* Fase 3b: emoji                                                      */
	/* ------------------------------------------------------------------ */

	var emojiDialog = null;
	var EMOJI_CATS = ['smileys', 'people', 'nature', 'food', 'activities', 'travel', 'objects', 'symbols'];

	function buildEmojiDialog() {
		var dialog = makeDialog(lang('EP_EMOJI_TITLE'), 'ep-emoji-dialog');
		var search = el('input', {type: 'search', className: 'inputbox ep-search', placeholder: lang('EP_EMOJI_SEARCH'), 'aria-label': lang('EP_EMOJI_SEARCH')});
		var tabs = el('div', {className: 'ep-tabs', role: 'tablist'});
		var grid = el('div', {className: 'ep-grid ep-emoji-grid'});
		var empty = el('p', {className: 'ep-empty', text: lang('EP_NO_RESULTS'), hidden: true});
		var current = 'recent';

		var all = [];
		EMOJI_CATS.forEach(function (cat) {
			(DATA.emoji[cat] || []).forEach(function (e) {
				all.push({c: e[0], n: e[1], it: e[2] || '', cat: cat});
			});
		});

		function recent() {
			return storeGet('editorplus:emoji-recent', []);
		}

		function tab(cat, icon, title) {
			var t = el('button', {type: 'button', className: 'ep-tab', role: 'tab', title: title, 'aria-label': title, 'data-cat': cat}, [icon]);
			t.addEventListener('click', function () {
				current = cat;
				search.value = '';
				render();
			});
			tabs.appendChild(t);
		}

		tab('recent', el('i', {className: 'fa fa-clock-o', 'aria-hidden': 'true'}), lang('EP_EMOJI_RECENT'));
		EMOJI_CATS.forEach(function (cat) {
			var list = DATA.emoji[cat] || [];
			tab(cat, list.length ? list[0][0] : '?', lang('EP_EMOJI_' + cat.toUpperCase()));
		});

		function render() {
			var q = search.value.trim().toLowerCase();
			var items;
			if (q) {
				items = all.filter(function (e) {
					return e.n.indexOf(q) !== -1 || e.it.indexOf(q) !== -1;
				});
			} else if (current === 'recent') {
				items = recent().map(function (c) {
					return {c: c, n: ''};
				});
				if (!items.length) {
					current = 'smileys';
					return render();
				}
			} else {
				items = all.filter(function (e) {
					return e.cat === current;
				});
			}

			Array.prototype.forEach.call(tabs.children, function (t) {
				var on = !q && t.getAttribute('data-cat') === current;
				t.classList.toggle('ep-active', on);
				t.setAttribute('aria-selected', on ? 'true' : 'false');
			});

			grid.textContent = '';
			var frag = document.createDocumentFragment();
			items.forEach(function (e) {
				frag.appendChild(el('button', {type: 'button', className: 'ep-cell ep-emoji', title: e.it ? e.it.split(' ').slice(0, 4).join(', ') : e.n, 'data-c': e.c}, [e.c]));
			});
			grid.appendChild(frag);
			empty.hidden = items.length > 0;
			dialog.counter.textContent = q ? String(items.length) : lang(current === 'recent' ? 'EP_EMOJI_RECENT' : 'EP_EMOJI_' + current.toUpperCase());
		}

		grid.addEventListener('click', function (e) {
			var b = e.target.closest('.ep-emoji');
			if (!b) {
				return;
			}
			var c = b.getAttribute('data-c');
			var list = recent().filter(function (x) {
				return x !== c;
			});
			list.unshift(c);
			storeSet('editorplus:emoji-recent', list.slice(0, 32));
			insertText(c);
			b.classList.add('ep-flash');
			setTimeout(function () {
				b.classList.remove('ep-flash');
			}, 300);
		});
		search.addEventListener('input', render);

		dialog.body.appendChild(search);
		dialog.body.appendChild(tabs);
		dialog.body.appendChild(grid);
		dialog.body.appendChild(empty);

		dialog.onOpen = function () {
			current = recent().length ? 'recent' : 'smileys';
			search.value = '';
			render();
			search.focus();
		};
		return dialog;
	}

	/* ------------------------------------------------------------------ */
	/* 1.0.1: faccine di phpBB in un riquadro con schede                   */
	/* ------------------------------------------------------------------ */

	var smileyBox = document.getElementById('smiley-box');
	var smileyPop = null, smileyBtn = null;

	function smiliesAvailable() {
		if (!F.smilies || !(cfg.smilies || []).length) {
			return false;
		}
		// Pagina di scrittura: phpBB mostra le faccine solo se sono permesse in quel forum
		if (smileyBox && smileyBox.contains(ta) === false && form && form.contains(smileyBox)) {
			return !!smileyBox.querySelector('img');
		}
		// Risposta rapida e altre pagine senza riquadro: dipende dall'impostazione generale
		return !!cfg.smiliesQr;
	}

	function smileyUrl(file) {
		return (cfg.rootPath || './') + (cfg.smiliesPath || 'images/smilies/') + file;
	}

	function buildSmileyPop() {
		var list = cfg.smilies.map(function (x) {
			return {code: x[0], file: x[1], name: x[2], w: x[3], h: x[4], group: x[5]};
		});
		var byCode = {};
		list.forEach(function (x) {
			byCode[x.code] = x;
		});

		var search = el('input', {type: 'search', className: 'ep-sm-search', placeholder: lang('EP_SMILIES_SEARCH'), 'aria-label': lang('EP_SMILIES_SEARCH')});
		var tabs = el('div', {className: 'ep-sm-tabs', role: 'tablist'});
		var grid = el('div', {className: 'ep-sm-grid'});
		var empty = el('p', {className: 'ep-empty', text: lang('EP_NO_RESULTS'), hidden: true});
		var pop = el('div', {className: 'ep-sm-pop', role: 'dialog', 'aria-label': lang('EP_SMILIES'), hidden: true}, [search, tabs, grid, empty]);
		document.body.appendChild(pop);
		watchContainer(pop);

		var current = null;

		function recent() {
			return storeGet('editorplus:smiley-recent', []).filter(function (c) {
				return byCode[c];
			});
		}

		function groups() {
			var g = [];
			var r = recent();
			if (r.length) {
				g.push({id: 'recent', label: lang('EP_SMILIES_RECENT'), items: r.map(function (c) {
					return byCode[c];
				})});
			}
			var phpbb = list.filter(function (x) {
				return x.group === 'phpbb';
			});
			var custom = list.filter(function (x) {
				return x.group === 'custom';
			});
			if (phpbb.length) {
				g.push({id: 'phpbb', label: lang('EP_SMILIES_PHPBB'), items: phpbb});
			}
			if (custom.length) {
				g.push({id: 'custom', label: lang('EP_SMILIES_CUSTOM'), items: custom});
			}
			return g;
		}

		function render() {
			var q = search.value.trim().toLowerCase();
			var g = groups();
			if (!current || !g.some(function (x) {
				return x.id === current;
			})) {
				current = g.length > 1 && g[0].id === 'recent' ? 'recent' : (g[0] ? g[0].id : null);
			}

			tabs.textContent = '';
			g.forEach(function (x) {
				var t = el('button', {type: 'button', className: 'ep-sm-tab' + (!q && x.id === current ? ' ep-active' : ''), role: 'tab', 'aria-selected': !q && x.id === current ? 'true' : 'false', 'data-tab': x.id}, [
					x.label, el('span', {className: 'ep-count', text: String(x.items.length)})
				]);
				tabs.appendChild(t);
			});

			var items;
			if (q) {
				items = list.filter(function (x) {
					return x.code.toLowerCase().indexOf(q) !== -1 || String(x.name).toLowerCase().indexOf(q) !== -1;
				});
			} else {
				var sel = g.filter(function (x) {
					return x.id === current;
				})[0];
				items = sel ? sel.items : [];
			}

			grid.textContent = '';
			var frag = document.createDocumentFragment();
			items.forEach(function (x) {
				var img = el('img', {src: smileyUrl(x.file), alt: x.code, loading: 'lazy'});
				if (x.w && x.h) {
					img.width = Math.min(x.w, 40);
					img.height = Math.round(x.h * (Math.min(x.w, 40) / x.w));
				}
				frag.appendChild(el('button', {type: 'button', className: 'ep-sm-cell', title: x.name + '  ' + x.code, 'data-code': x.code}, [img]));
			});
			grid.appendChild(frag);
			empty.hidden = items.length > 0;
		}

		tabs.addEventListener('click', function (e) {
			var t = e.target.closest('.ep-sm-tab');
			e.stopPropagation();
			if (t) {
				current = t.getAttribute('data-tab');
				search.value = '';
				render();
			}
		});
		grid.addEventListener('click', function (e) {
			var b = e.target.closest('.ep-sm-cell');
			if (!b) {
				return;
			}
			var code = b.getAttribute('data-code');
			var r = storeGet('editorplus:smiley-recent', []).filter(function (c) {
				return c !== code;
			});
			r.unshift(code);
			storeSet('editorplus:smiley-recent', r.slice(0, 24));
			// Uno spazio prima solo se serve, uno dopo: phpBB riconosce la faccina solo se è staccata dal testo
			ta.focus();
			var before = ta.value.slice(0, ta.selectionStart);
			insertText((before === '' || /\s$/.test(before) ? '' : ' ') + code + ' ');
			b.classList.add('ep-flash');
			setTimeout(function () {
				b.classList.remove('ep-flash');
			}, 250);
		});
		search.addEventListener('input', render);

		pop.render = render;
		pop.reset = function () {
			current = null; // a ogni apertura si riparte dalle recenti, se ce ne sono
			search.value = '';
		};
		return pop;
	}

	function placeSmileyPop() {
		var r = smileyBtn.getBoundingClientRect();
		var vw = document.documentElement.clientWidth;
		var width = Math.floor(Math.min(340, vw - 20));
		var left = Math.floor(Math.min(Math.max(8, r.left + window.pageXOffset), window.pageXOffset + vw - width - 10));
		smileyPop.style.width = width + 'px';
		smileyPop.style.left = left + 'px';
		smileyPop.style.top = (r.bottom + window.pageYOffset + 6) + 'px';
	}

	function toggleSmileyPop(force) {
		smileyPop = smileyPop || buildSmileyPop();
		var open = typeof force === 'boolean' ? force : smileyPop.hidden;
		if (open) {
			closeMenus();
			smileyPop.reset();
			smileyPop.render();
			smileyPop.hidden = false;
			placeSmileyPop();
			smileyBtn.setAttribute('aria-expanded', 'true');
		} else {
			smileyPop.hidden = true;
			smileyBtn.setAttribute('aria-expanded', 'false');
		}
	}

	function smileyPopOpen() {
		return smileyPop && !smileyPop.hidden;
	}

	document.addEventListener('click', function (e) {
		// e.target.isConnected: una scheda appena ridisegnata non è più nel documento, ma il clic era dentro al riquadro
		if (smileyPopOpen() && e.target.isConnected && !smileyPop.contains(e.target) && !smileyBtn.contains(e.target)) {
			toggleSmileyPop(false);
		}
	});
	window.addEventListener('resize', function () {
		if (smileyPopOpen()) {
			placeSmileyPop();
		}
	});

	/* Il riquadro di destra sparisce: le informazioni "BBCode è attivo…" passano nella barra di stato */
	var postInfo = '';

	function hideSmileyBox() {
		if (!F.hide_smiley_box || !F.smilies || !smileyBox || !smileyBtn) {
			return;
		}
		var status = smileyBox.querySelector('.bbcode-status');
		if (status) {
			postInfo = status.innerText.replace(/\n{2,}/g, '\n').trim();
		}
		document.documentElement.classList.add('ep-no-smiley-box');
	}

	/* ------------------------------------------------------------------ */
	/* Pulsanti degli strumenti                                            */
	/* ------------------------------------------------------------------ */

	var fsBtn = null;

	function toolButton(icon, title, action) {
		var b = el('button', {type: 'button', className: (coreBar ? 'button button-icon-only button-secondary ' : '') + 'abbc3_button ep-tool', title: title, 'aria-label': title, 'data-ep-action': action}, [
			el('i', {className: 'fa fa-fw ' + icon, 'aria-hidden': 'true'})
		]);
		return b;
	}

	function setupTools() {
		var tools = bar.querySelector('.ep-tools');
		// barra standard: niente menu "Nascosti", quindi GHide ha sempre il suo pulsante
		if (coreBar && tools && cfg.ghide && !F.categories && !bar.querySelector('[data-ep-action=ghide]')) {
			var gb = el('button', {type: 'button', className: 'button button-secondary abbc3_button ep-btn-ghide', 'data-ep-action': 'ghide', title: lang('EP_GHIDE')}, ['GHide']);
			gb.style.backgroundImage = 'url("' + (cfg.iconPath || '') + 'ghide.' + (cfg.iconExt || 'png') + '")';
			tools.insertBefore(gb, tools.firstChild);
		}
		if (!tools) {
			tools = el('span', {className: 'ep-tools', id: 'ep-tools'});
			var firstRow = bar.querySelector('.abbc3_buttons_row');
			(firstRow || bar).appendChild(tools);
		}

		if (smiliesAvailable()) {
			smileyBtn = el('button', {type: 'button', className: 'abbc3_button ep-tool ep-tool-smiley', title: lang('EP_SMILIES'), 'aria-label': lang('EP_SMILIES'), 'aria-haspopup': 'true', 'aria-expanded': 'false', 'data-ep-action': 'smilies'});
			var first = (cfg.smilies.filter(function (x) {
				return x[1] === 'icon_e_smile.gif';
			})[0] || cfg.smilies[0]);
			smileyBtn.style.backgroundImage = 'url("' + smileyUrl(first[1]) + '")';
			tools.appendChild(smileyBtn);
		}
		if (F.fa) {
			tools.appendChild(toolButton('fa-flag', lang('EP_FA_TITLE'), 'fa'));
		}
		if (F.syntax) {
			tools.appendChild(toolButton('fa-file-code-o', lang('EP_SYN_TITLE'), 'syntax'));
		}
		if (F.math && window.EditorPlusMath) {
			tools.appendChild(toolButton('fa-superscript', lang('EP_MATH_TITLE'), 'math'));
		}
		if (F.calc) {
			tools.appendChild(toolButton('fa-calculator', lang('EP_CALC_TITLE'), 'calc'));
		}
		if (F.emoji) {
			tools.appendChild(toolButton('fa-smile-o', lang('EP_EMOJI_TITLE'), 'emoji'));
		}
		if (imagesOn() && !cfg.isGuest) {
			tools.appendChild(toolButton('fa-picture-o', lang('EP_IMG_TITLE'), 'images'));
		}
		if (F.search_replace) {
			tools.appendChild(toolButton('fa-search', lang('EP_SR_TITLE'), 'search'));
		}
		if (F.live_preview) {
			liveBtn = toolButton('fa-columns', lang('EP_LIVE_TITLE'), 'live');
			tools.appendChild(liveBtn);
		}
		if (F.undo) {
			tools.appendChild(el('span', {className: 'ep-sep', 'aria-hidden': 'true'}));
			undoBtn = toolButton('fa-undo', lang('EP_UNDO'), 'undo');
			redoBtn = toolButton('fa-repeat', lang('EP_REDO'), 'redo');
			tools.appendChild(undoBtn);
			tools.appendChild(redoBtn);
		}
		if (F.fullscreen) {
			fsBtn = toolButton('fa-arrows-alt', lang('EP_FULLSCREEN'), 'fullscreen');
			tools.appendChild(fsBtn);
		}

		bar.addEventListener('click', function (e) {
			var b = e.target.closest('[data-ep-action]');
			if (!b || !bar.contains(b)) {
				return;
			}
			e.preventDefault();
			switch (b.getAttribute('data-ep-action')) {
				case 'ghide':
					ghideAction(b);
					break;
				case 'smilies':
					toggleSmileyPop();
					break;
				case 'fa':
				case 'emoji':
					var which = b.getAttribute('data-ep-action');
					b.classList.add('ep-loading');
					loadData().then(function () {
						b.classList.remove('ep-loading');
						if (which === 'fa') {
							faDialog = faDialog || buildFaDialog();
							showDialog(faDialog);
						} else {
							emojiDialog = emojiDialog || buildEmojiDialog();
							showDialog(emojiDialog);
						}
					}, function () {
						b.classList.remove('ep-loading');
						toast(lang('EP_LOAD_ERROR'), 'error');
					});
					break;
				case 'options':
					toggleOptions(b);
					break;
				case 'syntax':
					openSyntax();
					break;
				case 'math':
					openMath('formula');
					break;
				case 'calc':
					openMath('calc');
					break;
				case 'images':
					openImages();
					break;
				case 'search':
					if (wyActive()) {
						toast(lang('EP_WY_ONLY_BBCODE'), 'info');
						break;
					}
					toggleSearch();
					break;
				case 'live':
					toggleLive();
					break;
				case 'wysiwyg':
					if (wyActive()) {
						wyOff();
					} else {
						wyOn(false);
					}
					break;
				case 'undo':
				case 'redo':
					if (wyActive()) {
						wy.touched = true;
						try {
							wy.editor.getBody().ownerDocument.execCommand(b.getAttribute('data-ep-action'));
						} catch (e) { /* ignora */ }
						setTimeout(wySync, 0);
					} else if (b.getAttribute('data-ep-action') === 'undo') {
						undo();
					} else {
						redo();
					}
					break;
				case 'fullscreen':
					// l'editor visuale vive in un riquadro che si ricaricherebbe se spostato: lo si ricrea
					var wasVisual = wyActive();
					if (wasVisual) {
						wyOff();
					}
					toggleFullscreen();
					if (wasVisual) {
						wyOn(true);
					}
					break;
			}
		});
	}

	/* ------------------------------------------------------------------ */
	/* 1.0.6: avvisi brevi (toast)                                         */
	/* ------------------------------------------------------------------ */

	var toastBox = null;

	function toast(message, type) {
		if (!toastBox) {
			toastBox = el('div', {className: 'ep-toasts', 'aria-live': 'polite'});
			document.body.appendChild(toastBox);
		}
		var item = el('div', {className: 'ep-toast ep-toast-' + (type || 'info')}, [
			el('i', {className: 'fa fa-fw ' + (type === 'error' ? 'fa-exclamation-triangle' : (type === 'ok' ? 'fa-check-circle' : 'fa-info-circle')), 'aria-hidden': 'true'}),
			el('span', {text: message})
		]);
		toastBox.appendChild(item);
		setTimeout(function () {
			item.classList.add('ep-toast-out');
			setTimeout(function () {
				if (item.parentNode) {
					item.parentNode.removeChild(item);
				}
			}, 350);
		}, type === 'error' ? 6000 : 3500);
	}

	/* Riquadro ancorato a un pulsante, che si chiude cliccando fuori o con Esc */
	var popovers = [];

	function makePopover(className, anchor) {
		var pop = el('div', {className: 'ep-pop ' + className, hidden: true});
		document.body.appendChild(pop);
		watchContainer(pop);
		pop.anchor = anchor;
		pop.place = function () {
			var r = pop.anchor.getBoundingClientRect();
			var vw = document.documentElement.clientWidth;
			var width = Math.floor(Math.min(pop.preferredWidth || 360, vw - 20));
			var left = Math.floor(Math.min(Math.max(8, r.left + window.pageXOffset), window.pageXOffset + vw - width - 10));
			pop.style.width = width + 'px';
			pop.style.left = left + 'px';
			pop.style.top = (r.bottom + window.pageYOffset + 6) + 'px';
		};
		pop.open = function () {
			popovers.forEach(function (p) {
				if (p !== pop) {
					p.close();
				}
			});
			closeMenus();
			if (smileyPopOpen()) {
				toggleSmileyPop(false);
			}
			pop.hidden = false;
			pop.place();
			pop.classList.remove('ep-pop-in');
			void pop.offsetWidth;
			pop.classList.add('ep-pop-in');
			if (pop.onOpen) {
				pop.onOpen();
			}
		};
		pop.close = function () {
			if (!pop.hidden) {
				pop.hidden = true;
				if (pop.onClose) {
					pop.onClose();
				}
			}
		};
		pop.isOpen = function () {
			return !pop.hidden;
		};
		popovers.push(pop);
		return pop;
	}

	document.addEventListener('click', function (e) {
		popovers.forEach(function (pop) {
			if (pop.isOpen() && e.target.isConnected && !pop.contains(e.target) && !(pop.anchor && pop.anchor.contains(e.target))) {
				pop.close();
			}
		});
	});
	window.addEventListener('resize', function () {
		popovers.forEach(function (pop) {
			if (pop.isOpen()) {
				pop.place();
			}
		});
	});

	function closePopovers() {
		var closed = false;
		popovers.forEach(function (pop) {
			if (pop.isOpen()) {
				pop.close();
				closed = true;
			}
		});
		return closed;
	}

	/* ------------------------------------------------------------------ */
	/* 1.0.6: cerca e sostituisci                                          */
	/* ------------------------------------------------------------------ */

	var searchPop = null;

	function buildSearch() {
		var anchor = bar.querySelector('[data-ep-action=search]');
		var pop = makePopover('ep-sr', anchor);
		pop.preferredWidth = 380;

		var find = el('input', {type: 'search', className: 'ep-sr-input', placeholder: lang('EP_SR_FIND'), 'aria-label': lang('EP_SR_FIND')});
		var repl = el('input', {type: 'text', className: 'ep-sr-input', placeholder: lang('EP_SR_REPLACE'), 'aria-label': lang('EP_SR_REPLACE')});
		var matchCase = el('input', {type: 'checkbox'});
		var whole = el('input', {type: 'checkbox'});
		var info = el('span', {className: 'ep-sr-info', 'aria-live': 'polite'});
		var bNext = el('button', {type: 'button', className: 'ep-btn ep-btn-light ep-sr-next'}, [el('i', {className: 'fa fa-arrow-down', 'aria-hidden': 'true'}), ' ' + lang('EP_SR_NEXT')]);
		var bOne = el('button', {type: 'button', className: 'ep-btn ep-btn-light ep-sr-one'}, [lang('EP_SR_REPLACE_ONE')]);
		var bAll = el('button', {type: 'button', className: 'ep-btn ep-sr-all'}, [lang('EP_SR_REPLACE_ALL')]);

		pop.appendChild(el('div', {className: 'ep-sr-row'}, [el('i', {className: 'fa fa-search ep-sr-ico', 'aria-hidden': 'true'}), find]));
		pop.appendChild(el('div', {className: 'ep-sr-row'}, [el('i', {className: 'fa fa-exchange ep-sr-ico', 'aria-hidden': 'true'}), repl]));
		pop.appendChild(el('div', {className: 'ep-sr-opts'}, [
			el('label', {}, [matchCase, ' ' + lang('EP_SR_CASE')]),
			el('label', {}, [whole, ' ' + lang('EP_SR_WHOLE')]),
			info
		]));
		pop.appendChild(el('div', {className: 'ep-sr-actions'}, [bNext, bOne, bAll]));

		function regex(global) {
			var q = find.value;
			if (!q) {
				return null;
			}
			var src = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			if (whole.checked) {
				src = '(^|[^\\p{L}\\p{N}_])(' + src + ')(?=$|[^\\p{L}\\p{N}_])';
			} else {
				src = '()(' + src + ')';
			}
			return new RegExp(src, 'u' + (global ? 'g' : '') + (matchCase.checked ? '' : 'i'));
		}

		function count() {
			var re = regex(true);
			if (!re) {
				info.textContent = '';
				return 0;
			}
			var n = (ta.value.match(re) || []).length;
			info.textContent = n ? format(lang('EP_SR_COUNT'), n) : lang('EP_NO_RESULTS');
			info.classList.toggle('ep-sr-none', !n);
			return n;
		}

		function findNext(fromStart) {
			var re = regex(true);
			if (!re) {
				return false;
			}
			re.lastIndex = fromStart ? 0 : ta.selectionEnd;
			var m = re.exec(ta.value);
			if (!m && !fromStart) {
				re.lastIndex = 0;
				m = re.exec(ta.value);
			}
			if (!m) {
				return false;
			}
			var start = m.index + m[1].length;
			ta.focus();
			ta.setSelectionRange(start, start + m[2].length);
			// porta la parola trovata al centro dell'area di testo
			var before = ta.value.slice(0, start).split('\n').length - 1;
			var lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 18;
			ta.scrollTop = Math.max(0, before * lineHeight - ta.clientHeight / 2);
			find.focus();
			return true;
		}

		function selectedIsMatch() {
			var re = regex(false);
			if (!re || ta.selectionStart === ta.selectionEnd) {
				return false;
			}
			var sel = ta.value.slice(ta.selectionStart, ta.selectionEnd);
			var m = sel.match(new RegExp('^' + re.source.replace(/^\(\^\|\[\^\\p\{L\}\\p\{N\}_\]\)|^\(\)/, '').replace(/\(\?=\$\|\[\^\\p\{L\}\\p\{N\}_\]\)$/, '') + '$', re.flags));
			return !!m;
		}

		bNext.addEventListener('click', function () {
			if (!findNext(false)) {
				count();
			}
		});
		bOne.addEventListener('click', function () {
			if (!selectedIsMatch() && !findNext(false)) {
				count();
				return;
			}
			flushTyping();
			var s = ta.selectionStart;
			ta.value = ta.value.slice(0, s) + repl.value + ta.value.slice(ta.selectionEnd);
			ta.setSelectionRange(s + repl.value.length, s + repl.value.length);
			snapshot();
			changed();
			findNext(false);
			count();
		});
		bAll.addEventListener('click', function () {
			var n = count();
			var re = regex(true);
			if (!n || !re) {
				return;
			}
			flushTyping();
			var r = repl.value.replace(/\$/g, '$$$$');
			ta.value = ta.value.replace(re, '$1' + r);
			snapshot();
			changed();
			count();
			toast(format(lang('EP_SR_DONE'), n), 'ok');
		});
		find.addEventListener('input', count);
		[matchCase, whole].forEach(function (c) {
			c.addEventListener('change', count);
		});
		find.addEventListener('keydown', function (e) {
			if (e.key === 'Enter') {
				e.preventDefault();
				bNext.click();
			}
		});

		pop.onOpen = function () {
			var sel = ta.value.slice(ta.selectionStart, ta.selectionEnd);
			if (sel && sel.indexOf('\n') === -1 && sel.length < 80) {
				find.value = sel;
			}
			count();
			find.focus();
			find.select();
		};
		return pop;
	}

	function toggleSearch() {
		searchPop = searchPop || buildSearch();
		if (searchPop.isOpen()) {
			searchPop.close();
		} else {
			searchPop.open();
		}
	}

	/* ------------------------------------------------------------------ */
	/* 1.0.6: anteprima dal vivo                                           */
	/* ------------------------------------------------------------------ */

	var live = null, liveBtn = null, liveTimer = null, liveCtrl = null, liveLast = null;

	/* Nelle richieste AJAX phpBB scrive i percorsi relativi alla pagina da cui parte la richiesta:
	   li rendiamo assoluti rispetto a questa pagina, così valgono ovunque vengano mostrati */
	function absolutize(root) {
		var base = new URL(window.location.href);
		Array.prototype.forEach.call(root.querySelectorAll('[src], [href]'), function (node) {
			['src', 'href'].forEach(function (attr) {
				var v = node.getAttribute(attr);
				if (v && !/^(?:[a-z]+:|\/\/|#|\/)/i.test(v)) {
					try {
						node.setAttribute(attr, new URL(v, base).href);
					} catch (e) { /* ignora */ }
				}
			});
		});
	}

	/* Testo codificato (Base64) per il viaggio verso il server: niente emoji né HTML "visibili" ai firewall
	   del server (ModSecurity, Imunify...) che altrimenti possono bloccare la richiesta */
	function toB64(text) {
		try {
			return btoa(unescape(encodeURIComponent(String(text))));
		} catch (e) {
			return '';
		}
	}

	function render(data) {
		var fd = new FormData();
		fd.append('hash', cfg.renderHash || '');
		Object.keys(data).forEach(function (k) {
			if (k === 'signal') {
				return;
			}
			if (Array.isArray(data[k])) {
				data[k].forEach(function (v) {
					fd.append(k === 'items' ? 'items_b64[]' : k + '[]', k === 'items' ? toB64(v) : v);
				});
			} else if (k === 'text') {
				fd.append('text_b64', toB64(data[k]));
			} else {
				fd.append(k, data[k]);
			}
		});
		var opts = {method: 'POST', body: fd, credentials: 'same-origin', headers: {'X-Requested-With': 'XMLHttpRequest'}};
		if (data.signal) {
			opts.signal = data.signal;
		}
		return fetch(cfg.renderUrl, opts).then(function (r) {
			if (!r.ok) {
				throw new Error('HTTP ' + r.status);
			}
			return r.json();
		});
	}

	function buildLive() {
		var body = el('div', {className: 'content ep-live-content'});
		var state = el('span', {className: 'ep-live-state'});
		var close = el('button', {type: 'button', className: 'ep-live-close', title: lang('EP_CLOSE'), 'aria-label': lang('EP_CLOSE')}, [el('i', {className: 'fa fa-times', 'aria-hidden': 'true'})]);
		var head = [el('i', {className: 'fa fa-eye', 'aria-hidden': 'true'}), el('strong', {text: lang('EP_LIVE_TITLE')}), state];
		// 1.0.36: stampa / PDF del messaggio (contenuti nascosti solo per i gruppi autorizzati)
		if (F.print && cfg.printUrl && !cfg.isGuest) {
			var printBtn = el('button', {type: 'button', className: 'ep-live-print', title: lang('EP_PRINT_TITLE')}, [el('i', {className: 'fa fa-print', 'aria-hidden': 'true'}), ' ' + lang('EP_PRINT_BUTTON')]);
			printBtn.addEventListener('click', function () {
				printMessage(printBtn, state);
			});
			head.push(printBtn);
		}
		head.push(close);
		var box = el('div', {className: 'ep-live', 'aria-live': 'polite', hidden: true}, [
			el('div', {className: 'ep-live-head'}, head),
			el('div', {className: 'postbody ep-live-body'}, [body])
		]);
		(status && status.parentNode ? status : ta).insertAdjacentElement('afterend', box);
		close.addEventListener('click', function () {
			toggleLive(false);
		});
		return {box: box, body: body, state: state};
	}

	function refreshLive(now) {
		if (!live || live.box.hidden) {
			return;
		}
		clearTimeout(liveTimer);
		liveTimer = setTimeout(function () {
			var text = ta.value;
			if (text === liveLast) {
				return;
			}
			if (!text.trim()) {
				liveLast = text;
				live.body.innerHTML = '<p class="ep-live-empty">' + lang('EP_LIVE_EMPTY') + '</p>';
				live.state.textContent = '';
				return;
			}
			if (liveCtrl) {
				liveCtrl.abort();
			}
			liveCtrl = window.AbortController ? new AbortController() : null;
			live.box.classList.add('ep-live-busy');
			live.state.textContent = lang('EP_LIVE_UPDATING');
			render({text: text, attach_ids: attachmentIds(), signal: liveCtrl ? liveCtrl.signal : undefined}).then(function (res) {
				liveLast = text;
				live.body.innerHTML = res.html || '';
				absolutize(live.body);
				if (window.EditorPlusMath) {
					window.EditorPlusMath.run(live.body);
				}
				safely('allegati nell\'anteprima', function () {
					renderAttachments(live.body, res.attachments || {});
				});
				if (window.EditorPlusSyntax) {
					window.EditorPlusSyntax.run(live.body);
				}
				live.state.textContent = '';
				live.box.classList.remove('ep-live-busy');
			}).catch(function (err) {
				if (err && err.name === 'AbortError') {
					return;
				}
				live.box.classList.remove('ep-live-busy');
				live.state.textContent = lang('EP_LIVE_ERROR');
			});
		}, now ? 0 : 600);
	}

	function toggleLive(force) {
		live = live || buildLive();
		var open = typeof force === 'boolean' ? force : live.box.hidden;
		live.box.hidden = !open;
		document.documentElement.classList.toggle('ep-live-open', open);
		if (liveBtn) {
			liveBtn.classList.toggle('ep-active', open);
			liveBtn.setAttribute('aria-pressed', open ? 'true' : 'false');
		}
		storeSet('editorplus:live-open', open);
		if (open) {
			liveLast = null;
			refreshLive(true);
		}
	}

	/* ------------------------------------------------------------------ */
	/* 1.0.6: combo con tendina disegnata e anteprima della voce           */
	/* ------------------------------------------------------------------ */

	var previewCache = {};
	var hoverNone = window.matchMedia && window.matchMedia('(hover: none)').matches;

	function comboCode(sel, value) {
		var tag = sel.getAttribute('data-ep-tag');
		return sel.getAttribute('data-ep-mode') === 'param' ? '[' + tag + '=' + value + '][/' + tag + ']' : '[' + tag + ']' + value + '[/' + tag + ']';
	}

	function enhanceCombo(sel) {
		var name = sel.options[0].text;
		var trigger = el('button', {type: 'button', className: 'ep-cs-btn', 'aria-haspopup': 'listbox', 'aria-expanded': 'false', title: name}, [
			el('span', {className: 'ep-cs-label', text: name}),
			el('i', {className: 'fa fa-sort', 'aria-hidden': 'true'})
		]);
		sel.classList.add('ep-cs-native');
		sel.setAttribute('tabindex', '-1');
		sel.setAttribute('aria-hidden', 'true');
		sel.parentNode.insertBefore(trigger, sel);

		var pop = null;

		function build() {
			pop = makePopover('ep-cs-pop' + (F.combo_preview ? ' ep-cs-with-preview' : ''), trigger);
			pop.preferredWidth = F.combo_preview ? 560 : 300;
			var filter = el('input', {type: 'search', className: 'ep-cs-filter', placeholder: lang('EP_CS_FILTER'), 'aria-label': lang('EP_CS_FILTER')});
			var list = el('div', {className: 'ep-cs-list', role: 'listbox', 'aria-label': name});
			var preview = F.combo_preview ? el('div', {className: 'ep-cs-preview'}, [el('p', {className: 'ep-cs-hint', text: lang(hoverNone ? 'EP_CS_HINT_TOUCH' : 'EP_CS_HINT')})]) : null;
			pop.appendChild(el('div', {className: 'ep-cs-head'}, [el('strong', {text: name}), filter]));
			pop.appendChild(el('div', {className: 'ep-cs-main'}, [list, preview]));

			var items = [];
			Array.prototype.slice.call(sel.options, 1).forEach(function (opt, i) {
				var item = el('div', {className: 'ep-cs-item', role: 'option', tabindex: '-1', 'data-value': opt.value}, [
					el('span', {className: 'ep-cs-text', text: opt.text}),
					F.combo_preview && hoverNone ? el('button', {type: 'button', className: 'ep-cs-eye', 'aria-label': lang('EP_CS_PREVIEW')}, [el('i', {className: 'fa fa-eye', 'aria-hidden': 'true'})]) : null
				]);
				item.index = i;
				items.push(item);
				list.appendChild(item);
			});

			var key = sel.getAttribute('data-ep-tag') + '|' + sel.getAttribute('data-ep-mode');
			var active = null;

			function showPreview(item) {
				if (!preview) {
					return;
				}
				var value = item.getAttribute('data-value');
				var cached = previewCache[key] && previewCache[key][value];
				preview.textContent = '';
				preview.appendChild(el('div', {className: 'ep-cs-pv-title', text: item.textContent}));
				var frame = el('div', {className: 'postbody ep-cs-pv-body'}, [el('div', {className: 'content'})]);
				preview.appendChild(frame);
				preview.appendChild(el('code', {className: 'ep-cs-pv-code', text: comboCode(sel, value)}));
				if (cached !== undefined) {
					frame.firstChild.innerHTML = cached;
					absolutize(frame);
				} else {
					frame.classList.add('ep-cs-loading');
					loadPreviews().then(function () {
						if (active === item) {
							showPreview(item);
						}
					});
				}
			}

			var loading = null;
			function loadPreviews() {
				if (!loading) {
					var values = items.map(function (it) {
						return it.getAttribute('data-value');
					});
					var chunks = [];
					for (var i = 0; i < values.length; i += 40) {
						chunks.push(values.slice(i, i + 40));
					}
					previewCache[key] = previewCache[key] || {};
					loading = Promise.all(chunks.map(function (chunk) {
						return render({items: chunk.map(function (v) {
							return comboCode(sel, v);
						})}).then(function (res) {
							chunk.forEach(function (v, j) {
								previewCache[key][v] = (res.items || [])[j] || '';
							});
						});
					})).catch(function () {
						loading = null;
					});
				}
				return loading;
			}

			function setActive(item, preview) {
				if (active) {
					active.classList.remove('ep-cs-active');
				}
				active = item;
				if (item) {
					item.classList.add('ep-cs-active');
					// scorre solo l'elenco della tendina, mai la pagina
					if (item.offsetTop < list.scrollTop) {
						list.scrollTop = item.offsetTop;
					} else if (item.offsetTop + item.offsetHeight > list.scrollTop + list.clientHeight) {
						list.scrollTop = item.offsetTop + item.offsetHeight - list.clientHeight;
					}
					if (preview !== false) {
						showPreview(item);
					}
				}
			}

			function choose(item) {
				sel.value = item.getAttribute('data-value');
				sel.dispatchEvent(new Event('change', {bubbles: true}));
				pop.close();
			}

			list.addEventListener('mouseover', function (e) {
				var item = e.target.closest('.ep-cs-item');
				if (item && !hoverNone && item !== active) {
					setActive(item);
				}
			});
			list.addEventListener('click', function (e) {
				var eye = e.target.closest('.ep-cs-eye');
				var item = e.target.closest('.ep-cs-item');
				if (!item) {
					return;
				}
				if (eye) {
					e.stopPropagation();
					setActive(item);
					return;
				}
				choose(item);
			});
			function visible() {
				return items.filter(function (it) {
					return !it.hidden;
				});
			}
			filter.addEventListener('input', function () {
				var q = filter.value.trim().toLowerCase();
				items.forEach(function (it) {
					it.hidden = q && it.textContent.toLowerCase().indexOf(q) === -1 && it.getAttribute('data-value').toLowerCase().indexOf(q) === -1;
				});
				var v = visible();
				setActive(v[0] || null, !hoverNone);
			});
			pop.addEventListener('keydown', function (e) {
				var v = visible();
				var i = v.indexOf(active);
				if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
					e.preventDefault();
					var next = v[Math.max(0, Math.min(v.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))];
					if (next) {
						setActive(next);
					}
				} else if (e.key === 'Enter' && active && !active.hidden) {
					e.preventDefault();
					choose(active);
				}
			});

			pop.onOpen = function () {
				trigger.setAttribute('aria-expanded', 'true');
				filter.value = '';
				items.forEach(function (it) {
					it.hidden = false;
				});
				setActive(null);
				if (F.combo_preview) {
					loadPreviews();
				}
				if (!hoverNone) {
					filter.focus();
				}
			};
			pop.onClose = function () {
				trigger.setAttribute('aria-expanded', 'false');
			};
		}

		trigger.addEventListener('click', function () {
			if (!pop) {
				build();
			}
			if (pop.isOpen()) {
				pop.close();
			} else {
				pop.open();
			}
		});
	}

	function setupCombos() {
		Array.prototype.forEach.call(bar.querySelectorAll('.ep-img-combo'), enhanceCombo);
	}

	/* ------------------------------------------------------------------ */
	/* 1.0.6: immagini trascinate o incollate, caricate con barra di avanzamento */
	/* ------------------------------------------------------------------ */

	var tray = null, dropZone = null, queued = {}, uploaderHooked = false;

	function uploader() {
		return window.phpbb && phpbb.plupload && phpbb.plupload.uploader && phpbb.plupload.uploader.addFile ? phpbb.plupload.uploader : null;
	}

	function humanSize(bytes) {
		return bytes > 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB';
	}

	function trayItem(file) {
		if (!tray) {
			tray = el('div', {className: 'ep-tray', role: 'status', 'aria-live': 'polite'});
			document.body.appendChild(tray);
		}
		var thumb = el('span', {className: 'ep-tray-thumb'});
		if (/^image\//.test(file.type) && window.URL && URL.createObjectURL) {
			var url = URL.createObjectURL(file);
			thumb.style.backgroundImage = 'url("' + url + '")';
		} else {
			thumb.appendChild(el('i', {className: 'fa fa-file-o', 'aria-hidden': 'true'}));
		}
		var fill = el('span', {className: 'ep-tray-fill'});
		var pct = el('span', {className: 'ep-tray-pct', text: '0%'});
		var row = el('div', {className: 'ep-tray-item'}, [
			thumb,
			el('div', {className: 'ep-tray-info'}, [
				el('div', {className: 'ep-tray-name'}, [el('span', {text: file.name}), el('small', {text: humanSize(file.size)})]),
				el('div', {className: 'ep-tray-bar'}, [fill]),
			]),
			pct
		]);
		tray.appendChild(row);
		tray.classList.add('ep-tray-show');
		return {
			progress: function (p) {
				fill.style.width = p + '%';
				pct.textContent = p + '%';
			},
			done: function (ok, message) {
				row.classList.add(ok ? 'ep-tray-ok' : 'ep-tray-error');
				fill.style.width = '100%';
				pct.textContent = '';
				pct.appendChild(el('i', {className: 'fa ' + (ok ? 'fa-check' : 'fa-times'), 'aria-hidden': 'true'}));
				if (message) {
					row.querySelector('.ep-tray-name small').textContent = message;
				}
				setTimeout(function () {
					row.classList.add('ep-tray-out');
					setTimeout(function () {
						if (row.parentNode) {
							row.parentNode.removeChild(row);
						}
						if (tray && !tray.children.length) {
							tray.classList.remove('ep-tray-show');
						}
					}, 400);
				}, ok ? 2200 : 6000);
			}
		};
	}

	function hookUploader(up) {
		if (uploaderHooked) {
			return;
		}
		uploaderHooked = true;
		up.bind('FilesAdded', function (u, files) {
			files.forEach(function (f) {
				if (queued[f.name] && !queued[f.name].id) {
					queued[f.name].id = f.id;
				}
			});
		});
		function mine(file) {
			var found = null;
			Object.keys(queued).forEach(function (n) {
				if (queued[n].id === file.id) {
					found = queued[n];
				}
			});
			// un file scartato subito (troppo grande, estensione non ammessa) non ha ancora un id
			if (!found && file.name && queued[file.name] && !queued[file.name].id) {
				found = queued[file.name];
			}
			return found;
		}
		function forget(entry) {
			Object.keys(queued).forEach(function (n) {
				if (queued[n] === entry) {
					delete queued[n];
				}
			});
		}
		up.bind('UploadProgress', function (u, file) {
			var q = mine(file);
			if (q) {
				q.ui.progress(file.percent);
			}
		});
		up.bind('FileUploaded', function (u, file) {
			var q = mine(file);
			if (!q) {
				return;
			}
			forget(q);
			var data = file.attachment_data;
			if (!data || !data.attach_id) {
				q.ui.done(false, lang('EP_UPLOAD_FAILED'));
				return;
			}
			q.ui.done(true);
			var index = phpbb.plupload.getIndex(data.attach_id);
			ta.focus();
			ta.setSelectionRange(q.pos, q.pos);
			if (typeof window.attachInline === 'function' && index !== false && index !== undefined) {
				window.attachInline(index, data.real_filename);
			}
			// il prossimo file va dopo quello appena inserito
			Object.keys(queued).forEach(function (n) {
				if (queued[n].pos >= q.pos) {
					queued[n].pos = ta.selectionEnd;
				}
			});
		});
		up.bind('Error', function (u, err) {
			var q = err && err.file ? mine(err.file) : null;
			if (q) {
				forget(q);
				q.ui.done(false, err.message || lang('EP_UPLOAD_FAILED'));
			} else if (err && err.message) {
				toast(err.message, 'error');
			}
		});
	}

	/* 1.0.38: le immagini vanno nella cartella dell'utente (files/nome_ID/), gli altri file restano allegati */
	var IMG_TYPES = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp'};

	function imagesOn() {
		return !!(cfg.images && cfg.images.enabled);
	}

	function isFolderImage(file) {
		return imagesOn() && !!IMG_TYPES[file.type];
	}

	function openImages() {
		loadModule('images', [loadScriptOnce('editorplus_gallery.js')]).then(function (m) {
			m.open();
		}, function () {});
	}

	function uploadFiles(files, pos) {
		files = Array.prototype.slice.call(files || []);
		if (!files.length) {
			return false;
		}
		var pics = files.filter(isFolderImage);
		files = files.filter(function (f) {
			return !isFolderImage(f);
		});
		if (pics.length) {
			if (!cfg.images.allowed) {
				toast(cfg.images.reason || lang('EP_IMG_ERR_NO_GROUP'), 'error');
			} else {
				loadModule('images', [loadScriptOnce('editorplus_gallery.js')]).then(function (m) {
					m.upload(pics, pos);
				}, function () {});
			}
			if (!files.length) {
				return true;
			}
		}
		var up = uploader();
		if (!up) {
			toast(lang('EP_UPLOAD_NOT_HERE'), 'error');
			return true;
		}
		hookUploader(up);
		var stamp = Date.now();
		files.forEach(function (file, i) {
			var name = file.name && file.name !== 'image.png' ? file.name : lang('EP_UPLOAD_PASTED') + '-' + stamp + (i ? '-' + i : '') + '.' + ((file.type.split('/')[1] || 'png').replace('jpeg', 'jpg'));
			if (name !== file.name) {
				try {
					file = new File([file], name, {type: file.type});
				} catch (e) { /* browser vecchio: resta il nome originale */ }
			}
			if (queued[file.name]) {
				file = new File([file], stamp + '-' + file.name, {type: file.type});
			}
			queued[file.name] = {pos: pos, ui: trayItem(file), id: null};
			up.addFile(file, file.name);
		});
		return true;
	}

	function setupUpload() {
		if (!F.drop_upload) {
			return;
		}
		var target = ta.closest('#message-box') || ta.parentNode;
		var dropLabel = el('strong');
		var dropIcon = el('i', {className: 'fa fa-cloud-upload', 'aria-hidden': 'true'});
		dropZone = el('div', {className: 'ep-drop', 'aria-hidden': 'true'}, [
			el('div', {className: 'ep-drop-inner'}, [dropIcon, dropLabel])
		]);
		target.classList.add('ep-drop-target');
		target.appendChild(dropZone);

		var depth = 0;
		function hasFiles(e) {
			return e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') !== -1;
		}
		target.addEventListener('dragenter', function (e) {
			if (hasFiles(e)) {
				depth++;
				// phpBB prepara il caricamento dopo l'avvio della pagina: si controlla ora
				var ok = !!uploader() || (imagesOn() && cfg.images.allowed);
				dropLabel.textContent = lang(ok ? 'EP_DROP_HERE' : 'EP_UPLOAD_NOT_HERE');
				dropIcon.className = 'fa ' + (ok ? 'fa-cloud-upload' : 'fa-ban');
				target.classList.toggle('ep-drop-denied', !ok);
				target.classList.add('ep-dragging');
			}
		});
		target.addEventListener('dragleave', function (e) {
			if (hasFiles(e) && --depth <= 0) {
				depth = 0;
				target.classList.remove('ep-dragging');
			}
		});
		target.addEventListener('dragover', function (e) {
			if (hasFiles(e)) {
				e.preventDefault();
				e.dataTransfer.dropEffect = 'copy';
			}
		});
		target.addEventListener('drop', function (e) {
			if (!hasFiles(e)) {
				return;
			}
			e.preventDefault();
			e.stopPropagation();
			depth = 0;
			target.classList.remove('ep-dragging');
			uploadFiles(e.dataTransfer.files, ta.selectionEnd);
		}, true);

		ta.addEventListener('paste', function (e) {
			var files = [];
			var items = e.clipboardData ? e.clipboardData.items || [] : [];
			Array.prototype.forEach.call(items, function (it) {
				if (it.kind === 'file') {
					var f = it.getAsFile();
					if (f) {
						files.push(f);
					}
				}
			});
			if (files.length) {
				e.preventDefault();
				uploadFiles(files, ta.selectionStart);
			}
		});

		window.EditorPlus && (window.EditorPlus.upload = uploadFiles);
	}

	/* ------------------------------------------------------------------ */
	/* 1.0.12: formattazione mentre scrivi                                  */
	/* Dietro l'area di testo (resa trasparente) c'è un livello che mostra  */
	/* lo stesso identico testo con gli stili dei BBCode. I codici restano  */
	/* visibili ma sbiaditi e il testo salvato non cambia mai.              */
	/* ------------------------------------------------------------------ */

	var lf = null;

	var LF_COPY = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontVariant', 'fontStretch', 'lineHeight', 'letterSpacing', 'wordSpacing',
		'textIndent', 'textTransform', 'textAlign', 'direction', 'tabSize', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
		'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'boxSizing'];

	/* Il grassetto o il corsivo "veri" cambiano la larghezza delle lettere? Se sì, il cursore si disallineerebbe */
	function sameWidth(style) {
		try {
			var cs = getComputedStyle(ta);
			var c = document.createElement('canvas').getContext('2d');
			var sample = 'Il gatto nero salta sul muro: ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789 àèéìòù';
			c.font = 'normal ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
			var base = c.measureText(sample).width;
			c.font = style + ' ' + cs.fontSize + ' ' + cs.fontFamily;
			return Math.abs(c.measureText(sample).width - base) < 0.5;
		} catch (e) {
			return false;
		}
	}

	function escapeHtml(t) {
		return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	var LF_STYLE = {
		b: 'ep-lf-b', strong: 'ep-lf-b', i: 'ep-lf-i', em: 'ep-lf-i', u: 'ep-lf-u', s: 'ep-lf-s', strike: 'ep-lf-s',
		url: 'ep-lf-url', link: 'ep-lf-url', email: 'ep-lf-url', quote: 'ep-lf-quote', code: 'ep-lf-code', codebox: 'ep-lf-code',
		size: 'ep-lf-size', font: 'ep-lf-font', highlight: 'ep-lf-mark', mark: 'ep-lf-mark',
		hide: 'ep-lf-hidden', hidden: 'ep-lf-hidden', ghide: 'ep-lf-hidden', hhide: 'ep-lf-hidden', spoil: 'ep-lf-hidden',
		spoiler: 'ep-lf-hidden', password: 'ep-lf-hidden', offtopic: 'ep-lf-quote', mod: 'ep-lf-mark'
	};

	function lfRender(text) {
		var re = /\[(\/?)([a-z][a-z0-9_]*|\*)(=[^\]\n]{0,200})?\]/gi;
		var stack = [];
		var out = '';
		var last = 0;
		var m;

		function openSpan() {
			var classes = [];
			var color = '';
			stack.forEach(function (t) {
				if (LF_STYLE[t.name]) {
					classes.push(LF_STYLE[t.name]);
				}
				if (t.name === 'color' && /^=(#[0-9a-f]{3,8}|[a-z]{3,20})$/i.test(t.arg || '')) {
					color = t.arg.slice(1);
				}
			});
			if (!classes.length && !color) {
				return '';
			}
			return '<span class="' + classes.join(' ') + '"' + (color ? ' style="color:' + color + '"' : '') + '>';
		}

		// Le emoji (e altri simboli presi da un carattere di riserva) possono alzare la riga:
		// restano fuori dagli stili che cambiano il carattere, così alzano la riga come nell'area di testo
		var emojiRe = /(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)/u;

		function textChunk(t) {
			if (!t) {
				return '';
			}
			var open = openSpan();
			if (!open) {
				return escapeHtml(t);
			}
			return t.split(emojiRe).map(function (part, i) {
				if (!part) {
					return '';
				}
				return (i % 2 ? '<span class="ep-lf-emoji">' + escapeHtml(part) + '</span>' : escapeHtml(part));
			}).join('').replace(/^/, open) + '</span>';
		}

		while ((m = re.exec(text)) !== null) {
			out += textChunk(text.slice(last, m.index));
			var closing = m[1] === '/';
			var name = m[2].toLowerCase();
			out += '<span class="ep-lf-tag">' + escapeHtml(m[0]) + '</span>';
			if (closing) {
				for (var i = stack.length - 1; i >= 0; i--) {
					if (stack[i].name === name) {
						stack.splice(i, 1);
						break;
					}
				}
			} else if (name !== '*') {
				stack.push({name: name, arg: m[3] || ''});
			}
			last = re.lastIndex;
		}
		out += textChunk(text.slice(last));
		// uno spazio in più: l'ultima riga vuota deve avere la sua altezza come nell'area di testo
		return out + '\u200b\n\u200b';
	}

	function lfSync() {
		if (!lf) {
			return;
		}
		var cs = getComputedStyle(ta);
		LF_COPY.forEach(function (p) {
			lf.back.style[p] = cs[p];
		});
		lf.back.style.setProperty('--ep-lf-lh', cs.lineHeight);
		// la barra di scorrimento dell'area di testo riduce lo spazio per il testo: il livello dietro fa lo stesso
		var scrollbar = ta.offsetWidth - ta.clientWidth - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth);
		lf.back.style.paddingRight = (parseFloat(cs.paddingRight) + Math.max(0, scrollbar)) + 'px';
		lf.back.style.width = ta.offsetWidth + 'px';
		lf.back.style.height = ta.offsetHeight + 'px';
		lf.back.style.top = ta.offsetTop + 'px';
		lf.back.style.left = ta.offsetLeft + 'px';
		lf.back.scrollTop = ta.scrollTop;
		lf.back.scrollLeft = ta.scrollLeft;
	}

	function lfUpdate() {
		if (!lf) {
			return;
		}
		if (lf.frame) {
			cancelAnimationFrame(lf.frame);
		}
		lf.frame = requestAnimationFrame(function () {
			lf.frame = null;
			lf.inner.innerHTML = lfRender(ta.value);
			lfSync();
		});
	}

	function setupLiveFormat() {
		if (!F.live_format || !window.requestAnimationFrame) {
			return;
		}
		var wrap = el('div', {className: 'ep-lf-wrap'});
		var inner = el('div', {className: 'ep-lf-inner'});
		var back = el('div', {className: 'ep-lf-back', 'aria-hidden': 'true'}, [inner]);
		ta.parentNode.insertBefore(wrap, ta);
		wrap.appendChild(back);
		wrap.appendChild(ta);

		var cs = getComputedStyle(ta);
		back.style.backgroundColor = cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? cs.backgroundColor : '#ffffff';
		back.style.color = cs.color;
		ta.style.caretColor = cs.color;
		ta.classList.add('ep-lf-on');

		if (!sameWidth('bold')) {
			wrap.classList.add('ep-lf-fake-bold');
		}
		if (!sameWidth('italic ' + cs.fontWeight)) {
			wrap.classList.add('ep-lf-fake-italic');
		}

		lf = {wrap: wrap, back: back, inner: inner, frame: null};
		ta.addEventListener('scroll', lfSync);
		window.addEventListener('resize', lfSync);
		if (window.ResizeObserver) {
			new ResizeObserver(lfSync).observe(ta);
		}
		changeListeners.push(lfUpdate);
		lfUpdate();
	}

	/* ------------------------------------------------------------------ */
	/* 1.0.14: editor visuale (SCEditor)                                   */
	/* L'area di testo resta la fonte del messaggio: l'editor visuale ci    */
	/* riscrive il BBCode a ogni modifica, e ciò che altri script scrivono  */
	/* nell'area di testo passa nell'editor visuale.                        */
	/* ------------------------------------------------------------------ */

	var wy = {editor: null, on: false, syncing: false, checker: null, btn: null};

	function wyActive() {
		return !!(wy.on && wy.editor);
	}

	function wyPrepare(t) {
		return window.EditorPlusBBPrepare(t, cfg.customTags || [], !!F.wysiwyg_real);
	}

	function wyClean(t) {
		return window.EditorPlusBBClean(t);
	}

	/* Il giro BBCode -> visuale -> BBCode deve restituire ESATTAMENTE lo stesso testo */
	function wyCheck(text) {
		if (!text) {
			return true;
		}
		try {
			if (!wy.checker) {
				var t = document.createElement('textarea');
				var box = el('div', {'aria-hidden': 'true', style: 'position:absolute;left:-9999px;top:0;width:600px;height:200px;overflow:hidden;'}, [t]);
				document.body.appendChild(box);
				sceditor.create(t, {format: 'bbcode', toolbar: '', emoticonsEnabled: false, style: ''});
				wy.checker = sceditor.instance(t);
			}
			return wyClean(wy.checker.toBBCode(wy.checker.fromBBCode(wyPrepare(text)))) === text;
		} catch (e) {
			report('verifica editor visuale', e);
			return false;
		}
	}

	/* Dall'editor visuale all'area di testo */
	function wySync() {
		// finché il contenuto dell'editor visuale non è verificato identico all'originale non si scrive nulla
		// si scrive nell'area di testo solo dopo un'azione dell'utente e su un contenuto verificato identico:
		// così un riquadro che rilegge male il testo all'avvio non può mai alterare il messaggio
		if (!wyActive() || wy.syncing || !wy.verified || !wy.touched) {
			return;
		}
		var v = wyClean(wy.editor.val());
		if (v !== ta.value) {
			wy.syncing = true;
			ta.value = v;
			wy.syncing = false;
			changed();
		}
	}

	/* Dall'area di testo all'editor visuale (chiamata dal rilevamento delle modifiche) */
	function wyExternal(v) {
		if (!wyActive() || wy.syncing) {
			return;
		}
		if (v !== wyClean(wy.editor.val())) {
			wy.syncing = true;
			wy.editor.val(wyPrepare(v));
			wy.syncing = false;
			wy.original = v;
			setTimeout(wyRenderBlocks, 0);
		}
	}

	function wyFocus() {
		try {
			var body = wy.editor.getBody();
			body.ownerDocument.defaultView.focus();
			body.focus();
		} catch (e) {
			wy.editor.focus();
		}
	}

	function wyLabel() {
		updateInfo();
		if (!wy.btn) {
			return;
		}
		wy.btn.textContent = wyActive() ? lang('EP_WY_VISUAL') : lang('EP_WY_BBCODE');
		wy.btn.title = wyActive() ? lang('EP_WY_TO_BBCODE') : lang('EP_WY_TO_VISUAL');
		wy.btn.classList.toggle('ep-mode-bbcode', !wyActive());
		Array.prototype.forEach.call(bar.querySelectorAll('[data-ep-action=search]'), function (b) {
			b.classList.toggle('ep-disabled-wy', wyActive());
		});
	}

	function wyOn(silent) {
		if (wyActive()) {
			return true;
		}
		var text = ta.value;
		if (!wyCheck(text)) {
			if (!silent) {
				toast(lang('EP_WY_FALLBACK'), 'info');
			}
			wyLabel();
			return false;
		}
		if (lf) {
			lf.wrap.classList.add('ep-lf-paused');
			ta.classList.remove('ep-lf-on');
		}
		// il motore legge l'area di testo all'avvio del suo riquadro: deve trovarci già il testo preparato
		var nativeValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
		nativeValue.set.call(ta, wyPrepare(text));
		sceditor.create(ta, {
			format: 'bbcode',
			toolbar: '',
			emoticonsEnabled: false,
			style: cfg.wyContentCss || '',
			width: '100%',
			height: Math.max(ta.offsetHeight || 0, 240),
			resizeEnabled: true,
			spellcheck: prefOn('spellcheck', true)
		});
		wy.editor = sceditor.instance(ta);
		wy.on = true;
		try {
			wy.editor.getBody().ownerDocument.defaultView.frameElement.closest('.sceditor-container').classList.add('ep-wy-main');
		} catch (e) { /* ignora */ }
		nativeValue.set.call(ta, text);
		wy.syncing = true;
		wy.editor.val(wyPrepare(text));
		wy.syncing = false;
		// se il riquadro si è avviato dopo e ha riletto il testo, lo si ricarica nella forma giusta
		// Verifica all'avvio (fino a 3 secondi: il riquadro può avviarsi più tardi e rileggere il testo):
		// il contenuto deve risultare IDENTICO al testo originale prima di sincronizzare qualsiasi cosa.
		wy.verified = false;
		wy.touched = false;
		wy.original = text;
		var tries = 0;
		var recheck = setInterval(function () {
			tries++;
			if (!wyActive() || wy.syncing) {
				if (!wyActive()) {
					clearInterval(recheck);
				}
				return;
			}
			var body = wy.editor.getBody();
			// in modalità "aspetto reale" anche i blocchi con etichetta indicano un testo riletto dal riquadro
			var stale = wyReal() && body && body.querySelector('.ep-wy-bb');
			var same = !stale && wyClean(wy.editor.val()) === wy.original;
			if (wy.touched) {
				// l'utente ha iniziato a scrivere: se il contenuto era verificato si prosegue, altrimenti
				// non si può garantire nulla e si torna al BBCode con il testo originale
				clearInterval(recheck);
				if (!wy.verified) {
					wyAbort();
				}
				return;
			}
			if (same) {
				wy.verified = true;
				wyRenderBlocks();
			} else {
				// il riquadro ha (ri)letto il testo nella forma sbagliata: lo si ricarica
				wy.verified = false;
				wy.syncing = true;
				wy.editor.val(wyPrepare(wy.original));
				wy.syncing = false;
			}
			if (tries >= 20) {
				clearInterval(recheck);
				if (!wy.verified) {
					wyAbort();
				}
			}
		}, 150);
		if (wyReal()) {
			wyInheritStyles();
			setTimeout(wyRenderBlocks, 0);
		}
		// contenuto incollato (pagine web, Word, Google Documenti, mail) ripulito prima di diventare BBCode
		wy.editor.bind('pasteraw', function (e) {
			var data = (e && e.detail) || e;
			if (data && data.html && window.EditorPlusCleanPaste) {
				data.html = window.EditorPlusCleanPaste(data.html);
			}
		});
		wy.editor.bind('valuechanged keyup blur nodechanged', function () {
			setTimeout(wySync, 0);
		});

		// dentro l'editor visuale: immagini incollate/trascinate come allegati, Ctrl+Invio per inviare
		try {
			var doc = wy.editor.getBody().ownerDocument;
			var files = function (list) {
				return Array.prototype.filter.call(list || [], function (f) {
					return f && f.kind !== 'string';
				});
			};
			doc.addEventListener('paste', function (e) {
				var items = e.clipboardData ? Array.prototype.map.call(e.clipboardData.items || [], function (it) {
					return it.kind === 'file' ? it.getAsFile() : null;
				}).filter(Boolean) : [];
				if (items.length && F.drop_upload) {
					e.preventDefault();
					e.stopPropagation();
					uploadFiles(items, 0);
				}
			}, true);
			doc.addEventListener('drop', function (e) {
				var list = e.dataTransfer ? files(e.dataTransfer.files) : [];
				if (list.length && F.drop_upload) {
					e.preventDefault();
					e.stopPropagation();
					uploadFiles(list, 0);
				}
			}, true);
			doc.addEventListener('click', function (e) {
				var blk = e.target && e.target.closest ? e.target.closest('.ep-wy-raw') : null;
				if (blk) {
					e.preventDefault();
					e.stopPropagation();
					editRaw(blk, rawOf(blk));
				}
			}, true);
			// clic ed Esc dentro l'editor visuale chiudono menu e riquadri aperti, come nel resto della pagina
			doc.addEventListener('mousedown', function () {
				closeMenus();
				closePopovers();
				if (smileyPopOpen()) {
					toggleSmileyPop(false);
				}
			});
			['keydown', 'mousedown', 'paste', 'drop'].forEach(function (ev) {
				doc.addEventListener(ev, function () {
					wy.touched = true;
				}, true);
			});
			doc.addEventListener('keydown', function (e) {
				if (e.key === 'Escape') {
					closeMenus();
					closePopovers();
					if (smileyPopOpen()) {
						toggleSmileyPop(false);
					}
				}
				if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && form) {
					var post = form.querySelector('[name="post"]');
					if (post) {
						e.preventDefault();
						wySync();
						post.click();
					}
				}
			});
		} catch (e) {
			report('editor visuale: eventi', e);
		}

		storeSet('editorplus:wy-mode', 'visual');
		wyLabel();
		return true;
	}

	function wyAbort() {
		if (!wyActive()) {
			return;
		}
		var text = wy.original;
		wy.verified = false;
		var ed = wy.editor;
		wy.on = false;
		wy.editor = null;
		ed.destroy();
		ta.value = text;
		if (lf && F.live_format) {
			lf.wrap.classList.remove('ep-lf-paused');
			ta.classList.add('ep-lf-on');
			lfUpdate();
		}
		wyLabel();
		changed();
		toast(lang('EP_WY_FALLBACK'), 'info');
	}

	function wyOff() {
		if (!wyActive()) {
			return;
		}
		if (!wy.verified) {
			// mai verificato: si esce con il testo originale, senza leggere il riquadro
			var original = wy.original;
			var edo = wy.editor;
			wy.on = false;
			wy.editor = null;
			edo.destroy();
			ta.value = original;
			if (lf && F.live_format) {
				lf.wrap.classList.remove('ep-lf-paused');
				ta.classList.add('ep-lf-on');
				lfUpdate();
			}
			storeSet('editorplus:wy-mode', 'bbcode');
			wyLabel();
			changed();
			return;
		}
		wySync();
		var text = ta.value;
		var ed = wy.editor;
		wy.on = false;
		wy.editor = null;
		ed.destroy();
		ta.value = text;
		if (lf && F.live_format) {
			lf.wrap.classList.remove('ep-lf-paused');
			ta.classList.add('ep-lf-on');
			lfUpdate();
		}
		storeSet('editorplus:wy-mode', 'bbcode');
		wyLabel();
		changed();
	}

	/* Inserimenti di phpBB, ABBC3 ed Editor Plus: in modalità visuale vanno nell'editor visuale */
	function wyBridge() {
		var bfs = window.bbfontstyle;
		var itx = window.insert_text;
		if (typeof bfs === 'function') {
			window.bbfontstyle = function (open, close) {
				if (wyActive()) {
					wy.touched = true;
					wyFocus();
					// stili semplici: comando nativo, come in un programma di videoscrittura (attivi e scrivi)
					var simple = {'[b]': 'bold', '[i]': 'italic', '[u]': 'underline', '[s]': 'strikethrough'}[String(open).toLowerCase()];
					if (simple && String(close).toLowerCase() === String(open).toLowerCase().replace('[', '[/')) {
						try {
							wy.editor.getBody().ownerDocument.execCommand(simple, false, null);
							setTimeout(wySync, 0);
							return;
						} catch (e) { /* si ripiega sull'inserimento */ }
					}
					if (wyReal() && customTagOf(open)) {
						// blocco reale: con testo selezionato lo si avvolge subito, altrimenti si chiede il contenuto
						var selBB = '';
						try {
							var selHtml = wy.editor.getRangeHelper().selectedHtml();
							selBB = selHtml ? wyClean(wy.editor.toBBCode(selHtml)) : '';
						} catch (e) {
							selBB = '';
						}
						if (selBB || !close) {
							wy.editor.insert(wyPrepare(open + selBB + (close || '')));
							setTimeout(wyAfter, 0);
						} else {
							editRaw(null, open + close, function (raw) {
								wyFocus();
								wy.editor.insert(wyPrepare(raw));
								setTimeout(wyAfter, 0);
							}, String(open).length);
						}
						return;
					}
					wy.editor.insert(wyPrepare(open), close ? wyPrepare(close) : null);
					setTimeout(wySync, 0);
					return;
				}
				return bfs.apply(this, arguments);
			};
		}
		if (typeof itx === 'function') {
			window.insert_text = function (text) {
				if (wyActive()) {
					wy.touched = true;
					wyFocus();
					wy.editor.insert(wyPrepare(String(text)));
					setTimeout(wyAfter, 0);
					return;
				}
				return itx.apply(this, arguments);
			};
		}
	}

	function setupWysiwyg() {
		if (!(cfg.adminFeatures || {}).wysiwyg || !window.sceditor || !window.EditorPlusBBRules) {
			return;
		}
		window.EditorPlusBBRules(sceditor, cfg.customTags || []);
		wyBridge();

		var tools = bar.querySelector('.ep-tools');
		wy.btn = el('button', {type: 'button', className: 'abbc3_button ep-btn-mode', 'data-ep-action': 'wysiwyg'});
		if (tools) {
			tools.insertBefore(wy.btn, tools.firstChild);
		}
		if (F.wysiwyg && storeGet('editorplus:wy-mode', 'visual') === 'visual') {
			wyOn(false);
		}
		wyLabel();
	}

	/* ------------------------------------------------------------------ */
	/* 1.0.15: soluzione 3 – aspetto reale dei BBCode personalizzati       */
	/* Ogni blocco mostra l'HTML vero prodotto dal forum; con un clic si    */
	/* modifica il suo BBCode in una finestra con anteprima.                */
	/* ------------------------------------------------------------------ */

	var rawCache = {};
	var rawDlg = null;

	function wyReal() {
		return !!F.wysiwyg_real;
	}

	function rawOf(block) {
		try {
			return window.EditorPlusB64.dec(block.getAttribute('data-ep-raw') || '');
		} catch (e) {
			return '';
		}
	}

	function customTagOf(code) {
		var m = String(code).match(/^\[([a-z0-9_-]+)/i);
		return m && (cfg.customTags || []).indexOf(m[1].toLowerCase()) !== -1 ? m[1].toLowerCase() : '';
	}

	/* L'anteprima vive in uno spazio isolato (Shadow DOM): l'utente la vede, ma il convertitore
	   HTML -> BBCode del motore non ci entra (altrimenti la interpreterebbe e altererebbe il testo) */
	function fillBlock(block, html, raw) {
		var view = block.querySelector('.ep-wy-raw-view');
		if (!view) {
			return;
		}
		var root = view.shadowRoot || (view.attachShadow ? view.attachShadow({mode: 'open'}) : null);
		if (!root) {
			return; // browser senza Shadow DOM: resta il BBCode come testo
		}
		var links = Array.prototype.map.call(document.querySelectorAll('link[rel="stylesheet"]'), function (l) {
			return /sceditor|editorplus\.css/.test(l.href) ? '' : '<link rel="stylesheet" href="' + l.href.replace(/"/g, '&quot;') + '">';
		}).join('');
		var box = document.createElement('div');
		box.innerHTML = html || '';
		absolutize(box);
		root.innerHTML = links + '<style>:host{display:inline-block;max-width:100%;pointer-events:none}' +
			'.ep-view,.ep-view.postbody{float:none!important;width:auto!important;min-width:0;font-size:13px;max-width:100%}' +
			'.ep-view .content{min-height:0!important;height:auto!important;overflow:visible!important}.ep-view img,.ep-view iframe,.ep-view video{max-width:100%}' +
			// fuori dalla pagina dell'argomento alcuni stili dei moduli (dl/dt/dd) darebbero altezze e margini sbagliati
			'.ep-view dl,.ep-view dt,.ep-view dd{height:auto!important;min-height:0!important;float:none!important;width:auto!important}' +
			'.ep-view dd{margin-left:0!important}</style>' +
			'<div class="postbody ep-view"><div class="content"></div></div>';
		var content = root.querySelector('.content');
		if (html) {
			content.innerHTML = box.innerHTML;
		} else {
			content.textContent = raw;
		}
		// nel documento resta solo un carattere invisibile (tolto al salvataggio): il BBCode vero è nel blocco
		view.textContent = '\u200b';
	}

	/* Carica l'aspetto reale dei blocchi non ancora mostrati (in gruppi, con memoria) */
	function wyRenderBlocks() {
		if (!wyActive() || !wyReal()) {
			return;
		}
		var body = wy.editor.getBody();
		var pending = {};
		Array.prototype.forEach.call(body.querySelectorAll('.ep-wy-raw:not([data-ep-done])'), function (b) {
			b.setAttribute('data-ep-done', '1');
			b.title = lang('EP_WY_RAW_TIP');
			var raw = rawOf(b);
			if (rawCache[raw] !== undefined) {
				fillBlock(b, rawCache[raw], raw);
			} else {
				(pending[raw] = pending[raw] || []).push(b);
			}
		});
		var raws = Object.keys(pending);
		for (var i = 0; i < raws.length; i += 40) {
			(function (chunk) {
				render({items: chunk}).then(function (res) {
					chunk.forEach(function (raw, j) {
						rawCache[raw] = (res.items || [])[j] || '';
						pending[raw].forEach(function (b) {
							fillBlock(b, rawCache[raw], raw);
						});
					});
				}).catch(function () { /* resta il BBCode come testo */ });
			})(raws.slice(i, i + 40));
		}
	}

	function wyAfter() {
		wy.touched = true;
		wyRenderBlocks();
		wySync();
	}

	/* Finestra per modificare (o creare) un blocco: BBCode + anteprima dal vivo */
	function editRaw(block, initial, onSave, caret) {
		if (!rawDlg) {
			var d = makeDialog(lang('EP_WY_RAW_TITLE'), 'ep-raw-dialog');
			var area = el('textarea', {className: 'ep-raw-code', rows: '6', spellcheck: 'false'});
			var view = el('div', {className: 'postbody ep-raw-preview'}, [el('div', {className: 'content'})]);
			var save = el('button', {type: 'button', className: 'ep-btn'}, [lang('EP_WY_RAW_SAVE')]);
			var del = el('button', {type: 'button', className: 'ep-btn ep-btn-light ep-raw-del'}, [el('i', {className: 'fa fa-trash', 'aria-hidden': 'true'}), ' ' + lang('EP_WY_RAW_DELETE')]);
			var cancel = el('button', {type: 'button', className: 'ep-btn ep-btn-light'}, [lang('EP_WY_RAW_CANCEL')]);
			d.body.appendChild(el('p', {className: 'ep-raw-help', text: lang('EP_WY_RAW_HELP')}));
			d.body.appendChild(area);
			d.body.appendChild(view);
			d.body.appendChild(el('div', {className: 'ep-raw-actions'}, [del, el('span', {className: 'ep-raw-space'}), cancel, save]));
			var timer = null;
			var refresh = function () {
				clearTimeout(timer);
				timer = setTimeout(function () {
					render({text: area.value}).then(function (res) {
						view.firstChild.innerHTML = res.html || '';
						absolutize(view);
					}).catch(function () { /* niente anteprima */ });
				}, 350);
			};
			area.addEventListener('input', refresh);
			area.addEventListener('keydown', function (e) {
				if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
					e.preventDefault();
					save.click();
				}
			});
			cancel.addEventListener('click', function () {
				closeDialog();
			});
			save.addEventListener('click', function () {
				var cb = rawDlg.onSave;
				closeDialog();
				if (cb) {
					cb(area.value);
				}
			});
			del.addEventListener('click', function () {
				var b = rawDlg.block;
				closeDialog();
				wy.touched = true;
				if (b && b.parentNode) {
					b.parentNode.removeChild(b);
					setTimeout(wySync, 0);
				}
			});
			rawDlg = {dialog: d, area: area, refresh: refresh, del: del};
		}
		rawDlg.block = block;
		rawDlg.onSave = onSave || function (raw) {
			block.setAttribute('data-ep-raw', window.EditorPlusB64.enc(raw));
			block.setAttribute('data-ep-label', customTagOf(raw) || '?');
			block.removeAttribute('data-ep-done');
			wyAfter();
		};
		rawDlg.del.hidden = !block;
		rawDlg.area.value = initial;
		rawDlg.dialog.onOpen = function () {
			rawDlg.area.focus();
			var pos = typeof caret === 'number' ? caret : initial.length;
			rawDlg.area.setSelectionRange(pos, pos);
			rawDlg.refresh();
		};
		showDialog(rawDlg.dialog);
	}

	/* I fogli di stile del forum (stile, ABBC3, estensioni) anche dentro l'editor visuale:
	   così i blocchi appaiono come nei messaggi pubblicati. I nostri restano in coda e vincono. */
	function wyInheritStyles() {
		try {
			var doc = wy.editor.getBody().ownerDocument;
			var head = doc.head || doc.getElementsByTagName('head')[0];
			Array.prototype.forEach.call(document.querySelectorAll('link[rel="stylesheet"]'), function (l) {
				if (/sceditor|editorplus\.css/.test(l.href)) {
					return;
				}
				var c = doc.createElement('link');
				c.rel = 'stylesheet';
				c.href = l.href;
				head.insertBefore(c, head.firstChild);
			});
		} catch (e) {
			report('editor visuale: stili del forum', e);
		}
	}

	/* ------------------------------------------------------------------ */
	/* 1.0.17: menu "Opzioni" – scelte dell'utente cambiate al volo         */
	/* ------------------------------------------------------------------ */

	var prefs = cfg.prefs || {};
	var admin = cfg.adminFeatures || {};
	var optPop = null;

	function prefOn(key, def) {
		var v = prefs[key];
		if (cfg.isGuest || v === undefined) {
			var local = storeGet('editorplus:pref:' + key, null);
			if (local !== null) {
				return !!local;
			}
		}
		return v === undefined ? def : !!v;
	}

	function savePref(key, on) {
		prefs[key] = on ? 1 : 0;
		storeSet('editorplus:pref:' + key, on);
		if (cfg.isGuest || !cfg.prefsUrl) {
			return;
		}
		var fd = new FormData();
		fd.append('hash', cfg.prefsHash || '');
		fd.append('key', key);
		fd.append('value', on ? 1 : 0);
		fetch(cfg.prefsUrl, {method: 'POST', body: fd, credentials: 'same-origin', headers: {'X-Requested-With': 'XMLHttpRequest'}}).then(function (r) {
			if (r.ok) {
				toast(lang('EP_OPT_SAVED'), 'ok');
			}
		}).catch(function () { /* resta salvata nel browser */ });
	}

	function applySpellcheck(on) {
		ta.spellcheck = on;
		ta.setAttribute('spellcheck', on ? 'true' : 'false');
		if (typeof wy !== 'undefined' && wy.on && wy.editor) {
			try {
				wy.editor.getBody().setAttribute('spellcheck', on ? 'true' : 'false');
			} catch (e) { /* ignora */ }
		}
	}

	function applyLiveFormat(on) {
		if (on) {
			F.live_format = true;
			if (!lf) {
				setupLiveFormat();
			} else if (!(typeof wy !== 'undefined' && wy.on)) {
				lf.wrap.classList.remove('ep-lf-paused');
				ta.classList.add('ep-lf-on');
				lfUpdate();
			}
		} else if (lf) {
			lf.wrap.classList.add('ep-lf-paused');
			ta.classList.remove('ep-lf-on');
		}
		applyMarks(prefOn('lf_marks', false));
	}

	function applyMarks(on) {
		if (lf) {
			lf.wrap.classList.toggle('ep-lf-marks', !!on);
		}
	}

	function buildOptions(anchor) {
		var pop = makePopover('ep-opt-pop', anchor);
		pop.preferredWidth = 300;
		var rows = [];
		function row(key, label, def, apply, visible) {
			if (!visible) {
				return;
			}
			var box = el('input', {type: 'checkbox', 'data-ep-pref': key});
			box.checked = prefOn(key, def);
			box.addEventListener('change', function () {
				apply(box.checked);
				savePref(key, box.checked);
				refreshRows();
			});
			var r = el('label', {className: 'ep-opt-row'}, [box, el('span', {text: label})]);
			rows.push({key: key, el: r, box: box});
			pop.appendChild(r);
		}
		pop.appendChild(el('div', {className: 'ep-opt-head'}, [el('i', {className: 'fa fa-sliders', 'aria-hidden': 'true'}), el('strong', {text: lang('EP_OPT_TITLE')})]));
		row('spellcheck', lang('EP_OPT_SPELLCHECK'), true, applySpellcheck, true);
		row('live_format', lang('EP_OPT_LIVE_FORMAT'), true, applyLiveFormat, !!admin.live_format);
		row('lf_marks', lang('EP_OPT_LF_MARKS'), false, applyMarks, !!admin.live_format);
		row('wysiwyg', lang('EP_OPT_WYSIWYG'), true, function (on) {
			storeSet('editorplus:wy-mode', on ? 'visual' : 'bbcode');
			if (on) {
				wyOn(false);
			} else if (typeof wyOff === 'function') {
				wyOff();
			}
		}, !!admin.wysiwyg && !!window.sceditor);
		pop.appendChild(el('p', {className: 'ep-opt-note', text: lang('EP_OPT_NOTE')}));

		function refreshRows() {
			rows.forEach(function (r) {
				if (r.key === 'lf_marks') {
					r.el.classList.toggle('ep-opt-off', !prefOn('live_format', true));
				}
				if (r.key === 'wysiwyg') {
					r.box.checked = typeof wy !== 'undefined' && wy.on;
				}
			});
		}
		pop.onOpen = refreshRows;
		return pop;
	}

	function toggleOptions(anchor) {
		optPop = optPop || buildOptions(anchor);
		if (optPop.isOpen()) {
			optPop.close();
		} else {
			optPop.open();
		}
	}

	function setupOptions() {
		// scelte salvate applicate all'avvio
		applySpellcheck(prefOn('spellcheck', true));
		applyMarks(prefOn('lf_marks', false));
		if (!admin.options_menu) {
			return;
		}
		var tools = bar.querySelector('.ep-tools');
		if (tools) {
			tools.appendChild(toolButton('fa-sliders', lang('EP_OPT_TITLE'), 'options'));
		}
	}

	/* ------------------------------------------------------------------ */
	/* 1.0.19: riga informativa sopra la barra (editor in uso, versione,   */
	/* crediti). Si aggiorna passando tra modalità BBCode e visuale.        */
	/* ------------------------------------------------------------------ */

	var infoLine = null;

	function updateInfo() {
		if (!infoLine) {
			return;
		}
		var visual = typeof wy !== 'undefined' && wy.on && !!wy.editor;
		infoLine.mode.textContent = (visual ? lang('EP_INFO_MODE_VISUAL') : lang('EP_INFO_MODE_BBCODE')) +
			' (' + (coreBar ? lang('EP_INFO_BAR_CORE') : lang('EP_INFO_BAR_ABBC3')) + ')';
		infoLine.box.classList.toggle('ep-info-visual', visual);
	}

	function setupInfo() {
		if (!F.info_bar) {
			return;
		}
		var mode = el('strong', {className: 'ep-info-mode'});
		var link = el('a', {href: 'https://netshadows.de/ombra', target: '_blank', rel: 'noopener', text: 'Salvo Cortesiano'});
		var box = el('div', {className: 'ep-info', role: 'note'}, [
			el('i', {className: 'fa fa-pencil-square-o', 'aria-hidden': 'true'}),
			el('span', {className: 'ep-info-name', text: 'Editor Plus ' + epState.version}),
			el('span', {className: 'ep-info-sep', 'aria-hidden': 'true', text: '·'}),
			el('span', {}, [lang('EP_INFO_EDITOR') + ': ', mode]),
			el('span', {className: 'ep-info-sep', 'aria-hidden': 'true', text: '·'}),
			el('span', {className: 'ep-info-credits'}, [lang('EP_INFO_CREDITS') + ' ', link])
		]);
		bar.parentNode.insertBefore(box, bar);
		infoLine = {box: box, mode: mode};
		updateInfo();
	}

	/* ------------------------------------------------------------------ */
	/* 1.0.21: pulsante "Colora codice" – [syntax=linguaggio]…[/syntax]    */
	/* ------------------------------------------------------------------ */

	var synDlg = null;
	var SYN_LANGS = [
		['', 'EP_SYN_AUTO'], ['c', 'C'], ['cpp', 'C++'], ['csharp', 'C#'], ['java', 'Java'], ['python', 'Python'],
		['php', 'PHP'], ['javascript', 'JavaScript / Ajax'], ['typescript', 'TypeScript'], ['xml', 'HTML / XML'],
		['css', 'CSS'], ['sql', 'SQL'], ['json', 'JSON'], ['bash', 'Bash / Shell'], ['go', 'Go'], ['ruby', 'Ruby'],
		['kotlin', 'Kotlin'], ['swift', 'Swift'], ['rust', 'Rust'], ['perl', 'Perl'], ['lua', 'Lua'], ['vbnet', 'VB.NET'],
		['yaml', 'YAML'], ['ini', 'INI'], ['markdown', 'Markdown'], ['diff', 'Diff'], ['plaintext', 'EP_SYN_PLAIN']
	];
	var SYN_FORMAT = {xml: 'html', css: 'css', scss: 'css', less: 'css', javascript: 'js', typescript: 'js', json: 'js'};

	function buildSyntaxDialog() {
		var d = makeDialog(lang('EP_SYN_TITLE'), 'ep-syn-dialog');
		var sel = el('select', {className: 'ep-syn-lang', 'aria-label': lang('EP_SYN_LANG')});
		SYN_LANGS.forEach(function (l) {
			sel.appendChild(el('option', {value: l[0], text: /^EP_/.test(l[1]) ? lang(l[1]) : l[1]}));
		});
		var area = el('textarea', {className: 'ep-syn-code', rows: '12', spellcheck: 'false', placeholder: lang('EP_SYN_CODE')});
		var tabs = el('button', {type: 'button', className: 'ep-btn ep-btn-light'}, [lang('EP_SYN_TABS')]);
		var fmt = el('button', {type: 'button', className: 'ep-btn ep-btn-light'}, [el('i', {className: 'fa fa-magic', 'aria-hidden': 'true'}), ' ' + lang('EP_SYN_FORMAT')]);
		var ins = el('button', {type: 'button', className: 'ep-btn'}, [lang('EP_SYN_INSERT')]);
		var pv = el('div', {className: 'ep-syn-preview'});
		d.body.appendChild(el('div', {className: 'ep-syn-row'}, [el('label', {}, [lang('EP_SYN_LANG') + ': ', sel]), el('span', {className: 'ep-raw-space'}), tabs, fmt]));
		d.body.appendChild(area);
		d.body.appendChild(el('div', {className: 'ep-syn-pv-title', text: lang('EP_SYN_PREVIEW')}));
		d.body.appendChild(pv);
		d.body.appendChild(el('div', {className: 'ep-raw-actions'}, [el('span', {className: 'ep-raw-space'}), ins]));

		var timer = null;
		function preview() {
			clearTimeout(timer);
			timer = setTimeout(function () {
				pv.textContent = '';
				if (!area.value.trim() || !window.EditorPlusSyntax) {
					return;
				}
				var box = el('div', {className: 'ep-syntax', 'data-lang': sel.value}, [el('pre', {}, [el('code', {text: area.value})])]);
				pv.appendChild(box);
				window.EditorPlusSyntax.run(pv);
			}, 250);
		}
		function canFormat() {
			return !!SYN_FORMAT[sel.value];
		}
		function refreshFormat() {
			fmt.disabled = !canFormat();
			fmt.title = canFormat() ? '' : lang('EP_SYN_FORMAT_NA');
		}
		area.addEventListener('input', preview);
		sel.addEventListener('change', function () {
			refreshFormat();
			preview();
		});
		// il tasto Tab inserisce una tabulazione invece di uscire dal campo
		area.addEventListener('keydown', function (e) {
			if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
				e.preventDefault();
				var s = area.selectionStart;
				area.value = area.value.slice(0, s) + '\t' + area.value.slice(area.selectionEnd);
				area.setSelectionRange(s + 1, s + 1);
				preview();
			} else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
				e.preventDefault();
				ins.click();
			}
		});
		tabs.addEventListener('click', function () {
			var n = parseInt((window.EditorPlusSyntaxConfig || {}).tab, 10) || 4;
			area.value = area.value.replace(/\t/g, new Array(n + 1).join(' '));
			preview();
		});
		fmt.addEventListener('click', function () {
			if (!canFormat() || !window.EditorPlusSyntax) {
				return;
			}
			var kind = SYN_FORMAT[sel.value];
			window.EditorPlusSyntax.beautify().then(function (w) {
				var lib = w.beautifier || {js: w.js_beautify, css: w.css_beautify, html: w.html_beautify};
				var opts = {indent_size: 4, indent_with_tabs: false, preserve_newlines: true, max_preserve_newlines: 2};
				if (lib && typeof lib[kind] === 'function') {
					area.value = lib[kind](area.value, opts);
					preview();
				}
			}).catch(function () { /* niente riformattazione */ });
		});
		ins.addEventListener('click', function () {
			var code = area.value.replace(/\s+$/, '');
			if (!code) {
				closeDialog();
				return;
			}
			// la chiusura del blocco non può comparire dentro al codice
			code = code.replace(/\[\/syntax\]/gi, '[ /syntax]');
			var open = '[syntax' + (sel.value ? '=' + sel.value : '') + ']';
			closeDialog();
			insertText(open + '\n' + code + '\n[/syntax]');
		});
		synDlg = {dialog: d, sel: sel, area: area, preview: preview, refreshFormat: refreshFormat};
		return synDlg;
	}



	/* ------------------------------------------------------------------ */
	/* 1.0.37: moduli scaricati solo al primo utilizzo                     */
	/* (formule e calcolatrice, colore, stampa): la pagina di scrittura    */
	/* scarica meno codice e parte prima, soprattutto sul telefono.        */
	/* ------------------------------------------------------------------ */

	function escapeHtml(t) {
		return String(t).replace(/[&<>"]/g, function (c) {
			return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c];
		});
	}

	var moduleCache = {};
	var scriptCache = {};

	function jsUrl(file) {
		return (cfg.rootPath || './') + 'ext/salvocortesiano/editorplus/styles/all/template/js/' + file + '?v=' + epState.version;
	}

	function loadScriptOnce(file) {
		if (!scriptCache[file]) {
			scriptCache[file] = new Promise(function (resolve, reject) {
				var sc = document.createElement('script');
				sc.src = jsUrl(file);
				sc.onload = resolve;
				sc.onerror = function () {
					scriptCache[file] = null;
					reject(new Error(file));
				};
				document.head.appendChild(sc);
			});
		}
		return scriptCache[file];
	}

	function moduleApi() {
		return {F: F, cfg: cfg, ta: ta, wy: wy, setText: setText, confirm: niceConfirm, el: el, lang: lang, format: format, makeDialog: makeDialog, showDialog: showDialog, closeDialog: closeDialog, insertText: insertText, wrap: wrap, storeGet: storeGet, storeSet: storeSet, subjectInput: subjectInput, toB64: toB64, attachmentData: attachmentData, attachmentUrl: attachmentUrl, ATT_IMAGE: ATT_IMAGE, escapeHtml: escapeHtml, clamp: clamp, hexToRgb: hexToRgb, rgbToHex: rgbToHex, rgbToHsv: rgbToHsv, hsvToRgb: hsvToRgb, rgbToHsl: rgbToHsl, hslToRgb: hslToRgb, contrast: contrast, cssColorToRgb: cssColorToRgb, postBackground: postBackground, colorShades: colorShades, COLOR_BASES: COLOR_BASES, COLOR_RECENT_KEY: COLOR_RECENT_KEY, toast: toast, trayItem: trayItem, wyActive: function () {
			return typeof wyActive === 'function' && wyActive();
		}};
	}

	function loadModule(name, extra) {
		if (!moduleCache[name]) {
			moduleCache[name] = Promise.all([loadScriptOnce('editorplus_mod_' + name + '.js')].concat(extra || [])).then(function () {
				var factory = (window.EditorPlusModules || {})[name];
				if (!factory) {
					throw new Error(name);
				}
				return factory(moduleApi());
			}).catch(function (e) {
				moduleCache[name] = null;
				report('modulo ' + name, e);
				toast(lang('EP_MODULE_FAILED'), 'error');
				throw e;
			});
		}
		return moduleCache[name];
	}

	/*
	 * 1.0.37: testo formattato incollato nell'area di testo (Word, Google Docs, pagine web) → BBCode.
	 * Non si converte dentro [code], [syntax], [math], [imath] (lì si vuole il testo così com'è),
	 * né con Ctrl+Maiusc+V (il browser passa solo il testo semplice), né con l'editor visuale attivo.
	 */
	function caretInLiteral() {
		var before = ta.value.slice(0, ta.selectionStart).toLowerCase();
		return ['code', 'syntax', 'math', 'imath'].some(function (t) {
			var open = (before.match(new RegExp('\\[' + t + '(?:=[^\\]]*)?\\]', 'g')) || []).length;
			var close = (before.match(new RegExp('\\[/' + t + '\\]', 'g')) || []).length;
			return open > close;
		});
	}

	var pasteTipShown = false;

	function setupPasteConvert() {
		if (!F.paste_bbcode || !window.DOMParser) {
			return;
		}
		ta.addEventListener('paste', function (e) {
			if ((typeof wyActive === 'function' && wyActive()) || !e.clipboardData) {
				return;
			}
			var html = e.clipboardData.getData('text/html');
			var plain = e.clipboardData.getData('text/plain');
			// niente formattazione (o solo un'immagine copiata dal disco): incolla normale del browser
			if (!html || !/<(b|strong|i|em|u|s|strike|del|a|font|span|p|div|ul|ol|li|h[1-6]|blockquote|pre|img|table|sup|sub)\b/i.test(html) || caretInLiteral()) {
				return;
			}
			e.preventDefault();
			var start = ta.selectionStart, end = ta.selectionEnd;
			var restoreCaret = function () {
				ta.focus();
				ta.setSelectionRange(start, end);
			};
			var jobs = [loadModule('paste')];
			if (!window.EditorPlusCleanPaste) {
				jobs.push(loadScriptOnce('editorplus_bbrules.js'));
			}
			Promise.all(jobs).then(function (r) {
				var bb = r[0].convert(html);
				restoreCaret();
				insertText(bb || plain);
				if (!pasteTipShown) {
					pasteTipShown = true;
					toast(lang('EP_PASTE_CONVERTED'), 'info');
				}
			}).catch(function () {
				// qualcosa non va: si incolla il testo semplice, così non si perde nulla
				restoreCaret();
				insertText(plain);
			});
		});
	}

	function openMath(tab) {
		// il motore della calcolatrice serve solo se la calcolatrice è accesa
		var extra = F.calc && !window.EditorPlusCalc ? [loadScriptOnce('editorplus_calc.js')] : [];
		loadModule('math', extra).then(function (m) {
			m.open(tab);
		}, function () {});
	}

	function openColor() {
		loadModule('color').then(function (m) {
			m.open();
		}, function () {});
	}

	function printMessage(btn, state) {
		loadModule('print').then(function (m) {
			m.print(btn, state);
		}, function () {});
	}

	/* ------------------------------------------------------------------ */
	/* 1.0.31: selettore del colore con sfumature (+ tavolozza classica)   */
	/* Il pulsante del colore di phpBB e di ABBC3 chiama change_palette(): */
	/* con l'opzione accesa apre questo pannello. Risultato: il solito     */
	/* [color=#rrggbb]…[/color] di phpBB.                                  */
	/* ------------------------------------------------------------------ */

	var COLOR_BASES = ['#e53935', '#f4511e', '#fb8c00', '#fdd835', '#7cb342', '#43a047', '#00897b',
		'#00acc1', '#1e88e5', '#3949ab', '#8e24aa', '#d81b60', '#6d4c41', '#757575'];
	var COLOR_LIGHTNESS = [95, 88, 80, 71, 62, 53, 45, 37, 29, 21, 13];
	var COLOR_RECENT_KEY = 'editorplus:colors-recent';

	function clamp(v, a, b) {
		return Math.min(b, Math.max(a, v));
	}

	function hexToRgb(hex) {
		var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex).trim());
		if (!m) {
			return null;
		}
		var h = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1];
		return {r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16)};
	}

	function rgbToHex(c) {
		return '#' + [c.r, c.g, c.b].map(function (v) {
			return ('0' + clamp(Math.round(v), 0, 255).toString(16)).slice(-2);
		}).join('');
	}

	function rgbToHsv(c) {
		var r = c.r / 255, g = c.g / 255, b = c.b / 255;
		var max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, h = 0;
		if (d) {
			h = max === r ? ((g - b) / d) % 6 : (max === g ? (b - r) / d + 2 : (r - g) / d + 4);
			h = (h * 60 + 360) % 360;
		}
		return {h: h, s: max ? d / max : 0, v: max};
	}

	function hsvToRgb(h, s, v) {
		var c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c, r = 0, g = 0, b = 0;
		if (h < 60) {
			r = c; g = x;
		} else if (h < 120) {
			r = x; g = c;
		} else if (h < 180) {
			g = c; b = x;
		} else if (h < 240) {
			g = x; b = c;
		} else if (h < 300) {
			r = x; b = c;
		} else {
			r = c; b = x;
		}
		return {r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255};
	}

	function rgbToHsl(c) {
		var r = c.r / 255, g = c.g / 255, b = c.b / 255;
		var max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
		var s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
		return {h: rgbToHsv(c).h, s: s, l: l};
	}

	function hslToRgb(h, s, l) {
		var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
		var t = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
		return {r: (t[0] + m) * 255, g: (t[1] + m) * 255, b: (t[2] + m) * 255};
	}

	/* le sfumature di un colore: stessa tinta e intensità, dalla più chiara alla più scura */
	function colorShades(hex) {
		var hsl = rgbToHsl(hexToRgb(hex));
		return COLOR_LIGHTNESS.map(function (l) {
			// i grigi restano grigi; nei toni molto chiari o molto scuri l'intensità si attenua un poco
			var s = hsl.s < 0.08 ? 0 : clamp(hsl.s * (l > 85 || l < 20 ? 0.85 : 1), 0, 1);
			return rgbToHex(hslToRgb(hsl.h, s, l / 100));
		});
	}

	/* leggibilità (WCAG): rapporto di contrasto tra due colori */
	function luminance(c) {
		return ['r', 'g', 'b'].map(function (k) {
			var v = c[k] / 255;
			return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
		}).reduce(function (a, v, i) {
			return a + v * [0.2126, 0.7152, 0.0722][i];
		}, 0);
	}

	function contrast(a, b) {
		var la = luminance(a), lb = luminance(b);
		return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
	}

	function cssColorToRgb(css) {
		var m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/.exec(css || '');
		if (!m || (m[4] !== undefined && parseFloat(m[4]) === 0)) {
			return null;
		}
		return {r: +m[1], g: +m[2], b: +m[3]};
	}

	/* sfondo su cui si leggerà il messaggio: quello dei post, se si trova, altrimenti quello dell'area di testo */
	function postBackground() {
		var probes = [document.querySelector('.post .postbody'), document.querySelector('.post'), ta];
		for (var i = 0; i < probes.length; i++) {
			var n = probes[i];
			while (n && n !== document.documentElement) {
				var c = cssColorToRgb(getComputedStyle(n).backgroundColor);
				if (c) {
					return c;
				}
				n = n.parentElement;
			}
		}
		return {r: 255, g: 255, b: 255};
	}

	/* il pulsante del colore (phpBB e ABBC3) apre il nuovo pannello */
	function setupColor() {
		if (!F.color) {
			return;
		}
		var original = window.change_palette;
		window.change_palette = function () {
			var pal = document.getElementById('colour_palette');
			if (pal) {
				pal.style.display = 'none';
			}
			openColor();
		};
		window.change_palette.epColor = true;
		window.change_palette.original = original;
	}


	/* ------------------------------------------------------------------ */
	/* 1.0.33: allegati nell'anteprima dal vivo                            */
	/* Il server disegna [attachment=N] solo con il nome del file: qui lo  */
	/* si collega all'allegato N dell'elenco di phpBB (modulo della pagina)*/
	/* e si mostra un riquadro con la miniatura (o l'icona) e il nome.     */
	/* ------------------------------------------------------------------ */

	var ATT_IMAGE = /\.(jpe?g|png|gif|webp|bmp|avif|svg)$/i;
	var ATT_ICONS = [
		[/\.pdf$/i, 'fa-file-pdf-o'], [/\.(zip|rar|7z|gz|tar|bz2|xz)$/i, 'fa-file-archive-o'],
		[/\.(mp3|ogg|wav|flac|m4a)$/i, 'fa-file-audio-o'], [/\.(mp4|webm|mkv|avi|mov)$/i, 'fa-file-video-o'],
		[/\.(docx?|odt|rtf)$/i, 'fa-file-word-o'], [/\.(xlsx?|ods|csv)$/i, 'fa-file-excel-o'],
		[/\.(pptx?|odp)$/i, 'fa-file-powerpoint-o'], [/\.(txt|md|log|nfo)$/i, 'fa-file-text-o'],
		[/\.(torrent)$/i, 'fa-magnet']
	];

	/* l'allegato N del modulo: identificativo, nome, dimensione */
	function attachmentData(index) {
		if (!form) {
			return null;
		}
		var get = function (field) {
			var i = form.querySelector('input[name="attachment_data[' + index + '][' + field + ']"]');
			return i ? i.value : '';
		};
		var id = get('attach_id');
		return id ? {id: id, name: get('real_filename'), size: parseInt(get('filesize'), 10) || 0, comment: get('attach_comment')} : null;
	}

	/* identificativi degli allegati del modulo (per sapere dal server quali hanno la miniatura) */
	function attachmentIds() {
		if (!form) {
			return [];
		}
		return Array.prototype.map.call(form.querySelectorAll('input[name$="[attach_id]"]'), function (i) {
			return i.value;
		}).filter(Boolean);
	}

	function attachmentUrl(id, thumb) {
		return (cfg.rootPath || './') + 'download/file.php?' + (thumb ? 't=1&' : 'mode=view&') + 'id=' + encodeURIComponent(id);
	}

	function fileSize(n) {
		if (!n) {
			return '';
		}
		var s = n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : (n >= 1024 ? Math.round(n / 1024) + ' KB' : n + ' B');
		return lang('EP_CALC_DECIMAL') === ',' ? s.replace('.', ',') : s;
	}

	/* l'elemento accanto (prima o dopo), saltando spazi e a capo: è un altro allegato? */
	function attachmentNeighbour(box, dir) {
		for (var n = box[dir]; n; n = n[dir]) {
			if ((n.nodeType === 3 && !n.nodeValue.trim()) || n.nodeName === 'BR' || n.nodeType === 8) {
				continue;
			}
			return n.nodeType === 1 && n.classList.contains('inline-attachment');
		}
		return false;
	}

	function renderAttachments(root, info) {
		info = info || {};
		// Allegati vicini (separati solo da spazi o a capo) raccolti in una galleria: un blocco a sé,
		// dentro il quale si affiancano; il testo prima e dopo resta sopra e sotto.
		// Un allegato da solo va sotto il testo, su una riga sua.
		Array.prototype.forEach.call(root.querySelectorAll('.inline-attachment'), function (box) {
			if (!box.parentNode || box.parentNode.classList.contains('ep-att-gallery') || !attachmentNeighbour(box, 'nextSibling')) {
				return;
			}
			var gallery = document.createElement('div');
			gallery.className = 'ep-att-gallery';
			box.parentNode.insertBefore(gallery, box);
			var n = box;
			while (n) {
				var next = n.nextSibling;
				if (n.nodeType === 1 && n.classList.contains('inline-attachment')) {
					gallery.appendChild(n);
				} else if ((n.nodeType === 3 && !n.nodeValue.trim()) || n.nodeName === 'BR' || n.nodeType === 8) {
					// spazi e a capo tra un allegato e l'altro: via; quelli dopo l'ultimo restano al loro posto
					if (!attachmentNeighbour(n, 'nextSibling') && !(next && next.nodeType === 1 && next.classList.contains('inline-attachment'))) {
						break;
					}
					n.parentNode.removeChild(n);
				} else {
					break;
				}
				n = next;
			}
		});
		Array.prototype.forEach.call(root.querySelectorAll('.inline-attachment:not(.ep-att-done)'), function (box) {
			var index = null;
			for (var n = box.firstChild; n; n = n.nextSibling) {
				var m = n.nodeType === 8 ? /ia(\d+)/.exec(n.nodeValue) : null;
				if (m) {
					index = m[1];
					break;
				}
			}
			box.classList.add('ep-att-done');
			var shown = box.textContent.trim();
			var att = index === null ? null : attachmentData(index);
			var card = el('figure', {className: 'ep-att-card'});
			if (!att) {
				card.classList.add('ep-att-missing');
				card.appendChild(el('span', {className: 'ep-att-icon'}, [el('i', {className: 'fa fa-chain-broken', 'aria-hidden': 'true'})]));
				card.appendChild(el('figcaption', {}, [el('strong', {text: shown}), el('small', {text: lang('EP_ATT_MISSING')})]));
			} else {
				var link = el('a', {href: attachmentUrl(att.id, false), target: '_blank', rel: 'noopener', title: att.name, className: 'ep-att-media'});
				if (ATT_IMAGE.test(att.name)) {
					// la miniatura di phpBB se esiste (leggera), altrimenti l'immagine vera rimpicciolita
					var thumb = !!(info[att.id] && info[att.id].thumb);
					var img = el('img', {alt: att.name, loading: 'lazy', src: attachmentUrl(att.id, thumb)});
					if (!thumb) {
						img.setAttribute('data-full', '1');
					}
					img.addEventListener('error', function () {
						if (!img.getAttribute('data-full')) {
							img.setAttribute('data-full', '1');
							img.src = attachmentUrl(att.id, false);
						} else {
							card.classList.add('ep-att-noimg');
						}
					});
					link.appendChild(img);
				} else {
					var icon = 'fa-file-o';
					ATT_ICONS.some(function (r) {
						if (r[0].test(att.name)) {
							icon = r[1];
							return true;
						}
						return false;
					});
					link.classList.add('ep-att-file');
					link.appendChild(el('i', {className: 'fa ' + icon, 'aria-hidden': 'true'}));
				}
				card.appendChild(link);
				var caption = el('figcaption', {}, [el('strong', {text: att.name})]);
				var extra = [fileSize(att.size), att.comment].filter(Boolean).join(' · ');
				if (extra) {
					caption.appendChild(el('small', {text: extra}));
				}
				card.appendChild(caption);
			}
			box.textContent = '';
			box.appendChild(card);
		});
	}


	function openSyntax() {
		synDlg = synDlg || buildSyntaxDialog();
		// testo selezionato nell'area di testo: si parte da quello
		var selected = (typeof wy !== 'undefined' && wy.on) ? '' : ta.value.slice(ta.selectionStart, ta.selectionEnd);
		synDlg.area.value = selected || '';
		synDlg.refreshFormat();
		synDlg.dialog.onOpen = function () {
			synDlg.area.focus();
			synDlg.preview();
		};
		showDialog(synDlg.dialog);
	}

	/* ------------------------------------------------------------------ */
	/* 1.0.24: tutti i menu a tendina della barra con lo stile di Editor   */
	/* Plus (es. la dimensione di phpBB, o menu aggiunti da altre           */
	/* estensioni, anche in seguito). Cambia solo l'aspetto, non il         */
	/* funzionamento.                                                       */
	/* ------------------------------------------------------------------ */

	function skinSelect(sel) {
		if (sel && sel.tagName === 'SELECT' && !sel.classList.contains('abbc3_select') && !sel.multiple && !(sel.size > 1)) {
			sel.classList.add('abbc3_select', 'ep-skin-select');
		}
	}

	function setupSelectSkin() {
		Array.prototype.forEach.call(bar.querySelectorAll('select'), skinSelect);
		if (window.MutationObserver) {
			new MutationObserver(function (list) {
				list.forEach(function (m) {
					Array.prototype.forEach.call(m.addedNodes, function (n) {
						if (n.nodeType !== 1) {
							return;
						}
						if (n.tagName === 'SELECT') {
							skinSelect(n);
						} else {
							Array.prototype.forEach.call(n.querySelectorAll('select'), skinSelect);
						}
					});
				});
			}).observe(bar, {childList: true, subtree: true});
		}
	}

	/* ------------------------------------------------------------------ */
	/* Fase 4: schermo intero                                              */
	/* ------------------------------------------------------------------ */

	var fs = null;

	function topChild(ancestor, node) {
		while (node && node.parentNode !== ancestor) {
			node = node.parentNode;
		}
		return node;
	}

	function toggleFullscreen() {
		if (fs) {
			fs.parts.forEach(function (p) {
				p.holder.parentNode.replaceChild(p.node, p.holder);
			});
			fs.overlay.parentNode.removeChild(fs.overlay);
			document.documentElement.classList.remove('ep-fs-open');
			ta.style.height = fs.height;
			fs = null;
			fsBtn.title = lang('EP_FULLSCREEN');
			fsBtn.querySelector('i').className = 'fa fa-fw fa-arrows-alt';
			autogrow();
			ta.focus();
			return;
		}

		// Antenato comune più vicino tra barra e area di testo
		var common = bar.parentNode;
		while (common && !common.contains(ta)) {
			common = common.parentNode;
		}
		if (!common) {
			return;
		}
		var nodes = [];
		var a = topChild(common, bar), b = topChild(common, ta);
		for (var n = a; n; n = n.nextElementSibling) {
			nodes.push(n);
			if (n === b) {
				break;
			}
		}

		var overlay = el('div', {className: 'ep-fs'});
		var inner = el('div', {className: 'ep-fs-inner'});
		overlay.appendChild(inner);
		var parts = nodes.map(function (node) {
			var holder = document.createComment('editorplus');
			node.parentNode.replaceChild(holder, node);
			inner.appendChild(node);
			return {node: node, holder: holder};
		});
		document.body.appendChild(overlay);
		document.documentElement.classList.add('ep-fs-open');
		fs = {overlay: overlay, parts: parts, height: ta.style.height};
		ta.style.height = '';
		fsBtn.title = lang('EP_FULLSCREEN_EXIT');
		fsBtn.querySelector('i').className = 'fa fa-fw fa-compress';
		ta.focus();
	}

	/* ------------------------------------------------------------------ */
	/* Fase 4: contatore, area che si allarga, barra di stato              */
	/* ------------------------------------------------------------------ */

	var status = null, counter = null, draftInfo = null, minHeight = 0;

	function setupStatus() {
		if (!F.counter && !F.autosave && !F.shortcuts && !postInfo) {
			return;
		}
		counter = el('span', {className: 'ep-counter'});
		draftInfo = el('span', {className: 'ep-draft-info', 'aria-live': 'polite'});
		var help = F.shortcuts ? el('span', {className: 'ep-help', title: lang('EP_SHORTCUTS'), tabindex: '0'}, [el('i', {className: 'fa fa-keyboard-o', 'aria-hidden': 'true'})]) : null;
		var info = postInfo ? el('span', {className: 'ep-help ep-post-info', title: lang('EP_POST_INFO') + ':\n' + postInfo, tabindex: '0'}, [el('i', {className: 'fa fa-info-circle', 'aria-hidden': 'true'})]) : null;
		status = el('div', {className: 'ep-status'}, [counter, el('span', {className: 'ep-status-right'}, [draftInfo, info, help])]);
		ta.parentNode.insertBefore(status, ta.nextSibling);
	}

	/*
	 * 1.0.37: lunghezza contata ESATTAMENTE come phpBB (message_parser, modalità "post"): testo con i BBCode,
	 * a capo uniformati e spazi esterni tolti, dopo la trasformazione di & < > " in entità HTML
	 * (un & vale 5 caratteri), contando le lettere vere (un'emoji vale 1).
	 */
	function phpbbLength(text) {
		var t = String(text).replace(/\r\n?/g, '\n').trim();
		var n = Array.from ? Array.from(t).length : t.length;
		var extra = {'&': 4, '<': 3, '>': 3, '"': 5};
		for (var i = 0; i < t.length; i++) {
			if (extra[t[i]]) {
				n += extra[t[i]];
			}
		}
		return n;
	}

	function groupDigits(n) {
		var sep = lang('EP_CALC_DECIMAL') === ',' ? '.' : ',';
		return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
	}

	var counterLimit = null;

	function updateCounter() {
		if (!F.counter || !counter) {
			return;
		}
		var text = ta.value;
		var chars = Array.from ? Array.from(text).length : text.length;
		var words = text.trim() ? text.trim().split(/\s+/).length : 0;
		counter.textContent = groupDigits(chars) + ' ' + lang('EP_CHARS') + ' · ' + words + ' ' + lang('EP_WORDS');
		var max = cfg.maxChars || 0;
		if (!counterLimit) {
			counterLimit = el('span', {className: 'ep-limit', 'aria-live': 'polite'});
			counter.parentNode.insertBefore(counterLimit, counter.nextSibling);
		}
		var used = max ? phpbbLength(text) : 0;
		var state = !max ? '' : (used > max ? 'over' : (used >= max * 0.9 ? 'near' : ''));
		counter.classList.toggle('ep-over', state === 'over');
		counterLimit.className = 'ep-limit' + (state ? ' ep-limit-' + state : '');
		counterLimit.textContent = state === 'over' ? lang('EP_LIMIT_OVER').replace('%1$s', groupDigits(used - max)).replace('%2$s', groupDigits(max))
			: (state === 'near' ? lang('EP_LIMIT_NEAR').replace('%1$s', groupDigits(max - used)).replace('%2$s', groupDigits(max)) : '');
		counter.title = max ? lang('EP_LIMIT_TITLE').replace('%1$s', groupDigits(used)).replace('%2$s', groupDigits(max)) : '';
	}

	/* all'invio, se il messaggio supera il limite: avviso subito (phpBB lo rifiuterebbe) */
	function overLimit() {
		var max = cfg.maxChars || 0;
		return max && phpbbLength(ta.value) > max ? phpbbLength(ta.value) - max : 0;
	}

	/*
	 * Invio o anteprima di un messaggio oltre il limite: si ferma prima (phpBB lo rifiuterebbe comunque)
	 * e la bozza resta. Registrato in fase di cattura: gira prima di chi cancella la bozza all'invio.
	 */
	function setupLimitGuard() {
		if (!form || !(cfg.maxChars > 0)) {
			return;
		}
		var clicked = null;
		form.addEventListener('click', function (e) {
			var b = e.target.closest && e.target.closest('input[type="submit"], button[type="submit"]');
			if (b) {
				clicked = b.getAttribute('name');
			}
		}, true);
		form.addEventListener('submit', function (e) {
			var name = (e.submitter && e.submitter.getAttribute('name')) || clicked;
			var over = overLimit();
			if ((name === 'post' || name === 'preview') && over) {
				e.preventDefault();
				e.stopImmediatePropagation();
				updateCounter();
				toast(lang('EP_LIMIT_BLOCK').replace('%1$s', groupDigits(over)).replace('%2$s', groupDigits(cfg.maxChars)), 'error');
				ta.focus();
			}
		}, true);
	}

	/*
	 * phpBB ha un suo ridimensionamento dell'area di testo (phpbb.resizeTextArea, massimo 500 px) legato a
	 * focus/change/keyup e al ridimensionamento della finestra: riporterebbe l'altezza a 500 px appena si
	 * smette di scrivere. Editor Plus ricalcola la sua altezza subito DOPO phpBB, sugli stessi eventi.
	 */
	function setupAutogrowGuard() {
		if (!F.autogrow) {
			return;
		}
		// prima del prossimo ridisegno della pagina: nessun "tremolio" tra l'altezza di phpBB e la nostra
		var after = function () {
			(window.requestAnimationFrame || setTimeout)(autogrow);
		};
		['focus', 'change', 'keyup'].forEach(function (ev) {
			ta.addEventListener(ev, after);
		});
		window.addEventListener('resize', after);

		// si stacca il ridimensionamento di phpBB solo da quest'area di testo: un solo sistema decide l'altezza
		var $ = window.jQuery;
		var drop = function () {
			if (!$ || !$._data) {
				return;
			}
			var events = $._data(ta, 'events') || {};
			['focus', 'change', 'keyup'].forEach(function (type) {
				(events[type] || []).slice().forEach(function (h) {
					if (/autoResize/.test(String(h.handler))) {
						$(ta).off(type, h.handler);
					}
				});
			});
			ta.classList.remove('auto-resized');
			autogrow();
		};
		if ($) {
			$(ta).on('change', after);
			$(function () {
				setTimeout(drop, 0);
			});
		}
	}

	function autogrow() {
		if (!F.autogrow || fs || (typeof wy !== 'undefined' && wy.on)) {
			return;
		}
		if (!minHeight) {
			minHeight = ta.offsetHeight || 200;
		}
		var scrollY = window.pageYOffset;
		ta.style.height = 'auto';
		var target = Math.min(Math.max(ta.scrollHeight + 4, minHeight), Math.round(window.innerHeight * 0.75));
		ta.style.height = target + 'px';
		window.scrollTo(window.pageXOffset, scrollY);
	}

	/* ------------------------------------------------------------------ */
	/* Fase 4: salvataggio automatico della bozza                          */
	/* ------------------------------------------------------------------ */

	var DRAFT_PREFIX = 'editorplus:draft:';
	var draftKey = null, draftTimer = null;

	function computeDraftKey() {
		var params = {};
		function collect(url) {
			try {
				var u = new URL(url, window.location.href);
				['mode', 'f', 't', 'p', 'i', 'action', 'u'].forEach(function (k) {
					if (u.searchParams.get(k) && !params[k]) {
						params[k] = u.searchParams.get(k);
					}
				});
				return u.pathname.split('/').pop() || 'index.php';
			} catch (e) {
				return '';
			}
		}
		var page = collect(window.location.href);
		if (form && form.getAttribute('action')) {
			collect(form.getAttribute('action'));
		}
		if (!params.t && form && form.elements.topic_id) {
			params.t = form.elements.topic_id.value;
		}
		var key = Object.keys(params).sort().map(function (k) {
			return k + '=' + params[k];
		}).join('&');
		return DRAFT_PREFIX + (cfg.userId || 0) + ':' + page + '?' + key;
	}

	function subjectInput() {
		return form ? form.querySelector('input[name="subject"]') : null;
	}

	/* Bozze sul server (utenti registrati): si ritrovano da qualsiasi indirizzo, browser o dispositivo.
	   La memoria del browser resta come riserva (e per gli ospiti). */
	function serverDrafts() {
		return !!(cfg.draftUrl && !cfg.isGuest && window.fetch && window.FormData);
	}

	function serverKey() {
		return draftKey ? draftKey.slice(draftKey.indexOf(':', DRAFT_PREFIX.length) + 1).slice(0, 100) : '';
	}

	function draftRequest(action, extra) {
		var fd = new FormData();
		fd.append('hash', cfg.draftHash || '');
		fd.append('action', action);
		fd.append('key', serverKey());
		Object.keys(extra || {}).forEach(function (k) {
			// testo e titolo codificati: il database e i firewall del server non vedono emoji né HTML
			if (k === 'message' || k === 'subject' || k === 'attachments') {
				fd.append(k + '_b64', toB64(extra[k]));
			} else {
				fd.append(k, extra[k]);
			}
		});
		return fetch(cfg.draftUrl, {method: 'POST', body: fd, credentials: 'same-origin', keepalive: action !== 'load', headers: {'X-Requested-With': 'XMLHttpRequest'}})
			.then(function (r) {
				return r.ok ? r.json() : Promise.reject(r.status);
			});
	}


	/* ---------------- 1.0.34: allegati nelle bozze ---------------- */

	/* allegati del modulo, nell'ordine di phpBB (indice N di [attachment=N]): identificativo e commento */
	function draftAttachments() {
		if (!form) {
			return [];
		}
		var out = [];
		Array.prototype.forEach.call(form.querySelectorAll('input[name$="[attach_id]"]'), function (input) {
			var m = /attachment_data\[(\d+)\]/.exec(input.name);
			if (!m || !input.value) {
				return;
			}
			var comment = form.querySelector('textarea[name="comment_list[' + m[1] + ']"]') ||
				form.querySelector('input[name="attachment_data[' + m[1] + '][attach_comment]"]');
			out[parseInt(m[1], 10)] = {id: parseInt(input.value, 10), c: comment ? comment.value : ''};
		});
		return out.filter(Boolean);
	}

	/*
	 * Ripristino della bozza: gli allegati (verificati dal server: esistono, sono dell'utente, non ancora
	 * assegnati a un messaggio) rientrano nell'elenco di phpBB come se fossero appena stati caricati.
	 * I [attachment=N] del testo vengono rinumerati se nella pagina c'erano già altri allegati.
	 */
	function restoreDraftAttachments(saved) {
		if (!saved || !saved.length || !serverDrafts()) {
			return Promise.resolve({restored: 0, missing: 0});
		}
		return draftRequest('attachments', {attachments: JSON.stringify(saved)}).then(function (res) {
			var valid = (res && res.attachments) || [];
			var pl = window.phpbb && window.phpbb.plupload;
			var hasUploader = !!(pl && pl.rowTpl && window.jQuery && document.getElementById('file-list'));
			var current = hasUploader ? (pl.data || []).slice() : draftAttachments().map(function (a) {
				return {attach_id: a.id};
			});
			var known = current.map(function (a) {
				return Number(a.attach_id);
			});
			var added = valid.filter(function (a) {
				return known.indexOf(Number(a.attach_id)) === -1;
			});
			var finalList = current.concat(added);
			var newIndex = function (id) {
				for (var i = 0; i < finalList.length; i++) {
					if (Number(finalList[i].attach_id) === Number(id)) {
						return i;
					}
				}
				return -1;
			};

			// [attachment=N] del testo: N era la posizione nella bozza, ora è quella nell'elenco attuale
			var renumbered = ta.value.replace(/\[attachment=(\d+)\]/g, function (all, n) {
				var old = saved[parseInt(n, 10)];
				var idx = old ? newIndex(old.id) : -1;
				return idx === -1 ? all : '[attachment=' + idx + ']';
			});
			if (renumbered !== ta.value) {
				ta.value = renumbered;
			}

			if (added.length) {
				if (hasUploader) {
					var $ = window.jQuery;
					added.forEach(function (a) {
						var row = $(pl.rowTpl);
						// niente id: come le righe degli allegati già presenti nella pagina (phpBB, eliminando,
						// cerca nella coda di caricamento solo le righe con un id)
						row.removeAttr('id').attr('data-attach-id', a.attach_id);
						row.find('.file-name').text(a.real_filename);
						row.find('.file-size').text(window.plupload ? window.plupload.formatSize(a.filesize) : fileSize(a.filesize));
						row.find('.file-inline-bbcode').show();
						row.find('.file-status').addClass('file-uploaded');
						row.find('.file-progress').hide();
						$('#file-list').append(row);
					});
					pl.setData(finalList);
					pl.updateRows(finalList.map(function (a) {
						return (cfg.rootPath || './') + 'download/file.php?mode=view&id=' + a.attach_id;
					}));
					added.forEach(function (a) {
						var i = newIndex(a.attach_id);
						$('[data-attach-id="' + a.attach_id + '"] textarea').val(a.attach_comment || '');
						return i;
					});
					pl.clearParams();
					pl.updateMultipartParams(pl.getSerializedData());
					$('#file-list-container').show();
				} else if (form) {
					// pagina senza caricamento (es. risposta rapida): campi nascosti, così all'invio non si perdono
					added.forEach(function (a) {
						var i = newIndex(a.attach_id);
						['attach_id', 'is_orphan', 'real_filename', 'attach_comment', 'filesize'].forEach(function (k) {
							form.appendChild(el('input', {type: 'hidden', name: 'attachment_data[' + i + '][' + k + ']', value: String(a[k])}));
						});
					});
				}
			}
			return {restored: added.length, missing: (res && res.missing) || 0};
		}).catch(function () {
			return {restored: 0, missing: saved.length, failed: true};
		});
	}

	/* caricare o eliminare un allegato cambia la bozza anche se il testo resta uguale */
	function watchAttachmentList() {
		var list = document.getElementById('file-list');
		if (!list || !window.MutationObserver || typeof scheduleDraft !== 'function') {
			return;
		}
		var last = JSON.stringify(draftAttachments());
		new MutationObserver(function () {
			var now = JSON.stringify(draftAttachments());
			if (now !== last) {
				last = now;
				scheduleDraft();
			}
		}).observe(list, {childList: true, subtree: true, attributes: true, attributeFilter: ['value']});
	}

	var draftInfoHold = 0;

	function draftInfoText(state) {
		// un messaggio importante (es. allegati ripristinati) resta leggibile qualche secondo
		if (!draftInfo || Date.now() < draftInfoHold) {
			return;
		}
		var d = new Date();
		var hm = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
		draftInfo.classList.toggle('ep-draft-warn', state === 'none');
		draftInfo.textContent = state === 'none' ? lang('EP_DRAFT_NOT_SAVED') : format(lang(state === 'local' ? 'EP_DRAFT_SAVED_LOCAL' : 'EP_DRAFT_SAVED'), hm);
	}

	function removeDraft() {
		storeRemove(draftKey);
		if (serverDrafts() && draftKey) {
			draftRequest('delete').catch(function () {});
		}
	}

	function saveDraft(manual) {
		if (!F.autosave || !storage || !draftKey) {
			return;
		}
		clearTimeout(draftTimer);
		draftTimer = null;
		var value = ta.value;
		if (!value.trim() || value === initialValue) {
			removeDraft();
			if (manual && draftInfo) {
				draftInfo.textContent = '';
			}
			return;
		}
		var subj = subjectInput();
		var atts = draftAttachments();
		var localOk = storeSet(draftKey, {m: value, s: subj ? subj.value : '', a: atts, t: Date.now()});
		if (!serverDrafts()) {
			draftInfoText(localOk ? 'server' : 'none');
			return;
		}
		// "Bozza salvata" solo quando il server conferma; altrimenti si dice dove è stata salvata davvero
		draftRequest('save', {message: value, subject: subj ? subj.value : '', attachments: JSON.stringify(atts)}).then(function (res) {
			draftInfoText(res && res.saved ? 'server' : (localOk ? 'local' : 'none'));
		}).catch(function () {
			draftInfoText(localOk ? 'local' : 'none');
		});
	}

	function scheduleDraft() {
		if (!F.autosave || !storage) {
			return;
		}
		clearTimeout(draftTimer);
		draftTimer = setTimeout(function () {
			saveDraft(false);
		}, 1500);
	}

	function cleanOldDrafts() {
		var limit = Date.now() - (cfg.autosaveDays || 7) * 86400000;
		for (var i = storage.length - 1; i >= 0; i--) {
			var k = storage.key(i);
			if (k && k.indexOf(DRAFT_PREFIX) === 0) {
				var d = storeGet(k, null);
				if (!d || !d.t || d.t < limit) {
					storeRemove(k);
				}
			}
		}
	}

	function setupAutosave() {
		if (!F.autosave || !storage) {
			return;
		}
		cleanOldDrafts();
		draftKey = computeDraftKey();

		function offerDraft(draft) {
			if (draft && draft.m && draft.m !== ta.value && draft.m.trim() && !bar.parentNode.querySelector('.ep-draft-banner')) {
				var when = new Date(draft.t);
				var restore = el('button', {type: 'button', className: 'ep-btn ep-restore'}, [lang('EP_DRAFT_RESTORE')]);
				var discard = el('button', {type: 'button', className: 'ep-btn ep-btn-light ep-discard'}, [lang('EP_DRAFT_DISCARD')]);
				var banner = el('div', {className: 'ep-draft-banner', role: 'status'}, [
					el('i', {className: 'fa fa-history', 'aria-hidden': 'true'}),
					el('span', {text: format(lang('EP_DRAFT_FOUND'), when.toLocaleString())}),
					restore, discard
				]);
				// sopra la riga informativa, così riga e barra restano unite
				var bannerAt = bar.previousElementSibling && bar.previousElementSibling.classList.contains('ep-info') ? bar.previousElementSibling : bar;
				bar.parentNode.insertBefore(banner, bannerAt);

				restore.addEventListener('click', function () {
					flushTyping();
					ta.value = draft.m;
					var subj = subjectInput();
					if (subj && draft.s && !subj.value) {
						subj.value = draft.s;
					}
					banner.parentNode.removeChild(banner);
					if (draftInfo) {
						draftInfo.textContent = lang('EP_DRAFT_RESTORED');
					}
					restoreDraftAttachments(draft.a).then(function (r) {
						snapshot();
						changed();
						if (draftInfo && (r.restored || r.missing)) {
							var parts = [lang('EP_DRAFT_RESTORED')];
							if (r.restored) {
								parts.push(format(lang('EP_DRAFT_ATT_RESTORED'), r.restored));
							}
							if (r.missing) {
								parts.push(format(lang('EP_DRAFT_ATT_MISSING'), r.missing));
							}
							draftInfo.textContent = parts.join(' · ');
							draftInfo.classList.toggle('ep-draft-warn', !!r.missing);
							draftInfoHold = Date.now() + 6000;
						}
					});
					focusEnd();
				});
				discard.addEventListener('click', function () {
					removeDraft();
					banner.parentNode.removeChild(banner);
					ta.focus();
				});
			}
		}

		var localDraft = storeGet(draftKey, null);
		if (serverDrafts()) {
			draftRequest('load').then(function (res) {
				var remote = res && res.draft;
				var best = !localDraft ? remote : (!remote ? localDraft : (remote.t >= localDraft.t ? remote : localDraft));
				offerDraft(best);
			}).catch(function () {
				offerDraft(localDraft);
			});
		} else {
			offerDraft(localDraft);
		}

		safely('allegati nella bozza', watchAttachmentList);
		var subj = subjectInput();
		if (subj) {
			subj.addEventListener('input', scheduleDraft);
		}

		// Il messaggio è stato inviato: la bozza non serve più
		var submitter = null;
		if (form) {
			form.addEventListener('click', function (e) {
				var b = e.target.closest('input[type="submit"], button[type="submit"]');
				if (b) {
					submitter = b.getAttribute('name');
				}
			}, true);
			form.addEventListener('submit', function (e) {
				var name = (e.submitter && e.submitter.getAttribute('name')) || submitter;
				if (name === 'post') {
					removeDraft();
					clearTimeout(draftTimer);
					draftTimer = null;
					draftKey = null;
				} else {
					saveDraft(false);
				}
			});
		}
		window.addEventListener('pagehide', function () {
			if (draftTimer) {
				saveDraft(false);
			}
		});
	}

	/* ------------------------------------------------------------------ */
	/* Fase 4: scorciatoie da tastiera                                     */
	/* ------------------------------------------------------------------ */

	function clickButton(selector) {
		var b = bar.querySelector(selector);
		if (b) {
			b.click();
			return true;
		}
		return false;
	}

	function setupKeys() {
		ta.addEventListener('keydown', function (e) {
			var mod = isMac() ? e.metaKey : e.ctrlKey;
			if (!mod || e.altKey) {
				return;
			}
			var key = (e.key || '').toLowerCase();

			if (F.undo && key === 'z' && !e.shiftKey) {
				e.preventDefault();
				undo();
				return;
			}
			if (F.undo && (key === 'y' || (key === 'z' && e.shiftKey))) {
				e.preventDefault();
				redo();
				return;
			}
			if (F.search_replace && e.shiftKey && key === 'f') {
				e.preventDefault();
				toggleSearch();
				return;
			}
			if (!F.shortcuts || e.shiftKey) {
				return;
			}
			switch (key) {
				case 'b':
					e.preventDefault();
					clickButton('[name="addbbcode0"]') || wrap('[b]', '[/b]');
					break;
				case 'i':
					e.preventDefault();
					clickButton('[name="addbbcode2"]') || wrap('[i]', '[/i]');
					break;
				case 'u':
					e.preventDefault();
					clickButton('[name="addbbcode4"]') || wrap('[u]', '[/u]');
					break;
				case 'k':
					e.preventDefault();
					clickButton('[name="addbbcode16"]') || wrap('[url]', '[/url]');
					break;
				case 's':
					if (F.autosave && storage) {
						e.preventDefault();
						saveDraft(true);
					}
					break;
				case 'enter':
					if (form) {
						var post = form.querySelector('[name="post"]');
						if (post) {
							e.preventDefault();
							post.click();
						}
					}
					break;
			}
		});
	}

	document.addEventListener('keydown', function (e) {
		// con la conferma di phpBB aperta, Esc chiude solo quella
		if (e.key !== 'Escape' || document.documentElement.classList.contains('ep-confirm-open')) {
			return;
		}
		if (openDialog) {
			closeDialog();
		} else if (closePopovers()) {
			ta.focus();
		} else if (smileyPopOpen()) {
			toggleSmileyPop(false);
			smileyBtn.focus();
		} else if (openMenu) {
			var trigger = openMenu.querySelector('.ep-menu-btn');
			closeMenus();
			trigger.focus();
		} else if (fs) {
			toggleFullscreen();
		}
	});

	/* ------------------------------------------------------------------ */
	/* Avvio                                                               */
	/* ------------------------------------------------------------------ */

	// Il browser può tenere in cache il file di una versione precedente
	if (cfg.version && cfg.version !== epState.version) {
		report('versione', lang('EP_OLD_JS').replace('%1$s', epState.version).replace('%2$s', cfg.version));
	}

	if (coreBar && !cfg.hasFont) {
		// senza ABBC3 la combo dei caratteri serve solo se sul forum esiste il BBCode [font]
		F.font_select = false;
	}

	if (!epState.config) {
		report('configurazione', 'EditorPlusConfig vuota o mancante (vedi ACP > Editor Plus > Impostazioni > Diagnostica)');
	}

	safely('rilevamento delle modifiche', watchValue);
	safely('combo caratteri e dimensione', setupSelects);
	safely('pulsanti nascosti', hideButtons);
	safely('menu per categoria', buildCategories);
	safely('pulsanti strumenti', setupTools);
	safely('selettore del colore', setupColor);
	safely('limite di lunghezza', setupLimitGuard);
	safely('incolla con formattazione', setupPasteConvert);
	safely('riquadro faccine', hideSmileyBox);
	safely('barra di stato', setupStatus);
	safely('salvataggio bozza', setupAutosave);
	safely('scorciatoie', setupKeys);
	safely('annulla/ripeti', function () {
		['bbfontstyle', 'insert_text'].forEach(hookGlobal);
		watchContainer(bar);
	});
	safely('combo con anteprima', setupCombos);
	safely('immagini trascinate', setupUpload);
	safely('altezza automatica', setupAutogrowGuard);
	safely('formattazione mentre scrivi', setupLiveFormat);
	safely('editor visuale', setupWysiwyg);
	safely('menu opzioni', setupOptions);
	safely('riga informativa', setupInfo);
	safely('stile dei menu a tendina', setupSelectSkin);

	changeListeners.push(updateCounter, autogrow, scheduleDraft, function () {
		refreshLive(false);
	});
	safely('anteprima dal vivo', function () {
		if (F.live_preview && (F.live_open || storeGet('editorplus:live-open', false))) {
			toggleLive(true);
		}
	});
	safely('stato iniziale', function () {
		snapshot();
		updateCounter();
		autogrow();
		updateUndoButtons();
	});

	epState.ready = true;
	bar.setAttribute('data-ep-status', epState.errors.length ? 'errors' : 'ok');

	// Solo gli amministratori vedono un avviso nella barra se qualcosa non va
	if (epState.errors.length && cfg.isAdmin) {
		var warn = el('div', {className: 'ep-admin-warning', role: 'alert'}, [
			el('i', {className: 'fa fa-exclamation-triangle', 'aria-hidden': 'true'}),
			el('span', {text: 'Editor Plus: ' + epState.errors.join(' · ') + ' — ' + (lang('EP_ADMIN_DIAG') || '')})
		]);
		bar.parentNode.insertBefore(warn, bar);
	}
	if (window.console && console.info) {
		console.info('[Editor Plus ' + epState.version + '] avviato' + (epState.errors.length ? ' con errori: ' + epState.errors.join(' | ') : ' correttamente'));
	}

	window.EditorPlus = {
		version: '1.0.42',
		status: epState,
		visual: function () {
			return typeof wy !== 'undefined' && wy.on && !!wy.editor;
		},
		upload: function (files) {
			return uploadFiles(files, ta.selectionEnd);
		},
		preview: function (open) {
			if (F.live_preview) {
				toggleLive(open);
			}
		},
		undo: undo,
		redo: redo,
		insert: insertText,
		wrap: wrap,
		saveDraft: function () {
			saveDraft(true);
		},
		toggleFullscreen: function () {
			if (fsBtn) {
				toggleFullscreen();
			}
		}
	};
})(window, document);
