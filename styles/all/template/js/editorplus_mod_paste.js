/**
 * Editor Plus - modulo "paste": testo formattato incollato nell'area di testo → BBCode.
 * Scaricato solo al primo incolla di testo formattato. L'HTML viene prima ripulito
 * (EditorPlusCleanPaste: Word, Google Docs, pagine web, sicurezza) e poi convertito.
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 */
(function () {
	'use strict';

	window.EditorPlusModules = window.EditorPlusModules || {};

	window.EditorPlusModules.paste = function (api) {
		var cfg = api.cfg;
		var LINE = '\u0001';
		var PARA = '\u0002';
		var tags = (cfg.bbcodeTags || []).map(function (t) {
			return String(t).toLowerCase();
		});
		var has = function (t) {
			return tags.indexOf(t) !== -1;
		};
		var strikeTag = has('s') ? 's' : (has('strike') ? 'strike' : '');

		function toHex(css) {
			var m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(css || '');
			if (m) {
				return '#' + [m[1], m[2], m[3]].map(function (v) {
					return ('0' + parseInt(v, 10).toString(16)).slice(-2);
				}).join('');
			}
			m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(css || '').trim());
			if (m) {
				return '#' + (m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1]).toLowerCase();
			}
			return '';
		}

		/* dimensione CSS → scala percentuale di phpBB ([size=50..200]); vicino al normale: nessun [size] */
		function sizePercent(fs) {
			var m = /^([\d.]+)(px|pt|em|rem|%)$/i.exec(String(fs || '').trim());
			if (!m) {
				return 0;
			}
			var v = parseFloat(m[1]);
			var unit = m[2].toLowerCase();
			var pct = unit === '%' ? v : (unit === 'em' || unit === 'rem' ? v * 100 : (unit === 'pt' ? v * 4 / 3 : v) / 14 * 100);
			pct = Math.round(Math.max(50, Math.min(200, pct)) / 10) * 10;
			return pct >= 90 && pct <= 110 ? 0 : pct;
		}

		function safeUrl(u) {
			return /^(https?:\/\/|mailto:)/i.test(String(u || '').trim()) ? String(u).trim().replace(/[\[\]]/g, encodeURIComponent) : '';
		}

		function walk(node, inPre) {
			if (node.nodeType === 3) {
				var t = node.nodeValue.replace(/\u00a0/g, ' ');
				return inPre ? t : t.replace(/[\s\r\n]+/g, ' ');
			}
			if (node.nodeType !== 1) {
				return '';
			}
			var tag = node.tagName.toLowerCase();
			if (/^(script|style|head|title|meta|link|noscript|template)$/.test(tag)) {
				return '';
			}
			if (tag === 'br') {
				return '\n';
			}
			if (tag === 'hr') {
				return PARA;
			}
			if (tag === 'img') {
				var src = safeUrl(node.getAttribute('src'));
				return src && /^https?:/i.test(src) ? '[img]' + src + '[/img]' : '';
			}
			if (tag === 'pre') {
				return PARA + '[code]' + node.textContent.replace(/\n+$/, '') + '[/code]' + PARA;
			}
			var pre = inPre || tag === 'pre';
			var inner = Array.prototype.map.call(node.childNodes, function (c) {
				return walk(c, pre);
			}).join('');

			if (tag === 'ul' || tag === 'ol') {
				return PARA + (tag === 'ol' ? '[list=1]' : '[list]') + '\n' + inner.replace(/^[\s\u0001\u0002]+|[\s\u0001\u0002]+$/g, '') + '\n[/list]' + PARA;
			}
			if (tag === 'li') {
				return '[*]' + inner.replace(/[\u0001\u0002]+/g, ' ').trim() + '\n';
			}
			if (tag === 'blockquote') {
				return PARA + '[quote]' + inner.replace(/^[\s\u0001\u0002]+|[\s\u0001\u0002]+$/g, '') + '[/quote]' + PARA;
			}

			// formattazione: tag HTML o stile in linea
			var st = node.style || {};
			var weight = String(st.fontWeight || '');
			var deco = String(st.textDecoration || st.textDecorationLine || '');
			var wraps = [];
			var size = sizePercent(st.fontSize);
			if (size) {
				wraps.push(['size=' + size, 'size']);
			}
			var color = toHex(st.color || (tag === 'font' ? node.getAttribute('color') : ''));
			if (color && color !== '#000000') {
				wraps.push(['color=' + color, 'color']);
			}
			if (/^(b|strong)$/.test(tag) || weight === 'bold' || parseInt(weight, 10) >= 600) {
				wraps.push(['b', 'b']);
			}
			if (/^(i|em)$/.test(tag) || st.fontStyle === 'italic') {
				wraps.push(['i', 'i']);
			}
			if (/^(u|ins)$/.test(tag) || /underline/.test(deco)) {
				wraps.push(['u', 'u']);
			}
			if (strikeTag && (/^(s|strike|del)$/.test(tag) || /line-through/.test(deco))) {
				wraps.push([strikeTag, strikeTag]);
			}
			if ((tag === 'sup' || tag === 'sub') && has(tag)) {
				wraps.push([tag, tag]);
			}

			var out = inner;
			if (out.replace(/[\s\u0001\u0002]/g, '') !== '') {
				// gli spazi ai bordi restano fuori dai BBCode: "[b]parola[/b] " e non "[b]parola [/b]"
				var lead = /^\s*/.exec(out)[0], trail = /\s*$/.exec(out)[0];
				out = out.slice(lead.length, out.length - trail.length);
				for (var i = wraps.length - 1; i >= 0; i--) {
					out = '[' + wraps[i][0] + ']' + out + '[/' + wraps[i][1] + ']';
				}
				out = lead + out + trail;
			}

			if (tag === 'a') {
				var href = safeUrl(node.getAttribute('href'));
				var text = out.trim();
				if (href.toLowerCase().indexOf('mailto:') === 0) {
					var mail = href.slice(7).split('?')[0];
					out = text === mail ? '[email]' + mail + '[/email]' : '[email=' + mail + ']' + text + '[/email]';
				} else if (href) {
					out = !text || text === href ? '[url]' + href + '[/url]' : '[url=' + href + ']' + out + '[/url]';
				}
			}

			if (/^(p|h[1-6]|table)$/.test(tag)) {
				return PARA + out + PARA;
			}
			if (/^(div|tr|section|article|header|footer|address|figure|figcaption|dt|dd)$/.test(tag)) {
				return LINE + out + LINE;
			}
			if (tag === 'td' || tag === 'th') {
				return out + ' ';
			}
			return out;
		}

		function convert(html) {
			var cleaned = window.EditorPlusCleanPaste ? window.EditorPlusCleanPaste(html) : html;
			var doc = new DOMParser().parseFromString('<body>' + cleaned + '</body>', 'text/html');
			var out = walk(doc.body, false);
			// i blocchi di codice restano esattamente come sono (spazi e rientri compresi)
			var codes = [];
			out = out.replace(/\[code\][\s\S]*?\[\/code\]/g, function (m) {
				codes.push(m);
				return '\u0003' + (codes.length - 1) + '\u0003';
			});
			// confini di blocco: un a capo o una riga vuota, mai di più
			out = out.replace(/[ \t]*[\u0001\u0002\n][\u0001\u0002\n \t]*/g, function (run) {
				return /\u0002/.test(run) || (run.match(/\n/g) || []).length > 1 ? '\n\n' : '\n';
			});
			// BBCode vuoti e uguali di seguito: [b][/b] via, [b]a[/b][b]b[/b] → [b]ab[/b]
			for (var k = 0; k < 3; k++) {
				out = out.replace(/\[(b|i|u|s|strike)\](\s*)\[\/\1\]/g, '$2').replace(/\[\/(b|i|u)\]\[\1\]/g, '');
			}
			out = out.replace(/[ \t]+\n/g, '\n').trim();
			return out.replace(/\u0003(\d+)\u0003/g, function (m, i) {
				return codes[parseInt(i, 10)];
			});
		}

		return {convert: convert};
	};
})();
