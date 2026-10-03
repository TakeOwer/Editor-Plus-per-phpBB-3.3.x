<?php
/**
 *
 * Editor Plus
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\core;

/**
 * Funzioni condivise tra listener, controller ACP e migrazioni
 */
class helper
{
	/** Versione dei file JavaScript e CSS attesa (deve coincidere con composer.json) */
	const VERSION = '1.0.44';

	/** Interruttori delle funzioni (nome config => valore predefinito) */
	const TOGGLES = [
		'editorplus_ghide'			=> 1,
		'editorplus_font_select'	=> 1,
		'editorplus_image_combos'	=> 1,
		'editorplus_categories'		=> 1,
		'editorplus_fa'				=> 1,
		'editorplus_emoji'			=> 1,
		'editorplus_autosave'		=> 1,
		'editorplus_shortcuts'		=> 1,
		'editorplus_undo'			=> 1,
		'editorplus_fullscreen'		=> 1,
		'editorplus_counter'		=> 1,
		'editorplus_autogrow'		=> 1,
		'editorplus_smilies'		=> 1,
		'editorplus_hide_smiley_box'	=> 1,
		'editorplus_live_preview'	=> 1,
		'editorplus_combo_preview'	=> 1,
		'editorplus_drop_upload'	=> 1,
		'editorplus_search_replace'	=> 1,
		'editorplus_live_format'	=> 1,
		'editorplus_wysiwyg'		=> 0,
		'editorplus_wysiwyg_real'	=> 1,
		'editorplus_ghide_button'	=> 0,
		'editorplus_options_menu'	=> 1,
		'editorplus_info_bar'		=> 1,
		'editorplus_syntax'			=> 1,
		'editorplus_syntax_code'	=> 0,
		'editorplus_math'			=> 1,
		'editorplus_calc'			=> 1,
		'editorplus_color'			=> 1,
		'editorplus_color_classic'	=> 1,
		'editorplus_print'			=> 1,
		'editorplus_cleanup'		=> 1,
		'editorplus_paste_bbcode'	=> 1,
	];

	/**
	 * Preferenze che ogni utente può cambiare nel Pannello utente (chiave => predefinito).
	 * Valgono solo se la funzione è accesa anche in ACP.
	 */
	const USER_PREFS = [
		'autosave'		=> 1,
		'autogrow'		=> 1,
		'counter'		=> 1,
		'shortcuts'		=> 1,
		'live_open'		=> 0,
		'combo_preview'	=> 1,
		'drop_upload'	=> 1,
		'smiley_bar'	=> 1,
		'live_format'	=> 1,
		'wysiwyg'		=> 1,
		'spellcheck'	=> 1,
		'lf_marks'		=> 0,
	];

	/** Faccine installate di serie con phpBB (tutte le altre sono considerate personalizzate) */
	const PHPBB_SMILIES = [
		'icon_e_biggrin.gif', 'icon_e_smile.gif', 'icon_e_wink.gif', 'icon_e_sad.gif', 'icon_e_surprised.gif',
		'icon_eek.gif', 'icon_e_confused.gif', 'icon_cool.gif', 'icon_lol.gif', 'icon_mad.gif', 'icon_razz.gif',
		'icon_redface.gif', 'icon_cry.gif', 'icon_evil.gif', 'icon_twisted.gif', 'icon_rolleyes.gif',
		'icon_exclaim.gif', 'icon_question.gif', 'icon_idea.gif', 'icon_arrow.gif', 'icon_neutral.gif',
		'icon_mrgreen.gif', 'icon_e_geek.gif', 'icon_e_ugeek.gif',
	];

	/** Tag BBCode ammessi: lettere, numeri, trattino e trattino basso */
	const TAG_REGEX = '/^[a-z0-9_-]{1,32}$/';

	/** Categorie predefinite dei menu: chiave di lingua => tag BBCode */
	const DEFAULT_CATEGORIES = [
		'EP_CAT_TEXT'		=> 'align, center, left, right, justify, float, dir, pre, sub, sup, s, strike, highlight, hr, font, size, color, indent, acronym, abbr',
		'EP_CAT_EFFECTS'	=> 'glow, shadow, dropshadow, blur, fade, marq, marquee, rainbow, flip, rotate, typewriter',
		'EP_CAT_MEDIA'		=> 'youtube, youtu, youtube_be, youtubemini, vimeo, dailymotion, twitch, spotify, soundcloud, mp4, mp3, audio, video, bbvideo, media, flash, embedpdf, pdf',
		'EP_CAT_HIDDEN'		=> 'hidden, hide, hhide, ghide, spoil, spoiler, offtopic, mod, password, reveal',
		'EP_CAT_LINKS'		=> 'anchor, ed2k, magnet, hashtag, nfo, torrent, download, email, url, link',
		'EP_CAT_STRUCTURE'	=> 'table, pipes, codebox, tabs, tab, box, quote2, list2, collapse',
	];

