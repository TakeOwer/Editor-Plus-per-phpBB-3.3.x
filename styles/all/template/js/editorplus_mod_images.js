/**
 * Editor Plus 1.0.38 - modulo "images", scaricato solo al primo utilizzo.
 * Le immagini trascinate, incollate o scelte vanno nella cartella dell'utente (files/nome_ID/)
 * e nel messaggio entra il BBCode [img]. Gli altri file restano allegati di phpBB.
 * Pannello "Le mie immagini": reinserire, ingrandire, cancellare le proprie immagini.
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 */
(function () {
	'use strict';

	window.EditorPlusModules = window.EditorPlusModules || {};

	window.EditorPlusModules.images = function (api) {
		var G = window.EditorPlusGallery;
		var IC = api.cfg.images || {};
		var ta = api.ta;
		var el = api.el;
		// i testi delle immagini stanno in window.EditorPlusGalleryLang
		var lang = G.lang;
		var gcfg = {url: IC.uploadUrl, hash: IC.hash, maxSize: IC.maxSize, maxW: IC.maxW, maxH: IC.maxH, types: IC.types};

		var dialog = null, gridBox = null, quotaBox = null, moreBtn = null, rowsBox = null;
		var items = [], loaded = 0, total = 0, usage = null;

		/* ---------------- inserimento ---------------- */

		function insertAt(text, pos) {
			if (!(api.wyActive && api.wyActive()) && typeof pos === 'number' && pos >= 0) {
				ta.focus();
				pos = Math.min(pos, ta.value.length);
				ta.setSelectionRange(pos, pos);
			}
			// a capo prima, se il cursore è in mezzo a una riga già scritta
			var before = ta.value.slice(0, ta.selectionStart);
			var lead = (before && !/\n$/.test(before) && !(api.wyActive && api.wyActive())) ? '\n' : '';
			api.insertText(lead + text + '\n');
			return ta.selectionEnd;
		}

		/* ---------------- caricamento dall'editor ---------------- */

		var queue = Promise.resolve();

		function upload(files, pos) {
			var list = Array.prototype.slice.call(files || []);
			if (!IC.allowed) {
				api.toast(IC.reason || lang('EP_IMG_ERR_NO_GROUP'), 'error');
				return;
			}
			list.forEach(function (file, i) {
				var ui = api.trayItem(file);
				queue = queue.then(function () {
					return G.prepare(file, gcfg).then(function (prep) {
						var bad = G.precheck(prep.file, gcfg);
						if (bad) {
							ui.done(false, bad);
							return;
						}
						return G.upload(gcfg.url, prep.file, {hash: gcfg.hash}, ui.progress).then(function (res) {
							if (!res.ok) {
								ui.done(false, res.error || lang('EP_IMG_FAILED'));
								return;
							}
							ui.done(true, prep.resized ? G.format(lang('EP_IMG_RESIZED'), G.formatSize(file.size), G.formatSize(prep.file.size)) : '');
							pos = insertAt(res.image.bbcode, pos);
							usage = res.usage || usage;
							if (items.length || loaded) {
								items.unshift(res.image);
								total++;
								renderGrid();
							}
						});
					});
				});
			});
		}

		/* ---------------- pannello "Le mie immagini" ---------------- */

		function post(url, fields) {
			var body = new FormData();
			body.append('hash', IC.hash);
			Object.keys(fields || {}).forEach(function (k) {
				[].concat(fields[k]).forEach(function (v) {
					body.append(k, v);
				});
			});
			return fetch(url, {method: 'POST', body: body, credentials: 'same-origin', headers: {'X-Requested-With': 'XMLHttpRequest'}}).then(function (r) {
				return r.json();
			}).catch(function () {
				return {ok: false, error: lang('EP_IMG_NETWORK_ERROR')};
			});
		}

		function renderQuota() {
			quotaBox.innerHTML = '';
			if (!usage) {
				return;
			}
			var parts = [G.format(lang('EP_IMG_USAGE'), usage.count, usage.bytesText)];
			if (usage.maxQuota) {
				parts.push(G.format(lang('EP_IMG_USAGE_QUOTA'), usage.maxQuotaText));
			}
			if (usage.maxCount) {
				parts.push(G.format(lang('EP_IMG_USAGE_COUNT'), usage.maxCount));
			}
			if (usage.maxSizeText) {
				parts.push(G.format(lang('EP_IMG_USAGE_SIZE'), usage.maxSizeText));
			}
			if (usage.maxQuota) {
				var pct = Math.min(100, Math.round(usage.bytes * 100 / usage.maxQuota));
				quotaBox.appendChild(el('div', {className: 'epg-quota-bar'}, [el('div', {className: 'epg-quota-fill' + (pct > 85 ? ' epg-quota-high' : ''), style: 'width:' + pct + '%'})]));
			}
			quotaBox.appendChild(el('small', {text: parts.join(' · ')}));
			if (!IC.allowed) {
				quotaBox.appendChild(el('p', {className: 'ep-img-note ep-img-note-bad', text: IC.reason}));
			}
		}

		/*
		 * 1.0.41: un'immagine eliminata sparisce anche dal messaggio. Si riconosce dalla cartella e dal nome del
		 * file (vale per link diretto e "tramite l'estensione", immagine intera e miniatura cliccabile).
		 * @return int quanti link sono stati tolti
		 */
		function escapeRe(t) {
			return String(t).replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
		}

		function removeFromMessage(item) {
			if (!item || !item.folder || !item.file) {
				return 0;
			}
			var f = escapeRe(item.folder) + '\\/(?:thumbs\\/)?' + escapeRe(item.file);
			var patterns = [
				// miniatura cliccabile: [url=…file][img]…[/img][/url]
				new RegExp('\\[url=[^\\]\\s]*' + f + '\\]\\s*\\[img\\][^\\[\\]]*\\[\\/img\\]\\s*\\[\\/url\\]', 'gi'),
				// immagine intera: [img]…file[/img]
				new RegExp('\\[img\\][^\\[\\]]*' + f + '\\[\\/img\\]', 'gi'),
				// collegamento semplice: [url]…file[/url] o [url=…file]testo[/url]
				new RegExp('\\[url\\][^\\[\\]]*' + f + '\\[\\/url\\]', 'gi'),
				new RegExp('\\[url=[^\\]\\s]*' + f + '\\][^\\[]*\\[\\/url\\]', 'gi')
			];
			var MARK = '\u0000';
			var count = 0;
			var text = ta.value;
			patterns.forEach(function (re) {
				text = text.replace(re, function () {
					count++;
					return MARK;
				});
			});
			if (!count) {
				return 0;
			}
			// una riga che conteneva solo il link sparisce del tutto; altrove resta il testo intorno
			text = text.split('\n').filter(function (line) {
				return !(line.indexOf(MARK) !== -1 && !line.split(MARK).join('').trim());
			}).join('\n').split(MARK).join('');
			api.setText(text);
			return count;
		}

		function removeIds(ids) {
			items = items.filter(function (it) {
				return ids.indexOf(it.id) === -1;
			});
			total = Math.max(0, total - ids.length);
		}

		function remove(item, after) {
			api.confirm(G.format(lang('EP_IMG_CONFIRM_DELETE'), item.name), {yes: lang('EP_IMG_DELETE')}).then(function (ok) {
				if (!ok) {
					return;
				}
				post(IC.deleteUrl, {'ids[]': [item.id]}).then(function (res) {
					if (!res.ok) {
						api.toast(res.error || lang('EP_IMG_FAILED'), 'error');
						return;
					}
					usage = res.usage || usage;
					removeIds(res.deleted || []);
					renderGrid();
					if (api.wyActive && api.wyActive()) {
						// editor visuale: il testo non è nell'area BBCode, si avvisa invece di toccarlo alla cieca
						api.toast(lang('EP_IMG_DELETED_WY'), 'info');
					} else {
						var removed = removeFromMessage(item);
						api.toast(removed ? G.format(lang('EP_IMG_DELETED_FROM_MSG'), removed) : lang('EP_IMG_DELETED_ONE'), 'ok');
					}
					if (after) {
						after();
					}
				});
			});
		}

		function lightboxActions(item) {
			var acts = [{icon: 'fa-plus-circle', label: lang('EP_IMG_INSERT'), className: 'epg-btn-primary', run: function (it, ui) {
				ui.close();
				api.closeDialog();
				insertAt(it.bbcode);
			}}];
			if (IC.canDelete) {
				acts.push({icon: 'fa-trash', label: lang('EP_IMG_DELETE'), className: 'epg-btn-danger', run: function (it, ui) {
					remove(it, function () {
						ui.close();
					});
				}});
			}
			return acts;
		}

		function renderGrid() {
			if (!gridBox) {
				return;
			}
			gridBox.innerHTML = '';
			renderQuota();
			if (!items.length) {
				gridBox.appendChild(el('div', {className: 'epg-empty', text: lang('EP_IMG_NONE')}));
			}
			items.forEach(function (it, i) {
				var thumb = el('button', {type: 'button', className: 'epg-thumb', title: lang('EP_IMG_INSERT_HINT')}, [el('img', {src: it.thumb, alt: it.name, loading: 'lazy'})]);
				thumb.addEventListener('click', function () {
					api.closeDialog();
					insertAt(it.bbcode);
				});
				var zoom = G.button('fa-search-plus', '', function () {
					G.open(items, i, {actions: lightboxActions});
				}, 'epg-btn-small');
				zoom.title = lang('EP_IMG_ZOOM');
				var actions = [zoom];
				if (IC.canDelete) {
					var del = G.button('fa-trash', '', function () {
						remove(it);
					}, 'epg-btn-small');
					del.title = lang('EP_IMG_DELETE');
					actions.push(del);
				}
				gridBox.appendChild(el('div', {className: 'epg-card'}, [
					thumb,
					el('div', {className: 'epg-meta'}, [el('strong', {text: it.name, title: it.name}), it.width + '×' + it.height + ' · ' + it.sizeText]),
					el('div', {className: 'ep-img-tile-actions'}, actions)
				]));
			});
			moreBtn.hidden = items.length >= total || loaded >= total;
		}

		function load(more) {
			var start = more ? loaded : 0;
			return post(IC.listUrl, {start: start, limit: 40}).then(function (res) {
				if (!res.ok) {
					api.toast(res.error || lang('EP_IMG_FAILED'), 'error');
					return;
				}
				usage = res.usage;
				total = res.usage ? res.usage.count : res.images.length;
				items = more ? items.concat(res.images) : res.images;
				loaded = start + res.images.length;
				renderGrid();
			});
		}

		function build() {
			dialog = api.makeDialog(lang('EP_IMG_TITLE'), 'ep-img-dialog');
			quotaBox = el('div', {className: 'epg-quota'});
			gridBox = el('div', {className: 'epg-grid'});
			rowsBox = el('div', {className: 'epg-rows'});
			moreBtn = G.button('fa-chevron-down', lang('EP_IMG_MORE'), function () {
				load(true);
			});
			moreBtn.hidden = true;

			var input = el('input', {type: 'file', multiple: true, hidden: true, accept: (IC.types || []).map(function (t) {
				return t === 'jpg' ? 'image/jpeg' : 'image/' + t;
			}).join(',')});
			var top = el('div', {className: 'epg-toolbar'});
			if (IC.allowed) {
				top.appendChild(G.button('fa-upload', lang('EP_IMG_CHOOSE'), function () {
					input.click();
				}, 'epg-btn-primary'));
			}
			top.appendChild(el('span', {className: 'epg-spacer'}));
			if (IC.ucpUrl) {
				top.appendChild(el('a', {className: 'epg-btn', href: IC.ucpUrl, target: '_blank', rel: 'noopener'}, [G.icon('fa-th'), ' ' + lang('EP_IMG_MANAGE')]));
			}
			input.addEventListener('change', function () {
				var files = Array.prototype.slice.call(input.files || []);
				input.value = '';
				// dal pannello: le immagini vanno dove si trovava il cursore prima di aprirlo
				var pos = ta.selectionEnd;
				G.uploadAll(files, gcfg, rowsBox, function (res) {
					usage = res.usage || usage;
					items.unshift(res.image);
					total++;
					loaded++;
					renderGrid();
					pos = insertAt(res.image.bbcode, pos);
				});
			});

			dialog.body.appendChild(top);
			dialog.body.appendChild(input);
			dialog.body.appendChild(el('p', {className: 'ep-img-note', text: lang('EP_IMG_PANEL_HINT')}));
			dialog.body.appendChild(rowsBox);
			dialog.body.appendChild(quotaBox);
			dialog.body.appendChild(gridBox);
			dialog.body.appendChild(el('div', {style: 'text-align:center'}, [moreBtn]));
			dialog.onOpen = function () {
				load(false);
			};
		}

		function open() {
			if (!dialog) {
				build();
			}
			api.showDialog(dialog);
		}

		return {upload: upload, open: open};
	};
})();
