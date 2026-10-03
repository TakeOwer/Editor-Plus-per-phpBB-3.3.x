<?php
/**
 *
 * Editor Plus
 * Stampa del messaggio: prepara il testo BBCode PRIMA che venga disegnato.
 *  - contenuti nascosti ([hidden], [ghide], [hhide], [password]...): se l'utente non è autorizzato
 *    diventano un segnaposto (il contenuto non arriva mai nella pagina di stampa); se è autorizzato
 *    diventano un riquadro aperto con l'etichetta "Contenuto nascosto";
 *  - spoiler: riquadro aperto (con il titolo) per tutti;
 *  - [code], [syntax], [math], [imath]: messi da parte prima e rimessi dopo, così un "[hidden]" scritto
 *    dentro al codice resta testo e non viene toccato.
 * I riquadri vengono inseriti come marcatori di testo e trasformati in HTML dopo il disegno.
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\core;

class print_filter
{
	/** BBCode il cui contenuto è testo letterale: mai toccati dal filtro */
	const LITERAL = ['code', 'syntax', 'math', 'imath'];

	/** Limite di sicurezza per gli annidamenti */
	const MAX_PASSES = 50;

	/** @var array titoli dei riquadri, per indice */
	protected $boxes = [];

	/** @var int contenuti nascosti tolti */
	protected $removed = 0;

	/** @var string identificativo casuale dei marcatori (non indovinabile da chi scrive il messaggio) */
	protected $mark;

	public function __construct()
	{
		$this->mark = 'EPPRT' . strtoupper(bin2hex(random_bytes(5)));
	}

	public function removed()
	{
		return $this->removed;
	}

	/**
	 * Elenco di nomi di BBCode da un'impostazione ("ghide, hidden,hhide") a nomi puliti
	 *
	 * @param string $value
	 * @return array
	 */
	public static function tags($value)
	{
		$out = [];
		foreach (preg_split('/[\s,;]+/', strtolower((string) $value)) as $tag)
		{
			if (preg_match('/^[a-z0-9_*-]{1,30}$/', $tag) && !in_array($tag, self::LITERAL, true))
			{
				$out[] = $tag;
			}
		}

		return array_values(array_unique($out));
	}

	/**
	 * @param string $text            testo BBCode (già trattato come fa phpBB: entità HTML)
	 * @param array  $hidden_tags     BBCode di contenuto nascosto
	 * @param array  $spoiler_tags    BBCode spoiler
	 * @param bool   $show_hidden     l'utente può stampare i contenuti nascosti
	 * @return string testo con i marcatori
	 */
	public function prepare($text, array $hidden_tags, array $spoiler_tags, $show_hidden)
	{
		$this->boxes = [];
		$this->removed = 0;

		// 1) codice e formule da parte
		$literal = [];
		$names = implode('|', self::LITERAL);
		$text = preg_replace_callback('/\[(' . $names . ')(?:[=\s][^\]]*)?\][\s\S]*?\[\/\1\]/i', function ($m) use (&$literal) {
			$literal[] = $m[0];
			return $this->mark . 'L' . (count($literal) - 1) . 'X';
		}, $text);

		// 2) e 3) nascosti e spoiler, dall'interno verso l'esterno
		$all = array_merge($hidden_tags, $spoiler_tags);
		if ($all)
		{
			$pattern = '/\[(' . implode('|', array_map(function ($t) {
				return preg_quote($t, '/');
			}, $all)) . ')((?:[=\s][^\]]*)?)\]((?:(?!\[(?:' . implode('|', array_map(function ($t) {
				return preg_quote($t, '/');
			}, $all)) . ')[=\s\]])[\s\S])*?)\[\/\1\]/i';

			for ($pass = 0; $pass < self::MAX_PASSES; $pass++)
			{
				$before = $text;
				$text = preg_replace_callback($pattern, function ($m) use ($hidden_tags, $show_hidden) {
					$tag = strtolower($m[1]);
					$param = trim(ltrim($m[2], '= '));
					$content = $m[3];

					if (in_array($tag, $hidden_tags, true))
					{
						if (!$show_hidden)
						{
							$this->removed++;
							return $this->mark . 'H' . 'X';
						}
						return $this->box('hidden', $tag, '', $content);
					}

					// spoiler: il titolo è il parametro (es. [spoil=Finale]...)
					return $this->box('spoiler', $tag, $param, $content);
				}, $text);

				if ($text === $before || $text === null)
				{
					break;
				}
			}
		}

		// codice e formule al loro posto
		return preg_replace_callback('/' . $this->mark . 'L(\d+)X/', function ($m) use ($literal) {
			return isset($literal[(int) $m[1]]) ? $literal[(int) $m[1]] : '';
		}, (string) $text);
	}

	protected function box($kind, $tag, $title, $content)
	{
		$this->boxes[] = ['kind' => $kind, 'tag' => $tag, 'title' => $title];
		$i = count($this->boxes) - 1;

		// a capo prima e dopo: il riquadro non si incolla al testo vicino
		return $this->mark . 'B' . $i . 'S' . $content . $this->mark . 'B' . $i . 'E';
	}

	/**
	 * Dopo il disegno: marcatori → HTML dei riquadri e del segnaposto
	 *
	 * @param string $html
	 * @param array  $labels ['spoiler' => 'Spoiler', 'hidden' => 'Contenuto nascosto', 'removed' => '...']
	 * @return string
	 */
	public function finish($html, array $labels)
	{
		$boxes = $this->boxes;
		$html = preg_replace_callback('/' . $this->mark . 'B(\d+)S(?:<br\s*\/?>)?/', function ($m) use ($boxes, $labels) {
			$b = isset($boxes[(int) $m[1]]) ? $boxes[(int) $m[1]] : ['kind' => 'spoiler', 'tag' => '', 'title' => ''];
			$title = $labels[$b['kind']] . ($b['title'] !== '' ? ': ' . $b['title'] : '');
			return '<div class="ep-print-box ep-print-' . $b['kind'] . '"><div class="ep-print-box-title">' . $title . '</div><div class="ep-print-box-body">';
		}, $html);
		$html = preg_replace('/(?:<br\s*\/?>)?' . $this->mark . 'B\d+E(?:<br\s*\/?>)?/', '</div></div>', $html);

		return str_replace($this->mark . 'HX', '<span class="ep-print-removed">' . $labels['removed'] . '</span>', $html);
	}
}
