<?php
/**
 *
 * Editor Plus
 * Combo della barra create dall'amministratore (nome, BBCode, voci), salvate in config_text come JSON.
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\core;

class combos
{
	const CONFIG_KEY = 'editorplus_combos';
	const PACK_FILE = 'data/combos_ombre.json';
	const FORMAT = 'editorplus-combos';

	const MAX_COMBOS = 100;
	const MAX_OPTIONS = 500;
	const MAX_NAME = 60;
	const MAX_TEXT = 255;

	/** Modi di inserimento: [tag]valore[/tag] oppure [tag=valore][/tag] */
	const MODES = ['content', 'param'];

	/**
	 * @param \phpbb\config\db_text $config_text
	 * @return array Elenco di combo normalizzate
	 */
	public static function load($config_text)
	{
		$data = json_decode((string) $config_text->get(self::CONFIG_KEY), true);

		return is_array($data) ? self::normalize_list($data) : [];
	}

	/**
	 * @param \phpbb\config\db_text $config_text
	 * @param array                 $combos
	 */
	public static function save($config_text, array $combos)
	{
		$config_text->set(self::CONFIG_KEY, json_encode(array_values(self::normalize_list($combos)), JSON_UNESCAPED_UNICODE));
	}

	/**
	 * Normalizza un elenco: scarta le combo non valide, assegna gli id mancanti, limita il numero
	 *
	 * @param array $list
	 * @return array
	 */
	public static function normalize_list(array $list)
	{
		$out = [];
		$max_id = 0;

		foreach ($list as $combo)
		{
			if (is_array($combo) && !empty($combo['id']))
			{
				$max_id = max($max_id, (int) $combo['id']);
			}
		}

		$seen = [];
		foreach ($list as $combo)
		{
			$combo = self::normalize(is_array($combo) ? $combo : []);
			if ($combo === null)
			{
				continue;
			}

			if (!$combo['id'] || isset($seen[$combo['id']]))
			{
				$combo['id'] = ++$max_id;
			}
			$seen[$combo['id']] = true;

			$out[] = $combo;
			if (count($out) >= self::MAX_COMBOS)
			{
				break;
			}
		}

		return $out;
	}

	/**
	 * @param array $combo
	 * @return array|null null se la combo non è valida
	 */
	public static function normalize(array $combo)
	{
		$name = self::clean_text(isset($combo['name']) ? $combo['name'] : '', self::MAX_NAME);
		$tag = strtolower(rtrim(trim((string) (isset($combo['tag']) ? $combo['tag'] : '')), '='));

		if ($name === '' || !preg_match(helper::TAG_REGEX, $tag))
		{
			return null;
		}

		$options = [];
		foreach ((isset($combo['options']) && is_array($combo['options'])) ? $combo['options'] : [] as $option)
		{
			if (!is_array($option))
			{
				continue;
			}
			$option = array_values($option);
			$value = self::clean_text(isset($option[0]) ? $option[0] : '', self::MAX_TEXT);
			$label = self::clean_text(isset($option[1]) && $option[1] !== '' ? $option[1] : $value, self::MAX_TEXT);

			if ($value !== '')
			{
				$options[] = [$value, $label];
			}
			if (count($options) >= self::MAX_OPTIONS)
			{
				break;
			}
		}

		return [
			'id'		=> isset($combo['id']) ? (int) $combo['id'] : 0,
			'name'		=> $name,
			'tag'		=> $tag,
			'mode'		=> (isset($combo['mode']) && in_array($combo['mode'], self::MODES, true)) ? $combo['mode'] : 'content',
			'enabled'	=> !isset($combo['enabled']) || (bool) $combo['enabled'],
			'groups'	=> isset($combo['groups']) && is_array($combo['groups']) ? array_values(array_unique(array_filter(array_map('intval', $combo['groups'])))) : [],
			'options'	=> $options,
		];
	}

	/**
	 * Testo su una riga, senza caratteri di controllo né parentesi quadre (romperebbero il BBCode)
	 *
	 * @param mixed $text
	 * @param int   $max
	 * @return string
	 */
	public static function clean_text($text, $max)
	{
		$text = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', (string) $text);
		$text = trim(str_replace(['[', ']'], '', $text));

		return utf8_substr($text, 0, $max);
	}

	/**
	 * Voci scritte nell'area di testo dell'ACP: una per riga, "valore|etichetta" (senza "|" l'etichetta è il valore)
	 *
	 * @param string $text
	 * @return array
	 */
	public static function parse_options($text)
	{
		$options = [];
		foreach (preg_split('/\r\n|\r|\n/', (string) $text) as $line)
		{
			if (trim($line) === '')
			{
				continue;
			}
			$parts = explode('|', $line, 2);
			$options[] = [trim($parts[0]), isset($parts[1]) ? trim($parts[1]) : ''];
		}

		return $options;
	}

	/**
	 * @param array $options
	 * @return string
	 */
	public static function options_to_text(array $options)
	{
		$lines = [];
		foreach ($options as $option)
		{
			$lines[] = $option[0] === $option[1] ? $option[0] : $option[0] . '|' . $option[1];
		}

		return implode("\n", $lines);
	}

	/**
	 * Legge un JSON di combo: sia il formato di esportazione di Editor Plus sia un semplice elenco
	 *
	 * @param string $json
	 * @return array|null null se il testo non è un elenco di combo valido
	 */
	public static function decode($json)
	{
		$data = json_decode((string) $json, true);

		if (is_array($data) && isset($data['combos']) && is_array($data['combos']))
		{
			$data = $data['combos'];
		}

		if (!is_array($data) || array_values($data) !== $data)
		{
			return null;
		}

		$list = [];
		foreach ($data as $combo)
		{
			if (is_array($combo))
			{
				$combo['id'] = 0;
				$normalized = self::normalize($combo);
				if ($normalized !== null)
				{
					$list[] = $normalized;
				}
			}
		}

		return $list;
	}

	/**
	 * @param array  $combos
	 * @param string $title
	 * @return string JSON da copiare su un altro forum
	 */
	public static function export(array $combos, $title = '')
	{
		$list = [];
		foreach ($combos as $combo)
		{
			// Id e gruppi sono propri di ciascun forum: non si esportano
			unset($combo['id'], $combo['groups']);
			$list[] = $combo;
		}

		return json_encode([
			'format'	=> self::FORMAT,
			'version'	=> 1,
			'title'		=> (string) $title,
			'combos'	=> $list,
		], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
	}

	/**
	 * Aggiunge le combo importate. Una combo con lo stesso BBCode e lo stesso nome viene aggiornata;
	 * quelle il cui BBCode non esiste sul forum vengono scartate.
	 *
	 * @param array    $current
	 * @param array    $incoming
	 * @param string[] $existing_tags
	 * @return array ['combos' => [...], 'added' => [nomi], 'updated' => [nomi], 'skipped' => [nomi]]
	 */
	public static function import(array $current, array $incoming, array $existing_tags)
	{
		$result = ['combos' => $current, 'added' => [], 'updated' => [], 'skipped' => []];

		foreach ($incoming as $combo)
		{
			if (!in_array($combo['tag'], $existing_tags, true))
			{
				$result['skipped'][] = $combo['name'] . ' [' . $combo['tag'] . ']';
				continue;
			}

			$found = false;
			foreach ($result['combos'] as $i => $existing)
			{
				if ($existing['tag'] === $combo['tag'] && utf8_strtolower($existing['name']) === utf8_strtolower($combo['name']))
				{
					$combo['id'] = $existing['id'];
					$combo['enabled'] = $existing['enabled'];
					$combo['groups'] = $existing['groups'];
					$result['combos'][$i] = $combo;
					$result['updated'][] = $combo['name'];
					$found = true;
					break;
				}
			}

			if (!$found)
			{
				$combo['id'] = 0;
				$result['combos'][] = $combo;
				$result['added'][] = $combo['name'];
			}
		}

		$result['combos'] = self::normalize_list($result['combos']);

		return $result;
	}

	/**
	 * Pacchetto delle combo di Le Ombre della Rete incluso nell'estensione
	 *
	 * @param string $root_path
	 * @return array
	 */
	public static function read_pack($root_path)
	{
		$file = $root_path . 'ext/salvocortesiano/editorplus/' . self::PACK_FILE;

		return file_exists($file) ? (array) self::decode(file_get_contents($file)) : [];
	}

	/**
	 * Il pacchetto è utile solo se sul forum esiste almeno uno dei suoi BBCode
	 *
	 * @param array    $pack
	 * @param string[] $existing_tags
	 * @return bool
	 */
	public static function pack_usable(array $pack, array $existing_tags)
	{
		foreach ($pack as $combo)
		{
			if (in_array($combo['tag'], $existing_tags, true))
			{
				return true;
			}
		}

		return false;
	}
}