	/**
	 * Suddivisione predefinita dei BBCode personalizzati nei menu, con i nomi nella lingua indicata
	 *
	 * @param array $lang Stringhe di lingua (chiave => testo); se manca una chiave si usa la chiave stessa
	 * @return string
	 */
	public static function default_category_map(array $lang = [])
	{
		$lines = [];
		foreach (self::DEFAULT_CATEGORIES as $key => $tags)
		{
			$lines[] = (isset($lang[$key]) ? $lang[$key] : $key) . ': ' . $tags;
		}

		return implode("\n", $lines);
	}

	/**
	 * Legge un file di lingua dell'estensione senza il servizio "language" (serve nelle migrazioni).
	 * Usa la lingua predefinita del forum e ripiega sull'inglese.
	 *
	 * @param string $root_path
	 * @param string $php_ext
	 * @param string $iso   Lingua predefinita del forum (config default_lang)
	 * @param string $file  es. 'common'
	 * @return array
	 */
	public static function load_language_file($root_path, $php_ext, $iso, $file)
	{
		$base = $root_path . 'ext/salvocortesiano/editorplus/language/';
		$path = $base . basename((string) $iso) . '/' . $file . '.' . $php_ext;

		if (!file_exists($path))
		{
			$path = $base . 'en/' . $file . '.' . $php_ext;
		}

		$lang = [];
		include $path;

		return $lang;
	}

	/**
	 * Legge la mappa "Categoria: tag, tag" (una per riga)
	 *
	 * @param string $text
	 * @return array [nome categoria => [tag, ...]]
	 */
	public static function parse_category_map($text)
	{
		$map = [];

		foreach (preg_split('/\r\n|\r|\n/', (string) $text) as $line)
		{
			$line = trim($line);
			if ($line === '' || strpos($line, ':') === false)
			{
				continue;
			}

			list($name, $tags) = array_map('trim', explode(':', $line, 2));
			$name = utf8_substr(preg_replace('/\s+/u', ' ', strip_tags($name)), 0, 40);

			if ($name === '')
			{
				continue;
			}

			$tags = self::parse_tags($tags);
			$map[$name] = isset($map[$name]) ? array_values(array_unique(array_merge($map[$name], $tags))) : $tags;
		}

		return $map;
	}

	/**
	 * Normalizza un elenco di tag separati da virgole, spazi o a capo
	 *
	 * @param string $text
	 * @return string[]
	 */
	public static function parse_tags($text)
	{
		$tags = [];

		foreach (preg_split('/[\s,;]+/', strtolower((string) $text)) as $tag)
		{
			$tag = rtrim(trim($tag, '[]'), '=');
			if (preg_match(self::TAG_REGEX, $tag))
			{
				$tags[] = $tag;
			}
		}

		return array_values(array_unique($tags));
	}

	/**
	 * Tag di tutti i BBCode personalizzati presenti sul forum, senza "=" finale (es. ['imgi', 'ghide', ...]).
	 * La query è in cache: phpBB la svuota da solo quando si aggiunge o si elimina un BBCode dall'ACP.
	 *
	 * @param \phpbb\db\driver\driver_interface $db
	 * @return string[]
	 */
	public static function existing_bbcodes($db)
	{
		static $tags = null;

		if ($tags === null)
		{
			$sql = 'SELECT bbcode_tag
				FROM ' . BBCODES_TABLE;
			$result = $db->sql_query($sql, 3600);

			$tags = [];
			while ($row = $db->sql_fetchrow($result))
			{
				$tags[] = strtolower(rtrim($row['bbcode_tag'], '='));
			}
			$db->sql_freeresult($result);
		}

		return $tags;
	}

