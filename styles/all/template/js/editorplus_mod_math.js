/**
 * Editor Plus - modulo "math", scaricato solo al primo utilizzo (la pagina di scrittura resta leggera).
 * Riceve dal file principale (editorplus.js) le funzioni che gli servono.
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 */
(function () {
	'use strict';

	window.EditorPlusModules = window.EditorPlusModules || {};

	window.EditorPlusModules.math = function (api) {
		var F = api.F;
		var ta = api.ta;
		var wy = api.wy;
		var el = api.el;
		var lang = api.lang;
		var makeDialog = api.makeDialog;
		var showDialog = api.showDialog;
		var closeDialog = api.closeDialog;
		var insertText = api.insertText;
		var storeGet = api.storeGet;
		var storeSet = api.storeSet;
		/* ------------------------------------------------------------------ */
		/* 1.0.28: formule (KaTeX) e calcolatrice scientifica                  */
		/* ------------------------------------------------------------------ */

		/* Tavolozza: [come appare (LaTeX), cosa si inserisce]; # = dove va il cursore (o il testo selezionato) */
		var MATH_PALETTE = [
			['EP_MATH_CAT_BASE', [
				['+', '+'], ['-', '-'], ['\\times', '\\times '], ['\\div', '\\div '], ['\\cdot', '\\cdot '], ['\\pm', '\\pm '],
				['=', '='], ['\\neq', '\\neq '], ['\\approx', '\\approx '], ['\\equiv', '\\equiv '], ['<', '<'], ['>', '>'],
				['\\leq', '\\leq '], ['\\geq', '\\geq '], ['\\infty', '\\infty '], ['\\%', '\\%'], ['\\propto', '\\propto '], ['\\degree', '^\\circ']
			]],
			['EP_MATH_CAT_STRUCT', [
				['\\frac{a}{b}', '\\frac{#}{}'], ['\\sqrt{x}', '\\sqrt{#}'], ['\\sqrt[n]{x}', '\\sqrt[]{#}'], ['x^{n}', '^{#}'],
				['x_{n}', '_{#}'], ['x_{a}^{b}', '_{#}^{}'], ['e^{x}', 'e^{#}'], ['\\log_{b}', '\\log_{#}'], ['\\ln', '\\ln\\left(#\\right)'],
				['\\left|x\\right|', '\\left|#\\right|'], ['\\left(x\\right)', '\\left(#\\right)'], ['\\left[x\\right]', '\\left[#\\right]'],
				['\\overline{x}', '\\overline{#}'], ['\\vec{v}', '\\vec{#}'], ['\\hat{x}', '\\hat{#}'], ['\\dot{x}', '\\dot{#}'],
				['\\binom{n}{k}', '\\binom{#}{}'], ['n!', '!']
			]],
			['EP_MATH_CAT_GREEK', ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'lambda', 'mu', 'nu', 'xi',
				'pi', 'rho', 'sigma', 'tau', 'phi', 'chi', 'psi', 'omega', 'Gamma', 'Delta', 'Theta', 'Lambda', 'Pi', 'Sigma', 'Phi', 'Psi', 'Omega'
			].map(function (g) {
				return ['\\' + g, '\\' + g + ' '];
			})],
			['EP_MATH_CAT_CALCULUS', [
				['\\int', '\\int #\\,dx'], ['\\int_{a}^{b}', '\\int_{#}^{} \\,dx'], ['\\iint', '\\iint #\\,dA'], ['\\oint', '\\oint #'],
				['\\sum_{i=1}^{n}', '\\sum_{i=1}^{n} #'], ['\\prod_{i=1}^{n}', '\\prod_{i=1}^{n} #'], ['\\lim_{x\\to a}', '\\lim_{x \\to #}'],
				['\\frac{d}{dx}', '\\frac{d}{dx}#'], ['\\frac{\\partial f}{\\partial x}', '\\frac{\\partial #}{\\partial x}'], ["f'(x)", "f'(#)"],
				['\\nabla', '\\nabla '], ['\\partial', '\\partial '], ['\\Delta x', '\\Delta '], ['\\to', '\\to '], ['\\infty', '\\infty ']
			]],
			['EP_MATH_CAT_SETS', [
				['\\in', '\\in '], ['\\notin', '\\notin '], ['\\subset', '\\subset '], ['\\subseteq', '\\subseteq '], ['\\cup', '\\cup '],
				['\\cap', '\\cap '], ['\\setminus', '\\setminus '], ['\\emptyset', '\\emptyset '], ['\\mathbb{N}', '\\mathbb{N}'], ['\\mathbb{Z}', '\\mathbb{Z}'],
				['\\mathbb{Q}', '\\mathbb{Q}'], ['\\mathbb{R}', '\\mathbb{R}'], ['\\mathbb{C}', '\\mathbb{C}'], ['\\forall', '\\forall '],
				['\\exists', '\\exists '], ['\\neg', '\\neg '], ['\\land', '\\land '], ['\\lor', '\\lor '], ['\\Rightarrow', '\\Rightarrow '],
				['\\Leftrightarrow', '\\Leftrightarrow '], ['\\rightarrow', '\\rightarrow '], ['\\leftarrow', '\\leftarrow '], ['\\mapsto', '\\mapsto ']
			]],
			['EP_MATH_CAT_MATRIX', [
				['\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}', '\\begin{pmatrix} # & \\\\  & \\end{pmatrix}'],
				['\\begin{bmatrix}a&b\\\\c&d\\end{bmatrix}', '\\begin{bmatrix} # & \\\\  & \\end{bmatrix}'],
				['\\begin{vmatrix}a&b\\\\c&d\\end{vmatrix}', '\\begin{vmatrix} # & \\\\  & \\end{vmatrix}'],
				['\\begin{pmatrix}a&b&c\\\\d&e&f\\\\g&h&i\\end{pmatrix}', '\\begin{pmatrix} # &  &  \\\\  &  &  \\\\  &  &  \\end{pmatrix}'],
				['\\begin{cases}a\\\\b\\end{cases}', '\\begin{cases} # \\\\  \\end{cases}'],
				['\\begin{aligned}a&=b\\\\c&=d\\end{aligned}', '\\begin{aligned} # &=  \\\\  &=  \\end{aligned}']
			]],
			['EP_MATH_CAT_CHEM', [
				['\\ce{H2O}', '\\ce{#}'], ['\\ce{A -> B}', '\\ce{# -> }'], ['\\ce{A <=> B}', '\\ce{# <=> }'], ['\\ce{^{14}_{6}C}', '\\ce{^{#}_{}}'],
				['\\ce{SO4^2-}', '\\ce{#^{2-}}'], ['\\ce{A ->[\\Delta] B}', '\\ce{# ->[\\Delta] }'], ['\\ce{v}', '\\ce{v}'], ['\\ce{^}', '\\ce{^}']
			]]
		];

		var MATH_TEMPLATES = [
			['EP_MATH_T_QUADRATIC', 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}'],
			['EP_MATH_T_PYTHAGORAS', 'a^2 + b^2 = c^2'],
			['EP_MATH_T_EULER', 'e^{i\\pi} + 1 = 0'],
			['EP_MATH_T_EINSTEIN', 'E = mc^2'],
			['EP_MATH_T_DERIVATIVE', "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}"],
			['EP_MATH_T_INTEGRAL', '\\int_{-\\infty}^{+\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}'],
			['EP_MATH_T_BINOMIAL', '(a+b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k} b^k'],
			['EP_MATH_T_SYSTEM', '\\begin{cases} 2x + y = 5 \\\\ x - y = 1 \\end{cases}'],
			['EP_MATH_T_DET', '\\det\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} = ad - bc'],
			['EP_MATH_T_SCHRODINGER', 'i\\hbar\\frac{\\partial}{\\partial t}\\Psi = \\hat{H}\\Psi'],
			['EP_MATH_T_PHOTON', 'E = h\\nu = \\frac{hc}{\\lambda}'],
			['EP_MATH_T_COMBUSTION', '\\ce{CH4 + 2O2 -> CO2 + 2H2O}'],
			['EP_MATH_T_EQUILIBRIUM', '\\ce{N2 + 3H2 <=> 2NH3}'],
			['EP_MATH_T_DECAY', '\\ce{^{14}_{6}C -> ^{14}_{7}N + e- + \\bar{\\nu}_e}']
		];

		var CALC_KEYS = [
			['sin', 'sin('], ['cos', 'cos('], ['tan', 'tan('], ['ln', 'ln('], ['log', 'log('], ['√', 'sqrt('],
			['sin⁻¹', 'asin('], ['cos⁻¹', 'acos('], ['tan⁻¹', 'atan('], ['eˣ', 'exp('], ['10ˣ', '10^'], ['x²', '^2'],
			['xʸ', '^'], ['(', '('], [')', ')'], ['n!', '!'], ['%', '%'], ['÷', '/', 'op'],
			['7', '7', 'num'], ['8', '8', 'num'], ['9', '9', 'num'], ['C', '#clear', 'fn'], ['⌫', '#back', 'fn'], ['×', '*', 'op'],
			['4', '4', 'num'], ['5', '5', 'num'], ['6', '6', 'num'], ['π', 'pi'], ['e', 'e'], ['−', '-', 'op'],
			['1', '1', 'num'], ['2', '2', 'num'], ['3', '3', 'num'], ['i', 'i'], ['Ans', 'Ans'], ['+', '+', 'op'],
			['0', '0', 'num'], ['#dec', '#dec', 'num'], ['EXP', 'e', 'x10'], ['±', '#neg'], ['nCr', 'nCr('], ['=', '#eq', 'eq']
		];

		var CALC_FUNCS = ['abs(', 'arg(', 'conj(', 're(', 'im(', 'cbrt(', 'root(', 'log2(', 'logb(', 'sinh(', 'cosh(', 'tanh(',
			'floor(', 'ceil(', 'round(', 'mod(', 'nPr('];

		var mathDlg = null;

		function calcDecimal() {
			return lang('EP_CALC_DECIMAL') === ',' ? ',' : '.';
		}

		function buildMathDialog() {
			var d = makeDialog(lang('EP_MATH_DIALOG'), 'ep-math-dialog');
			var tabF = el('button', {type: 'button', className: 'ep-mtab', 'data-tab': 'formula'}, [el('i', {className: 'fa fa-superscript', 'aria-hidden': 'true'}), ' ' + lang('EP_MATH_TAB_FORMULA')]);
			var tabC = el('button', {type: 'button', className: 'ep-mtab', 'data-tab': 'calc'}, [el('i', {className: 'fa fa-calculator', 'aria-hidden': 'true'}), ' ' + lang('EP_MATH_TAB_CALC')]);
			if (!F.math || !window.EditorPlusMath) {
				tabF.hidden = true;
			}
			if (!F.calc || !window.EditorPlusCalc) {
				tabC.hidden = true;
			}
			d.body.appendChild(el('div', {className: 'ep-mtabs', role: 'tablist'}, [tabF, tabC]));

			/* ---------------- scheda Formula ---------------- */
			var paneF = el('div', {className: 'ep-mpane', 'data-pane': 'formula'});
			var modeBlock = el('input', {type: 'radio', name: 'ep-math-mode', value: 'block', checked: true});
			var modeInline = el('input', {type: 'radio', name: 'ep-math-mode', value: 'inline'});
			var tpl = el('select', {className: 'ep-math-tpl', 'aria-label': lang('EP_MATH_TEMPLATES')}, [el('option', {value: '', text: lang('EP_MATH_TEMPLATES')})]);
			MATH_TEMPLATES.forEach(function (t, i) {
				tpl.appendChild(el('option', {value: String(i), text: lang(t[0])}));
			});
			paneF.appendChild(el('div', {className: 'ep-syn-row'}, [
				el('label', {}, [modeBlock, ' ' + lang('EP_MATH_BLOCK')]),
				el('label', {}, [modeInline, ' ' + lang('EP_MATH_INLINE')]),
				el('span', {className: 'ep-raw-space'}),
				tpl
			]));
			var cats = el('div', {className: 'ep-math-cats', role: 'tablist'});
			var grid = el('div', {className: 'ep-math-grid'});
			paneF.appendChild(cats);
			paneF.appendChild(grid);
			var area = el('textarea', {className: 'ep-math-src', rows: '4', spellcheck: 'false', placeholder: lang('EP_MATH_PLACEHOLDER')});
			paneF.appendChild(area);
			var pvTitle = el('div', {className: 'ep-syn-pv-title', text: lang('EP_SYN_PREVIEW')});
			var pv = el('div', {className: 'ep-math-preview'});
			var err = el('div', {className: 'ep-math-err', role: 'status'});
			paneF.appendChild(pvTitle);
			paneF.appendChild(pv);
			paneF.appendChild(err);
			var help = el('a', {href: 'https://katex.org/docs/supported.html', target: '_blank', rel: 'noopener', className: 'ep-math-help'}, [el('i', {className: 'fa fa-question-circle', 'aria-hidden': 'true'}), ' ' + lang('EP_MATH_HELP')]);
			var insF = el('button', {type: 'button', className: 'ep-btn'}, [lang('EP_MATH_INSERT')]);
			paneF.appendChild(el('div', {className: 'ep-raw-actions'}, [help, el('span', {className: 'ep-raw-space'}), insF]));
			d.body.appendChild(paneF);

			function isBlock() {
				return !modeInline.checked;
			}

			var timer = null;
			function preview() {
				clearTimeout(timer);
				timer = setTimeout(function () {
					var tex = area.value.trim();
					err.textContent = '';
					insF.disabled = !tex;
					if (!tex) {
						pv.textContent = '';
						return;
					}
					window.EditorPlusMath.check(tex).then(function (msg) {
						err.textContent = msg ? lang('EP_MATH_ERROR') + ' ' + msg : '';
						return window.EditorPlusMath.render(tex, pv, isBlock());
					}).catch(function () {
						pv.textContent = tex;
					});
				}, 200);
			}

			/* inserisce un pezzo di formula al cursore; il testo selezionato finisce al posto di # */
			function put(snippet) {
				var s0 = area.selectionStart, s1 = area.selectionEnd;
				var sel = area.value.slice(s0, s1);
				var at = snippet.indexOf('#');
				var text = at === -1 ? snippet : snippet.slice(0, at) + sel + snippet.slice(at + 1);
				area.value = area.value.slice(0, s0) + text + area.value.slice(s1);
				var caret = at === -1 ? s0 + text.length : s0 + at + sel.length;
				area.focus();
				area.setSelectionRange(caret, caret);
				preview();
			}

			function showCat(i) {
				Array.prototype.forEach.call(cats.children, function (b, j) {
					b.classList.toggle('ep-on', i === j);
					b.setAttribute('aria-selected', i === j ? 'true' : 'false');
				});
				grid.textContent = '';
				MATH_PALETTE[i][1].forEach(function (item) {
					var b = el('button', {type: 'button', className: 'ep-math-key', title: item[1].replace('#', '…')});
					b.appendChild(el('span', {text: item[0]}));
					b.addEventListener('mousedown', function (e) {
						e.preventDefault();
					});
					b.addEventListener('click', function () {
						put(item[1]);
					});
					grid.appendChild(b);
					window.EditorPlusMath.render(item[0], b.firstChild, false).catch(function () {});
				});
			}
			MATH_PALETTE.forEach(function (c, i) {
				var b = el('button', {type: 'button', className: 'ep-math-cat', role: 'tab', text: lang(c[0])});
				b.addEventListener('click', function () {
					showCat(i);
				});
				cats.appendChild(b);
			});

			tpl.addEventListener('change', function () {
				if (tpl.value !== '') {
					area.value = MATH_TEMPLATES[parseInt(tpl.value, 10)][1];
					tpl.value = '';
					area.focus();
					preview();
				}
			});
			area.addEventListener('input', preview);
			modeBlock.addEventListener('change', preview);
			modeInline.addEventListener('change', preview);
			area.addEventListener('keydown', function (e) {
				if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
					e.preventDefault();
					insF.click();
				}
			});
			insF.addEventListener('click', function () {
				var tex = area.value.trim();
				if (!tex) {
					return;
				}
				var tag = isBlock() ? 'math' : 'imath';
				// la chiusura del BBCode non può comparire dentro alla formula
				tex = tex.replace(/\[\/(i?math)\]/gi, '[ /$1]');
				closeDialog();
				insertText('[' + tag + ']' + tex + '[/' + tag + ']');
			});

			/* ---------------- scheda Calcolatrice ---------------- */
			var paneC = el('div', {className: 'ep-mpane', 'data-pane': 'calc'});
			var expr = el('input', {type: 'text', className: 'ep-calc-expr', spellcheck: 'false', autocomplete: 'off', placeholder: lang('EP_CALC_PLACEHOLDER'), 'aria-label': lang('EP_CALC_EXPR')});
			var result = el('div', {className: 'ep-calc-result', 'aria-live': 'polite'});
			var cerr = el('div', {className: 'ep-calc-err'});
			var angle = el('button', {type: 'button', className: 'ep-btn ep-btn-light ep-calc-angle', title: lang('EP_CALC_ANGLE')});
			var memInfo = el('span', {className: 'ep-calc-mem'});
			var constSel = el('select', {'aria-label': lang('EP_CALC_CONSTANTS')}, [el('option', {value: '', text: lang('EP_CALC_CONSTANTS')})]);
			var calcConst = window.EditorPlusCalc ? window.EditorPlusCalc.constants : {};
			Object.keys(calcConst).forEach(function (k) {
				var c = calcConst[k];
				var label = lang('EP_CALC_C_' + k.toUpperCase());
				constSel.appendChild(el('option', {value: k, text: c.name + ' — ' + label + (c.unit ? ' (' + c.unit + ')' : '')}));
			});
			var funcSel = el('select', {'aria-label': lang('EP_CALC_FUNCTIONS')}, [el('option', {value: '', text: lang('EP_CALC_FUNCTIONS')})]);
			CALC_FUNCS.forEach(function (f) {
				funcSel.appendChild(el('option', {value: f, text: f.replace('(', '(…)') + ' — ' + lang('EP_CALC_F_' + f.replace('(', '').toUpperCase())}));
			});
			var mem = ['MC', 'MR', 'M+', 'M−'].map(function (m) {
				return el('button', {type: 'button', className: 'ep-btn ep-btn-light ep-calc-membtn', 'data-mem': m, text: m});
			});
			paneC.appendChild(el('div', {className: 'ep-calc-screen'}, [expr, result, cerr]));
			paneC.appendChild(el('div', {className: 'ep-syn-row ep-calc-tools'}, [angle].concat(mem).concat([memInfo, el('span', {className: 'ep-raw-space'}), constSel, funcSel])));
			var keys = el('div', {className: 'ep-calc-keys'});
			CALC_KEYS.forEach(function (k) {
				var label = k[0] === '#dec' ? calcDecimal() : k[0];
				var b = el('button', {type: 'button', className: 'ep-calc-key' + (k[2] ? ' ep-calc-' + k[2] : ''), text: label});
				b.addEventListener('mousedown', function (e) {
					e.preventDefault();
				});
				b.addEventListener('click', function () {
					press(k[1] === '#dec' ? calcDecimal() : k[1]);
				});
				keys.appendChild(b);
			});
			var hist = el('ul', {className: 'ep-calc-hist'});
			paneC.appendChild(el('div', {className: 'ep-calc-body'}, [keys, el('div', {className: 'ep-calc-side'}, [el('div', {className: 'ep-syn-pv-title', text: lang('EP_CALC_HISTORY')}), hist])]));
			var insRes = el('button', {type: 'button', className: 'ep-btn ep-btn-light'}, [lang('EP_CALC_INS_RESULT')]);
			var insCalc = el('button', {type: 'button', className: 'ep-btn ep-btn-light'}, [lang('EP_CALC_INS_CALC')]);
			var insTex = el('button', {type: 'button', className: 'ep-btn'}, [el('i', {className: 'fa fa-superscript', 'aria-hidden': 'true'}), ' ' + lang('EP_CALC_INS_FORMULA')]);
			if (!F.math || !window.EditorPlusMath) {
				insTex.hidden = true;
			}
			paneC.appendChild(el('div', {className: 'ep-raw-actions'}, [el('span', {className: 'ep-calc-tip', text: lang('EP_CALC_TIP')}), el('span', {className: 'ep-raw-space'}), insRes, insCalc, insTex]));
			d.body.appendChild(paneC);

			var calcState = {angle: storeGet('editorplus:calc-angle', 'deg') === 'rad' ? 'rad' : 'deg', ans: {re: 0, im: 0}, mem: null, last: null};

			function calcOpts() {
				return {angle: calcState.angle, ans: calcState.ans, decimal: calcDecimal()};
			}

			function showAngle() {
				angle.textContent = calcState.angle === 'deg' ? 'DEG' : 'RAD';
			}

			function showMem() {
				memInfo.textContent = calcState.mem ? 'M = ' + window.EditorPlusCalc.format(calcState.mem, {decimal: calcDecimal()}) : '';
			}

			function evaluate(commit) {
				var src = expr.value.trim();
				cerr.textContent = '';
				if (!src) {
					result.textContent = '';
					calcState.last = null;
					refreshIns();
					return null;
				}
				var r = window.EditorPlusCalc.calc(src, calcOpts());
				if (!r.ok) {
					calcState.last = null;
					// mentre si scrive un'espressione incompleta non si segnala nulla: solo al tasto =
					if (commit || !/^(INCOMPLETE|PAREN|EMPTY)$/.test(r.error)) {
						cerr.textContent = lang('EP_CALC_ERR_' + r.error) + (r.detail ? ' (' + r.detail + ')' : '');
					}
					result.textContent = '';
					refreshIns();
					return null;
				}
				result.textContent = '= ' + r.text;
				calcState.last = {src: src, r: r};
				refreshIns();
				if (commit) {
					calcState.ans = r.value;
					addHistory(src, r);
				}
				return r;
			}

			function refreshIns() {
				insRes.disabled = insCalc.disabled = insTex.disabled = !calcState.last;
			}

			function addHistory(src, r) {
				var li = el('li', {tabindex: '0', title: lang('EP_CALC_REUSE')}, [el('span', {className: 'ep-calc-hexpr', text: src}), el('strong', {text: '= ' + r.text})]);
				li.addEventListener('click', function () {
					expr.value = src;
					expr.focus();
					evaluate(false);
				});
				hist.insertBefore(li, hist.firstChild);
				while (hist.children.length > 20) {
					hist.removeChild(hist.lastChild);
				}
			}

			function insertAtCaret(text) {
				var s0 = expr.selectionStart === null ? expr.value.length : expr.selectionStart;
				var s1 = expr.selectionEnd === null ? s0 : expr.selectionEnd;
				expr.value = expr.value.slice(0, s0) + text + expr.value.slice(s1);
				var c = s0 + text.length;
				expr.focus();
				expr.setSelectionRange(c, c);
			}

			function press(k) {
				if (k === '#clear') {
					expr.value = '';
				} else if (k === '#back') {
					var s0 = expr.selectionStart, s1 = expr.selectionEnd;
					if (s0 !== s1) {
						expr.value = expr.value.slice(0, s0) + expr.value.slice(s1);
						expr.setSelectionRange(s0, s0);
					} else if (s0 > 0) {
						expr.value = expr.value.slice(0, s0 - 1) + expr.value.slice(s0);
						expr.setSelectionRange(s0 - 1, s0 - 1);
					}
					expr.focus();
				} else if (k === '#neg') {
					expr.value = expr.value ? '-(' + expr.value + ')' : '-';
					expr.focus();
				} else if (k === '#eq') {
					var r = evaluate(true);
					if (r) {
						expr.select();
					}
					return;
				} else {
					insertAtCaret(k);
				}
				evaluate(false);
			}

			expr.addEventListener('input', function () {
				evaluate(false);
			});
			expr.addEventListener('keydown', function (e) {
				if (e.key === 'Enter') {
					e.preventDefault();
					press('#eq');
				}
			});
			angle.addEventListener('click', function () {
				calcState.angle = calcState.angle === 'deg' ? 'rad' : 'deg';
				storeSet('editorplus:calc-angle', calcState.angle);
				showAngle();
				evaluate(false);
			});
			mem.forEach(function (b) {
				b.addEventListener('click', function () {
					var m = b.getAttribute('data-mem');
					var cur = calcState.last ? calcState.last.r.value : null;
					if (m === 'MC') {
						calcState.mem = null;
					} else if (m === 'MR') {
						if (calcState.mem) {
							insertAtCaret('(' + window.EditorPlusCalc.format(calcState.mem, {decimal: '.'}).replace(/ /g, '').replace('−', '-') + ')');
							evaluate(false);
						}
					} else if (cur) {
						var base = calcState.mem || {re: 0, im: 0};
						var sign = m === 'M+' ? 1 : -1;
						calcState.mem = {re: base.re + sign * cur.re, im: base.im + sign * cur.im};
					}
					showMem();
				});
			});
			constSel.addEventListener('change', function () {
				if (constSel.value) {
					insertAtCaret(constSel.value);
					constSel.value = '';
					evaluate(false);
				}
			});
			funcSel.addEventListener('change', function () {
				if (funcSel.value) {
					insertAtCaret(funcSel.value);
					funcSel.value = '';
					evaluate(false);
				}
			});
			insRes.addEventListener('click', function () {
				if (calcState.last) {
					closeDialog();
					insertText(calcState.last.r.text);
				}
			});
			insCalc.addEventListener('click', function () {
				if (calcState.last) {
					closeDialog();
					insertText(calcState.last.src + ' = ' + calcState.last.r.text);
				}
			});
			insTex.addEventListener('click', function () {
				if (calcState.last) {
					closeDialog();
					insertText('[math]' + calcState.last.r.tex + ' = ' + calcState.last.r.resultTex + '[/math]');
				}
			});

			function showTab(name) {
				if ((name === 'formula' && tabF.hidden) || (name === 'calc' && tabC.hidden)) {
					name = tabF.hidden ? 'calc' : 'formula';
				}
				[tabF, tabC].forEach(function (t) {
					var on = t.getAttribute('data-tab') === name;
					t.classList.toggle('ep-on', on);
					t.setAttribute('aria-selected', on ? 'true' : 'false');
				});
				paneF.hidden = name !== 'formula';
				paneC.hidden = name !== 'calc';
				mathDlg.tab = name;
				// la griglia dei simboli si prepara la prima volta che si vede la scheda Formula, da qualunque parte si arrivi
				if (name === 'formula' && !mathDlg.catShown) {
					mathDlg.catShown = true;
					showCat(0);
				}
				(name === 'formula' ? area : expr).focus();
			}
			tabF.addEventListener('click', function () {
				showTab('formula');
			});
			tabC.addEventListener('click', function () {
				showTab('calc');
			});

			showAngle();
			showMem();
			refreshIns();
			mathDlg = {dialog: d, area: area, expr: expr, preview: preview, showTab: showTab, showCat: showCat, evaluate: evaluate, tab: 'formula'};
			return mathDlg;
		}

		function openMath(tab) {
			mathDlg = mathDlg || buildMathDialog();
			var selected = (typeof wy !== 'undefined' && wy.on) ? '' : ta.value.slice(ta.selectionStart, ta.selectionEnd);
			mathDlg.dialog.onOpen = function () {
				mathDlg.showTab(tab);
				if (tab === 'formula') {
					if (selected) {
						// una formula già scritta ([math]…[/math] o LaTeX) si riprende per modificarla
						var m = /^\[(i?math)\]([\s\S]*)\[\/\1\]$/i.exec(selected.trim());
						mathDlg.area.value = m ? m[2] : selected;
					}
					mathDlg.preview();
				} else if (selected && !/\n/.test(selected)) {
					mathDlg.expr.value = selected;
					mathDlg.evaluate(false);
				}
			};
			showDialog(mathDlg.dialog);
		}
		return {open: openMath};
	};
})();
