/* Editor Plus – regole BBCode di phpBB per SCEditor. Copyright (c) 2026 Salvo Cortesiano, GPL-2.0 */
/* Regole BBCode di phpBB per SCEditor (Editor Plus) */
window.EditorPlusB64 = {
	enc: function (raw) {
		return btoa(unescape(encodeURIComponent(raw))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
	},
	dec: function (enc) {
		var pad = enc.length % 4 ? '===='.slice(enc.length % 4) : '';
		return decodeURIComponent(escape(atob(enc.replace(/-/g, '+').replace(/_/g, '/') + pad)));
	}
};

/* customTags: BBCode personalizzati del forum da mostrare come blocchi con etichetta */
window.EditorPlusBBRules = function (sceditor, customTags) {
	var bb = sceditor.formats.bbcode;
	// Blocchi: nessun "a capo" aggiunto dopo la chiusura (phpBB non lo scrive)
	['quote', 'code', 'center', 'left', 'right', 'justify'].forEach(function (name) {
		var def = bb.get(name);
		if (def) {
			def.breakAfter = false;
			def.breakEnd = false;
			def.breakStart = false;
			def.breakBefore = false;
			bb.set(name, def);
		}
	});
	// Citazioni: si conservano esattamente gli attributi di phpBB ("Nome" post_id=… time=… user_id=…)
	function escAttr(v) {
		return String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
	}
	bb.set('quote', {
		tags: {blockquote: null},
		isInline: false, breakBefore: false, breakStart: false, breakEnd: false, breakAfter: false,
		quoteType: sceditor.BBCodeParser.QuoteType.never,
		html: function (token, attrs, content) {
			// l'intestazione originale arriva codificata da EditorPlusBBPrepare (il motore toglierebbe le virgolette)
			var raw = '';
			var enc = attrs.defaultattr || '';
			if (/^epq/.test(enc)) {
				try {
					var e64 = enc.slice(3);
					raw = decodeURIComponent(escape(atob(e64.replace(/-/g, '+').replace(/_/g, '/') + (e64.length % 4 ? '===='.slice(e64.length % 4) : ''))));
				} catch (e) {
					raw = '';
				}
			} else if (enc) {
				raw = '=' + enc;
			}
			var author = (raw.match(/^=\s*"([^"]*)"/) || raw.match(/^=\s*([^\s\]]+)/) || [])[1] || '';
			return '<blockquote class="ep-wy-quote" data-ep-raw="' + escAttr(raw) + '" data-ep-author="' + escAttr(author) + '">' + content + '</blockquote>';
		},
		format: function (el, content) {
			var raw = el.getAttribute('data-ep-raw');
			if (!raw) {
				return '[quote]' + content + '[/quote]';
			}
			// esce codificata: il normalizzatore del motore toglierebbe le virgolette; la decodifica EditorPlusBBClean
			return '[quote=epq' + btoa(unescape(encodeURIComponent(raw))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') + ']' + content + '[/quote]';
		}
	});
	// [url]indirizzo[/url] resta così se il testo coincide con l'indirizzo
	var url = bb.get('url');
	bb.set('url', Object.assign({}, url, {
		format: function (el, content) {
			var href = el.getAttribute('href') || '';
			if (/^mailto:/i.test(href)) {
				var addr = href.replace(/^mailto:/i, '');
				return addr === content ? '[email]' + content + '[/email]' : '[email=' + addr + ']' + content + '[/email]';
			}
			if (href === content) {
				return '[url]' + content + '[/url]';
			}
			return '[url=' + href + ']' + content + '[/url]';
		}
	}));
	// Liste come le scrive phpBB: [list] / [list=1] / [list=a] e voci [*]
	bb.set('ul', {
		tags: {ul: null},
		breakStart: true, isInline: false, skipLastLineBreak: true,
		format: '[list]{0}[/list]',
		html: '<ul>{0}</ul>'
	});
	bb.set('ol', {
		tags: {ol: null},
		breakStart: true, isInline: false, skipLastLineBreak: true,
		format: function (el, content) {
			var type = el.getAttribute('type') || '1';
			return '[list=' + type + ']' + content + '[/list]';
		},
		html: '<ol>{0}</ol>'
	});
	bb.set('list', {
		breakStart: true, isInline: false, skipLastLineBreak: true,
		html: function (token, attrs, content) {
			var type = attrs.defaultattr;
			if (!type) {
				return '<ul>' + content + '</ul>';
			}
			return '<ol type="' + type.replace(/[^1aAiI]/g, '').slice(0, 1) + '">' + content + '</ol>';
		}
	});
	bb.set('li', {
		tags: {li: null},
		isInline: false, closedBy: ['/ul', '/ol', '/list', '*', 'li'],
		format: '[*]{0}',
		html: '<li>{0}</li>'
	});
	bb.set('*', {
		isInline: false, excludeClosing: true, closedBy: ['/ul', '/ol', '/list', '*', 'li'],
		html: '<li>{0}</li>'
	});
	// BBCode personalizzati: blocco con etichetta (fatta con i CSS, non modificabile) e contenuto modificabile.
	// Parametro e nome originali viaggiano codificati negli attributi: al salvataggio escono identici.
	var B = window.EditorPlusB64;
	(customTags || []).forEach(function (tag) {
		tag = String(tag).toLowerCase();
		if (!/^[a-z0-9_-]{1,32}$/.test(tag) || bb.get(tag) && ['quote', 'url', 'email', 'img', 'code', 'list', 'size', 'color', 'b', 'i', 'u', 's'].indexOf(tag) !== -1) {
			return;
		}
		bb.set(tag, {
			tags: {span: {'data-ep-tag': [tag]}},
			isInline: true, allowsEmpty: true, quoteType: sceditor.BBCodeParser.QuoteType.never,
			html: function (token, attrs, content) {
				var enc = attrs.defaultattr || '';
				var arg = '';
				if (/^epa/.test(enc)) {
					try {
						arg = B.dec(enc.slice(3));
					} catch (e) {
						arg = '';
					}
				} else if (enc) {
					// testo non passato da EditorPlusBBPrepare: il parametro si conserva così com'è
					arg = '=' + enc;
				}
				var label = tag + (arg ? ' ' + arg.replace(/^=/, '') : '');
				return '<span class="ep-wy-bb" data-ep-tag="' + tag + '" data-ep-arg="' + B.enc(arg) + '" data-ep-label="' + label.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;') + '">' + content + '</span>';
			},
			format: function (el, content) {
				var arg = el.getAttribute('data-ep-arg') || '';
				return '[' + tag + (arg ? '=epa' + arg : '') + ']' + content + '[/' + tag + ']';
			}
		});
	});

	// Soluzione 3: BBCode personalizzato come blocco con l'aspetto reale (HTML prodotto dal forum, caricato
	// dopo). Il BBCode originale completo resta codificato nel blocco e al salvataggio esce identico.
	bb.set('epraw', {
		tags: {span: {'data-ep-raw': null}},
		isInline: true, allowsEmpty: true, quoteType: sceditor.BBCodeParser.QuoteType.never,
		html: function (token, attrs) {
			var enc = attrs.defaultattr || '';
			var raw = '';
			try {
				raw = B.dec(enc);
			} catch (e) {
				raw = '';
			}
			var tag = (raw.match(/^\[([a-z0-9_-]+)/i) || [])[1] || '';
			var esc = function (t) {
				return String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
			};
			return '<span class="ep-wy-raw" contenteditable="false" data-ep-raw="' + enc + '" data-ep-label="' + esc(tag) + '"><span class="ep-wy-raw-view">' + esc(raw) + '</span></span>';
		},
		format: function (el) {
			return '[epraw=' + (el.getAttribute('data-ep-raw') || '') + '][/epraw]';
		}
	});

	// Dimensioni: phpBB usa percentuali (100 = normale). I valori che arrivano dai BBCode restano identici;
	// quelli in px/pt/em del contenuto incollato diventano percentuali (nessun codice per il testo normale).
	var sizeDef = bb.get('size');
	bb.set('size', Object.assign({}, sizeDef, {
		format: function (el, content) {
			var attr = el.getAttribute && el.getAttribute('size');
			if (attr) {
				return '[size=' + attr + ']' + content + '[/size]';
			}
			var fs = String((el.style && el.style.fontSize) || '').trim().toLowerCase();
			var m = fs.match(/^([\d.]+)(px|pt|em|rem|%)$/);
			var px = null;
			if (m) {
				var n = parseFloat(m[1]);
				px = m[2] === 'px' ? n : m[2] === 'pt' ? n * 4 / 3 : m[2] === '%' ? n * 14 / 100 : n * 14;
			} else {
				px = {'xx-small': 9, 'x-small': 10, small: 12, medium: 14, large: 18, 'x-large': 24, 'xx-large': 32}[fs] || null;
			}
			if (!px) {
				return content;
			}
			var pct = Math.max(50, Math.min(200, Math.round(px / 14 * 100 / 5) * 5));
			return pct >= 90 && pct <= 110 ? content : '[size=' + pct + ']' + content + '[/size]';
		}
	}));

	['ul', 'ol', 'list'].forEach(function (name) {
		var def = bb.get(name);
		def.breakAfter = false;
		bb.set(name, def);
	});
};
/* Prima della conversione: gli spazi multipli diventerebbero uno solo nel browser; si alternano spazi
   normali e speciali così il loro numero resta identico al ritorno */
/* Blocchi più esterni dei BBCode personalizzati: [tag…]…[/tag] con eventuali annidamenti dello stesso tag */
window.EditorPlusRawBlocks = function (s, customTags) {
	if (!customTags || !customTags.length) {
		return [];
	}
	var names = customTags.filter(function (t) {
		return /^[a-z0-9_-]{1,32}$/i.test(t);
	}).map(function (t) {
		return t.replace(/-/g, '\\-');
	});
	if (!names.length) {
		return [];
	}
	var re = new RegExp('\\[(\\/?)(' + names.join('|') + ')(=[^\\]]*)?\\]', 'gi');
	var out = [];
	var open = null;
	var depth = 0;
	var m;
	while ((m = re.exec(s)) !== null) {
		var name = m[2].toLowerCase();
		if (!open) {
			if (m[1] !== '/') {
				open = {name: name, start: m.index};
				depth = 1;
			}
			continue;
		}
		if (name !== open.name) {
			continue;
		}
		depth += m[1] === '/' ? -1 : 1;
		if (depth === 0) {
			out.push({start: open.start, end: re.lastIndex});
			open = null;
		}
	}
	return out;
};

window.EditorPlusBBPrepare = function (s, customTags, real) {
	// [syntax] è sempre un blocco intoccabile: il codice non deve essere interpretato dall'editor visuale
	var rawTags = real ? (customTags || []).concat(['syntax', 'math', 'imath']) : ['syntax', 'math', 'imath'];
	if (rawTags.length) {
		var blocks = window.EditorPlusRawBlocks(s, rawTags);
		for (var bi = blocks.length - 1; bi >= 0; bi--) {
			var raw = s.slice(blocks[bi].start, blocks[bi].end);
			s = s.slice(0, blocks[bi].start) + '[epraw=' + window.EditorPlusB64.enc(raw) + '][/epraw]' + s.slice(blocks[bi].end);
		}
	}
	(customTags || []).forEach(function (tag) {
		var re = new RegExp('\\[' + tag + '(=[^\\]]*)\\]', 'gi');
		s = s.replace(re, function (m, raw) {
			return '[' + tag + '=epa' + window.EditorPlusB64.enc(raw) + ']';
		});
	});
	s = s.replace(/\[quote((?:=[^\]]*)?)\]/gi, function (m, raw) {
		if (!raw) {
			return m;
		}
		var b64 = btoa(unescape(encodeURIComponent(raw))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
		return '[quote=epq' + b64 + ']';
	});
	return s.replace(/ {2,}/g, function (m) {
		var out = '';
		for (var i = 0; i < m.length; i++) {
			out += i % 2 ? '\u00a0' : ' ';
		}
		return out;
	});
};
/* Pulizia finale: spazi speciali che il browser usa al posto degli spazi normali */
window.EditorPlusBBClean = function (s) {
	s = s.replace(/\[([a-z0-9_-]+)=epa([A-Za-z0-9_-]*)\]/gi, function (m, tag, enc) {
		try {
			return '[' + tag + window.EditorPlusB64.dec(enc) + ']';
		} catch (e) {
			return m;
		}
	});
	s = s.replace(/\[quote=epq([A-Za-z0-9_-]*)\]/g, function (m, enc) {
		try {
			var pad = enc.length % 4 ? '===='.slice(enc.length % 4) : '';
			return '[quote' + decodeURIComponent(escape(atob(enc.replace(/-/g, '+').replace(/_/g, '/') + pad))) + ']';
		} catch (e) {
			return m;
		}
	});
	s = s.replace(/\u00a0/g, ' ').replace(/\u200b/g, '');
	return s.replace(/\[epraw=([A-Za-z0-9_-]*)\]\[\/epraw\]/g, function (m, enc) {
		try {
			return window.EditorPlusB64.dec(enc);
		} catch (e) {
			return m;
		}
	});
};

/*
 * Pulizia del contenuto incollato nell'editor visuale (da pagine web, Word, Google Documenti, mail),
 * prima che diventi BBCode:
 * - Google Documenti avvolge tutto in <b style="font-weight:normal">: lo si toglie (altrimenti tutto grassetto);
 * - Word: commenti condizionali, <o:p>, puntini finti degli elenchi, stili mso-*; gli elenchi Word diventano elenchi veri;
 * - caratteri (font-family) tolti: il testo prende il carattere del forum;
 * - titoli (h1-h6) -> grassetto (h1/h2 anche più grande);
 * - tabelle -> una riga per ogni riga della tabella, celle separate da " | " (phpBB non ha BBCode per le tabelle);
 * - immagini solo con indirizzo http/https.
 */
window.EditorPlusCleanPaste = function (html) {
	if (!html || typeof DOMParser === 'undefined') {
		return html;
	}
	html = html
		.replace(/<!\[if !supportLists\]>[\s\S]*?<!\[endif\]>/gi, '')
		.replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '')
		.replace(/<\/?o:p[^>]*>/gi, '');
	var doc = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');
	var body = doc.body;
	var each = function (sel, fn) {
		Array.prototype.slice.call(body.querySelectorAll(sel)).forEach(fn);
	};
	var unwrap = function (node) {
		while (node.firstChild) {
			node.parentNode.insertBefore(node.firstChild, node);
		}
		node.parentNode.removeChild(node);
	};

	each('style, meta, link, title, script, noscript', function (n) {
		n.parentNode.removeChild(n);
	});
	// Google Documenti
	each('b[id^="docs-internal-guid"]', unwrap);
	// Word: puntini finti degli elenchi
	each('span[style*="mso-list:Ignore"], span[style*="mso-list: Ignore"]', function (n) {
		n.parentNode.removeChild(n);
	});
	each('span', function (n) {
		var ff = (n.style && n.style.fontFamily || '').toLowerCase();
		if (/symbol|wingdings/.test(ff) && /^[\s\u00b7\u2022\u00a7o\u00a0-]*$/.test(n.textContent)) {
			n.parentNode.removeChild(n);
		}
	});
	// Word: paragrafi di elenco -> elenco vero
	var items = Array.prototype.slice.call(body.querySelectorAll('p[class^="MsoListParagraph"], p[style*="mso-list"]'));
	items.forEach(function (p) {
		var prev = p.previousElementSibling;
		var list = prev && prev.tagName === 'UL' && prev.getAttribute('data-ep-word') ? prev : null;
		if (!list) {
			list = doc.createElement('ul');
			list.setAttribute('data-ep-word', '1');
			p.parentNode.insertBefore(list, p);
		}
		var li = doc.createElement('li');
		while (p.firstChild) {
			li.appendChild(p.firstChild);
		}
		li.innerHTML = li.innerHTML.replace(/^(\s|&nbsp;|\u00a0|\u00b7|\u2022)+/, '');
		list.appendChild(li);
		p.parentNode.removeChild(p);
	});
	each('ul[data-ep-word]', function (u) {
		u.removeAttribute('data-ep-word');
	});
	// stili: via caratteri e proprietà di Word
	each('[style]', function (n) {
		var keep = n.getAttribute('style').split(';').filter(function (d) {
			var prop = d.split(':')[0].trim().toLowerCase();
			return prop && prop.indexOf('mso-') !== 0 && prop !== 'font-family' && prop !== 'font';
		});
		if (keep.length) {
			n.setAttribute('style', keep.join(';'));
		} else {
			n.removeAttribute('style');
		}
	});
	each('font[face]', function (n) {
		n.removeAttribute('face');
	});
	each('[class]', function (n) {
		n.removeAttribute('class');
	});
	// titoli
	each('h1, h2, h3, h4, h5, h6', function (h) {
		var p = doc.createElement('p');
		var b = doc.createElement('b');
		while (h.firstChild) {
			b.appendChild(h.firstChild);
		}
		if (h.tagName === 'H1' || h.tagName === 'H2') {
			var big = doc.createElement('span');
			big.style.fontSize = '21px';
			big.appendChild(b);
			p.appendChild(big);
		} else {
			p.appendChild(b);
		}
		h.parentNode.replaceChild(p, h);
	});
	// tabelle -> righe di testo
	each('table', function (t) {
		var frag = doc.createElement('div');
		Array.prototype.forEach.call(t.querySelectorAll('tr'), function (tr) {
			var cells = Array.prototype.map.call(tr.querySelectorAll('td, th'), function (c) {
				return c.innerHTML.trim();
			});
			var line = doc.createElement('div');
			line.innerHTML = cells.join(' | ');
			frag.appendChild(line);
		});
		t.parentNode.replaceChild(frag, t);
	});
	// immagini solo con indirizzi http/https
	each('img', function (img) {
		if (!/^https?:\/\//i.test(img.getAttribute('src') || '')) {
			img.parentNode.removeChild(img);
		}
	});
	return body.innerHTML;
};
