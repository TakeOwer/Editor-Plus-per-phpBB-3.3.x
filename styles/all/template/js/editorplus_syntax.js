/**
 * Editor Plus - codice colorato nei messaggi ([syntax=linguaggio]…[/syntax])
 * Colori per linguaggio (highlight.js, incluso nell'estensione), numeri di riga, nome del linguaggio,
 * pulsante "Copia". Le librerie si caricano solo se nella pagina c'è davvero del codice.
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 */
(function () {
	'use strict';

	var cfg = window.EditorPlusSyntaxConfig || {};
	var L = cfg.lang || {};
	var loading = null;

	/* nomi mostrati per i linguaggi (highlight.js usa nomi tecnici) */
	var NAMES = {
		c: 'C', cpp: 'C++', csharp: 'C#', java: 'Java', python: 'Python', php: 'PHP', javascript: 'JavaScript',
		typescript: 'TypeScript', xml: 'HTML / XML', css: 'CSS', scss: 'SCSS', less: 'Less', sql: 'SQL', json: 'JSON',
		bash: 'Bash', shell: 'Shell', go: 'Go', ruby: 'Ruby', kotlin: 'Kotlin', swift: 'Swift', rust: 'Rust', perl: 'Perl',
		lua: 'Lua', yaml: 'YAML', ini: 'INI', markdown: 'Markdown', diff: 'Diff', vbnet: 'VB.NET', objectivec: 'Objective-C',
		r: 'R', makefile: 'Makefile', graphql: 'GraphQL', plaintext: L.plain || 'Testo'
	};

	var AUTO = ['xml', 'javascript', 'typescript', 'css', 'scss', 'php', 'python', 'java', 'csharp', 'cpp', 'c', 'sql', 'json',
		'bash', 'go', 'ruby', 'kotlin', 'swift', 'rust', 'perl', 'lua', 'yaml', 'ini', 'markdown', 'diff', 'vbnet'];

	function asset(path) {
		return (cfg.root || './') + 'ext/salvocortesiano/editorplus/styles/all/' + path + '?v=' + (cfg.version || '');
	}

	function loadScript(src) {
		return new Promise(function (resolve, reject) {
			var s = document.createElement('script');
			s.src = src;
			s.onload = resolve;
			s.onerror = reject;
			document.head.appendChild(s);
		});
	}

	function loadTheme() {
		if (document.getElementById('ep-syntax-theme')) {
			return;
		}
		var l = document.createElement('link');
		l.id = 'ep-syntax-theme';
		l.rel = 'stylesheet';
		l.href = asset('theme/syntax/' + (cfg.theme === 'dark' ? 'dark' : 'light') + '.min.css');
		document.head.appendChild(l);
	}

	/* highlight.js si scarica una volta sola, al primo blocco di codice */
	function ready() {
		if (window.hljs) {
			return Promise.resolve(window.hljs);
		}
		if (!loading) {
			loadTheme();
			loading = loadScript(asset('template/js/syntax/highlight.min.js')).then(function () {
				return window.hljs;
			});
		}
		return loading;
	}

	function escapeHtml(t) {
		return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	/* L'HTML colorato va diviso in righe senza spezzare i tag aperti (commenti su più righe ecc.) */
	function splitLines(html) {
		var lines = [];
		var cur = '';
		var stack = [];
		var re = /(<span[^>]*>)|(<\/span>)|(\n)|([^<\n]+)|(<[^>]*>)/g;
		var m;
		while ((m = re.exec(html)) !== null) {
			if (m[1]) {
				stack.push(m[1]);
				cur += m[1];
			} else if (m[2]) {
				stack.pop();
				cur += m[2];
			} else if (m[3]) {
				cur += new Array(stack.length + 1).join('</span>');
				lines.push(cur);
				cur = stack.join('');
			} else {
				cur += m[0];
			}
		}
		lines.push(cur);
		return lines;
	}

	function languageOf(hljs, name) {
		name = String(name || '').toLowerCase();
		var alias = {'c++': 'cpp', 'c#': 'csharp', cs: 'csharp', js: 'javascript', ajax: 'javascript', jquery: 'javascript', html: 'xml', htm: 'xml', py: 'python', sh: 'bash', ts: 'typescript', text: 'plaintext', txt: 'plaintext'};
		name = alias[name] || name;
		return name && hljs.getLanguage(name) ? name : '';
	}

	/* Trasforma un blocco [syntax] (o un'anteprima) in codice colorato con numeri di riga */
	function decorate(hljs, box) {
		if (box.getAttribute('data-ep-done')) {
			return;
		}
		var code = box.querySelector('pre code');
		if (!code) {
			return;
		}
		box.setAttribute('data-ep-done', '1');
		var text = code.textContent.replace(/\n$/, '');
		var tab = parseInt(cfg.tab, 10) || 4;
		var lang = languageOf(hljs, box.getAttribute('data-lang'));
		var result;
		try {
			// riconoscimento automatico solo tra i linguaggi "veri" (niente varianti come php-template)
			result = lang ? hljs.highlight(text, {language: lang, ignoreIllegals: true}) : hljs.highlightAuto(text, AUTO.filter(function (l) {
				return !!hljs.getLanguage(l);
			}));
		} catch (e) {
			result = {value: escapeHtml(text), language: ''};
		}
		var shown = result.language || lang || 'plaintext';
		var lines = splitLines(result.value);

		var head = document.createElement('div');
		head.className = 'ep-syntax-head';
		var label = document.createElement('span');
		label.className = 'ep-syntax-lang';
		label.textContent = (NAMES[shown] || shown) + (lang ? '' : ' · ' + (L.auto || 'auto'));
		var count = document.createElement('span');
		count.className = 'ep-syntax-count';
		count.textContent = (L.lines || '%d').replace('%d', lines.length);
		var copy = document.createElement('button');
		copy.type = 'button';
		copy.className = 'ep-syntax-copy';
		copy.textContent = L.copy || 'Copia';
		copy.addEventListener('click', function () {
			var done = function () {
				copy.textContent = L.copied || 'OK';
				copy.classList.add('ep-syntax-copied');
				setTimeout(function () {
					copy.textContent = L.copy || 'Copia';
					copy.classList.remove('ep-syntax-copied');
				}, 1600);
			};
			if (navigator.clipboard && navigator.clipboard.writeText) {
				navigator.clipboard.writeText(text).then(done, function () {});
			} else {
				var ta = document.createElement('textarea');
				ta.value = text;
				document.body.appendChild(ta);
				ta.select();
				try {
					document.execCommand('copy');
					done();
				} catch (e) { /* ignora */ }
				document.body.removeChild(ta);
			}
		});
		head.appendChild(label);
		head.appendChild(count);
		head.appendChild(copy);

		var table = document.createElement('div');
		table.className = 'ep-syntax-body hljs';
		table.style.tabSize = tab;
		table.style.MozTabSize = tab;
		table.innerHTML = lines.map(function (l, i) {
			return '<div class="ep-syntax-line"><span class="ep-syntax-num" data-n="' + (i + 1) + '"></span><span class="ep-syntax-code">' + (l || ' ') + '</span></div>';
		}).join('');

		var pre = code.parentNode;
		pre.parentNode.insertBefore(head, pre);
		pre.parentNode.replaceChild(table, pre);
		box.classList.add('ep-syntax-ready', 'ep-syntax-' + (cfg.theme === 'dark' ? 'dark' : 'light'));
	}

	/* Blocchi da colorare: [syntax] e, se scelto in ACP, anche i [code] di phpBB */
	function blocks(root) {
		root = root || document;
		var list = Array.prototype.slice.call(root.querySelectorAll('.ep-syntax:not([data-ep-done])'));
		if (cfg.code) {
			Array.prototype.forEach.call(root.querySelectorAll('.codebox:not([data-ep-done])'), function (cb) {
				if (cb.querySelector('pre code') && !cb.closest('.ep-syntax')) {
					cb.classList.add('ep-syntax', 'ep-syntax-codebox');
					list.push(cb);
				}
			});
		}
		return list;
	}

	function run(root) {
		var list = blocks(root);
		if (!list.length) {
			return Promise.resolve(0);
		}
		return ready().then(function (hljs) {
			list.forEach(function (b) {
				decorate(hljs, b);
			});
			return list.length;
		}).catch(function () {
			return 0;
		});
	}

	window.EditorPlusSyntax = {
		run: run,
		ready: ready,
		languageOf: function (name) {
			return window.hljs ? languageOf(window.hljs, name) : '';
		},
		beautify: function () {
			return window.js_beautify ? Promise.resolve(window) : loadScript(asset('template/js/syntax/beautifier.min.js')).then(function () {
				return window;
			});
		}
	};

	if (cfg.enabled !== false) {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', function () {
				run();
			});
		} else {
			run();
		}
	}
})();
