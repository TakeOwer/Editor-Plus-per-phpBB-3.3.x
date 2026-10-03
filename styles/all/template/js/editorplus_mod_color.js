/**
 * Editor Plus - modulo "color", scaricato solo al primo utilizzo (la pagina di scrittura resta leggera).
 * Riceve dal file principale (editorplus.js) le funzioni che gli servono.
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 */
(function () {
	'use strict';

	window.EditorPlusModules = window.EditorPlusModules || {};

	window.EditorPlusModules.color = function (api) {
		var F = api.F;
		var ta = api.ta;
		var wy = api.wy;
		var el = api.el;
		var lang = api.lang;
		var makeDialog = api.makeDialog;
		var showDialog = api.showDialog;
		var closeDialog = api.closeDialog;
		var wrap = api.wrap;
		var storeGet = api.storeGet;
		var storeSet = api.storeSet;
		var clamp = api.clamp;
		var hexToRgb = api.hexToRgb;
		var rgbToHex = api.rgbToHex;
		var rgbToHsv = api.rgbToHsv;
		var hsvToRgb = api.hsvToRgb;
		var contrast = api.contrast;
		var postBackground = api.postBackground;
		var colorShades = api.colorShades;
		var COLOR_BASES = api.COLOR_BASES;
		var COLOR_RECENT_KEY = api.COLOR_RECENT_KEY;
		function recentColors() {
			var list = storeGet(COLOR_RECENT_KEY, []);
			return Array.isArray(list) ? list.filter(function (c) {
				return !!hexToRgb(c);
			}).slice(0, 12) : [];
		}

		function rememberColor(hex) {
			var list = recentColors().filter(function (c) {
				return c.toLowerCase() !== hex.toLowerCase();
			});
			list.unshift(hex.toLowerCase());
			storeSet(COLOR_RECENT_KEY, list.slice(0, 12));
		}

		var colorDlg = null;

		function swatch(hex, cls, title) {
			var b = el('button', {type: 'button', className: 'ep-sw' + (cls ? ' ' + cls : ''), title: title || hex, 'data-color': hex});
			b.style.backgroundColor = hex;
			b.addEventListener('mousedown', function (e) {
				e.preventDefault();
			});
			return b;
		}

		function buildColorDialog() {
			var d = makeDialog(lang('EP_COLOR_TITLE'), 'ep-color-dialog');
			var classicOn = F.color_classic !== false;
			var tabS = el('button', {type: 'button', className: 'ep-mtab ep-on', 'data-tab': 'shades'}, [el('i', {className: 'fa fa-tint', 'aria-hidden': 'true'}), ' ' + lang('EP_COLOR_TAB_SHADES')]);
			var tabC = el('button', {type: 'button', className: 'ep-mtab', 'data-tab': 'classic'}, [el('i', {className: 'fa fa-th', 'aria-hidden': 'true'}), ' ' + lang('EP_COLOR_TAB_CLASSIC')]);
			if (!classicOn) {
				tabC.hidden = true;
			}
			d.body.appendChild(el('div', {className: 'ep-mtabs', role: 'tablist'}, [tabS, tabC]));

			/* ---------------- Sfumature ---------------- */
			var paneS = el('div', {className: 'ep-mpane', 'data-pane': 'shades'});
			var bases = el('div', {className: 'ep-sw-row ep-sw-bases', role: 'listbox', 'aria-label': lang('EP_COLOR_BASES')});
			COLOR_BASES.forEach(function (hex) {
				var b = swatch(hex, 'ep-sw-base');
				b.addEventListener('click', function () {
					setColor(hex, true);
				});
				bases.appendChild(b);
			});
			var shades = el('div', {className: 'ep-sw-row ep-sw-shades', 'aria-label': lang('EP_COLOR_SHADES')});
			paneS.appendChild(el('div', {className: 'ep-color-label', text: lang('EP_COLOR_BASES')}));
			paneS.appendChild(bases);
			paneS.appendChild(el('div', {className: 'ep-color-label', text: lang('EP_COLOR_SHADES')}));
			paneS.appendChild(shades);

			// regolazione fine: quadrato (intensità × luminosità) e barra delle tinte
			var sv = el('div', {className: 'ep-sv', tabindex: '0', role: 'slider', 'aria-label': lang('EP_COLOR_FINE')});
			var svDot = el('span', {className: 'ep-sv-dot'});
			sv.appendChild(svDot);
			var hue = el('input', {type: 'range', min: '0', max: '359', step: '1', className: 'ep-hue', 'aria-label': lang('EP_COLOR_HUE')});
			var hexIn = el('input', {type: 'text', className: 'ep-hex', maxlength: '7', spellcheck: 'false', 'aria-label': lang('EP_COLOR_HEX')});
			var drop = el('button', {type: 'button', className: 'ep-btn ep-btn-light', title: lang('EP_COLOR_EYEDROPPER')}, [el('i', {className: 'fa fa-eyedropper', 'aria-hidden': 'true'})]);
			if (!window.EyeDropper) {
				drop.hidden = true;
			}
			var sample = el('div', {className: 'ep-color-sample'});
			var warn = el('div', {className: 'ep-color-warn', role: 'status'});
			var recent = el('div', {className: 'ep-sw-row ep-sw-recent'});
			var recentBox = el('div', {}, [el('div', {className: 'ep-color-label', text: lang('EP_COLOR_RECENT')}), recent]);
			paneS.appendChild(el('div', {className: 'ep-color-fine'}, [
				sv,
				el('div', {className: 'ep-color-side'}, [
					hue,
					el('div', {className: 'ep-syn-row'}, [hexIn, drop]),
					sample,
					warn
				])
			]));
			paneS.appendChild(recentBox);
			var apply = el('button', {type: 'button', className: 'ep-btn'}, [el('i', {className: 'fa fa-tint', 'aria-hidden': 'true'}), ' ' + lang('EP_COLOR_APPLY')]);
			paneS.appendChild(el('div', {className: 'ep-raw-actions'}, [el('span', {className: 'ep-calc-tip', text: lang('EP_COLOR_TIP')}), el('span', {className: 'ep-raw-space'}), apply]));
			d.body.appendChild(paneS);

			/* ---------------- Classica (la tavolozza di phpBB) ---------------- */
			var paneC = el('div', {className: 'ep-mpane', 'data-pane': 'classic', hidden: true});
			var grid = el('div', {className: 'ep-classic-grid'});
			var hexes = ['00', '40', '80', 'BF', 'FF'];
			hexes.forEach(function (r) {
				hexes.forEach(function (g) {
					hexes.forEach(function (b) {
						var hex = '#' + r + g + b;
						var sw = swatch(hex, 'ep-sw-classic');
						sw.addEventListener('click', function () {
							insertColor(hex);
						});
						grid.appendChild(sw);
					});
				});
			});
			paneC.appendChild(el('p', {className: 'ep-calc-tip', text: lang('EP_COLOR_CLASSIC_TIP')}));
			paneC.appendChild(grid);
			d.body.appendChild(paneC);

			var state = {h: 210, s: 0.8, v: 0.8, hex: '#1e88e5', text: ''};

			function paintRecent() {
				recent.textContent = '';
				var list = recentColors();
				recentBox.hidden = !list.length;
				list.forEach(function (hex) {
					var b = swatch(hex, 'ep-sw-small');
					b.addEventListener('click', function () {
						setColor(hex, true);
					});
					recent.appendChild(b);
				});
			}

			function paintShades(fromHex) {
				shades.textContent = '';
				colorShades(fromHex).forEach(function (hex) {
					var b = swatch(hex, 'ep-sw-shade');
					b.addEventListener('click', function () {
						setColor(hex, false);
					});
					shades.appendChild(b);
				});
			}

			/* aggiorna tutto il pannello; baseChange = true ricostruisce anche le sfumature */
			function setColor(hex, baseChange, fromFine) {
				var rgb = hexToRgb(hex);
				if (!rgb) {
					return;
				}
				hex = rgbToHex(rgb);
				state.hex = hex;
				if (!fromFine) {
					var hsv = rgbToHsv(rgb);
					// per i grigi si tiene la tinta di prima (altrimenti la barra salterebbe sul rosso)
					if (hsv.s > 0.02) {
						state.h = hsv.h;
					}
					state.s = hsv.s;
					state.v = hsv.v;
					hue.value = String(Math.round(state.h));
				}
				if (baseChange) {
					paintShades(hex);
				}
				sv.style.backgroundColor = rgbToHex(hsvToRgb(state.h, 1, 1));
				svDot.style.left = (state.s * 100) + '%';
				svDot.style.top = ((1 - state.v) * 100) + '%';
				svDot.style.backgroundColor = hex;
				if (document.activeElement !== hexIn) {
					hexIn.value = hex;
				}
				sample.style.color = hex;
				sample.style.backgroundColor = rgbToHex(postBackground());
				var ratio = contrast(rgb, postBackground());
				warn.textContent = ratio < 3 ? lang('EP_COLOR_LOW_CONTRAST').replace('%s', ratio.toFixed(1).replace('.', lang('EP_CALC_DECIMAL') === ',' ? ',' : '.')) : '';
				Array.prototype.forEach.call(d.body.querySelectorAll('.ep-sw'), function (b) {
					b.classList.toggle('ep-sw-on', b.getAttribute('data-color').toLowerCase() === hex);
				});
			}

			function fineFromPointer(e) {
				var r = sv.getBoundingClientRect();
				state.s = clamp((e.clientX - r.left) / r.width, 0, 1);
				state.v = clamp(1 - (e.clientY - r.top) / r.height, 0, 1);
				setColor(rgbToHex(hsvToRgb(state.h, state.s, state.v)), false, true);
			}
			sv.addEventListener('pointerdown', function (e) {
				e.preventDefault();
				sv.setPointerCapture(e.pointerId);
				fineFromPointer(e);
				var move = function (ev) {
					fineFromPointer(ev);
				};
				var up = function () {
					sv.removeEventListener('pointermove', move);
					sv.removeEventListener('pointerup', up);
					paintShades(state.hex);
				};
				sv.addEventListener('pointermove', move);
				sv.addEventListener('pointerup', up);
			});
			sv.addEventListener('keydown', function (e) {
				var step = e.shiftKey ? 0.1 : 0.02;
				var k = {ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step]}[e.key];
				if (k) {
					e.preventDefault();
					state.s = clamp(state.s + k[0], 0, 1);
					state.v = clamp(state.v + k[1], 0, 1);
					setColor(rgbToHex(hsvToRgb(state.h, state.s, state.v)), true, true);
				}
			});
			hue.addEventListener('input', function () {
				state.h = parseInt(hue.value, 10);
				if (state.s < 0.05) {
					state.s = 0.75;
				}
				setColor(rgbToHex(hsvToRgb(state.h, state.s, state.v)), true, true);
			});
			hexIn.addEventListener('input', function () {
				var v = hexIn.value.trim();
				if (v && v[0] !== '#') {
					v = '#' + v;
				}
				if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) {
					hexIn.classList.remove('ep-bad');
					setColor(v, true);
				} else {
					hexIn.classList.add('ep-bad');
				}
			});
			hexIn.addEventListener('keydown', function (e) {
				if (e.key === 'Enter') {
					e.preventDefault();
					apply.click();
				}
			});
			drop.addEventListener('click', function () {
				new window.EyeDropper().open().then(function (r) {
					setColor(r.sRGBHex, true);
				}, function () { /* annullato */ });
			});
			apply.addEventListener('click', function () {
				insertColor(state.hex);
			});

			function showTab(name) {
				if (name === 'classic' && tabC.hidden) {
					name = 'shades';
				}
				[tabS, tabC].forEach(function (t) {
					var on = t.getAttribute('data-tab') === name;
					t.classList.toggle('ep-on', on);
					t.setAttribute('aria-selected', on ? 'true' : 'false');
				});
				paneS.hidden = name !== 'shades';
				paneC.hidden = name !== 'classic';
				storeSet('editorplus:color-tab', name);
			}
			tabS.addEventListener('click', function () {
				showTab('shades');
			});
			tabC.addEventListener('click', function () {
				showTab('classic');
			});

			colorDlg = {dialog: d, state: state, setColor: setColor, paintRecent: paintRecent, sample: sample, showTab: showTab};
			return colorDlg;
		}

		function insertColor(hex) {
			rememberColor(hex);
			closeDialog();
			wrap('[color=' + hex + ']', '[/color]');
		}

		function openColor() {
			colorDlg = colorDlg || buildColorDialog();
			var sel = (typeof wy !== 'undefined' && wy.on) ? '' : ta.value.slice(ta.selectionStart, ta.selectionEnd);
			// un [color=…] già selezionato: si riparte da quel colore
			var m = /^\[color=(#[0-9a-f]{3,6})\]/i.exec(sel);
			var start = m ? m[1] : (recentColors()[0] || colorDlg.state.hex);
			colorDlg.dialog.onOpen = function () {
				colorDlg.sample.textContent = sel ? sel.replace(/\[\/?[^\]]+\]/g, '').slice(0, 120) || lang('EP_COLOR_SAMPLE') : lang('EP_COLOR_SAMPLE');
				colorDlg.paintRecent();
				colorDlg.setColor(start, true);
				colorDlg.showTab(storeGet('editorplus:color-tab', 'shades'));
			};
			showDialog(colorDlg.dialog);
		}
		return {open: openColor};
	};
})();