	/**
	 * Il pulsante GHide ha senso solo se sul forum esiste il BBCode [ghide]:
	 * creato nell'ACP oppure registrato da un'estensione (non compare nella tabella dei BBCode).
	 *
	 * @param \phpbb\db\driver\driver_interface $db
	 * @param \phpbb\textformatter\parser_interface|null $parser
	 * @return bool
	 */
	public static function ghide_available($db, $parser = null, $config = null)
	{
		return self::ghide_source($db, $parser, $config) !== '';
	}

	/**
	 * Come è stato riconosciuto [ghide] (stringa vuota = non riconosciuto)
	 *
	 * @return string force | posts | table | parser | ''
	 */
	public static function ghide_source($db, $parser = null, $config = null)
	{
		if ($config !== null && !empty($config['editorplus_ghide_force']))
		{
			return 'force';
		}
		if ($config !== null && !empty($config['editorplus_ghide_used']))
		{
			return 'posts';
		}
		if (in_array('ghide', self::existing_bbcodes($db), true))
		{
			return 'table';
		}
		if ($parser !== null && self::parser_knows($parser, 'ghide', ['[ghide=2|5,4]x[/ghide]', '[ghide=2]x[/ghide]', '[ghide]x[/ghide]']))
		{
			return 'parser';
		}

		return '';
	}

	/**
	 * Il forum usa già [ghide] nei messaggi? (testo salvato come BBCode riconosciuto o come testo semplice)
	 *
	 * @param \phpbb\db\driver\driver_interface $db
	 * @param string $posts_table
	 * @return bool
	 */
	public static function ghide_in_posts($db, $posts_table)
	{
		$sql = 'SELECT post_id
			FROM ' . $posts_table . "
			WHERE post_text " . $db->sql_like_expression($db->get_any_char() . '[ghide' . $db->get_any_char()) . "
				OR post_text " . $db->sql_like_expression($db->get_any_char() . '<GHIDE' . $db->get_any_char());
		$result = $db->sql_query_limit($sql, 1);
		$found = (bool) $db->sql_fetchfield('post_id');
		$db->sql_freeresult($result);

		return $found;
	}

	/**
	 * Il motore di phpBB riconosce questo BBCode? Vale anche per quelli aggiunti da estensioni.
	 * Si prova a interpretare un esempio: se il risultato contiene il tag, il BBCode esiste.
	 *
	 * @param \phpbb\textformatter\parser_interface $parser
	 * @param string   $tag
	 * @param string[] $samples Esempi da provare; se vuoto: [tag]x[/tag] e [tag=1]x[/tag]
	 * @return bool
	 */
	public static function parser_knows($parser, $tag, array $samples = [])
	{
		static $known = [];

		if (isset($known[$tag]))
		{
			return $known[$tag];
		}

		$samples = $samples ?: ['[' . $tag . ']x[/' . $tag . ']', '[' . $tag . '=1]x[/' . $tag . ']'];
		$known[$tag] = false;

		try
		{
			foreach ($samples as $sample)
			{
				$xml = $parser->parse($sample);
				if (stripos($xml, '<' . strtoupper($tag)) !== false)
				{
					$known[$tag] = true;
					break;
				}
			}
		}
		catch (\Exception $e)
		{
			$known[$tag] = false;
		}

		return $known[$tag];
	}

	/**
	 * Tag esistenti tra quelli richiesti: tabella dei BBCode più quelli registrati da estensioni
	 *
	 * @param \phpbb\db\driver\driver_interface $db
	 * @param \phpbb\textformatter\parser_interface|null $parser
	 * @param string[] $candidates
	 * @return string[]
	 */
	public static function known_tags($db, $parser, array $candidates)
	{
		$table = self::existing_bbcodes($db);
		$known = $table;

		if ($parser !== null)
		{
			foreach (array_diff(array_unique($candidates), $table) as $tag)
			{
				if (preg_match(self::TAG_REGEX, $tag) && self::parser_knows($parser, $tag))
				{
					$known[] = $tag;
				}
			}
		}

		return array_values(array_unique($known));
	}

	/**
	 * JSON per il JavaScript che non fallisce mai: i caratteri non UTF-8 validi (capita con dati
	 * importati da vecchi forum, per esempio nelle descrizioni delle faccine) vengono sostituiti
	 * invece di far perdere tutta la configurazione. Sicuro dentro un tag <script>.
	 *
	 * @param mixed $data
	 * @return string
	 */
	public static function safe_json($data)
	{
		$flags = JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR;
		if (defined('JSON_INVALID_UTF8_SUBSTITUTE'))
		{
			$flags |= JSON_INVALID_UTF8_SUBSTITUTE;
		}

		$json = json_encode($data, $flags);

		// U+2028/U+2029 restano comunque protetti: PHP li scrive come \u2028 anche con JSON_UNESCAPED_UNICODE
		return $json === false ? '{}' : $json;
	}

