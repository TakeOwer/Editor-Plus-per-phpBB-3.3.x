/**
 * Editor Plus – calcolatrice scientifica
 *
 * Interprete scritto apposta: l'espressione viene letta e trasformata in un albero, MAI eseguita come
 * codice (niente eval / Function). Tutti i calcoli usano numeri complessi (a + bi).
 *
 * Esempi: 2+3*4 · (1+2)^3 · sqrt(-4) · 2i*(3-i) · sin(30) in gradi · ln(e^2) · 5! · nCr(10;3)
 *         h*c/(500e-9) · NA*u · abs(3+4i) · 15% di 80 → 80*15%
 *
 * @copyright (c) 2026 Salvo Cortesiano
 * @license GNU General Public License, version 2 (GPL-2.0)
 */
(function (root) {
	'use strict';

	/* ---------------- numeri complessi ---------------- */
	function C(re, im) {
		return {re: re, im: im || 0};
	}

	function isReal(z) {
		return Math.abs(z.im) < 1e-12 * Math.max(1, Math.abs(z.re));
	}

	/* rumore di calcolo: un valore trascurabile rispetto alla scala delle grandezze coinvolte vale 0
	   (es. sin(180°) = 1,2e-16 → 0; 0,1 + 0,2 - 0,3 → 0), mentre 4e-19 da solo resta 4e-19 */
	function clean(v, scale) {
		return Math.abs(v) < 1e-14 * scale ? 0 : v;
	}

	function add(a, b) {
		return C(clean(a.re + b.re, Math.max(Math.abs(a.re), Math.abs(b.re))),
			clean(a.im + b.im, Math.max(Math.abs(a.im), Math.abs(b.im))));
	}

	function sub(a, b) {
		return add(a, C(-b.re, -b.im));
	}

	function mul(a, b) {
		return C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
	}

	function div(a, b) {
		var d = b.re * b.re + b.im * b.im;
		if (d === 0) {
			throw calcError('DIV_ZERO');
		}
		return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
	}

	function cabs(z) {
		return Math.hypot(z.re, z.im);
	}

	function carg(z) {
		return Math.atan2(z.im, z.re);
	}

	function cexp(z) {
		var e = Math.exp(z.re);
		return C(clean(e * Math.cos(z.im), e), clean(e * Math.sin(z.im), e));
	}

	function cln(z) {
		if (z.re === 0 && z.im === 0) {
			throw calcError('DOMAIN');
		}
		return C(Math.log(cabs(z)), carg(z));
	}

	function csqrt(z) {
		if (isReal(z) && z.re >= 0) {
			return C(Math.sqrt(z.re), 0);
		}
		var r = cabs(z);
		var re = Math.sqrt((r + z.re) / 2);
		var im = Math.sqrt((r - z.re) / 2);
		return C(re, z.im < 0 ? -im : im);
	}

	function cpow(a, b) {
		if (isReal(a) && isReal(b)) {
			var x = a.re, y = b.re;
			// potenze reali: risultato reale quando esiste (anche radici dispari di negativi, es. (-8)^(1/3))
			if (x >= 0 || Number.isInteger(y)) {
				return C(Math.pow(x, y), 0);
			}
			var inv = 1 / y;
			if (Math.abs(inv - Math.round(inv)) < 1e-9 && Math.round(inv) % 2 !== 0) {
				return C(-Math.pow(-x, y), 0);
			}
		}
		if (a.re === 0 && a.im === 0) {
			return C(0, 0);
		}
		return cexp(mul(b, cln(a)));
	}

	function csin(z) {
		var k = Math.cosh(z.im);
		return C(clean(Math.sin(z.re) * k, k), clean(Math.cos(z.re) * Math.sinh(z.im), k));
	}

	function ccos(z) {
		var k = Math.cosh(z.im);
		return C(clean(Math.cos(z.re) * k, k), clean(-Math.sin(z.re) * Math.sinh(z.im), k));
	}

	/* ---------------- errori ---------------- */
	function calcError(code, detail) {
		var e = new Error(code);
		e.calcCode = code;
		e.detail = detail || '';
		return e;
	}

	/* ---------------- costanti (fisiche e atomiche: CODATA 2018) ---------------- */
	var CONST = {
		pi: {v: Math.PI, tex: '\\pi', name: 'π'},
		e: {v: Math.E, tex: 'e', name: 'e'},
		phi: {v: (1 + Math.sqrt(5)) / 2, tex: '\\varphi', name: 'φ'},
		c: {v: 299792458, tex: 'c', name: 'c', unit: 'm/s'},
		h: {v: 6.62607015e-34, tex: 'h', name: 'h', unit: 'J·s'},
		hbar: {v: 6.62607015e-34 / (2 * Math.PI), tex: '\\hbar', name: 'ħ', unit: 'J·s'},
		qe: {v: 1.602176634e-19, tex: 'e', name: 'e', unit: 'C'},
		me: {v: 9.1093837015e-31, tex: 'm_e', name: 'mₑ', unit: 'kg'},
		mp: {v: 1.67262192369e-27, tex: 'm_p', name: 'mₚ', unit: 'kg'},
		mn: {v: 1.67492749804e-27, tex: 'm_n', name: 'mₙ', unit: 'kg'},
		u: {v: 1.66053906660e-27, tex: 'u', name: 'u', unit: 'kg'},
		NA: {v: 6.02214076e23, tex: 'N_A', name: 'Nₐ', unit: 'mol⁻¹'},
		kB: {v: 1.380649e-23, tex: 'k_B', name: 'k_B', unit: 'J/K'},
		R: {v: 8.314462618, tex: 'R', name: 'R', unit: 'J/(mol·K)'},
		F: {v: 96485.33212, tex: 'F', name: 'F', unit: 'C/mol'},
		G: {v: 6.67430e-11, tex: 'G', name: 'G', unit: 'm³/(kg·s²)'},
		g0: {v: 9.80665, tex: 'g_0', name: 'g₀', unit: 'm/s²'},
		a0: {v: 5.29177210903e-11, tex: 'a_0', name: 'a₀', unit: 'm'},
		eps0: {v: 8.8541878128e-12, tex: '\\varepsilon_0', name: 'ε₀', unit: 'F/m'},
		mu0: {v: 1.25663706212e-6, tex: '\\mu_0', name: 'μ₀', unit: 'N/A²'},
		sigma: {v: 5.670374419e-8, tex: '\\sigma', name: 'σ', unit: 'W/(m²·K⁴)'},
		alpha: {v: 7.2973525693e-3, tex: '\\alpha', name: 'α'},
		Ry: {v: 10973731.568160, tex: 'R_\\infty', name: 'R∞', unit: 'm⁻¹'},
		eV: {v: 1.602176634e-19, tex: '\\mathrm{eV}', name: 'eV', unit: 'J'}
	};

	/* ---------------- funzioni ---------------- */
	var FUNCS = {
		sqrt: {n: 1, f: function (z) { return csqrt(z[0]); }},
		cbrt: {n: 1, f: function (z) { return cpow(z[0], C(1 / 3)); }},
		root: {n: 2, f: function (z) { return cpow(z[0], div(C(1), z[1])); }},
		abs: {n: 1, f: function (z) { return C(cabs(z[0])); }},
		arg: {n: 1, deg: 'out', f: function (z) { return C(carg(z[0])); }},
		conj: {n: 1, f: function (z) { return C(z[0].re, -z[0].im); }},
		re: {n: 1, f: function (z) { return C(z[0].re); }},
		im: {n: 1, f: function (z) { return C(z[0].im); }},
		exp: {n: 1, f: function (z) { return cexp(z[0]); }},
		ln: {n: 1, f: function (z) { return cln(z[0]); }},
		log: {n: 1, f: function (z) { return div(cln(z[0]), C(Math.LN10)); }},
		log2: {n: 1, f: function (z) { return div(cln(z[0]), C(Math.LN2)); }},
		logb: {n: 2, f: function (z) { return div(cln(z[0]), cln(z[1])); }},
		sin: {n: 1, deg: 'in', f: function (z) { return csin(z[0]); }},
		cos: {n: 1, deg: 'in', f: function (z) { return ccos(z[0]); }},
		tan: {n: 1, deg: 'in', f: function (z) {
			var c = ccos(z[0]);
			if (cabs(c) < 1e-15) {
				throw calcError('DOMAIN');
			}
			return div(csin(z[0]), c);
		}},
		asin: {n: 1, real: [-1, 1], deg: 'out', f: function (z) { return C(Math.asin(z[0].re)); }},
		acos: {n: 1, real: [-1, 1], deg: 'out', f: function (z) { return C(Math.acos(z[0].re)); }},
		atan: {n: 1, real: true, deg: 'out', f: function (z) { return C(Math.atan(z[0].re)); }},
		sinh: {n: 1, f: function (z) { return mul(sub(cexp(z[0]), cexp(C(-z[0].re, -z[0].im))), C(0.5)); }},
		cosh: {n: 1, f: function (z) { return mul(add(cexp(z[0]), cexp(C(-z[0].re, -z[0].im))), C(0.5)); }},
		tanh: {n: 1, real: true, f: function (z) { return C(Math.tanh(z[0].re)); }},
		floor: {n: 1, real: true, f: function (z) { return C(Math.floor(z[0].re)); }},
		ceil: {n: 1, real: true, f: function (z) { return C(Math.ceil(z[0].re)); }},
		round: {n: 1, real: true, f: function (z) { return C(Math.round(z[0].re)); }},
		nCr: {n: 2, real: true, f: function (z) { return C(combin(z[0].re, z[1].re, false)); }},
		nPr: {n: 2, real: true, f: function (z) { return C(combin(z[0].re, z[1].re, true)); }},
		mod: {n: 2, real: true, f: function (z) {
			if (z[1].re === 0) {
				throw calcError('DIV_ZERO');
			}
			var r = z[0].re % z[1].re;
			return C(r < 0 ? r + Math.abs(z[1].re) : r);
		}}
	};

	function factorial(x) {
		if (x < 0 || !Number.isInteger(x)) {
			throw calcError('DOMAIN');
		}
		if (x > 170) {
			throw calcError('OVERFLOW');
		}
		var r = 1;
		for (var i = 2; i <= x; i++) {
			r *= i;
		}
		return r;
	}

	function combin(n, k, ordered) {
		if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0 || k < 0 || k > n) {
			throw calcError('DOMAIN');
		}
		var r = 1;
		for (var i = 0; i < k; i++) {
			r = r * (n - i) / (ordered ? 1 : i + 1);
		}
		return Math.round(r);
	}

	function own(obj, key) {
		return Object.prototype.hasOwnProperty.call(obj, key);
	}

	/* ---------------- lettura dell'espressione ---------------- */
	var MAX_LEN = 500;

	function tokenize(src) {
		if (src.length > MAX_LEN) {
			throw calcError('TOO_LONG');
		}
		var s = String(src)
			.replace(/×|·|⋅/g, '*').replace(/÷|:/g, '/').replace(/−|–/g, '-')
			.replace(/π/g, 'pi').replace(/²/g, '^2').replace(/³/g, '^3')
			.replace(/ħ/g, 'hbar');
		var out = [];
		var i = 0;
		while (i < s.length) {
			var ch = s[i];
			if (/\s/.test(ch)) {
				i++;
				continue;
			}
			// numero: 12 · 12,5 · 12.5 · 1e-9 · 1,2E+3 (virgola decimale all'italiana)
			var m = /^(\d+(?:[.,]\d+)?|[.,]\d+)(?:[eE][+-]?\d+)?/.exec(s.slice(i));
			if (m) {
				out.push({t: 'num', v: parseFloat(m[0].replace(',', '.')), s: m[0]});
				i += m[0].length;
				continue;
			}
			m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(i));
			if (m) {
				out.push({t: 'id', v: m[0]});
				i += m[0].length;
				continue;
			}
			if ('+-*/^()!%;√'.indexOf(ch) !== -1) {
				out.push({t: ch});
				i++;
				continue;
			}
			throw calcError('SYNTAX', ch);
		}
		return out;
	}

	/*
	 * Grammatica (dal più debole al più forte):
	 *   expr    = term (('+'|'-') term)*
	 *   term    = unary (('*'|'/'|moltiplicazione implicita) unary)*
	 *   unary   = ('-'|'+') unary | power
	 *   power   = postfix ('^' unary)?          (a destra: 2^3^2 = 2^9)
	 *   postfix = primary ('!' | '%')*
	 *   primary = numero | costante | i | Ans | funzione '(' argomenti ')' | '(' expr ')'
	 */
	function parse(src) {
		var tk = tokenize(src);
		var p = 0;
		var depth = 0;

		function peek() {
			return tk[p];
		}

		function next() {
			return tk[p++];
		}

		function expect(t) {
			var x = next();
			if (!x || x.t !== t) {
				throw calcError(t === ')' ? 'PAREN' : 'SYNTAX', x ? (x.v || x.t) : '');
			}
		}

		function expr() {
			if (++depth > 60) {
				throw calcError('TOO_DEEP');
			}
			var n = term();
			while (peek() && (peek().t === '+' || peek().t === '-')) {
				var op = next().t;
				n = {k: 'bin', op: op, a: n, b: term()};
			}
			depth--;
			return n;
		}

		function startsPrimary(x) {
			return x && (x.t === 'num' || x.t === 'id' || x.t === '(' || x.t === '√');
		}

		function term() {
			var n = unary();
			for (;;) {
				var x = peek();
				if (x && (x.t === '*' || x.t === '/')) {
					next();
					n = {k: 'bin', op: x.t, a: n, b: unary()};
				} else if (startsPrimary(x)) {
					// moltiplicazione implicita: 2pi · 3(4+1) · 2i · (1+i)(1-i)
					n = {k: 'bin', op: '*', a: n, b: unary(), implicit: true};
				} else {
					return n;
				}
			}
		}

		function unary() {
			var x = peek();
			if (x && (x.t === '-' || x.t === '+')) {
				next();
				var a = unary();
				return x.t === '-' ? {k: 'neg', a: a} : a;
			}
			return power();
		}

		function power() {
			if (peek() && peek().t === '√') {
				next();
				return {k: 'fn', f: 'sqrt', args: [power()]};
			}
			var base = postfix();
			if (peek() && peek().t === '^') {
				next();
				return {k: 'bin', op: '^', a: base, b: unary()};
			}
			return base;
		}

		function postfix() {
			var n = primary();
			while (peek() && (peek().t === '!' || peek().t === '%')) {
				n = {k: next().t === '!' ? 'fact' : 'pct', a: n};
			}
			return n;
		}

		function primary() {
			var x = next();
			if (!x) {
				throw calcError('INCOMPLETE');
			}
			if (x.t === 'num') {
				return {k: 'num', v: x.v, s: x.s};
			}
			if (x.t === '(') {
				var inner = expr();
				expect(')');
				return {k: 'group', a: inner};
			}
			if (x.t === 'id') {
				var id = x.v;
				if (own(FUNCS, id) && peek() && peek().t === '(') {
					next();
					var args = [expr()];
					while (peek() && peek().t === ';') {
						next();
						args.push(expr());
					}
					expect(')');
					if (args.length !== FUNCS[id].n) {
						throw calcError('ARGS', id);
					}
					return {k: 'fn', f: id, args: args};
				}
				if (id === 'i') {
					return {k: 'i'};
				}
				if (id === 'Ans' || id === 'ans') {
					return {k: 'ans'};
				}
				if (own(CONST, id)) {
					return {k: 'const', c: id};
				}
				throw calcError('UNKNOWN', id);
			}
			throw calcError('SYNTAX', x.t);
		}

		if (!tk.length) {
			throw calcError('EMPTY');
		}
		var tree = expr();
		if (p < tk.length) {
			throw calcError(tk[p].t === ')' ? 'PAREN' : 'SYNTAX', tk[p].v || tk[p].t);
		}
		return tree;
	}

	/* ---------------- calcolo ---------------- */
	function evaluate(tree, opts) {
		opts = opts || {};
		var degrees = opts.angle === 'deg';
		var ans = opts.ans || C(0);

		function ev(n) {
			switch (n.k) {
				case 'num':
					return C(n.v);
				case 'i':
					return C(0, 1);
				case 'ans':
					return ans;
				case 'const':
					return C(CONST[n.c].v);
				case 'group':
					return ev(n.a);
				case 'neg':
					var a = ev(n.a);
					return C(-a.re, -a.im);
				case 'pct':
					return mul(ev(n.a), C(0.01));
				case 'fact':
					var z = ev(n.a);
					if (!isReal(z)) {
						throw calcError('REAL_ONLY', '!');
					}
					return C(factorial(Math.round(z.re * 1e9) / 1e9));
				case 'bin':
					var x = ev(n.a), y = ev(n.b);
					if (n.op === '+') {
						return add(x, y);
					}
					if (n.op === '-') {
						return sub(x, y);
					}
					if (n.op === '*') {
						return mul(x, y);
					}
					if (n.op === '/') {
						return div(x, y);
					}
					return cpow(x, y);
				case 'fn':
					var def = FUNCS[n.f];
					var args = n.args.map(ev);
					if (def.real) {
						args.forEach(function (v) {
							if (!isReal(v)) {
								throw calcError('REAL_ONLY', n.f);
							}
						});
						if (Array.isArray(def.real) && (args[0].re < def.real[0] || args[0].re > def.real[1])) {
							throw calcError('DOMAIN', n.f);
						}
					}
					if (def.deg === 'in' && degrees) {
						args[0] = mul(args[0], C(Math.PI / 180));
					}
					var r = def.f(args);
					if (def.deg === 'out' && degrees) {
						r = mul(r, C(180 / Math.PI));
					}
					return r;
			}
			throw calcError('SYNTAX');
		}

		var res = ev(tree);
		if (!isFinite(res.re) || !isFinite(res.im)) {
			throw calcError('OVERFLOW');
		}
		// parte reale o immaginaria trascurabile rispetto all'altra (es. e^(iπ) = -1 + 1,2e-16 i → -1)
		var big = Math.max(Math.abs(res.re), Math.abs(res.im));
		res.re = clean(res.re, big);
		res.im = clean(res.im, big);
		// risultato in gradi di funzioni trigonometriche note (sin 30° = 0,5 esatto)
		res.re = tidy(res.re);
		res.im = tidy(res.im);
		return res;
	}

	function tidy(x) {
		if (x === 0 || !isFinite(x)) {
			return x;
		}
		return parseFloat(x.toPrecision(14));
	}

	/* ---------------- scrittura del risultato ---------------- */
	function fmtReal(x, dec, sci) {
		if (x === 0) {
			return '0';
		}
		var ax = Math.abs(x);
		var s;
		if (sci || ax >= 1e15 || ax < 1e-9) {
			s = x.toExponential(10).replace(/\.?0+e/, 'e').replace('e+', 'e');
		} else {
			s = String(parseFloat(x.toPrecision(12)));
			if (/e/.test(s)) {
				s = x.toExponential(10).replace(/\.?0+e/, 'e').replace('e+', 'e');
			}
		}
		return dec === ',' ? s.replace('.', ',') : s;
	}

	function format(z, opts) {
		opts = opts || {};
		var dec = opts.decimal || '.';
		if (z.im === 0) {
			return fmtReal(z.re, dec, opts.sci);
		}
		var im = fmtReal(Math.abs(z.im), dec, opts.sci);
		im = (im === '1' ? '' : im) + 'i';
		if (z.re === 0) {
			return (z.im < 0 ? '−' : '') + im;
		}
		return fmtReal(z.re, dec, opts.sci) + (z.im < 0 ? ' − ' : ' + ') + im;
	}

	/* ---------------- espressione in LaTeX (per inserirla come formula) ---------------- */
	var TEX_FN = {
		sin: '\\sin', cos: '\\cos', tan: '\\tan', asin: '\\arcsin', acos: '\\arccos', atan: '\\arctan',
		sinh: '\\sinh', cosh: '\\cosh', tanh: '\\tanh', ln: '\\ln', log: '\\log', exp: '\\exp', arg: '\\arg'
	};

	function prec(n) {
		if (n.k === 'bin') {
			return n.op === '+' || n.op === '-' ? 1 : (n.op === '^' ? 3 : 2);
		}
		if (n.k === 'neg') {
			return 1.5;
		}
		return 4;
	}

	function toTex(n, dec) {
		function num(s) {
			var t = String(s).replace(',', '.');
			var m = /^([\d.]+)[eE]([+-]?\d+)$/.exec(t);
			var out = m ? m[1] + ' \\cdot 10^{' + parseInt(m[2], 10) + '}' : t;
			return dec === ',' ? out.replace(/(\d)\.(\d)/g, '$1{,}$2') : out;
		}

		function wrap(child, min) {
			var t = tx(child);
			return prec(child) < min ? '\\left(' + t + '\\right)' : t;
		}

		function tx(n) {
			switch (n.k) {
				case 'num':
					return num(n.s);
				case 'i':
					return 'i';
				case 'ans':
					return '\\mathrm{Ans}';
				case 'const':
					return CONST[n.c].tex;
				case 'group':
					return '\\left(' + tx(n.a) + '\\right)';
				case 'neg':
					return '-' + wrap(n.a, 2);
				case 'pct':
					return wrap(n.a, 4) + '\\%';
				case 'fact':
					return wrap(n.a, 4) + '!';
				case 'bin':
					if (n.op === '/') {
						return '\\frac{' + tx(unwrap(n.a)) + '}{' + tx(unwrap(n.b)) + '}';
					}
					if (n.op === '^') {
						return wrap(n.a, 4) + '^{' + tx(unwrap(n.b)) + '}';
					}
					if (n.op === '*') {
						var sep = n.implicit && (n.b.k === 'const' || n.b.k === 'i' || n.b.k === 'group' || n.b.k === 'fn') ? '\\,' : ' \\cdot ';
						return wrap(n.a, 2) + sep + wrap(n.b, 2);
					}
					return tx(n.a) + ' ' + n.op + ' ' + wrap(n.b, n.op === '-' ? 2 : 1);
				case 'fn':
					var a = n.args.map(function (x) {
						return tx(unwrap(x));
					});
					if (n.f === 'sqrt') {
						return '\\sqrt{' + a[0] + '}';
					}
					if (n.f === 'cbrt') {
						return '\\sqrt[3]{' + a[0] + '}';
					}
					if (n.f === 'root') {
						return '\\sqrt[' + a[1] + ']{' + a[0] + '}';
					}
					if (n.f === 'abs') {
						return '\\left|' + a[0] + '\\right|';
					}
					if (n.f === 'conj') {
						return '\\overline{' + a[0] + '}';
					}
					if (n.f === 'log2') {
						return '\\log_2\\left(' + a[0] + '\\right)';
					}
					if (n.f === 'logb') {
						return '\\log_{' + a[1] + '}\\left(' + a[0] + '\\right)';
					}
					if (n.f === 'nCr') {
						return '\\binom{' + a[0] + '}{' + a[1] + '}';
					}
					if (n.f === 'nPr') {
						return 'P\\left(' + a[0] + ',' + a[1] + '\\right)';
					}
					if (n.f === 'mod') {
						return a[0] + ' \\bmod ' + a[1];
					}
					if (n.f === 'floor') {
						return '\\lfloor ' + a[0] + ' \\rfloor';
					}
					if (n.f === 'ceil') {
						return '\\lceil ' + a[0] + ' \\rceil';
					}
					return (TEX_FN[n.f] || '\\operatorname{' + n.f + '}') + '\\left(' + a.join(', ') + '\\right)';
			}
			return '';
		}

		function unwrap(x) {
			return x.k === 'group' ? x.a : x;
		}

		return tx(n);
	}

	function resultTex(z, dec) {
		var s = format(z, {decimal: '.'}).replace('−', '-');
		s = s.replace(/(\d(?:\.\d+)?)e([+-]?\d+)/g, function (m0, a, b) {
			return a + ' \\cdot 10^{' + parseInt(b, 10) + '}';
		});
		return dec === ',' ? s.replace(/(\d)\.(\d)/g, '$1{,}$2') : s;
	}

	/* ---------------- interfaccia pubblica ---------------- */
	var api = {
		/**
		 * @return {{ok: boolean, value?: object, text?: string, tex?: string, resultTex?: string, error?: string, detail?: string}}
		 */
		calc: function (src, opts) {
			opts = opts || {};
			try {
				var tree = parse(src);
				var value = evaluate(tree, opts);
				return {
					ok: true,
					value: value,
					text: format(value, opts),
					tex: toTex(tree, opts.decimal),
					resultTex: resultTex(value, opts.decimal)
				};
			} catch (e) {
				if (!e.calcCode) {
					return {ok: false, error: 'SYNTAX', detail: ''};
				}
				return {ok: false, error: e.calcCode, detail: e.detail};
			}
		},
		constants: CONST,
		functions: Object.keys(FUNCS),
		format: format
	};

	root.EditorPlusCalc = api;
	if (typeof module === 'object' && module.exports) {
		module.exports = api;
	}
})(typeof window !== 'undefined' ? window : this);
