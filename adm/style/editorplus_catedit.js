/**
 * Editor Plus - editor visuale delle categorie dei menu (ACP)
 * Legge e scrive la stessa area di testo "Nome: tag, tag", che resta il dato salvato.
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 */
(function () {
	'use strict';

	var root = document.getElementById('ep_cat_editor');
	var textarea = document.getElementById('editorplus_category_map');
	if (!root || !textarea) {
		return;
	}

	var L = JSON.parse(root.getAttribute('data-lang') || '{}');
	var bbcodes = JSON.parse(root.getAttribute('data-bbcodes') || '{}');
	var all = Object.keys(bbcodes).sort();
	var cats = [];
	var dragTag = null, dragCat = null;

	function el(tag, cls, text) {
		var n = document.createElement(tag);
		if (cls) {
			n.className = cls;
		}
		if (text !== undefined) {
			n.textContent = text;
		}
		return n;
	}

	function parse() {
		cats = [];
		textarea.value.split(/\r\n|\r|\n/).forEach(function (line) {
			var i = line.indexOf(':');
			if (i < 1) {
				return;
			}
			var name = line.slice(0, i).trim();
			var tags = line.slice(i + 1).split(/[\s,;]+/).map(function (t) {
				return t.trim().toLowerCase().replace(/^\[|\]$/g, '').replace(/=$/, '');
			}).filter(function (t) {
				return /^[a-z0-9_-]{1,32}$/.test(t);
			});
			var existing = cats.filter(function (c) {
				return c.name === name;
			})[0];
			if (existing) {
				tags.forEach(function (t) {
					if (existing.tags.indexOf(t) === -1) {
						existing.tags.push(t);
					}
				});
			} else if (name) {
				cats.push({name: name, tags: tags});
			}
		});
	}

	function serialize() {
		textarea.value = cats.map(function (c) {
			return c.name.replace(/[:\r\n]/g, ' ').trim() + ': ' + c.tags.join(', ');
		}).filter(function (line) {
			return !/^:/.test(line);
		}).join('\n');
	}

	function assigned() {
		var used = {};
		cats.forEach(function (c) {
			c.tags.forEach(function (t) {
				used[t] = true;
			});
		});
		return used;
	}

	function removeTag(tag) {
		cats.forEach(function (c) {
			var i = c.tags.indexOf(tag);
			if (i !== -1) {
				c.tags.splice(i, 1);
			}
		});
	}

	function chip(tag) {
		var c = el('span', 'ep-chip' + (bbcodes.hasOwnProperty(tag) ? '' : ' ep-chip-missing'), '[' + tag + ']');
		c.draggable = true;
		c.setAttribute('data-tag', tag);
		c.title = bbcodes.hasOwnProperty(tag) ? (bbcodes[tag] || tag) : L.missing;
		c.addEventListener('dragstart', function (e) {
			dragTag = tag;
			dragCat = null;
			c.classList.add('ep-chip-drag');
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', tag);
		});
		c.addEventListener('dragend', function () {
			dragTag = null;
			c.classList.remove('ep-chip-drag');
		});
		return c;
	}

	function dropArea(area, index) {
		area.addEventListener('dragover', function (e) {
			if (dragTag !== null) {
				e.preventDefault();
				area.classList.add('ep-drop-over');
			}
		});
		area.addEventListener('dragleave', function () {
			area.classList.remove('ep-drop-over');
		});
		area.addEventListener('drop', function (e) {
			if (dragTag === null) {
				return;
			}
			e.preventDefault();
			area.classList.remove('ep-drop-over');
			removeTag(dragTag);
			if (index !== null) {
				cats[index].tags.push(dragTag);
			}
			dragTag = null;
			changed();
		});
	}

	function render() {
		root.textContent = '';
		var used = assigned();

		cats.forEach(function (cat, index) {
			var card = el('div', 'ep-cat-card');
			card.setAttribute('data-index', index);

			var head = el('div', 'ep-cat-head');
			var handle = el('span', 'ep-cat-handle');
			handle.innerHTML = '<i class="icon fa-bars fa-fw" aria-hidden="true"></i>';
			handle.draggable = true;
			handle.title = L.editor;
			handle.addEventListener('dragstart', function (e) {
				dragCat = index;
				dragTag = null;
				card.classList.add('ep-cat-dragging');
				e.dataTransfer.effectAllowed = 'move';
				e.dataTransfer.setData('text/plain', 'cat:' + index);
			});
			handle.addEventListener('dragend', function () {
				dragCat = null;
				card.classList.remove('ep-cat-dragging');
			});

			var name = el('input', 'inputbox ep-cat-name');
			name.type = 'text';
			name.value = cat.name;
			name.maxLength = 40;
			name.addEventListener('input', function () {
				cat.name = name.value;
				serialize();
			});

			var count = el('span', 'ep-cat-count', String(cat.tags.length));
			var del = el('button', 'ep-cat-del');
			del.type = 'button';
			del.title = L.del;
			del.innerHTML = '<i class="icon fa-times fa-fw" aria-hidden="true"></i>';
			del.addEventListener('click', function () {
				cats.splice(index, 1);
				changed();
			});

			head.appendChild(handle);
			head.appendChild(name);
			head.appendChild(count);
			head.appendChild(del);

			var body = el('div', 'ep-cat-body');
			cat.tags.forEach(function (t) {
				body.appendChild(chip(t));
			});
			dropArea(body, index);

			card.addEventListener('dragover', function (e) {
				if (dragCat !== null && dragCat !== index) {
					e.preventDefault();
					card.classList.add('ep-cat-over');
				}
			});
			card.addEventListener('dragleave', function () {
				card.classList.remove('ep-cat-over');
			});
			card.addEventListener('drop', function (e) {
				if (dragCat === null) {
					return;
				}
				e.preventDefault();
				card.classList.remove('ep-cat-over');
				var moved = cats.splice(dragCat, 1)[0];
				cats.splice(index, 0, moved);
				dragCat = null;
				changed();
			});

			card.appendChild(head);
			card.appendChild(body);
			root.appendChild(card);
		});

		var pool = el('div', 'ep-cat-card ep-cat-pool');
		var poolHead = el('div', 'ep-cat-head');
		poolHead.appendChild(el('strong', '', L.pool));
		var free = all.filter(function (t) {
			return !used[t];
		});
		poolHead.appendChild(el('span', 'ep-cat-count', String(free.length)));
		var poolBody = el('div', 'ep-cat-body');
		free.forEach(function (t) {
			poolBody.appendChild(chip(t));
		});
		dropArea(poolBody, null);
		pool.appendChild(poolHead);
		pool.appendChild(poolBody);
		root.appendChild(pool);
	}

	function changed() {
		serialize();
		render();
	}

	var add = document.getElementById('ep_cat_add');
	var toggle = document.getElementById('ep_cat_toggle');
	var textMode = false;

	add.addEventListener('click', function () {
		cats.push({name: L.newName, tags: []});
		changed();
		var inputs = root.querySelectorAll('.ep-cat-name');
		if (inputs.length) {
			inputs[inputs.length - 1].focus();
			inputs[inputs.length - 1].select();
		}
	});

	toggle.addEventListener('click', function () {
		textMode = !textMode;
		textarea.hidden = !textMode;
		root.hidden = textMode;
		add.hidden = textMode;
		toggle.textContent = textMode ? L.asVisual : L.asText;
		if (!textMode) {
			parse();
			render();
		}
	});

	var form = textarea.form;
	if (form) {
		form.addEventListener('reset', function () {
			setTimeout(function () {
				parse();
				render();
			}, 0);
		});
	}

	textarea.hidden = true;
	root.hidden = false;
	parse();
	render();
})();