	/**
	 * Preferenze dell'utente (colonna user_editorplus, JSON) completate con i valori predefiniti
	 *
	 * @param string $json
	 * @return array
	 */
	public static function user_prefs($json)
	{
		$saved = json_decode((string) $json, true);
		$prefs = [];
		foreach (self::USER_PREFS as $key => $default)
		{
			$prefs[$key] = (is_array($saved) && isset($saved[$key])) ? (int) (bool) $saved[$key] : $default;
		}

		return $prefs;
	}

	/**
	 * Gruppi ammessi per ciascun BBCode, impostati in ACP > BBCode da Advanced BBCode Box
	 * (vuoto = tutti). Chiave: tag senza "=".
	 *
	 * @param \phpbb\db\driver\driver_interface $db
	 * @return array [tag => int[]]
	 */
	public static function bbcode_groups($db)
	{
		// la colonna bbcode_group la aggiunge Advanced BBCode Box: senza (mai installata, o dati cancellati)
		// non esiste, e i BBCode valgono per tutti, come in phpBB
		if (!self::has_bbcode_group_column($db))
		{
			return [];
		}

		$sql = 'SELECT bbcode_tag, bbcode_group
			FROM ' . BBCODES_TABLE;
		$result = $db->sql_query($sql, 3600);

		$groups = [];
		while ($row = $db->sql_fetchrow($result))
		{
			$groups[strtolower(rtrim($row['bbcode_tag'], '='))] = self::parse_group_ids(isset($row['bbcode_group']) ? $row['bbcode_group'] : '');
		}
		$db->sql_freeresult($result);

		return $groups;
	}

	/**
	 * La tabella dei BBCode ha la colonna bbcode_group (di Advanced BBCode Box)?
	 * Il risultato resta nella cache del forum (svuotandola, si ricontrolla: per esempio dopo aver
	 * installato o cancellato ABBC3).
	 *
	 * @param \phpbb\db\driver\driver_interface $db
	 * @return bool
	 */
	public static function has_bbcode_group_column($db)
	{
		static $known = null;
		if ($known !== null)
		{
			return $known;
		}

		global $cache, $phpbb_container;
		$cached = isset($cache) && $cache ? $cache->get('_editorplus_bbcode_group_col') : false;
		if ($cached === 'yes' || $cached === 'no')
		{
			return $known = ($cached === 'yes');
		}

		$known = false;
		try
		{
			$tools = (isset($phpbb_container) && $phpbb_container && $phpbb_container->has('dbal.tools'))
				? $phpbb_container->get('dbal.tools')
				: (new \phpbb\db\tools\factory())->get($db);
			$known = (bool) $tools->sql_column_exists(BBCODES_TABLE, 'bbcode_group');
		}
		catch (\Exception $e)
		{
			$known = false;
		}

		if (isset($cache) && $cache)
		{
			$cache->put('_editorplus_bbcode_group_col', $known ? 'yes' : 'no', 3600);
		}

		return $known;
	}

	/**
	 * Gruppi a cui appartiene l'utente (esclusi quelli in attesa di approvazione)
	 *
	 * @param \phpbb\db\driver\driver_interface $db
	 * @param int $user_id
	 * @return int[]
	 */
	public static function user_groups($db, $user_id)
	{
		$sql = 'SELECT group_id
			FROM ' . USER_GROUP_TABLE . '
			WHERE user_id = ' . (int) $user_id . '
				AND user_pending = 0';
		$result = $db->sql_query($sql);

		$groups = [];
		while ($row = $db->sql_fetchrow($result))
		{
			$groups[] = (int) $row['group_id'];
		}
		$db->sql_freeresult($result);

		return $groups;
	}

	/**
	 * Gruppi GHide come array di interi (es. "5,4" => [5, 4])
	 *
	 * @param string $value
	 * @return int[]
	 */
	public static function parse_group_ids($value)
	{
		return array_values(array_unique(array_filter(array_map('intval', explode(',', (string) $value)))));
	}
}
