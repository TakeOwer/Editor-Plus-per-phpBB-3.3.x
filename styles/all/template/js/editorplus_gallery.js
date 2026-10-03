/**
 * Editor Plus 1.0.38 - immagini degli utenti: parti comuni a editor, Pannello utente e ACP.
 *
 * - open(): ingrandimento con frecce, tastiera, scorrimento col dito e scheda dei dettagli
 * - upload(): caricamento con percentuale reale (XMLHttpRequest)
 * - prepare(): rimpicciolisce nel browser le foto troppo grandi prima di inviarle
 *   (meno attesa, meno memoria sul server); le immagini animate non vengono toccate
 * - grid(): selezione multipla con "seleziona tutte" e pulsanti attivi solo con una selezione
 * - uploader(): zona di caricamento con una barra per ogni file
 *
 * Testi: window.EditorPlusGalleryLang (chiavi EP_IMG_...).
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 */
(function () {
	'use strict';

	if (window.EditorPlusGallery) {
		return;
	}

	var TYPES = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp'};

	function lang(key) {
		var L = window.EditorPlusGalleryLang || {};
		return Object.prototype.hasOwnProperty.call(L, key) ? L[key] : key;
	}

	function format(str) {
		var args = Array.prototype.slice.call(arguments, 1);
		var i = 0;
		return String(str).replace(/%(\d+\$)?[ds]/g, function (m, pos) {
			var v = pos ? args[parseInt(pos, 10) - 1] : args[i++];
			return v === undefined ? m : v;
		});
	}

	function el(tag, attrs, children) {
		var node = document.createElement(tag);
		Object.keys(attrs || {}).forEach(function (k) {
			var v = attrs[k];
			if (k === 'text') {
				node.textContent = v;
			} else if (k === 'className') {
				node.className = v;
			} else if (v !== null && v !== undefined && v !== false) {
				node.setAttribute(k, v === true ? '' : v);
			}
		});
		(children || []).forEach(function (c) {
			if (c) {
				node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
			}
		});
		return node;
	}

	function icon(name) {
		return el('i', {className: 'fa fa-fw ' + name, 'aria-hidden': 'true'});
	}

	function formatSize(bytes) {
		bytes = Number(bytes) || 0;
		if (bytes >= 1048576) {
			return (bytes / 1048576).toFixed(1).replace('.', ',') + ' MB';
		}
		return Math.max(1, Math.round(bytes / 1024)) + ' KB';
	}

	/* ------------------------------------------------------------------ */
	/* Copia negli appunti                                                 */
	/* ------------------------------------------------------------------ */

	function copy(text) {
		if (navigator.clipboard && window.isSecureContext) {
			return navigator.clipboard.writeText(text).then(function () {
				return true;
			}, function () {
				return fallbackCopy(text);
			});
		}
		return Promise.resolve(fallbackCopy(text));
	}

	function fallbackCopy(text) {
		var ta = el('textarea', {readonly: true, style: 'position:fixed;left:-9999px;top:0;opacity:0'});
		ta.value = text;
		document.body.appendChild(ta);
		ta.select();
		var ok = false;
		try {
			ok = document.execCommand('copy');
		} catch (e) {
			ok = false;
		}
		document.body.removeChild(ta);
		return ok;
	}

	var flashTimer = null;

	function flash(message, bad) {
		var box = document.querySelector('.epg-flash');
		if (!box) {
			box = el('div', {className: 'epg-flash', role: 'status', 'aria-live': 'polite'});
			document.body.appendChild(box);
		}
		box.textContent = message;
		box.classList.toggle('epg-flash-bad', !!bad);
		box.classList.add('epg-flash-on');
		clearTimeout(flashTimer);
		flashTimer = setTimeout(function () {
			box.classList.remove('epg-flash-on');
		}, bad ? 5000 : 2200);
	}

	function copyAndTell(text) {
		return copy(text).then(function (ok) {
			flash(ok ? lang('EP_IMG_COPIED') : lang('EP_IMG_COPY_FAIL'), !ok);
			return ok;
		});
	}

	/* ------------------------------------------------------------------ */
	/* Ingrandimento                                                        */
	/* ------------------------------------------------------------------ */

	var lb = null;

	function buildLightbox() {
		var img = el('img', {className: 'epg-lb-img', alt: ''});
		var spinner = el('div', {className: 'epg-lb-spin'}, [icon('fa-spinner fa-spin')]);
		var prev = el('button', {type: 'button', className: 'epg-lb-nav epg-lb-prev', title: lang('EP_IMG_PREV'), 'aria-label': lang('EP_IMG_PREV')}, [icon('fa-chevron-left')]);
		var next = el('button', {type: 'button', className: 'epg-lb-nav epg-lb-next', title: lang('EP_IMG_NEXT'), 'aria-label': lang('EP_IMG_NEXT')}, [icon('fa-chevron-right')]);
		var close = el('button', {type: 'button', className: 'epg-lb-close', title: lang('EP_IMG_CLOSE'), 'aria-label': lang('EP_IMG_CLOSE')}, [icon('fa-times')]);
		var counter = el('span', {className: 'epg-lb-count'});
		var title = el('strong', {className: 'epg-lb-title'});
		var details = el('dl', {className: 'epg-lb-details'});
		var actions = el('div', {className: 'epg-lb-actions'});
		var extra = el('div', {className: 'epg-lb-extra'});
		var stage = el('div', {className: 'epg-lb-stage'}, [spinner, img, prev, next]);
		var info = el('div', {className: 'epg-lb-info'}, [el('div', {className: 'epg-lb-head'}, [title, counter]), details, actions, extra]);
		var box = el('div', {className: 'epg-lb-box', role: 'dialog', 'aria-modal': 'true'}, [close, stage, info]);
		var overlay = el('div', {className: 'epg-lb', hidden: true}, [box]);
		document.body.appendChild(overlay);

		var state = {items: [], index: 0, opts: {}};

		function show(i) {
			var n = state.items.length;
			if (!n) {
				return;
			}
			state.index = (i + n) % n;
			var it = state.items[state.index];
			spinner.hidden = false;
			img.classList.remove('epg-lb-ready');
			img.onload = function () {
				spinner.hidden = true;
				img.classList.add('epg-lb-ready');
			};
			img.onerror = function () {
				spinner.hidden = true;
				img.classList.add('epg-lb-ready');
				img.alt = lang('EP_IMG_LOAD_FAILED');
			};
			img.alt = it.name || '';
			img.src = it.url;
			title.textContent = it.name || it.file || '';
			title.title = title.textContent;
			counter.textContent = n > 1 ? (state.index + 1) + ' / ' + n : '';
			prev.hidden = next.hidden = n < 2;

			details.innerHTML = '';
			var rows = [
				[lang('EP_IMG_DIMENSIONS'), it.width && it.height ? it.width + ' × ' + it.height + ' px' : ''],
				[lang('EP_IMG_SIZE'), it.sizeText || (it.size ? formatSize(it.size) : '')],
				[lang('EP_IMG_DATE'), it.date || '']
			];
			if (it.ip) {
				rows.push([lang('EP_IMG_IP'), it.ip]);
			}
			rows.push([lang('EP_IMG_FILE'), it.folder ? it.folder + '/' + it.file : (it.file || '')]);
			rows.forEach(function (r) {
				if (r[1]) {
					details.appendChild(el('dt', {text: r[0]}));
					details.appendChild(el('dd', {text: r[1]}));
				}
			});

			var link = el('input', {type: 'text', className: 'inputbox epg-lb-field', readonly: true, 'aria-label': lang('EP_IMG_LINK')});
			link.value = it.url;
			var bb = el('input', {type: 'text', className: 'inputbox epg-lb-field', readonly: true, 'aria-label': lang('EP_IMG_BBCODE')});
			bb.value = it.bbcode || '';
			[link, bb].forEach(function (f) {
				f.addEventListener('focus', function () {
					f.select();
				});
			});
			details.appendChild(el('dt', {text: lang('EP_IMG_LINK')}));
			details.appendChild(el('dd', {className: 'epg-lb-copyrow'}, [link, button('fa-clipboard', lang('EP_IMG_COPY'), function () {
				copyAndTell(it.url);
			}, 'epg-btn-small')]));
			if (it.bbcode) {
				details.appendChild(el('dt', {text: lang('EP_IMG_BBCODE')}));
				details.appendChild(el('dd', {className: 'epg-lb-copyrow'}, [bb, button('fa-clipboard', lang('EP_IMG_COPY'), function () {
					copyAndTell(it.bbcode);
				}, 'epg-btn-small')]));
			}

			actions.innerHTML = '';
			extra.innerHTML = '';
			actions.appendChild(el('a', {className: 'epg-btn', href: it.url, target: '_blank', rel: 'noopener'}, [icon('fa-external-link'), ' ' + lang('EP_IMG_OPEN')]));
			(state.opts.actions ? state.opts.actions(it) : []).forEach(function (a) {
				actions.appendChild(button(a.icon, a.label, function () {
					a.run(it, {extra: extra, close: hide, index: state.index});
				}, a.className));
			});

			// immagini vicine già pronte: lo scorrimento è immediato
			[state.index + 1, state.index - 1].forEach(function (j) {
				var near = state.items[(j + n) % n];
				if (near && near.url) {
					(new Image()).src = near.url;
				}
			});
		}

		function hide() {
			overlay.hidden = true;
			document.documentElement.classList.remove('epg-lb-open');
			img.removeAttribute('src');
			if (state.opts.onClose) {
				state.opts.onClose();
			}
			if (state.returnFocus && state.returnFocus.focus) {
				state.returnFocus.focus();
			}
		}

		prev.addEventListener('click', function () {
			show(state.index - 1);
		});
		next.addEventListener('click', function () {
			show(state.index + 1);
		});
		close.addEventListener('click', hide);
		overlay.addEventListener('mousedown', function (e) {
			if (e.target === overlay) {
				hide();
			}
		});
		document.addEventListener('keydown', function (e) {
			// con la conferma di phpBB aperta, i tasti sono suoi (Esc la chiude senza chiudere l'ingrandimento)
			if (document.documentElement.classList.contains('ep-confirm-open')) {
				return;
			}
			if (overlay.hidden) {
				return;
			}
			var tag = (e.target && e.target.tagName) || '';
			if (e.key === 'Escape') {
				e.preventDefault();
				hide();
			} else if (tag !== 'INPUT' && tag !== 'TEXTAREA' && e.key === 'ArrowLeft') {
				show(state.index - 1);
			} else if (tag !== 'INPUT' && tag !== 'TEXTAREA' && e.key === 'ArrowRight') {
				show(state.index + 1);
			}
		});
		// col dito: scorrere a destra o a sinistra
		var x0 = null;
		stage.addEventListener('touchstart', function (e) {
			x0 = e.touches.length === 1 ? e.touches[0].clientX : null;
		}, {passive: true});
		stage.addEventListener('touchend', function (e) {
			if (x0 === null || !e.changedTouches.length) {
				return;
			}
			var dx = e.changedTouches[0].clientX - x0;
			x0 = null;
			if (Math.abs(dx) > 50) {
				show(state.index + (dx < 0 ? 1 : -1));
			}
		});

		return {
			open: function (items, index, opts) {
				state.items = items || [];
				state.opts = opts || {};
				state.returnFocus = document.activeElement;
				overlay.hidden = false;
				document.documentElement.classList.add('epg-lb-open');
				show(index || 0);
				close.focus();
			},
			close: hide,
			refresh: function (items, index) {
				state.items = items;
				if (!items.length) {
					hide();
				} else {
					show(Math.min(index, items.length - 1));
				}
			}
		};
	}

	function button(iconName, label, onClick, className) {
		var b = el('button', {type: 'button', className: 'epg-btn ' + (className || '')}, [icon(iconName), ' ' + label]);
		b.addEventListener('click', function (e) {
			e.preventDefault();
			onClick(e);
		});
		return b;
	}

	function open(items, index, opts) {
		lb = lb || buildLightbox();
		lb.open(items, index, opts);
		return lb;
	}

	/* ------------------------------------------------------------------ */
	/* Preparazione nel browser                                             */
	/* ------------------------------------------------------------------ */

	function readHead(file, bytes) {
		return new Promise(function (resolve) {
			var r = new FileReader();
			r.onload = function () {
				resolve(new Uint8Array(r.result));
			};
			r.onerror = function () {
				resolve(new Uint8Array(0));
			};
			r.readAsArrayBuffer(file.slice(0, bytes));
		});
	}

	function hasChunk(bytes, name) {
		var a = name.charCodeAt(0), b = name.charCodeAt(1), c = name.charCodeAt(2), d = name.charCodeAt(3);
		for (var i = 0; i < bytes.length - 3; i++) {
			if (bytes[i] === a && bytes[i + 1] === b && bytes[i + 2] === c && bytes[i + 3] === d) {
				return true;
			}
		}
		return false;
	}

	function loadBitmap(file) {
		if (window.createImageBitmap) {
			return createImageBitmap(file, {imageOrientation: 'from-image'}).catch(function () {
				return createImageBitmap(file);
			});
		}
		return new Promise(function (resolve, reject) {
			var url = URL.createObjectURL(file);
			var im = new Image();
			im.onload = function () {
				resolve(im);
			};
			im.onerror = function () {
				URL.revokeObjectURL(url);
				reject(new Error('image'));
			};
			im.src = url;
		});
	}

	function toBlob(canvas, type, quality) {
		return new Promise(function (resolve) {
			canvas.toBlob(function (b) {
				resolve(b);
			}, type, quality);
		});
	}

	/**
	 * Rimpicciolisce l'immagine se supera le misure massime o il peso massimo (solo JPEG, PNG, WebP fissi).
	 * In caso di dubbio restituisce il file originale: il server rifà comunque tutti i controlli.
	 *
	 * @param {File} file
	 * @param {{maxW:number, maxH:number, maxSize:number}} cfg
	 * @return {Promise<{file: File, resized: boolean}>}
	 */
	function prepare(file, cfg) {
		var type = file.type;
		if (!/^image\/(jpeg|png|webp)$/.test(type) || !window.HTMLCanvasElement || !HTMLCanvasElement.prototype.toBlob) {
			return Promise.resolve({file: file, resized: false});
		}
		var maxW = cfg.maxW || 0, maxH = cfg.maxH || 0, maxSize = cfg.maxSize || 0;

		return readHead(file, 262144).then(function (head) {
			// PNG e WebP animati: il disegno su tela terrebbe solo il primo fotogramma
			if ((type === 'image/png' && hasChunk(head, 'acTL')) || (type === 'image/webp' && hasChunk(head, 'ANIM'))) {
				return {file: file, resized: false};
			}
			return loadBitmap(file).then(function (bmp) {
				var w = bmp.width, h = bmp.height;
				var scale = 1;
				if (maxW && w > maxW) {
					scale = Math.min(scale, maxW / w);
				}
				if (maxH && h > maxH) {
					scale = Math.min(scale, maxH / h);
				}
				var tooHeavy = maxSize && file.size > maxSize;
				if (scale >= 1 && !tooHeavy) {
					return {file: file, resized: false};
				}
				var outType = type === 'image/png' && tooHeavy ? 'image/jpeg' : type;
				var attempt = 0;

				function round(s) {
					var nw = Math.max(1, Math.round(w * s)), nh = Math.max(1, Math.round(h * s));
					var canvas = el('canvas');
					canvas.width = nw;
					canvas.height = nh;
					var ctx = canvas.getContext('2d');
					if (outType === 'image/jpeg') {
						ctx.fillStyle = '#fff';
						ctx.fillRect(0, 0, nw, nh);
					}
					ctx.imageSmoothingQuality = 'high';
					ctx.drawImage(bmp, 0, 0, nw, nh);
					return toBlob(canvas, outType, 0.9).then(function (blob) {
						if (blob && maxSize && blob.size > maxSize && attempt < 5) {
							attempt++;
							return round(s * 0.8);
						}
						return blob;
					});
				}

				return round(Math.min(scale, 1)).then(function (blob) {
					if (bmp.close) {
						bmp.close();
					}
					if (!blob || (!tooHeavy && blob.size >= file.size && scale >= 1)) {
						return {file: file, resized: false};
					}
					var ext = TYPES[outType];
					var name = String(file.name || 'immagine').replace(/\.[^.]*$/, '') + '.' + ext;
					var out;
					try {
						out = new File([blob], name, {type: outType});
					} catch (e) {
						out = blob;
						out.name = name;
					}
					return {file: out, resized: true};
				});
			});
		}).catch(function () {
			return {file: file, resized: false};
		});
	}

	/* ------------------------------------------------------------------ */
	/* Caricamento                                                          */
	/* ------------------------------------------------------------------ */

	/**
	 * @param {string} url
	 * @param {File} file
	 * @param {Object} fields  es. {hash: '...'}
	 * @param {function(number)} onProgress percentuale 0-100
	 * @return {Promise<Object>} risposta del server (sempre con ok e, se fallisce, error)
	 */
	function upload(url, file, fields, onProgress) {
		return new Promise(function (resolve) {
			var data = new FormData();
			Object.keys(fields || {}).forEach(function (k) {
				data.append(k, fields[k]);
			});
			data.append('file', file, file.name || 'immagine');

			var xhr = new XMLHttpRequest();
			xhr.open('POST', url, true);
			xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
			xhr.responseType = 'text';
			if (xhr.upload && onProgress) {
				xhr.upload.onprogress = function (e) {
					if (e.lengthComputable && e.total) {
						// 99% al massimo finché il server non ha finito di elaborare l'immagine
						onProgress(Math.min(99, Math.floor(e.loaded * 100 / e.total)));
					}
				};
			}
			xhr.onload = function () {
				var res = null;
				try {
					res = JSON.parse(xhr.responseText);
				} catch (e) {
					res = null;
				}
				if (!res || typeof res !== 'object') {
					res = {ok: false, error: format(lang('EP_IMG_SERVER_ERROR'), xhr.status)};
				}
				if (res.ok && onProgress) {
					onProgress(100);
				}
				resolve(res);
			};
			xhr.onerror = function () {
				resolve({ok: false, error: lang('EP_IMG_NETWORK_ERROR')});
			};
			xhr.ontimeout = xhr.onerror;
			xhr.send(data);
		});
	}

	/**
	 * Controllo veloce prima dell'invio
	 *
	 * @return {string} messaggio d'errore o ''
	 */
	function precheck(file, cfg) {
		var ext = TYPES[file.type];
		if (!ext || (cfg.types && cfg.types.indexOf(ext) === -1)) {
			return format(lang('EP_IMG_TYPE_NOT_ALLOWED'), (cfg.types || []).join(', ').toUpperCase());
		}
		if (cfg.maxSize && file.size > cfg.maxSize) {
			return format(lang('EP_IMG_TOO_BIG'), formatSize(file.size), formatSize(cfg.maxSize));
		}
		return '';
	}

	/**
	 * Righe con barra di avanzamento (una per file), usate da Pannello utente ed editor
	 */
	function progressRow(list, file) {
		var thumb = el('span', {className: 'epg-row-thumb'});
		if (window.URL && URL.createObjectURL && /^image\//.test(file.type)) {
			thumb.style.backgroundImage = 'url("' + URL.createObjectURL(file) + '")';
		}
		var fill = el('span', {className: 'epg-row-fill'});
		var pct = el('span', {className: 'epg-row-pct', text: '0%'});
		var note = el('small', {text: formatSize(file.size)});
		var row = el('div', {className: 'epg-row'}, [
			thumb,
			el('div', {className: 'epg-row-info'}, [
				el('div', {className: 'epg-row-name'}, [el('span', {text: file.name || ''}), note]),
				el('div', {className: 'epg-row-bar'}, [fill])
			]),
			pct
		]);
		list.appendChild(row);
		return {
			progress: function (p) {
				fill.style.width = p + '%';
				pct.textContent = p + '%';
			},
			note: function (text) {
				note.textContent = text;
			},
			done: function (ok, message) {
				row.classList.add(ok ? 'epg-row-ok' : 'epg-row-bad');
				fill.style.width = '100%';
				pct.textContent = '';
				pct.appendChild(icon(ok ? 'fa-check' : 'fa-times'));
				if (message) {
					note.textContent = message;
				}
				if (ok) {
					setTimeout(function () {
						row.classList.add('epg-row-out');
						setTimeout(function () {
							if (row.parentNode) {
								row.parentNode.removeChild(row);
							}
						}, 400);
					}, 2500);
				}
			}
		};
	}

	/**
	 * Carica una lista di file uno dopo l'altro, con preparazione e barra per ciascuno
	 *
	 * @param {Array<File>} files
	 * @param {Object} cfg {url, hash, maxSize, maxW, maxH, types}
	 * @param {Element} list contenitore delle righe
	 * @param {function(Object)} onDone chiamata per ogni immagine salvata (dati del server)
	 * @return {Promise}
	 */
	function uploadAll(files, cfg, list, onDone) {
		var chain = Promise.resolve();
		Array.prototype.forEach.call(files, function (file) {
			var ui = progressRow(list, file);
			chain = chain.then(function () {
				return prepare(file, cfg).then(function (prep) {
					var bad = precheck(prep.file, cfg);
					if (bad) {
						ui.done(false, bad);
						return;
					}
					if (prep.resized) {
						ui.note(format(lang('EP_IMG_RESIZED'), formatSize(file.size), formatSize(prep.file.size)));
					}
					return upload(cfg.url, prep.file, {hash: cfg.hash}, ui.progress).then(function (res) {
						if (res.ok) {
							ui.done(true, lang('EP_IMG_UPLOADED'));
							if (onDone) {
								onDone(res);
							}
						} else {
							ui.done(false, res.error || lang('EP_IMG_FAILED'));
						}
					});
				});
			});
		});
		return chain;
	}

	/**
	 * Zona di caricamento (Pannello utente): trascina qui o scegli i file
	 */
	function uploader(root, cfg, onDone, onFinish) {
		var input = el('input', {type: 'file', multiple: true, accept: (cfg.types || ['jpg', 'png', 'gif', 'webp']).map(function (t) {
			return t === 'jpg' ? 'image/jpeg' : 'image/' + t;
		}).join(','), hidden: true});
		var choose = button('fa-upload', lang('EP_IMG_CHOOSE'), function () {
			input.click();
		}, 'epg-btn-primary');
		var list = el('div', {className: 'epg-rows'});
		var zone = el('div', {className: 'epg-drop'}, [
			icon('fa-cloud-upload epg-drop-icon'),
			el('p', {text: lang('EP_IMG_DROP')}),
			choose,
			input
		]);
		root.appendChild(zone);
		root.appendChild(list);

		function send(files) {
			files = Array.prototype.filter.call(files || [], function (f) {
				return f && f.size;
			});
			if (files.length) {
				var ok = 0;
				uploadAll(files, cfg, list, function (res) {
					ok++;
					if (onDone) {
						onDone(res);
					}
				}).then(function () {
					if (onFinish) {
						onFinish(ok);
					}
				});
			}
		}

		input.addEventListener('change', function () {
			send(input.files);
			input.value = '';
		});
		var depth = 0;
		zone.addEventListener('dragenter', function (e) {
			e.preventDefault();
			depth++;
			zone.classList.add('epg-drop-on');
		});
		zone.addEventListener('dragleave', function () {
			if (--depth <= 0) {
				depth = 0;
				zone.classList.remove('epg-drop-on');
			}
		});
		zone.addEventListener('dragover', function (e) {
			e.preventDefault();
		});
		zone.addEventListener('drop', function (e) {
			e.preventDefault();
			depth = 0;
			zone.classList.remove('epg-drop-on');
			send(e.dataTransfer && e.dataTransfer.files);
		});
		return {send: send, list: list};
	}

	/* ------------------------------------------------------------------ */
	/* Griglia con selezione                                                */
	/* ------------------------------------------------------------------ */

	/**
	 * @param {Element} root   contenitore con [data-epg-open=indice] e checkbox [data-epg-select]
	 * @param {Array} items    dati delle immagini (stesso ordine degli indici)
	 * @param {Object} opts    {actions: function(item) per l'ingrandimento}
	 */
	function grid(root, items, opts) {
		opts = opts || {};
		root.addEventListener('click', function (e) {
			var t = e.target.closest ? e.target.closest('[data-epg-open]') : null;
			if (t && root.contains(t)) {
				e.preventDefault();
				open(items, parseInt(t.getAttribute('data-epg-open'), 10) || 0, opts);
			}
		});

		var boxes = function () {
			return Array.prototype.slice.call(root.querySelectorAll('input[data-epg-select]'));
		};
		var all = document.querySelector('input[data-epg-select-all]');
		var counter = document.querySelector('[data-epg-selected]');
		var needs = Array.prototype.slice.call(document.querySelectorAll('[data-epg-needs-selection]'));

		function update() {
			var list = boxes();
			var n = list.filter(function (b) {
				return b.checked;
			}).length;
			list.forEach(function (b) {
				var card = b.closest('.epg-card');
				if (card) {
					card.classList.toggle('epg-card-selected', b.checked);
				}
			});
			if (counter) {
				counter.textContent = n ? format(lang('EP_IMG_SELECTED'), n) : '';
			}
			needs.forEach(function (b) {
				b.disabled = !n;
			});
			if (all) {
				all.checked = n > 0 && n === list.length;
				all.indeterminate = n > 0 && n < list.length;
			}
		}

		root.addEventListener('change', function (e) {
			if (e.target.matches && e.target.matches('input[data-epg-select]')) {
				update();
			}
		});
		if (all) {
			all.addEventListener('change', function () {
				boxes().forEach(function (b) {
					b.checked = all.checked;
				});
				update();
			});
		}
		update();
	}

	window.EditorPlusGallery = {
		lang: lang,
		format: format,
		el: el,
		icon: icon,
		button: button,
		formatSize: formatSize,
		copy: copy,
		copyAndTell: copyAndTell,
		flash: flash,
		open: open,
		prepare: prepare,
		precheck: precheck,
		upload: upload,
		uploadAll: uploadAll,
		progressRow: progressRow,
		uploader: uploader,
		grid: grid,
		TYPES: TYPES
	};
})();
