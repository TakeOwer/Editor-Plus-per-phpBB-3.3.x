/**
 * Editor Plus - pagina Check-up (prove dal vivo e aggiornamento di KaTeX).
 * I testi e le impostazioni arrivano dal template in window.EditorPlusCheck.
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 */
(function () {
	'use strict';
	var L = window.EditorPlusCheck.L;
	var CFG = window.EditorPlusCheck.CFG;
	var ICON = {ok: 'fa-check-circle', warn: 'fa-exclamation-triangle', fail: 'fa-times-circle'};

	function setRow(name, status, detail) {
		var row = document.querySelector('[data-live="' + name + '"]');
		if (!row) {
			return;
		}
		row.className = 'ep-check-row ep-check-' + status;
		row.setAttribute('data-status', status);
		var cell = row.querySelector('.ep-check-status');
		if (status === 'run') {
			cell.innerHTML = '<span class="ep-st ep-st-idle"><i class="icon fa-spinner fa-spin fa-fw" aria-hidden="true"></i> ' + L.running + '</span>';
		} else {
			cell.innerHTML = '<span class="ep-st ep-st-' + status + '"><i class="icon ' + ICON[status] + ' fa-fw" aria-hidden="true"></i> ' + L[status] + '</span>';
		}
		row.querySelector('.ep-check-detail').textContent = detail;
	}

	function toB64(text) {
		return btoa(unescape(encodeURIComponent(String(text))));
	}

	/* come la barra: testi codificati; in caso di errore si riporta anche ciò che il server ha risposto */
	function post(url, data) {
		var fd = new FormData();
		Object.keys(data).forEach(function (k) {
			if (k === 'text' || k === 'message' || k === 'subject') {
				fd.append(k + '_b64', toB64(data[k]));
			} else {
				fd.append(k, data[k]);
			}
		});
		return fetch(url, {method: 'POST', body: fd, credentials: 'same-origin', headers: {'X-Requested-With': 'XMLHttpRequest'}}).then(function (r) {
			if (r.ok) {
				return r.json();
			}
			return r.text().then(function (body) {
				var detail = '';
				try {
					var j = JSON.parse(body);
					detail = (j.error || '') + (j.detail ? ' – ' + j.detail : '');
				} catch (e) {
					var m = body.match(/<title>([^<]*)<\/title>/i) || body.match(/<p>([^<]{5,200})<\/p>/i);
					detail = m ? m[1] : body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
				}
				throw new Error('HTTP ' + r.status + (detail ? ' – ' + L.serverSaid + ' ' + detail : ''));
			});
		});
	}

	/* 1) la barra nella pagina di scrittura vera */
	function liveBar() {
		return new Promise(function (resolve) {
			if (!CFG.posting) {
				setRow('bar', 'warn', L.noForum);
				return resolve();
			}
			setRow('bar', 'run', '');
			var frame = document.getElementById('ep-live-frame');
			var started = Date.now();
			var done = false;
			function finish(status, detail) {
				if (done) {
					return;
				}
				done = true;
				setRow('bar', status, detail);
				frame.src = 'about:blank';
				resolve();
			}
			// limite complessivo: se la pagina non si carica nemmeno (riquadro vietato dal server) non si resta in attesa
			var guard = setTimeout(function () {
				var blocked = false;
				try {
					blocked = !frame.contentDocument || frame.contentDocument.URL === 'about:blank';
				} catch (e) {
					blocked = true;
				}
				finish('fail', blocked ? L.barFrame : L.barNone);
			}, 20000);
			var baseFinish = finish;
			finish = function (status, detail) {
				clearTimeout(guard);
				baseFinish(status, detail);
			};
			frame.onload = function () {
				var poll = setInterval(function () {
					var w, d;
					try {
						w = frame.contentWindow;
						d = frame.contentDocument;
					} catch (e) {
						clearInterval(poll);
						return finish('fail', L.barFrame + ' (' + e.message + ')');
					}
					if (!d || d.URL === 'about:blank') {
						return;
					}
					var ep = w && w.EditorPlus;
					if (ep && ep.status && ep.status.ready) {
						clearInterval(poll);
						var st = ep.status;
						var bar = d.querySelector('#abbc3_buttons[data-ep-ready]') ? 'ABBC3' : (d.querySelector('#format-buttons[data-ep-ready]') ? 'phpBB' : '?');
						var info = L.barOk
							.replace('%1$s', st.version)
							.replace('%2$s', bar)
							.replace('%3$d', d.querySelectorAll('[data-ep-ready] .ep-tools [data-ep-action]').length)
							.replace('%4$d', d.querySelectorAll('[data-ep-ready] .ep-menu').length)
							.replace('%5$d', d.querySelectorAll('[data-ep-ready] .ep-img-combo').length);
						var needed = [];
						if (CFG.mathOn && !d.querySelector('[data-ep-ready] [data-ep-action=math]')) {
							needed.push('math');
						}
						if (CFG.calcOn && !d.querySelector('[data-ep-ready] [data-ep-action=calc]')) {
							needed.push('calc');
						}
						// il pulsante del colore deve aprire il pannello delle sfumature
						if (CFG.colorOn && !(w.change_palette && w.change_palette.epColor)) {
							needed.push('color');
						}
						if (needed.length && st.version === CFG.expected) {
							return finish('warn', info + ' — ' + L.barNoMath + ' ' + needed.join(', '));
						}
						if (st.version !== CFG.expected) {
							return finish('fail', L.barOld.replace('%1$s', st.version).replace('%2$s', CFG.expected));
						}
						if (st.errors && st.errors.length) {
							return finish('warn', info + ' — ' + L.barErrors + ' ' + st.errors.join('; '));
						}
						return finish('ok', info);
					}
					if (Date.now() - started > 12000) {
						clearInterval(poll);
						var hasScript = d && Array.prototype.some.call(d.scripts, function (s) {
							return /editorplus\.js/.test(s.src);
						});
						finish('fail', hasScript ? L.barNone : L.barNoScript);
					}
				}, 250);
			};
			frame.src = CFG.posting + (CFG.posting.indexOf('?') === -1 ? '?' : '&') + 'ep_checkup=' + Date.now();
		});
	}

	/* 2) anteprima dal vivo: richiesta vera al server */
	/* 1.0.38: link alle immagini degli utenti (cartella di prova) */
	function loadImage(url) {
		return new Promise(function (resolve) {
			var im = new Image();
			var t = setTimeout(function () {
				resolve(false);
			}, 15000);
			im.onload = function () {
				clearTimeout(t);
				resolve(im.naturalWidth > 0);
			};
			im.onerror = function () {
				clearTimeout(t);
				resolve(false);
			};
			im.src = url + (url.indexOf('?') === -1 ? '?' : '&') + 't=' + Date.now();
		});
	}

	function liveImages() {
		var P = CFG.imgProbe;
		if (!P) {
			setRow('img_direct', 'warn', L.imgNoProbe);
			setRow('img_php', 'warn', L.imgNoProbe);
			setRow('img_route', 'warn', L.imgNoProbe);
			return Promise.resolve();
		}
		setRow('img_direct', 'run', '');
		setRow('img_php', 'run', '');
		setRow('img_route', 'run', '');
		return loadImage(P.image).then(function (ok) {
			setRow('img_direct', ok ? 'ok' : (P.mode === 'direct' ? 'fail' : 'warn'), (ok ? L.imgOk : L.imgFail + ' — ' + L.imgDirectHint) + ' · ' + P.image);
			return fetch(P.php + '?t=' + Date.now(), {credentials: 'omit', cache: 'no-store'}).then(function (r) {
				return r.text();
			}).catch(function () {
				return '';
			});
		}).then(function (body) {
			var ran = body.indexOf('EP-PHP-42') !== -1;
			setRow('img_php', ran ? 'fail' : 'ok', ran ? L.imgPhpFail + ' — ' + L.imgPhpHint : L.imgPhpOk);
			return loadImage(P.route);
		}).then(function (ok) {
			setRow('img_route', ok ? 'ok' : (P.mode === 'route' ? 'fail' : 'warn'), (ok ? L.imgOk : L.imgFail) + ' · ' + P.route);
		});
	}

	function liveRender() {
		setRow('render', 'run', '');
		return post(CFG.render, {hash: CFG.renderHash, text: '[b]Editor Plus[/b] [syntax=php]echo 1;[/syntax]'}).then(function (res) {
			var html = (res && res.html) || '';
			if (/<strong/i.test(html) && /ep-syntax/.test(html)) {
				setRow('render', 'ok', L.renderOk);
			} else {
				setRow('render', 'fail', L.renderFail + ' ' + (res && res.error ? res.error : html.slice(0, 120)));
			}
		}).catch(function (e) {
			setRow('render', 'fail', L.renderFail + ' ' + e.message);
		});
	}

	/* 3) bozze sul server: prima una bozza semplice, poi una con emoji e HTML (distingue le cause) */
	function draftRound(key, text) {
		return post(CFG.draft, {hash: CFG.draftHash, action: 'save', key: key, message: text, subject: 'Check-up'}).then(function (r1) {
			if (!r1 || !r1.saved) {
				throw new Error(JSON.stringify(r1));
			}
			return post(CFG.draft, {hash: CFG.draftHash, action: 'load', key: key});
		}).then(function (r2) {
			if (!r2 || !r2.draft || r2.draft.m !== text) {
				throw new Error('load');
			}
			return post(CFG.draft, {hash: CFG.draftHash, action: 'delete', key: key});
		}).then(function () {
			return post(CFG.draft, {hash: CFG.draftHash, action: 'load', key: key});
		}).then(function (r4) {
			if (r4 && r4.draft) {
				throw new Error('delete');
			}
		});
	}

	function liveDraft() {
		setRow('draft', 'run', '');
		var key = 'checkup/editorplus';
		return draftRound(key, 'Check-up semplice ' + Date.now()).then(function () {
			return draftRound(key, 'Check-up ' + Date.now() + ' & <b>test</b> àè 😀 [syntax=html]<div class="x"></div>[/syntax]').then(function () {
				setRow('draft', 'ok', L.draftOk);
			}, function (e) {
				setRow('draft', 'fail', L.draftSpecial + ' ' + e.message);
			});
		}).catch(function (e) {
			setRow('draft', 'fail', L.draftFail + ' ' + e.message);
		});
	}


	/* 1.0.42: conferme con la finestra integrata di phpBB (come le altre conferme dell'ACP), non quella del browser */
	function esc(t) {
		return String(t).replace(/[&<>"]/g, function (c) {
			return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c];
		});
	}

	function niceConfirm(message) {
		return new Promise(function (resolve) {
			var $ = window.jQuery;
			var box = document.getElementById('phpbb_confirm');
			if (!$ || !window.phpbb || typeof window.phpbb.confirm !== 'function' || !box) {
				resolve(window.confirm(message));
				return;
			}
			var done = false, seen = false, timer = null;
			var finish = function (ok) {
				if (!done) {
					done = true;
					clearInterval(timer);
					resolve(!!ok);
				}
			};
			window.phpbb.confirm('<h3>' + esc(L.confirmTitle) + '</h3><p>' + esc(message) + '</p><fieldset class="submit-buttons">' +
				'<input type="button" name="confirm" value="' + esc(L.yes) + '" class="button2">&nbsp;<input type="button" name="cancel" value="' + esc(L.no) + '" class="button2"></fieldset>', finish);
			// chiusa senza rispondere (clic fuori o sulla X): vale come "No"
			timer = setInterval(function () {
				if ($(box).is(':visible')) {
					seen = true;
				} else if (seen && !$(box).is(':animated')) {
					finish(false);
				}
			}, 150);
		});
	}

	/* ---------------- KaTeX: prova in un riquadro isolato (versione in uso o preparata) ---------------- */
	var MATH_SAMPLES = [
		['x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}', true],
		['\\int_0^\\infty e^{-x^2}\\,dx = \\frac{\\sqrt{\\pi}}{2} \\quad \\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}', true],
		['\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} \\begin{cases} x+y=1 \\\\ x-y=0 \\end{cases}', true],
		['\\ce{CH4 + 2O2 -> CO2 + 2H2O}', true],
		['\\ce{^{14}_{6}C -> ^{14}_{7}N + e-}', true],
		['\\alpha^2 + \\beta_1 \\neq \\hbar\\omega', false]
	];

	function katexUrls(kind) {
		if (kind === 'staging') {
			var b = CFG.katexStaging, v = '?t=' + Date.now();
			return {css: b + 'katex.min.css' + v, js: b + 'katex.min.js' + v, mhchem: b + 'mhchem.min.js' + v};
		}
		var a = CFG.katexActive, t = '?t=' + Date.now();
		return {css: a + 'theme/math/katex.min.css' + t, js: a + 'template/js/math/katex.min.js' + t, mhchem: a + 'template/js/math/mhchem.min.js' + t};
	}

	/* @return Promise<{ok, version, drawn, total, fonts, error}> */
	function testKatex(kind, onStep) {
		return new Promise(function (resolve) {
			var u = katexUrls(kind);
			var frame = document.getElementById('ep-katex-frame');
			var done = false;
			var guard = setTimeout(function () {
				finish({ok: false, error: 'timeout'});
			}, 20000);
			function finish(res) {
				if (done) {
					return;
				}
				done = true;
				clearTimeout(guard);
				resolve(res);
			}
			frame.onload = function () {
				var w = frame.contentWindow, d = frame.contentDocument;
				var tries = 0;
				var poll = setInterval(function () {
					if (w.katex && w.katex.__defineMacro && w.EP_MHCHEM_LOADED) {
						clearInterval(poll);
						var out = d.getElementById('o');
						var drawn = 0, errors = [];
						var steps = MATH_SAMPLES.length + 1;
						var nextFrame = function () {
							return new Promise(function (r) {
								requestAnimationFrame(function () {
									setTimeout(r, 0);
								});
							});
						};
						var chain = Promise.resolve();
						MATH_SAMPLES.forEach(function (s, i) {
							chain = chain.then(nextFrame).then(function () {
								var box = d.createElement('div');
								out.appendChild(box);
								try {
									w.katex.render(s[0], box, {displayMode: s[1], throwOnError: true, trust: false, strict: 'ignore'});
									drawn++;
								} catch (e) {
									errors.push(e.message);
								}
								if (onStep) {
									onStep(i + 1, steps);
								}
							});
						});
						chain.then(function () {
						var fontsOk = function () {
							return d.fonts.check('1em KaTeX_Main') && d.fonts.check('italic 1em KaTeX_Math');
						};
						Promise.all([d.fonts.load('1em KaTeX_Main'), d.fonts.load('italic 1em KaTeX_Math'), d.fonts.load('1em KaTeX_Size2')]).then(function (loaded) {
							var fonts = fontsOk() && loaded.every(function (l) {
								return l && l.length > 0;
							});
							if (onStep) {
								onStep(steps, steps);
							}
							finish({ok: drawn === MATH_SAMPLES.length && fonts, version: w.katex.version, drawn: drawn, total: MATH_SAMPLES.length, fonts: fonts, error: errors[0] || ''});
						}, function () {
							finish({ok: false, version: w.katex.version, drawn: drawn, total: MATH_SAMPLES.length, fonts: false, error: errors[0] || 'fonts'});
						});
						});
					} else if (++tries > 60) {
						clearInterval(poll);
						finish({ok: false, error: 'katex non caricato'});
					}
				}, 200);
			};
			frame.srcdoc = '<!DOCTYPE html><html><head><meta charset="utf-8"><link rel="stylesheet" href="' + u.css + '"></head><body><div id="o"></div>' +
				'<script src="' + u.js + '"><\/script><script src="' + u.mhchem + '" onload="window.EP_MHCHEM_LOADED=1"><\/script></body></html>';
		});
	}

	function describeKatex(r) {
		if (r.ok) {
			return L.mathOk.replace('%1$s', r.version).replace('%2$d', r.drawn).replace('%3$d', r.total);
		}
		var parts = [L.mathFail];
		if (r.version) {
			parts.push('KaTeX ' + r.version);
		}
		if (typeof r.drawn === 'number') {
			parts.push(r.drawn + '/' + r.total);
		}
		if (r.fonts === false) {
			parts.push(L.mathFonts);
		}
		if (r.error) {
			parts.push(r.error);
		}
		return parts.join(' · ');
	}

	/* 4) formule: KaTeX in uso, nel browser */
	function liveMath() {
		if (!CFG.mathOn) {
			setRow('math', 'ok', L.off);
			return Promise.resolve();
		}
		setRow('math', 'run', '');
		return testKatex('active').then(function (r) {
			setRow('math', r.ok ? 'ok' : 'fail', describeKatex(r));
		});
	}

	/* 5) calcolatrice: calcoli di cui si conosce il risultato */
	var CALC_SAMPLES = [
		['2+3*4', {}, '14'], ['sqrt(-4)', {}, '2i'], ['(3+4i)/(1-2i)', {}, '-1 + 2i'], ['sin(30)', {angle: 'deg'}, '0.5'],
		['e^(i*pi)', {}, '-1'], ['nCr(10;3)', {}, '120'], ['5!', {}, '120'], ['h*c/(500e-9)', {}, '3.9728917143e-19'],
		['1/0', {}, '#DIV_ZERO'], ['constructor', {}, '#UNKNOWN']
	];

	function loadCalcEngine() {
		if (window.EditorPlusCalc) {
			return Promise.resolve(window.EditorPlusCalc);
		}
		return new Promise(function (resolve, reject) {
			var s = document.createElement('script');
			s.src = CFG.calcEngine;
			s.onload = function () {
				window.EditorPlusCalc ? resolve(window.EditorPlusCalc) : reject(new Error('engine'));
			};
			s.onerror = function () {
				reject(new Error('HTTP'));
			};
			document.head.appendChild(s);
		});
	}

	function liveCalc() {
		if (!CFG.calcOn) {
			setRow('calc', 'ok', L.off);
			return Promise.resolve();
		}
		setRow('calc', 'run', '');
		return loadCalcEngine().then(function (C) {
			var wrong = [];
			CALC_SAMPLES.forEach(function (t) {
				var r = C.calc(t[0], Object.assign({decimal: '.'}, t[1]));
				var got = r.ok ? r.text : '#' + r.error;
				if (got !== t[2]) {
					wrong.push(t[0] + ' → ' + got + ' (' + t[2] + ')');
				}
			});
			if (wrong.length) {
				setRow('calc', 'fail', L.calcFail + ' ' + wrong.join('; '));
			} else {
				setRow('calc', 'ok', L.calcOk.replace(/%1\$d/g, CALC_SAMPLES.length));
			}
		}).catch(function (e) {
			setRow('calc', 'fail', L.calcFail + ' ' + e.message);
		});
	}


	/* ---------------- barra di avanzamento dell'aggiornamento (dati reali dal server) ---------------- */
	var PH_PREPARE = ['check', 'download', 'verify', 'extract', 'stage', 'test'];
	var PH_SWAP = ['backup', 'install'];
	var prog = {box: document.getElementById('ep-kprog'), bar: document.getElementById('ep-kprog-bar'), phase: document.getElementById('ep-kprog-phase'),
		step: document.getElementById('ep-kprog-step'), pct: document.getElementById('ep-kprog-pct'), detail: document.getElementById('ep-kprog-detail'),
		list: [], op: '', timer: null, last: null};

	function fmtBytes(n) {
		var s = n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(0, Math.round(n / 1024)) + ' KB';
		return L.decimal === ',' ? s.replace('.', ',') : s;
	}

	function showProgress(phase, done, total, pct) {
		var i = prog.list.indexOf(phase);
		prog.box.hidden = false;
		prog.box.classList.remove('ep-kprog-error', 'ep-kprog-done');
		prog.phase.textContent = L.phase[phase] || phase;
		prog.step.textContent = i >= 0 ? L.kStep.replace('%1$d', i + 1).replace('%2$d', prog.list.length) : '';
		prog.bar.style.width = pct + '%';
		prog.pct.textContent = pct + '%';
		prog.box.setAttribute('aria-valuenow', String(pct));
		var detail = '';
		if (phase === 'download') {
			detail = total > 0 ? L.kBytes.replace('%1$s', fmtBytes(done)).replace('%2$s', fmtBytes(total)) : fmtBytes(done);
		} else if (phase === 'extract') {
			detail = total > 0 ? L.kBytes.replace('%1$s', fmtBytes(done)).replace('%2$s', fmtBytes(total)) : '';
		} else if (phase === 'stage' || phase === 'backup' || phase === 'install') {
			detail = L.kFiles.replace('%1$d', done).replace('%2$d', total);
		} else if (phase === 'test') {
			detail = L.kFormulas.replace('%1$d', done).replace('%2$d', total);
		}
		prog.detail.textContent = detail;
	}

	function pollProgress() {
		katexPost('progress', {op: prog.op}).then(function (p) {
			// solo lo stato di QUESTA operazione (non quello rimasto da una precedente)
			if (!p || p.op !== prog.op || prog.list.indexOf(p.phase) === -1) {
				return;
			}
			prog.last = p;
			showProgress(p.phase, p.done, p.total, p.pct);
		}).catch(function () { /* il prossimo giro riprova */ });
	}

	function startProgress(list) {
		prog.list = list;
		prog.op = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
		prog.last = null;
		showProgress(list[0], 0, 0, 0);
		clearInterval(prog.timer);
		prog.timer = setInterval(pollProgress, 250);
		return prog.op;
	}

	function stopProgress() {
		clearInterval(prog.timer);
		prog.timer = null;
	}

	/* stato definitivo scritto dal server: in quale fase ci si è fermati o conclusi, e fin dove */
	function finalState() {
		return katexPost('progress', {op: prog.op}).then(function (p) {
			return p && p.op === prog.op ? p : null;
		}, function () {
			return null;
		});
	}

	/* errore: la barra si ferma nel punto raggiunto, diventa rossa e dice perché */
	function failProgress(message) {
		stopProgress();
		finalState().then(function (p) {
			if (p && p.at && prog.list.indexOf(p.at) !== -1) {
				var pct = p.at_total > 0 ? Math.floor(p.at_done * 100 / p.at_total) : 0;
				showProgress(p.at, p.at_done, p.at_total, pct);
			}
			prog.box.hidden = false;
			prog.box.classList.add('ep-kprog-error');
			prog.detail.textContent = L.kFailedAt.replace('%s', prog.phase.textContent) + ' ' + message;
		});
	}

	/* fine di attivazione o ripristino: conteggi reali dell'ultima fase, poi il messaggio */
	function finishSwap(text) {
		stopProgress();
		return finalState().then(function (p) {
			if (p && p.at && prog.list.indexOf(p.at) !== -1) {
				showProgress(p.at, p.at_done, p.at_total, 100);
			}
			var files = prog.detail.textContent;
			doneProgress(text + (files ? ' (' + prog.phase.textContent + ': ' + files + ')' : ''));
		});
	}

	function doneProgress(text) {
		stopProgress();
		prog.bar.style.width = '100%';
		prog.pct.textContent = '100%';
		prog.box.setAttribute('aria-valuenow', '100');
		prog.box.classList.add('ep-kprog-done');
		prog.detail.textContent = text || L.kDone;
	}

	/* ---------------- aggiornamento di KaTeX ---------------- */
	var kMsg = document.getElementById('ep-katex-msg');
	var kOffer = document.getElementById('ep-katex-offer');
	var kActivate = document.getElementById('ep-katex-activate');
	var kDiscard = document.getElementById('ep-katex-discard');
	var kRestore = document.getElementById('ep-katex-restore');
	var kStageRow = document.getElementById('ep-katex-stage-row');
	var kTest = document.getElementById('ep-katex-test');

	function katexPost(action, extra) {
		var fd = new FormData();
		fd.append('katex_action', action);
		fd.append('hash', CFG.katexHash);
		Object.keys(extra || {}).forEach(function (k) {
			fd.append(k, extra[k]);
		});
		return fetch(CFG.action, {method: 'POST', body: fd, credentials: 'same-origin', headers: {'X-Requested-With': 'XMLHttpRequest'}})
			.then(function (r) {
				return r.json();
			})
			.then(function (j) {
				if (!j || !j.ok) {
					throw new Error((j && j.error ? j.error : 'error') + (j && j.detail ? ' (' + j.detail + ')' : ''));
				}
				return j.result;
			});
	}

	function busy(on, text) {
		['ep-katex-check', 'ep-katex-activate', 'ep-katex-discard', 'ep-katex-restore'].forEach(function (id) {
			var b = document.getElementById(id);
			if (on) {
				b.setAttribute('data-was', b.disabled ? '1' : '0');
				b.disabled = true;
			} else {
				b.disabled = b.getAttribute('data-was') === '1';
			}
		});
		kOffer.querySelectorAll('button').forEach(function (b) {
			b.disabled = on;
		});
		kMsg.textContent = text || '';
	}

	/* prova della versione preparata: "Attiva" si abilita solo se passa */
	function testStaged() {
		kStageRow.hidden = false;
		kTest.textContent = L.kWorking;
		kActivate.hidden = false;
		kActivate.disabled = true;
		kDiscard.hidden = false;
		if (prog.list !== PH_PREPARE) {
			prog.list = PH_PREPARE;
		}
		showProgress('test', 0, MATH_SAMPLES.length + 1, 0);
		return testKatex('staging', function (n, tot) {
			showProgress('test', n, tot, Math.floor(n * 100 / tot));
		}).then(function (r) {
			if (r.ok) {
				doneProgress(L.kTestOk + ' ' + describeKatex(r));
			} else {
				failProgress(describeKatex(r));
			}
			kTest.textContent = r.ok ? L.kTestOk + ' ' + describeKatex(r) : L.kTestFail + ' ' + describeKatex(r);
			kStageRow.className = 'ep-check-row ' + (r.ok ? 'ep-check-ok' : 'ep-check-fail');
			kActivate.disabled = !r.ok;
			return r;
		});
	}

	function offerButton(o, other) {
		var b = document.createElement('button');
		b.type = 'button';
		b.className = other ? 'button2' : 'button1';
		b.textContent = L.kPrepare.replace('%s', o.version);
		b.addEventListener('click', function () {
			(other ? niceConfirm(L.kConfirmOther.replace('%s', o.version)) : Promise.resolve(true)).then(function (ok) {
				if (!ok) {
					return;
				}
				busy(true, '');
				var op = startProgress(PH_PREPARE);
				katexPost('prepare', {version: o.version, op: op}).then(function (res) {
					stopProgress();
					document.getElementById('ep-katex-staged').textContent = res.version;
					busy(false, '');
					return testStaged();
				}).catch(function (e) {
					failProgress(e.message);
					busy(false, '');
				});
			});
		});
		return b;
	}

	document.getElementById('ep-katex-check').addEventListener('click', function () {
		busy(true, L.kWorking);
		katexPost('check').then(function (res) {
			busy(false, '');
			kOffer.textContent = '';
			if (!res.same && !res.latest) {
				kOffer.textContent = L.kNone.replace('%s', res.installed);
				return;
			}
			if (res.same) {
				var p1 = document.createElement('div');
				p1.appendChild(document.createTextNode(L.kSame.replace('%s', res.same.version) + ' '));
				p1.appendChild(offerButton(res.same, false));
				kOffer.appendChild(p1);
			}
			if (res.latest) {
				var p2 = document.createElement('div');
				p2.className = 'ep-katex-other';
				p2.appendChild(document.createTextNode(L.kOther.replace('%s', res.latest.version) + ' '));
				p2.appendChild(offerButton(res.latest, true));
				var w = document.createElement('div');
				w.className = 'ep-check-hint';
				w.textContent = L.kOtherWarn;
				p2.appendChild(w);
				kOffer.appendChild(p2);
			}
		}).catch(function (e) {
			busy(false, e.message);
		});
	});

	kActivate.addEventListener('click', function () {
		busy(true, '');
		var op = startProgress(PH_SWAP);
		katexPost('activate', {op: op}).then(function (res) {
			finishSwap(L.kActivated.replace('%s', res.version));
			busy(false, '');
			setTimeout(function () {
				window.location.href = CFG.action;
			}, 2200);
		}).catch(function (e) {
			failProgress(e.message);
			busy(false, '');
		});
	});

	kDiscard.addEventListener('click', function () {
		busy(true, L.kWorking);
		katexPost('discard').then(function () {
			busy(false, L.kDiscarded);
			kStageRow.hidden = true;
			kActivate.hidden = true;
			kDiscard.hidden = true;
		}).catch(function (e) {
			busy(false, e.message);
		});
	});

	kRestore.addEventListener('click', function () {
		niceConfirm(L.kConfirmRestore.replace('%s', kRestore.getAttribute('data-version'))).then(function (ok) {
			if (!ok) {
				return;
			}
			busy(true, '');
			var op = startProgress(PH_SWAP);
			katexPost('restore', {op: op}).then(function (res) {
				finishSwap(L.kRestored.replace('%s', res.version));
				busy(false, '');
				setTimeout(function () {
					window.location.href = CFG.action;
				}, 2200);
			}).catch(function (e) {
				failProgress(e.message);
				busy(false, '');
			});
		});
	});

	/* una versione già preparata (per esempio pagina ricaricata): la si riprova subito */
	if (!kStageRow.hidden) {
		testStaged();
	}

	var runBtn = document.getElementById('ep-live-run');
	runBtn.addEventListener('click', function () {
		runBtn.disabled = true;
		liveRender().then(liveImages).then(liveDraft).then(liveMath).then(liveCalc).then(liveBar).then(function () {
			runBtn.disabled = false;
		});
	});

	/* referto in testo semplice, da incollare in una richiesta di aiuto */
	document.getElementById('ep-copy-report').addEventListener('click', function () {
		var out = [L.reportTitle + ' — Editor Plus ' + CFG.expected + ' — ' + CFG.time, ''];
		Array.prototype.forEach.call(document.querySelectorAll('.ep-check-group'), function (fs) {
			out.push('== ' + fs.querySelector('legend').textContent.trim() + ' ==');
			Array.prototype.forEach.call(fs.querySelectorAll('.ep-check-row'), function (row) {
				var st = row.getAttribute('data-status') || '-';
				out.push('[' + (L[st] || '-') + '] ' + row.querySelector('.ep-check-label').textContent.trim() + ': ' +
					row.querySelector('.ep-check-detail').textContent.replace(/\s+/g, ' ').trim());
			});
			out.push('');
		});
		var text = out.join('\n');
		var done = function () {
			var s = document.getElementById('ep-copy-done');
			s.hidden = false;
			setTimeout(function () {
				s.hidden = true;
			}, 2500);
		};
		if (navigator.clipboard && navigator.clipboard.writeText) {
			navigator.clipboard.writeText(text).then(done, function () {});
		} else {
			var t = document.createElement('textarea');
			t.value = text;
			document.body.appendChild(t);
			t.select();
			try {
				document.execCommand('copy');
				done();
			} catch (e) { /* ignora */ }
			document.body.removeChild(t);
		}
	});
})();
