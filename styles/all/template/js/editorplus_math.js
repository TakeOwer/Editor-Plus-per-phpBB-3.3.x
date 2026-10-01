/**
 * Editor Plus - formule matematiche e chimiche nei messaggi ([math]…[/math] e [imath]…[/imath])
 * Disegnate con KaTeX (incluso nell'estensione, licenza MIT) + mhchem per la chimica (\ce{…}).
 * Le librerie si scaricano solo se nella pagina c'è davvero una formula.
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 */
(function () {
	'use strict';

	var cfg = window.EditorPlusMathConfig || {};
	var loading = null;

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

	function cssHref() {
		return asset('theme/math/katex.min.css');
	}

	/* KaTeX e l'estensione per la chimica, una volta sola */
	function ready() {
		if (!loading) {
			loading = new Promise(function (resolve, reject) {
				if (!document.querySelector('link[data-ep-katex]')) {
					var l = document.createElement('link');
					l.rel = 'stylesheet';
					l.href = cssHref();
					l.setAttribute('data-ep-katex', '1');
					document.head.appendChild(l);
				}
				(window.katex ? Promise.resolve() : loadScript(asset('template/js/math/katex.min.js')))
					.then(function () {
						return loadScript(asset('template/js/math/mhchem.min.js'));
					})
					.then(function () {
						resolve(window.katex);
					}, reject);
			});
		}
		return loading;
	}

	var OPTIONS = {
		throwOnError: false,
		// niente comandi che aprono collegamenti, immagini o HTML: le formule restano solo formule
		trust: false,
		strict: 'ignore',
		maxSize: 40,
		maxExpand: 1000,
		errorColor: '#c0392b',
		output: 'htmlAndMathml'
	};

	function draw(katex, tex, target, display) {
		try {
			katex.render(tex, target, Object.assign({}, OPTIONS, {displayMode: !!display}));
			return true;
		} catch (e) {
			target.textContent = tex;
			target.classList.add('ep-math-error');
			target.title = e && e.message ? e.message : '';
			return false;
		}
	}

	/* tutte le formule dentro root (la pagina, un'anteprima, un riquadro) */
	function run(root) {
		root = root || document;
		var list = root.querySelectorAll ? root.querySelectorAll('.ep-math:not(.ep-math-done)') : [];
		if (!list.length) {
			return Promise.resolve(0);
		}
		return ready().then(function (katex) {
			Array.prototype.forEach.call(list, function (node) {
				if (node.classList.contains('ep-math-done')) {
					return;
				}
				var tex = node.getAttribute('data-tex');
				if (tex === null) {
					tex = node.textContent;
					node.setAttribute('data-tex', tex);
				}
				node.classList.add('ep-math-done');
				draw(katex, tex, node, node.classList.contains('ep-math-block'));
			});
			return list.length;
		}).catch(function () {
			return 0; // libreria non raggiungibile: la formula resta leggibile come testo LaTeX
		});
	}

	window.EditorPlusMath = {
		run: run,
		ready: ready,
		cssHref: cssHref,
		/* disegna una formula in un elemento qualsiasi (anteprima della finestra delle formule) */
		render: function (tex, target, display) {
			return ready().then(function (katex) {
				target.classList.remove('ep-math-error');
				target.title = '';
				return draw(katex, tex, target, display);
			});
		},
		/* controlla una formula senza disegnarla: null se è valida, altrimenti il messaggio di errore */
		check: function (tex) {
			return ready().then(function (katex) {
				try {
					katex.renderToString(tex, Object.assign({}, OPTIONS, {throwOnError: true}));
					return null;
				} catch (e) {
					return e && e.message ? e.message.replace(/^KaTeX parse error:\s*/, '') : 'error';
				}
			});
		}
	};

	function start() {
		if (document.querySelector('.ep-math')) {
			run(document);
		}
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', start);
	} else {
		start();
	}
})();
