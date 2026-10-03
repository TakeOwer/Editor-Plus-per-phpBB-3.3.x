/**
 * Editor Plus - modulo "print", scaricato solo al primo utilizzo (la pagina di scrittura resta leggera).
 * Riceve dal file principale (editorplus.js) le funzioni che gli servono.
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 */
(function () {
	'use strict';

	window.EditorPlusModules = window.EditorPlusModules || {};

	window.EditorPlusModules.print = function (api) {
		var cfg = api.cfg;
		var ta = api.ta;
		var el = api.el;
		var lang = api.lang;
		var format = api.format;
		var wrap = api.wrap;
		var subjectInput = api.subjectInput;
		var toB64 = api.toB64;
		var attachmentData = api.attachmentData;
		var attachmentUrl = api.attachmentUrl;
		var ATT_IMAGE = api.ATT_IMAGE;
		var escapeHtml = api.escapeHtml;
		var rgbToHex = api.rgbToHex;
		var rgbToHsl = api.rgbToHsl;
		var hslToRgb = api.hslToRgb;
		var contrast = api.contrast;
		var cssColorToRgb = api.cssColorToRgb;
		var makeDialog = api.makeDialog;
		var showDialog = api.showDialog;
		var closeDialog = api.closeDialog;
		var storeGet = api.storeGet;
		var storeSet = api.storeSet;
		/* ------------------------------------------------------------------ */
		/* 1.0.36: stampa / PDF del messaggio                                  */
		/* Il server prepara il testo (spoiler aperti per tutti, contenuti     */
		/* nascosti solo per i gruppi autorizzati); qui si disegnano formule,  */
		/* codice e allegati e si apre la stampa del browser (anche "Salva     */
		/* come PDF").                                                         */
		/* ------------------------------------------------------------------ */

		/* ------------------------------------------------------------------ */
		/* 1.0.40: impostazioni di stampa (carattere, dimensioni, interlinea,  */
		/* righe vuote, margini, immagini, intestazione, colori) con anteprima */
		/* della pagina A4 e numero di pagine stimato. La pagina di stampa non */
		/* dipende più dallo stile del forum (che poteva ingrandire tutto).    */
		/* ------------------------------------------------------------------ */

		var OPT_KEY = 'editorplus:print-options';
		var DEFAULTS = {fit: 'none', font: 'serif', size: 11, sizes: 'soft', line: 'normal', gaps: 'reduce', margin: 'normal', images: 'medium', header: 'yes', colors: 'original', forum: 'no'};
		/* "Adatta a 1 pagina A4": riduzione minima ammessa (sotto, il testo non si legge più) */
		var FIT_MIN = 0.45;
		var FONTS = {serif: 'Georgia,"Times New Roman",serif', sans: 'Arial,Helvetica,sans-serif', mono: 'Consolas,"Courier New",monospace'};
		var LINES = {compact: 1.25, normal: 1.45, wide: 1.7};
		var MARGINS = {narrow: 10, normal: 15, wide: 22};
		var IMAGES = {large: 100, medium: 60, small: 35};
		var CHOICES = {
			fit: [['none', 'EP_PRINTOPT_FIT_NONE'], ['page', 'EP_PRINTOPT_FIT_PAGE']],
			font: [['serif', 'EP_PRINTOPT_FONT_SERIF'], ['sans', 'EP_PRINTOPT_FONT_SANS'], ['mono', 'EP_PRINTOPT_FONT_MONO'], ['message', 'EP_PRINTOPT_FONT_MESSAGE']],
			size: [[9, '9 pt'], [10, '10 pt'], [11, '11 pt'], [12, '12 pt'], [13, '13 pt'], [14, '14 pt']],
			sizes: [['soft', 'EP_PRINTOPT_SIZES_SOFT'], ['same', 'EP_PRINTOPT_SIZES_SAME'], ['original', 'EP_PRINTOPT_SIZES_ORIGINAL']],
			line: [['compact', 'EP_PRINTOPT_LINE_COMPACT'], ['normal', 'EP_PRINTOPT_LINE_NORMAL'], ['wide', 'EP_PRINTOPT_LINE_WIDE']],
			gaps: [['reduce', 'EP_PRINTOPT_GAPS_REDUCE'], ['keep', 'EP_PRINTOPT_GAPS_KEEP']],
			margin: [['narrow', 'EP_PRINTOPT_MARGIN_NARROW'], ['normal', 'EP_PRINTOPT_MARGIN_NORMAL'], ['wide', 'EP_PRINTOPT_MARGIN_WIDE']],
			images: [['large', 'EP_PRINTOPT_IMAGES_LARGE'], ['medium', 'EP_PRINTOPT_IMAGES_MEDIUM'], ['small', 'EP_PRINTOPT_IMAGES_SMALL']],
			header: [['yes', 'EP_PRINTOPT_HEADER_YES'], ['no', 'EP_PRINTOPT_HEADER_NO']],
			colors: [['original', 'EP_PRINTOPT_COLORS_ORIGINAL'], ['bw', 'EP_PRINTOPT_COLORS_BW']],
			forum: [['no', 'EP_PRINTOPT_FORUM_NO'], ['yes', 'EP_PRINTOPT_FORUM_YES']]
		};
		var ORDER = ['fit', 'font', 'size', 'sizes', 'line', 'gaps', 'margin', 'images', 'header', 'colors', 'forum'];

		/* scelte salvate, ripulite: un valore sconosciuto torna a quello di serie */
		function options() {
			var saved = storeGet(OPT_KEY, {}) || {};
			var out = {};
			ORDER.forEach(function (k) {
				var ok = CHOICES[k].some(function (c) {
					return String(c[0]) === String(saved[k]);
				});
				out[k] = ok ? (k === 'size' ? parseInt(saved[k], 10) : saved[k]) : DEFAULTS[k];
			});
			return out;
		}

		function printCss(o) {
			var base = FONTS[o.font] || FONTS.serif;
			var lh = LINES[o.line];
			var keepFont = o.font === 'message';
			var notSpecial = ':not(pre):not(code):not(kbd):not(samp):not(.katex):not(.katex *):not(.ep-syntax):not(.ep-syntax *)';
			return [
				'@page{margin:' + MARGINS[o.margin] + 'mm}',
				// qualunque ingrandimento, zoom o larghezza imposti dagli stili non arrivano sulla carta
				'html{font-size:100%!important;zoom:1!important;-webkit-text-size-adjust:100%}',
				'html,body{background:#fff!important;color:#111!important;margin:0!important;padding:0!important;width:auto!important;min-width:0!important;max-width:none!important;height:auto!important;transform:none!important;zoom:1!important;float:none!important;border:0!important}',
				'body{font:' + o.size + 'pt/' + lh + ' ' + base + '!important}',
				'html.ep-print-preview body{padding:' + MARGINS[o.margin] + 'mm!important}',
				// "Adatta a 1 pagina": tutto ridotto in proporzione (zoom cambia davvero l'impaginazione)
				'.ep-print-fit{display:block}',
				'.ep-print-head{margin:0 0 ' + (o.size * 0.9) + 'pt;padding:0 0 ' + (o.size * 0.5) + 'pt;border-bottom:1pt solid #333}',
				'.ep-print-head h1{margin:0 0 2pt!important;padding:0!important;font:bold ' + (o.size * 1.45).toFixed(1) + 'pt/1.2 ' + base + '!important;color:#111!important;border:0!important;text-transform:none!important}',
				'.ep-print-meta{font:' + Math.max(7, o.size - 2.5) + 'pt/1.35 Arial,Helvetica,sans-serif!important;color:#555!important}',
				'.ep-print-body,.ep-print-body.postbody,.ep-print-body .content{float:none!important;width:auto!important;max-width:none!important;margin:0!important;padding:0!important;overflow:visible!important;border:0!important;background:none!important}',
				'.ep-print-body,.ep-print-body .content{font-size:' + o.size + 'pt!important;line-height:' + lh + '!important;color:#111;' + (keepFont ? '' : 'font-family:' + base + '!important;') + '}',
				'.ep-print-body *' + notSpecial + '{line-height:inherit!important;letter-spacing:normal!important' + (keepFont ? '' : ';font-family:inherit!important') + '}',
				'.ep-print-body p{margin:0 0 .5em!important}',
				'.ep-print-gap{display:block;height:' + (o.line === 'compact' ? '.25' : '.4') + 'em}',
				'.ep-print-body h1,.ep-print-body h2,.ep-print-body h3,.ep-print-body h4{font-size:1.15em!important;margin:.6em 0 .3em!important}',
				'.ep-print-body img{max-width:' + IMAGES[o.images] + '%!important;height:auto!important;break-inside:avoid;page-break-inside:avoid}',
				'.ep-print-body .katex img{max-width:none!important}',
				'.ep-print-body blockquote{margin:.5em 0 .5em .3em!important;padding:.2em .7em!important;border:0!important;border-left:2.5pt solid #999!important;background:none!important;font-size:.95em}',
				'.ep-print-body blockquote cite{display:block;font-style:normal;font-weight:bold;font-size:.85em;margin-bottom:.2em}',
				'.ep-print-body .codebox{margin:.5em 0!important;padding:.3em .5em!important;border:1pt solid #bbb!important;background:none!important}',
				'.ep-print-body .codebox p{margin:0 0 .2em!important;font:bold 7.5pt Arial,Helvetica,sans-serif!important}',
				'.ep-print-body pre,.ep-print-body code,.ep-print-body .codebox pre{font-size:.85em!important;white-space:pre-wrap!important;word-break:break-word!important;overflow:visible!important;max-height:none!important}',
				'.ep-print-body ul,.ep-print-body ol{margin:.3em 0 .5em 1.4em!important;padding:0!important}',
				'.ep-print-body hr{border:0!important;border-top:.5pt solid #999!important;margin:.6em 0!important}',
				'.ep-print-body table{border-collapse:collapse}',
				'.ep-print-body td,.ep-print-body th{border:.5pt solid #aaa;padding:2pt 4pt}',
				'.ep-print-body .ep-syntax{overflow:visible!important}',
				'.ep-print-body .ep-syntax-copy,.ep-print-body .codebox p button,.ep-print-body .codebox p a{display:none!important}',
				'.ep-print-body .ep-math-block{overflow:visible!important}',
				'.ep-print-box{margin:.5em 0;border:1pt solid #888;border-radius:3pt;break-inside:avoid;page-break-inside:avoid}',
				'.ep-print-box-title{padding:2pt 7pt;font:bold 8pt Arial,Helvetica,sans-serif!important;color:#333;background:#eee;border-bottom:1pt solid #ccc}',
				'.ep-print-box-body{padding:4pt 8pt}',
				'.ep-print-hidden{border-style:dashed}',
				'.ep-print-removed{display:inline-block;padding:1pt 6pt;font:italic 8pt Arial,Helvetica,sans-serif!important;color:#555;border:1pt dashed #999;border-radius:3pt}',
				'.ep-print-att{display:block;margin:.5em 0;break-inside:avoid;page-break-inside:avoid}',
				'.ep-print-att img{display:block;max-width:' + IMAGES[o.images] + '%;max-height:230mm}',
				'.ep-print-att figcaption{margin-top:2pt;font:8pt Arial,Helvetica,sans-serif!important;color:#555}',
				'.ep-print-foot{clear:both;margin-top:' + o.size + 'pt;padding-top:4pt;border-top:.5pt solid #999;font:7.5pt Arial,Helvetica,sans-serif!important;color:#666}',
				'.ep-print-note{margin-top:3pt;font-style:italic}',
				'a{color:#111!important;text-decoration:underline}',
				o.colors === 'bw' ? '.ep-print-body *{color:#000!important;background-color:transparent!important;text-shadow:none!important}' : ''
			].join('\n');
		}

		/* il messaggio secondo le scelte: dimensioni dei [size], caratteri dei [font], righe vuote */
		function shapeBody(html, o) {
			var doc = new DOMParser().parseFromString('<div id="r">' + html + '</div>', 'text/html');
			var root = doc.getElementById('r');
			Array.prototype.forEach.call(root.querySelectorAll('[style*="font-size"]'), function (n) {
				if (n.closest('.katex')) {
					return;
				}
				if (o.sizes === 'original') {
					return;
				}
				var m = /font-size:\s*([\d.]+)\s*(%|px|pt|em|rem)?/i.exec(n.getAttribute('style') || '');
				var pct = 100;
				if (m) {
					var v = parseFloat(m[1]);
					var u = (m[2] || '%').toLowerCase();
					pct = u === '%' ? v : (u === 'px' ? v / 16 * 100 : (u === 'pt' ? v / 12 * 100 : v * 100));
				}
				if (o.sizes === 'same') {
					n.style.fontSize = '';
				} else {
					// attenuate: si vede ancora che è più grande o più piccolo, senza far esplodere la pagina
					n.style.fontSize = Math.round(Math.max(85, Math.min(135, 100 + (pct - 100) * 0.35))) + '%';
				}
				n.style.lineHeight = '';
			});
			if (o.font !== 'message') {
				Array.prototype.forEach.call(root.querySelectorAll('[style*="font-family"]'), function (n) {
					if (!n.closest('.katex')) {
						n.style.fontFamily = '';
					}
				});
			}
			if (o.gaps === 'reduce') {
				// più a capo di seguito (righe vuote) diventano un a capo e un piccolo spazio
				Array.prototype.forEach.call(root.querySelectorAll('br'), function (br) {
					if (!br.parentNode || br.closest('pre, code, .ep-syntax, .katex')) {
						return;
					}
					var extra = [];
					for (var n = br.nextSibling; n; n = n.nextSibling) {
						if (n.nodeType === 3 && !n.nodeValue.trim()) {
							continue;
						}
						if (n.nodeName === 'BR') {
							extra.push(n);
							continue;
						}
						break;
					}
					if (extra.length) {
						extra.forEach(function (x) {
							x.parentNode.removeChild(x);
						});
						var gap = doc.createElement('span');
						gap.className = 'ep-print-gap';
						br.parentNode.insertBefore(gap, br.nextSibling);
					}
				});
			}
			return root.innerHTML;
		}

		/* la pagina completa da stampare (preview = anteprima con i margini disegnati) */
		function buildDoc(data, o, preview, scale) {
			var subj = subjectInput();
			var title = subj && subj.value.trim() ? subj.value.trim() : lang('EP_PRINT_UNTITLED');
			var links = Array.prototype.filter.call(document.querySelectorAll('link[rel="stylesheet"]'), function (l) {
				// di serie solo gli stili delle estensioni (formule, codice colorato, BBCode di ABBC3),
				// non quelli dello stile del forum, che possono ingrandire o stringere la pagina
				return o.forum === 'yes' || /\/ext\//.test(l.href);
			}).map(function (l) {
				return '<link rel="stylesheet" href="' + escapeHtml(l.href) + '">';
			}).join('');
			var when = new Date().toLocaleString(document.documentElement.lang || undefined);
			var note = data.res.removed ? '<div class="ep-print-note">' + escapeHtml(lang('EP_PRINT_REMOVED_NOTE')) + '</div>' : '';
			var head = o.header === 'yes' ? '<header class="ep-print-head"><h1>' + escapeHtml(title) + '</h1><div class="ep-print-meta">' +
				escapeHtml(format(lang('EP_PRINT_AUTHOR'), cfg.userName || '')) + ' · ' + escapeHtml(when) + ' · ' + escapeHtml(cfg.siteName || '') + '</div></header>' : '';
			return '<!DOCTYPE html><html class="ep-print-page' + (preview ? ' ep-print-preview' : '') + '" lang="' + escapeHtml(document.documentElement.lang || 'it') + '"><head><meta charset="utf-8">' +
				'<base href="' + escapeHtml(document.baseURI) + '"><title>' + escapeHtml(title) + '</title>' + links +
				'<style>' + printCss(o) + '</style></head><body class="ep-print-page"><div class="ep-print-fit"' +
				(scale && scale < 1 ? ' style="zoom:' + scale.toFixed(3) + '"' : '') + '>' + head +
				'<main class="ep-print-body postbody"><div class="content">' + shapeBody(data.body, o) + '</div></main>' +
				'<footer class="ep-print-foot">' + escapeHtml(format(lang('EP_PRINT_FOOTER'), cfg.siteName || '')) + note + '</footer></div></body></html>';
		}

		function whenLoaded(frame) {
			var d = frame.contentDocument;
			var imgs = Array.prototype.map.call(d.images, function (img) {
				return img.complete ? Promise.resolve() : new Promise(function (r) {
					img.onload = img.onerror = r;
				});
			});
			return Promise.race([Promise.all(imgs.concat([d.fonts ? d.fonts.ready : Promise.resolve()])), new Promise(function (r) {
				setTimeout(r, 10000);
			})]);
		}

		/* pagine stimate: altezza del contenuto divisa per l'altezza utile di un foglio A4 */
		function estimatePages(frame, o) {
			var d = frame.contentDocument;
			var mm = 96 / 25.4;
			// altezza vera del contenuto (non quella del riquadro, che dopo un calcolo può essere più alta)
			var content = d.body.getBoundingClientRect().height - 2 * MARGINS[o.margin] * mm;
			if (o.fit === 'page') {
				var w = d.querySelector('.ep-print-fit');
				content = w ? w.getBoundingClientRect().height : content;
			}
			var page = (297 - 2 * MARGINS[o.margin]) * mm;
			return Math.max(1, Math.ceil((content - 2) / page));
		}

		/* colori troppo chiari per la carta bianca: stessa tinta, più scura */
		function darkenLightColors(root) {
			Array.prototype.forEach.call(root.querySelectorAll('[style*="color"]'), function (n) {
				var c = cssColorToRgb(getComputedStyle(n).color);
				if (c && contrast(c, {r: 255, g: 255, b: 255}) < 3) {
					var hsl = rgbToHsl(c);
					n.style.color = rgbToHex(hslToRgb(hsl.h, hsl.s, Math.min(hsl.l, 0.38)));
				}
			});
		}

		/* allegati: immagine a piena risoluzione (o icona) e nome sotto */
		function printAttachments(root) {
			Array.prototype.forEach.call(root.querySelectorAll('.inline-attachment'), function (box) {
				var index = null;
				for (var n = box.firstChild; n; n = n.nextSibling) {
					var m = n.nodeType === 8 ? /ia(\d+)/.exec(n.nodeValue) : null;
					if (m) {
						index = m[1];
						break;
					}
				}
				var att = index === null ? null : attachmentData(index);
				var fig = el('figure', {className: 'ep-print-att'});
				if (att && ATT_IMAGE.test(att.name)) {
					fig.appendChild(el('img', {src: new URL(attachmentUrl(att.id, false), document.baseURI).href, alt: att.name}));
				}
				fig.appendChild(el('figcaption', {text: (att ? att.name : box.textContent.trim()) + (att && att.comment ? ' — ' + att.comment : '')}));
				box.parentNode.replaceChild(fig, box);
			});
		}


		/*
		 * Riduzione per stare in una pagina A4: si prova sull'anteprima già caricata (senza ricaricarla),
		 * cercando il valore più grande che dà una sola pagina; un piccolo margine di sicurezza evita che
		 * l'ultima riga scivoli sulla seconda pagina.
		 * @return {scale, pages} scale = null se nemmeno con la riduzione minima ci sta
		 */
		function fitScale(frame, o) {
			var w = frame.contentDocument.querySelector('.ep-print-fit');
			var pagesAt = function (z) {
				w.style.zoom = String(z);
				return estimatePages(frame, o);
			};
			if (pagesAt(1) <= 1) {
				return {scale: 1, pages: 1};
			}
			var minPages = pagesAt(FIT_MIN);
			if (minPages > 1) {
				w.style.zoom = String(FIT_MIN);
				return {scale: null, pages: minPages};
			}
			var lo = FIT_MIN, hi = 1;
			for (var i = 0; i < 14; i++) {
				var mid = (lo + hi) / 2;
				if (pagesAt(mid) <= 1) {
					lo = mid;
				} else {
					hi = mid;
				}
			}
			var scale = Math.floor(lo * 0.985 * 1000) / 1000;
			w.style.zoom = String(scale);
			return {scale: scale, pages: 1};
		}

		/* stampa vera: la pagina con le scelte fatte, poi la finestra di stampa del browser */
		function printDoc(data, o, done, scale) {
			var old = document.getElementById('ep-print-frame');
			if (old) {
				old.parentNode.removeChild(old);
			}
			var frame = el('iframe', {id: 'ep-print-frame', title: lang('EP_PRINT_BUTTON'), 'aria-hidden': 'true', tabindex: '-1'});
			frame.style.cssText = 'position:absolute;left:-10000px;top:0;width:210mm;height:297mm;border:0;';
			document.body.appendChild(frame);
			frame.onload = function () {
				whenLoaded(frame).then(function () {
					done(data.res.removed ? lang('EP_PRINT_REMOVED_SHORT') : '');
					frame.contentWindow.focus();
					frame.contentWindow.print();
				});
			};
			frame.srcdoc = buildDoc(data, o, false, scale);
		}

		var optDialog = null;

		/* pannello "Impostazioni di stampa" con anteprima della pagina e pagine stimate */
		function openOptions(data, done) {
			var o = options();
			if (!optDialog) {
				var d = makeDialog(lang('EP_PRINTOPT_TITLE'), 'ep-printopt-dialog');
				var form = el('div', {className: 'ep-printopt-form'});
				var selects = {};
				ORDER.forEach(function (k) {
					var sel = el('select', {className: 'ep-printopt-' + k, 'data-opt': k});
					CHOICES[k].forEach(function (c) {
						sel.appendChild(el('option', {value: String(c[0]), text: /^EP_/.test(String(c[1])) ? lang(c[1]) : String(c[1])}));
					});
					selects[k] = sel;
					form.appendChild(el('label', {className: 'ep-printopt-row'}, [el('span', {text: lang('EP_PRINTOPT_' + k.toUpperCase())}), sel]));
				});
				var reset = el('button', {type: 'button', className: 'ep-btn ep-btn-light ep-printopt-reset'}, [el('i', {className: 'fa fa-undo', 'aria-hidden': 'true'}), ' ' + lang('EP_PRINTOPT_RESET')]);
				form.appendChild(reset);
				var pages = el('span', {className: 'ep-printopt-pages', 'aria-live': 'polite'});
				var fitBtn = el('button', {type: 'button', className: 'ep-btn ep-btn-light ep-printopt-fitbtn'}, [el('i', {className: 'fa fa-compress', 'aria-hidden': 'true'}), ' ' + lang('EP_PRINTOPT_FIT_BUTTON')]);
				var frame = el('iframe', {className: 'ep-printopt-frame', title: lang('EP_PRINTOPT_PREVIEW'), tabindex: '-1'});
				var sheet = el('div', {className: 'ep-printopt-sheet'}, [frame]);
				var preview = el('div', {className: 'ep-printopt-preview'}, [el('div', {className: 'ep-printopt-top'}, [pages, fitBtn]), el('div', {className: 'ep-printopt-scroll'}, [sheet])]);
				var go = el('button', {type: 'button', className: 'ep-btn ep-printopt-go'}, [el('i', {className: 'fa fa-print', 'aria-hidden': 'true'}), ' ' + lang('EP_PRINT_BUTTON')]);
				var cancel = el('button', {type: 'button', className: 'ep-btn ep-btn-light ep-printopt-cancel', text: lang('EP_PRINTOPT_CANCEL')});
				d.body.appendChild(el('div', {className: 'ep-printopt-wrap'}, [form, preview]));
				d.body.appendChild(el('div', {className: 'ep-raw-actions'}, [el('span', {className: 'ep-calc-tip', text: lang('EP_PRINTOPT_TIP')}), el('span', {className: 'ep-raw-space'}), cancel, go]));
				optDialog = {dialog: d, selects: selects, frame: frame, sheet: sheet, pages: pages, go: go, cancel: cancel, reset: reset, fitBtn: fitBtn, timer: null, data: null, done: null, scale: 1};

				var refresh = function () {
					var cur = read();
					storeSet(OPT_KEY, cur);
					clearTimeout(optDialog.timer);
					optDialog.timer = setTimeout(function () {
						render(cur);
					}, 120);
				};
				var read = function () {
					var cur = {};
					ORDER.forEach(function (k) {
						cur[k] = k === 'size' ? parseInt(selects[k].value, 10) : selects[k].value;
					});
					return cur;
				};
				var render = function (cur) {
					optDialog.pages.textContent = lang('EP_PRINTOPT_COUNTING');
					// si riparte da un foglio A4: un'anteprima precedente più lunga non deve falsare la misura
					optDialog.frame.style.height = '297mm';
					optDialog.frame.onload = function () {
						whenLoaded(optDialog.frame).then(function () {
							var doc = optDialog.frame.contentDocument;
							var fitted = null;
							optDialog.scale = 1;
							if (cur.fit === 'page') {
								fitted = fitScale(optDialog.frame, cur);
								optDialog.scale = fitted.scale || FIT_MIN;
							}
							var h = Math.ceil(doc.body.getBoundingClientRect().height);
							optDialog.frame.style.height = h + 'px';
							var scale = optDialog.sheet.parentNode.clientWidth / optDialog.frame.offsetWidth;
							optDialog.sheet.style.height = Math.ceil(h * Math.min(1, scale)) + 'px';
							optDialog.frame.style.transform = 'scale(' + Math.min(1, scale) + ')';
							var n = estimatePages(optDialog.frame, cur);
							var label = format(lang(n === 1 ? 'EP_PRINTOPT_PAGES_ONE' : 'EP_PRINTOPT_PAGES'), n);
							if (fitted && fitted.scale && fitted.scale < 1) {
								label += ' · ' + format(lang('EP_PRINTOPT_FIT_SCALE'), Math.round(fitted.scale * 100));
							} else if (fitted && !fitted.scale) {
								label = lang('EP_PRINTOPT_FIT_TOO_LONG').replace('%1$d', fitted.pages).replace('%2$d', Math.round(FIT_MIN * 100));
							}
							optDialog.pages.textContent = label;
							optDialog.pages.classList.toggle('ep-printopt-warn', !!(fitted && !fitted.scale));
							optDialog.fitBtn.classList.toggle('ep-on', cur.fit === 'page');
						});
					};
					optDialog.frame.srcdoc = buildDoc(optDialog.data, cur, true);
				};
				optDialog.render = render;
				ORDER.forEach(function (k) {
					selects[k].addEventListener('change', refresh);
				});
				fitBtn.addEventListener('click', function () {
					selects.fit.value = selects.fit.value === 'page' ? 'none' : 'page';
					refresh();
				});
				reset.addEventListener('click', function () {
					ORDER.forEach(function (k) {
						selects[k].value = String(DEFAULTS[k]);
					});
					refresh();
				});
				cancel.addEventListener('click', function () {
					closeDialog();
					optDialog.done('');
				});
				go.addEventListener('click', function () {
					var cur = read();
					closeDialog();
					printDoc(optDialog.data, cur, optDialog.done, cur.fit === 'page' ? optDialog.scale : 1);
				});
			}
			optDialog.data = data;
			optDialog.done = done;
			ORDER.forEach(function (k) {
				optDialog.selects[k].value = String(o[k]);
			});
			optDialog.dialog.onOpen = function () {
				setTimeout(function () {
					optDialog.render(o);
				}, 30);
			};
			showDialog(optDialog.dialog);
		}

		function printMessage(btn, state) {
			if (btn.disabled) {
				return;
			}
			btn.disabled = true;
			state.textContent = lang('EP_PRINT_PREPARING');
			var fd = new FormData();
			fd.append('hash', cfg.renderHash || '');
			fd.append('text_b64', toB64(ta.value));
			var done = function (msg) {
				btn.disabled = false;
				state.textContent = msg || '';
			};
			fetch(cfg.printUrl, {method: 'POST', body: fd, credentials: 'same-origin', headers: {'X-Requested-With': 'XMLHttpRequest'}})
				.then(function (r) {
					return r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status));
				})
				.then(function (res) {
					// formule e codice disegnati in un contenitore nascosto
					var holder = el('div', {className: 'postbody ep-print-holder'}, [el('div', {className: 'content'})]);
					holder.style.cssText = 'position:absolute;left:-10000px;top:0;width:180mm;';
					holder.firstChild.innerHTML = res.html || '';
					document.body.appendChild(holder);
					var jobs = [];
					if (window.EditorPlusMath) {
						jobs.push(window.EditorPlusMath.run(holder));
					}
					if (window.EditorPlusSyntax) {
						jobs.push(window.EditorPlusSyntax.run(holder));
					}
					return Promise.all(jobs).then(function () {
						printAttachments(holder);
						darkenLightColors(holder);
						var body = holder.firstChild.innerHTML;
						holder.parentNode.removeChild(holder);
						return {res: res, body: body};
					});
				})
				.then(function (data) {
					state.textContent = '';
					openOptions(data, done);
				})
				.catch(function () {
					done(lang('EP_PRINT_FAILED'));
				});
		}
		return {print: printMessage};
	};
})();
