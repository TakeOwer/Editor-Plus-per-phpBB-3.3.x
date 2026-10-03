<?php
/**
 *
 * Editor Plus
 * Check-up dell'installazione: ogni riga è una domanda con una risposta chiara
 * (OK / da vedere / problema), il dettaglio e, se serve, cosa fare.
 * Nessun controllo modifica dati; le prove che passano dal browser stanno nella pagina ACP.
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\core;

class checkup
{
	const OK	= 'ok';
	const WARN	= 'warn';
	const FAIL	= 'fail';

	/** Impostazioni aggiunte da ciascuna migrazione: se manca, quella migrazione non è stata eseguita */
	const MIGRATION_KEYS = [
		'1.0.0'		=> 'editorplus_font_select',
		'1.0.10'	=> 'editorplus_ghide_force',
		'1.0.11'	=> 'editorplus_ghide_default',
		'1.0.12'	=> 'editorplus_live_format',
		'1.0.14'	=> 'editorplus_wysiwyg',
		'1.0.15'	=> 'editorplus_wysiwyg_real',
		'1.0.16'	=> 'editorplus_ghide_button',
		'1.0.17'	=> 'editorplus_options_menu',
		'1.0.19'	=> 'editorplus_info_bar',
		'1.0.21'	=> 'editorplus_syntax',
		'1.0.28'	=> 'editorplus_math',
		'1.0.29'	=> 'editorplus_katex_version',
		'1.0.31'	=> 'editorplus_color',
		'1.0.36'	=> 'editorplus_print',
		'1.0.37'	=> 'editorplus_cleanup',
		'1.0.38'	=> 'editorplus_images',
		'1.0.39'	=> 'editorplus_img_need_post',
	];

	/** File senza i quali una parte dell'estensione non funziona */
	const FILES = [
		'styles/all/template/js/editorplus.js',
		'styles/all/template/js/editorplus_data.js',
		'styles/all/template/js/editorplus_bbrules.js',
		'styles/all/template/js/editorplus_syntax.js',
		'styles/all/template/js/sceditor/sceditor.min.js',
		'styles/all/template/js/sceditor/sceditor.bbcode.min.js',
		'styles/all/template/js/syntax/highlight.min.js',
		'styles/all/template/js/syntax/beautifier.min.js',
		'styles/all/template/js/editorplus_math.js',
		'styles/all/template/js/editorplus_calc.js',
		'styles/all/template/js/editorplus_mod_math.js',
		'styles/all/template/js/editorplus_mod_color.js',
		'styles/all/template/js/editorplus_mod_print.js',
		'styles/all/template/js/editorplus_mod_paste.js',
		'styles/all/template/js/math/katex.min.js',
		'styles/all/template/js/math/mhchem.min.js',
		'styles/all/theme/math/katex.min.css',
		'styles/all/theme/math/fonts/KaTeX_Main-Regular.woff2',
		'styles/all/template/editorplus_bar_after.html',
		'styles/all/template/editorplus_tools.html',
		'styles/all/theme/editorplus.css',
		'styles/all/theme/editorplus_syntax.css',
		'styles/all/theme/editorplus_wysiwyg_content.css',
		'styles/all/theme/sceditor.min.css',
		'styles/all/theme/syntax/light.min.css',
		'styles/all/theme/syntax/dark.min.css',
		'adm/style/editorplus_acp.html',
		'adm/style/editorplus_combos.html',
		'adm/style/editorplus_check.html',
		'adm/style/editorplus_check.js',
		'cron/task/cleanup.php',
		'core/print_filter.php',
		'core/images.php',
		'core/image_exception.php',
		'controller/image_controller.php',
		'controller/acp_images_controller.php',
		'adm/style/editorplus_images.html',
		'styles/all/template/ucp_editorplus_images.html',
		'styles/all/template/js/editorplus_gallery.js',
		'styles/all/template/js/editorplus_mod_images.js',
		'styles/all/theme/editorplus_gallery.css',
	];

	/** @var \phpbb\config\config */
	protected $config;

	/** @var \phpbb\config\db_text */
	protected $config_text;

	/** @var \phpbb\db\driver\driver_interface */
	protected $db;

	/** @var \phpbb\extension\manager */
	protected $ext_manager;

	/** @var \phpbb\language\language */
	protected $language;

	/** @var \phpbb\db\tools\tools_interface */
	protected $db_tools;

	/** @var \phpbb\controller\helper */
	protected $helper;

	/** @var \Symfony\Component\DependencyInjection\ContainerInterface */
	protected $container;

	/** @var string */
	protected $root_path;

	/** @var string */
	protected $table_prefix;

	/** @var array */
	protected $rows = [];

	public function __construct($config, $config_text, $db, $ext_manager, $language, $db_tools, $helper, $container, $root_path, $table_prefix)
	{
		$this->config = $config;
		$this->config_text = $config_text;
		$this->db = $db;
		$this->ext_manager = $ext_manager;
		$this->language = $language;
		$this->db_tools = $db_tools;
		$this->helper = $helper;
		$this->container = $container;
		$this->root_path = $root_path;
		$this->table_prefix = $table_prefix;
	}

	/**
	 * @return array Righe: ['group', 'label', 'status', 'detail', 'hint']
	 */
	public function run()
	{
		$this->rows = [];

		foreach (['environment', 'files', 'install', 'bbcodes', 'engine', 'math', 'data', 'images'] as $step)
		{
			try
			{
				$this->{'check_' . $step}();
			}
			catch (\Throwable $e)
			{
				// un controllo che si rompe è esso stesso un problema da segnalare, non deve fermare gli altri
				$this->add('EDITORPLUS_CHK_GROUP_' . strtoupper($step), 'EDITORPLUS_CHK_CRASH', self::FAIL, $e->getMessage(), 'EDITORPLUS_CHK_CRASH_HINT');
			}
		}

		return $this->rows;
	}

	/**
	 * @return array [ok, warn, fail]
	 */
	public function summarise(array $rows)
	{
		$summary = [self::OK => 0, self::WARN => 0, self::FAIL => 0];
		foreach ($rows as $row)
		{
			$summary[$row['status']]++;
		}

		return $summary;
	}

	protected function add($group, $label, $status, $detail = '', $hint = '')
	{
		$this->rows[] = [
			'group'		=> $group,
			'label'		=> $label,
			'status'	=> $status,
			'detail'	=> (string) $detail,
			'hint'		=> $hint,
		];
	}

	protected function lang($key)
	{
		return call_user_func_array([$this->language, 'lang'], func_get_args());
	}

	protected function ext_path()
	{
		return $this->root_path . 'ext/salvocortesiano/editorplus/';
	}

	/* ---------------------------------------------------------------- */

	protected function check_environment()
	{
		$g = 'EDITORPLUS_CHK_GROUP_ENVIRONMENT';

		$this->add($g, 'EDITORPLUS_CHK_PHP', version_compare(PHP_VERSION, '7.4.0', '>=') ? self::OK : self::FAIL, PHP_VERSION,
			version_compare(PHP_VERSION, '7.4.0', '>=') ? '' : 'EDITORPLUS_CHK_PHP_HINT');

		$this->add($g, 'EDITORPLUS_CHK_PHPBB', phpbb_version_compare($this->config['version'], '3.3.0', '>=') ? self::OK : self::FAIL, $this->config['version']);

		$enabled = $this->ext_manager->is_enabled('vse/abbc3');
		if ($enabled && !empty($this->config['abbc3_bbcode_bar']))
		{
			$this->add($g, 'EDITORPLUS_CHK_ABBC3', self::OK, $this->lang('EDITORPLUS_CHK_ABBC3_FULL'));
		}
		else if ($enabled)
		{
			$this->add($g, 'EDITORPLUS_CHK_ABBC3', self::WARN, $this->lang('EDITORPLUS_CHK_ABBC3_BAR_OFF'), 'EDITORPLUS_CHK_ABBC3_HINT');
		}
		else
		{
			$this->add($g, 'EDITORPLUS_CHK_ABBC3', self::WARN,
				$this->lang($this->ext_manager->is_available('vse/abbc3') ? 'EDITORPLUS_CHK_ABBC3_DISABLED' : 'EDITORPLUS_CHK_ABBC3_MISSING'),
				'EDITORPLUS_CHK_ABBC3_HINT');
		}

		$this->add($g, 'EDITORPLUS_CHK_JSON', function_exists('json_encode') && defined('JSON_INVALID_UTF8_SUBSTITUTE') ? self::OK : self::FAIL,
			function_exists('json_encode') ? 'json' : '-');
		$this->add($g, 'EDITORPLUS_CHK_MBSTRING', function_exists('mb_strlen') ? self::OK : self::WARN, function_exists('mb_strlen') ? 'mbstring' : '-',
			function_exists('mb_strlen') ? '' : 'EDITORPLUS_CHK_MBSTRING_HINT');
	}

	/* ---------------------------------------------------------------- */

	protected function check_files()
	{
		$g = 'EDITORPLUS_CHK_GROUP_FILES';

		$missing = [];
		foreach (self::FILES as $file)
		{
			$path = $this->ext_path() . $file;
			if (!is_readable($path) || !filesize($path))
			{
				$missing[] = $file;
			}
		}
		$this->add($g, 'EDITORPLUS_CHK_FILES', $missing ? self::FAIL : self::OK,
			$missing ? implode(', ', $missing) : $this->lang('EDITORPLUS_CHK_FILES_OK', count(self::FILES)),
			$missing ? 'EDITORPLUS_CHK_FILES_HINT' : '');

		// Tutti i pezzi devono essere della stessa versione: altrimenti l'aggiornamento è rimasto a metà
		$versions = ['composer.json' => '', 'core/helper.php' => helper::VERSION, 'editorplus.js' => '', 'editorplus_bar_after.html' => ''];
		$composer = @json_decode((string) @file_get_contents($this->ext_path() . 'composer.json'), true);
		$versions['composer.json'] = isset($composer['version']) ? $composer['version'] : '';
		if (preg_match("/var epState = \\{version: '([^']+)'/", (string) @file_get_contents($this->ext_path() . 'styles/all/template/js/editorplus.js'), $m))
		{
			$versions['editorplus.js'] = $m[1];
		}
		if (preg_match('/editorplus\.js\?v=([0-9.]+)/', (string) @file_get_contents($this->ext_path() . 'styles/all/template/editorplus_bar_after.html'), $m))
		{
			$versions['editorplus_bar_after.html'] = $m[1];
		}
		$distinct = array_unique(array_filter($versions, 'strlen'));
		$detail = [];
		foreach ($versions as $file => $v)
		{
			$detail[] = $file . ' ' . ($v !== '' ? $v : '?');
		}
		$ok = count($distinct) === 1 && count(array_filter($versions, 'strlen')) === count($versions);
		$this->add($g, 'EDITORPLUS_CHK_VERSIONS', $ok ? self::OK : self::FAIL,
			$ok ? reset($distinct) : implode(' · ', $detail),
			$ok ? '' : 'EDITORPLUS_CHK_VERSIONS_HINT');

		// Versione registrata da phpBB (quella delle migrazioni) rispetto ai file
		$meta = $this->ext_manager->create_extension_metadata_manager('salvocortesiano/editorplus');
		$installed = '';
		try
		{
			$installed = (string) $meta->get_metadata('version');
		}
		catch (\Exception $e)
		{
			$installed = '';
		}
		$this->add($g, 'EDITORPLUS_CHK_METADATA', $installed === helper::VERSION ? self::OK : self::WARN, $installed !== '' ? $installed : '?',
			$installed === helper::VERSION ? '' : 'EDITORPLUS_CHK_VERSIONS_HINT');
	}

	/* ---------------------------------------------------------------- */

	protected function check_install()
	{
		$g = 'EDITORPLUS_CHK_GROUP_INSTALL';

		$missing = [];
		foreach (self::MIGRATION_KEYS as $version => $key)
		{
			if (!$this->config->offsetExists($key))
			{
				$missing[] = $version;
			}
		}
		$this->add($g, 'EDITORPLUS_CHK_MIGRATIONS', $missing ? self::FAIL : self::OK,
			$missing ? $this->lang('EDITORPLUS_CHK_MIGRATIONS_MISSING', implode(', ', $missing)) : $this->lang('EDITORPLUS_CHK_MIGRATIONS_OK', count(self::MIGRATION_KEYS)),
			$missing ? 'EDITORPLUS_CHK_REENABLE_HINT' : '');

		$table = $this->table_prefix . 'editorplus_drafts';
		$has_table = $this->db_tools->sql_table_exists($table);
		// dalla 1.0.34 la tabella ha anche l'elenco degli allegati
		$complete = $has_table && $this->db_tools->sql_column_exists($table, 'draft_attachments');
		$this->add($g, 'EDITORPLUS_CHK_DRAFT_TABLE', $complete ? self::OK : self::FAIL, $table . ($has_table && !$complete ? ' (draft_attachments?)' : ''),
			$complete ? '' : 'EDITORPLUS_CHK_REENABLE_HINT');

		$has_column = $this->db_tools->sql_column_exists(USERS_TABLE, 'user_editorplus');
		$this->add($g, 'EDITORPLUS_CHK_PREFS_COLUMN', $has_column ? self::OK : self::FAIL, USERS_TABLE . '.user_editorplus', $has_column ? '' : 'EDITORPLUS_CHK_REENABLE_HINT');

		$sql = 'SELECT module_mode
			FROM ' . MODULES_TABLE . "
			WHERE module_class = 'acp'
				AND module_basename = '" . $this->db->sql_escape('\\salvocortesiano\\editorplus\\acp\\main_module') . "'";
		$result = $this->db->sql_query($sql);
		$modes = [];
		while ($row = $this->db->sql_fetchrow($result))
		{
			$modes[] = $row['module_mode'];
		}
		$this->db->sql_freeresult($result);
		$lack = array_diff(['settings', 'combos', 'images', 'check'], $modes);
		$this->add($g, 'EDITORPLUS_CHK_MODULES', $lack ? self::WARN : self::OK, implode(', ', $modes), $lack ? 'EDITORPLUS_CHK_REENABLE_HINT' : '');

		$routes = [];
		$broken = [];
		foreach (['salvocortesiano_editorplus_render', 'salvocortesiano_editorplus_prefs', 'salvocortesiano_editorplus_draft', 'salvocortesiano_editorplus_print', 'salvocortesiano_editorplus_image_upload'] as $route)
		{
			try
			{
				// senza il codice di sessione: il referto si copia e si condivide
				$routes[] = preg_replace('/[?&](amp;)?sid=[0-9a-f]+/i', '', $this->helper->route($route));
			}
			catch (\Exception $e)
			{
				$broken[] = $route;
			}
		}
		$this->add($g, 'EDITORPLUS_CHK_ROUTES', $broken ? self::FAIL : self::OK, $broken ? implode(', ', $broken) : implode(' · ', $routes),
			$broken ? 'EDITORPLUS_CHK_ROUTES_HINT' : '');
	}

	/* ---------------------------------------------------------------- */

	protected function check_bbcodes()
	{
		$g = 'EDITORPLUS_CHK_GROUP_BBCODES';
		$existing = helper::existing_bbcodes($this->db);
		$parser = $this->parser();

		$fa = in_array('fa', $existing, true);
		$this->add($g, 'EDITORPLUS_CHK_FA', $fa ? self::OK : self::WARN, $fa ? '[fa]' : $this->lang('EDITORPLUS_CHK_NOT_FOUND'), $fa ? '' : 'EDITORPLUS_CHK_FA_HINT');

		// selettore del colore: il BBCode [color] è di phpBB, sempre presente; qui si dice come è impostato
		$this->add($g, 'EDITORPLUS_CHK_COLOR', self::OK, empty($this->config['editorplus_color'])
			? $this->lang('EDITORPLUS_CHK_COLOR_OFF')
			: $this->lang(empty($this->config['editorplus_color_classic']) ? 'EDITORPLUS_CHK_COLOR_ON' : 'EDITORPLUS_CHK_COLOR_ON_CLASSIC'));

		// stampa: gruppi che possono stampare i contenuti nascosti (ancora esistenti?)
		if (!empty($this->config['editorplus_print']))
		{
			$pg = helper::parse_group_ids($this->config['editorplus_print_groups']);
			$found = [];
			if ($pg)
			{
				$result = $this->db->sql_query('SELECT group_id FROM ' . GROUPS_TABLE . ' WHERE ' . $this->db->sql_in_set('group_id', $pg));
				while ($row = $this->db->sql_fetchrow($result))
				{
					$found[] = (int) $row['group_id'];
				}
				$this->db->sql_freeresult($result);
			}
			$gone = array_diff($pg, $found);
			$this->add($g, 'EDITORPLUS_CHK_PRINT', $gone ? self::WARN : self::OK,
				$this->lang('EDITORPLUS_CHK_PRINT_DETAIL', $pg ? implode(',', $pg) : '-',
					implode(', ', print_filter::tags($this->config['editorplus_print_hidden_tags'])) ?: '-',
					implode(', ', print_filter::tags($this->config['editorplus_print_spoiler_tags'])) ?: '-'),
				$gone ? 'EDITORPLUS_CHK_PRINT_HINT' : '');
		}
		else
		{
			$this->add($g, 'EDITORPLUS_CHK_PRINT', self::OK, $this->lang('EDITORPLUS_CHK_OFF'));
		}

		$font = in_array('font', $existing, true);
		$this->add($g, 'EDITORPLUS_CHK_FONT', $font ? self::OK : self::WARN, $font ? '[font]' : $this->lang('EDITORPLUS_CHK_NOT_FOUND'), $font ? '' : 'EDITORPLUS_CHK_FONT_HINT');

		// come nelle impostazioni: se [ghide] risulta non usato si ricontrolla nei messaggi (utile dopo un'importazione)
		if (empty($this->config['editorplus_ghide_used']) && helper::ghide_in_posts($this->db, POSTS_TABLE))
		{
			$this->config->set('editorplus_ghide_used', 1);
		}
		$source = helper::ghide_source($this->db, $parser, $this->config);
		if (empty($this->config['editorplus_ghide']))
		{
			$this->add($g, 'EDITORPLUS_CHK_GHIDE', self::OK, $this->lang('EDITORPLUS_CHK_OFF'));
		}
		else
		{
			$this->add($g, 'EDITORPLUS_CHK_GHIDE', $source !== '' ? self::OK : self::WARN,
				$this->lang('EDITORPLUS_GHIDE_SOURCE_' . strtoupper($source ?: 'none')),
				$source !== '' ? '' : 'EDITORPLUS_CHK_GHIDE_HINT');
		}

		// combo che usano BBCode assenti: non compaiono nella barra
		$combos = combos::load($this->config_text);
		$known = helper::known_tags($this->db, $parser, array_column($combos, 'tag'));
		$broken = [];
		$active = 0;
		foreach ($combos as $combo)
		{
			if (empty($combo['enabled']))
			{
				continue;
			}
			$active++;
			if (!in_array($combo['tag'], $known, true))
			{
				$broken[] = $combo['name'] . ' [' . $combo['tag'] . ']';
			}
		}
		$this->add($g, 'EDITORPLUS_CHK_COMBOS', $broken ? self::WARN : self::OK,
			$broken ? implode(', ', $broken) : $this->lang('EDITORPLUS_CHK_COMBOS_OK', $active, count($combos)),
			$broken ? 'EDITORPLUS_CHK_COMBOS_HINT' : '');
	}

	/* ---------------------------------------------------------------- */

	/**
	 * Prova vera del motore dei BBCode: un testo di esempio passa da interpretazione e visualizzazione
	 */
	protected function check_engine()
	{
		$g = 'EDITORPLUS_CHK_GROUP_ENGINE';
		$parser = $this->parser();
		if (!$parser || !$this->container)
		{
			$this->add($g, 'EDITORPLUS_CHK_RENDER', self::FAIL, $this->lang('EDITORPLUS_CHK_NOT_FOUND'));
			return;
		}
		$renderer = $this->container->get('text_formatter.renderer');

		$xml = $parser->parse('[b]Editor Plus[/b]');
		$html = $renderer->render($xml);
		$ok = strpos($html, 'Editor Plus') !== false && stripos($html, '<strong') !== false;
		$this->add($g, 'EDITORPLUS_CHK_RENDER', $ok ? self::OK : self::FAIL, $ok ? $this->lang('EDITORPLUS_CHK_RENDER_OK') : strip_tags($html),
			$ok ? '' : 'EDITORPLUS_CHK_RENDER_HINT');

		$xml = $parser->parse("[syntax=php]echo '<b>ciao</b>'; [b]x[/b][/syntax]");
		$html = $renderer->render($xml);
		$ok = strpos($html, 'ep-syntax') !== false && strpos($html, 'data-lang="php"') !== false
			&& strpos($html, '[b]x[/b]') !== false && strpos($html, '&lt;b&gt;') !== false;
		$this->add($g, 'EDITORPLUS_CHK_SYNTAX', $ok ? self::OK : self::FAIL, $ok ? $this->lang('EDITORPLUS_CHK_SYNTAX_OK') : strip_tags($html),
			$ok ? '' : 'EDITORPLUS_CHK_SYNTAX_HINT');

		// formule: [math] e [imath] registrati, contenuto letterale (niente BBCode né HTML interpretati)
		$xml = $parser->parse('[math]\\frac{a}{b} < [b]x[/b][/math] e [imath]\\sqrt[3]{x}[/imath]');
		$html = $renderer->render($xml);
		$ok = strpos($html, 'ep-math ep-math-block') !== false && strpos($html, 'ep-math ep-math-inline') !== false
			&& strpos($html, '[b]x[/b]') !== false && strpos($html, '\\sqrt[3]{x}') !== false && strpos($html, '&lt;') !== false;
		$this->add($g, 'EDITORPLUS_CHK_MATH', $ok ? self::OK : self::FAIL, $ok ? $this->lang('EDITORPLUS_CHK_MATH_OK') : strip_tags($html),
			$ok ? '' : 'EDITORPLUS_CHK_SYNTAX_HINT');
	}

	/* ---------------------------------------------------------------- */

	/**
	 * Formule e calcolatrice: KaTeX (versione, caratteri, aggiornamento) e stato delle funzioni
	 */
	protected function check_math()
	{
		$g = 'EDITORPLUS_CHK_GROUP_MATH';
		$katex = new katex_updater($this->config, $this->root_path);

		$installed = $katex->installed_version();
		$backup = $katex->backup_version();
		$this->add($g, 'EDITORPLUS_CHK_KATEX', $installed !== '' ? self::OK : self::FAIL,
			$installed !== '' ? $installed . ($backup !== '' ? ' · ' . $this->lang('EDITORPLUS_CHK_KATEX_BACKUP', $backup) : '') : $this->lang('EDITORPLUS_CHK_NOT_FOUND'),
			$installed !== '' ? '' : 'EDITORPLUS_CHK_FILES_HINT');

		$missing = $installed !== '' ? $katex->missing_fonts() : [];
		$this->add($g, 'EDITORPLUS_CHK_KATEX_FONTS', $missing ? self::FAIL : self::OK,
			$missing ? implode(', ', array_slice($missing, 0, 6)) : $this->lang('EDITORPLUS_CHK_KATEX_FONTS_OK', count((array) glob($katex->active_paths()['fonts'] . '*.woff2'))),
			$missing ? 'EDITORPLUS_CHK_KATEX_FONTS_HINT' : '');

		$staged = $katex->staged_version();
		if ($staged !== '')
		{
			$this->add($g, 'EDITORPLUS_CHK_KATEX_STAGED', self::WARN, $staged, 'EDITORPLUS_CHK_KATEX_STAGED_HINT');
		}

		$caps = $katex->capabilities();
		$ok = $caps['network'] && $caps['writable'] && $caps['gzip'];
		$why = [];
		if (!$caps['network'])
		{
			$why[] = $this->lang('EDITORPLUS_CHK_KATEX_NO_NETWORK');
		}
		if (!$caps['gzip'])
		{
			$why[] = 'zlib';
		}
		if (!$caps['writable'])
		{
			$why[] = $this->lang('EDITORPLUS_CHK_KATEX_NOT_WRITABLE', implode(', ', $caps['not_writable']));
		}
		$this->add($g, 'EDITORPLUS_CHK_KATEX_UPDATE', $ok ? self::OK : self::WARN,
			$ok ? $this->lang('EDITORPLUS_CHK_KATEX_UPDATE_OK') : implode(' · ', $why),
			$ok ? '' : 'EDITORPLUS_CHK_KATEX_UPDATE_HINT');

		foreach (['editorplus_math' => 'EDITORPLUS_MATH', 'editorplus_calc' => 'EDITORPLUS_CALC'] as $key => $label)
		{
			$this->add($g, $label, self::OK, $this->lang(empty($this->config[$key]) ? 'EDITORPLUS_CHK_OFF' : 'EDITORPLUS_CHK_ON'));
		}
	}

	/* ---------------------------------------------------------------- */

	protected function check_data()
	{
		$g = 'EDITORPLUS_CHK_GROUP_DATA';

		// Un carattere non valido nelle faccine o nei BBCode bloccava tutta la barra (1.0.7): qui si trova dove
		$bad = [];
		$result = $this->db->sql_query('SELECT code, emotion FROM ' . SMILIES_TABLE);
		while ($row = $this->db->sql_fetchrow($result))
		{
			if (!preg_match('//u', $row['code'] . $row['emotion']))
			{
				$bad[] = $this->lang('EDITORPLUS_CHK_SMILEY') . ' ' . utf8_htmlspecialchars(@iconv('UTF-8', 'UTF-8//IGNORE', $row['code']));
			}
		}
		$this->db->sql_freeresult($result);
		$result = $this->db->sql_query('SELECT bbcode_tag, bbcode_helpline FROM ' . BBCODES_TABLE);
		while ($row = $this->db->sql_fetchrow($result))
		{
			if (!preg_match('//u', $row['bbcode_tag'] . $row['bbcode_helpline']))
			{
				$bad[] = '[' . $row['bbcode_tag'] . ']';
			}
		}
		$this->db->sql_freeresult($result);
		$this->add($g, 'EDITORPLUS_CHK_UTF8', $bad ? self::WARN : self::OK, $bad ? implode(', ', array_slice($bad, 0, 10)) : $this->lang('EDITORPLUS_CHK_UTF8_OK'),
			$bad ? 'EDITORPLUS_CHK_UTF8_HINT' : '');

		$raw = (string) $this->config_text->get('editorplus_combos');
		$valid = $raw === '' || is_array(json_decode($raw, true));
		$this->add($g, 'EDITORPLUS_CHK_COMBO_DATA', $valid ? self::OK : self::FAIL,
			$valid ? $this->lang('EDITORPLUS_CHK_BYTES', strlen($raw)) : $this->lang('EDITORPLUS_CHK_CORRUPT'), $valid ? '' : 'EDITORPLUS_CHK_COMBO_DATA_HINT');

		$cats = helper::parse_category_map($this->config_text->get('editorplus_category_map'));
		$this->add($g, 'EDITORPLUS_CHK_CATEGORIES', $cats ? self::OK : self::WARN, $this->lang('EDITORPLUS_CHK_CATEGORIES_COUNT', count($cats)),
			$cats ? '' : 'EDITORPLUS_CHK_CATEGORIES_HINT');

		$groups = helper::parse_group_ids($this->config['editorplus_ghide_groups']);
		if ($groups)
		{
			$result = $this->db->sql_query('SELECT group_id FROM ' . GROUPS_TABLE . ' WHERE ' . $this->db->sql_in_set('group_id', $groups));
			$found = [];
			while ($row = $this->db->sql_fetchrow($result))
			{
				$found[] = (int) $row['group_id'];
			}
			$this->db->sql_freeresult($result);
			$gone = array_diff($groups, $found);
			$this->add($g, 'EDITORPLUS_CHK_GHIDE_GROUPS', $gone ? self::WARN : self::OK, implode(',', $groups),
				$gone ? 'EDITORPLUS_CHK_GHIDE_GROUPS_HINT' : '');
		}

		$table = $this->table_prefix . 'editorplus_drafts';
		if ($this->db_tools->sql_table_exists($table))
		{
			$result = $this->db->sql_query('SELECT COUNT(*) AS total, COUNT(DISTINCT user_id) AS users FROM ' . $table);
			$row = $this->db->sql_fetchrow($result);
			$this->db->sql_freeresult($result);
			$this->add($g, 'EDITORPLUS_CHK_DRAFTS', self::OK, $this->lang('EDITORPLUS_CHK_DRAFTS_COUNT', (int) $row['total'], (int) $row['users']));
		}
	}

	/* ---------------------------------------------------------------- */

	/**
	 * 1.0.38: immagini degli utenti
	 */
	protected function check_images()
	{
		$g = 'EDITORPLUS_CHK_GROUP_IMAGES';
		/** @var images $images */
		$images = $this->container->get('salvocortesiano.editorplus.images');

		$on = $images->enabled();
		$this->add($g, 'EDITORPLUS_CHK_IMG_ON', $on ? self::OK : self::WARN,
			$on ? $this->lang('EDITORPLUS_CHK_IMG_ON_YES', $this->lang($images->link_mode() === 'route' ? 'EDITORPLUS_IMG_LINK_ROUTE' : 'EDITORPLUS_IMG_LINK_DIRECT')) : $this->lang('EDITORPLUS_CHK_IMG_ON_NO'));

		$tables = [$this->table_prefix . 'editorplus_images', $this->table_prefix . 'editorplus_img_folders'];
		$missing = array_filter($tables, function ($t) {
			return !$this->db_tools->sql_table_exists($t);
		});
		$this->add($g, 'EDITORPLUS_CHK_IMG_TABLES', $missing ? self::FAIL : self::OK, implode(', ', $missing ?: $tables), $missing ? 'EDITORPLUS_CHK_REENABLE_HINT' : '');
		if ($missing)
		{
			return;
		}

		$formats = [];
		foreach (array_values(images::TYPES) as $type)
		{
			$formats[] = strtoupper($type) . ' ' . (images::gd_can($type) ? '✓' : '✗');
		}
		$gd_all = images::gd_can('jpg') && images::gd_can('png') && images::gd_can('gif') && images::gd_can('webp');
		$this->add($g, 'EDITORPLUS_CHK_IMG_GD', images::gd_can('jpg') ? ($gd_all ? self::OK : self::WARN) : self::FAIL, implode(' · ', $formats),
			$gd_all ? '' : 'EDITORPLUS_CHK_IMG_GD_HINT');
		$this->add($g, 'EDITORPLUS_CHK_IMG_EXIF', function_exists('exif_read_data') ? self::OK : self::WARN, function_exists('exif_read_data') ? 'exif' : '-',
			function_exists('exif_read_data') ? '' : 'EDITORPLUS_CHK_IMG_EXIF_HINT');

		$base = trim((string) $this->config['upload_path'], '/') . '/';
		$writable = is_dir($images->base_dir()) && is_writable($images->base_dir());
		$this->add($g, $this->lang('EDITORPLUS_CHK_IMG_DIR', $base), $writable ? self::OK : self::FAIL, realpath($images->base_dir()) ?: $images->base_dir(), $writable ? '' : 'EDITORPLUS_CHK_IMG_DIR_HINT');

		$limit = images::php_upload_limit();
		$this->add($g, 'EDITORPLUS_CHK_IMG_LIMIT', $limit && $limit < 2097152 ? self::WARN : self::OK,
			$this->lang('EDITORPLUS_CHK_IMG_LIMIT_DETAIL', ini_get('upload_max_filesize'), ini_get('post_max_size'), ini_get('memory_limit')));

		$names = [];
		$allowed = array_keys(array_filter($images->group_settings(), function ($set) {
			return $set['mode'] === 'yes';
		}));
		if ($allowed)
		{
			$result = $this->db->sql_query('SELECT group_id, group_name, group_type FROM ' . GROUPS_TABLE . ' WHERE ' . $this->db->sql_in_set('group_id', $allowed));
			while ($row = $this->db->sql_fetchrow($result))
			{
				$key = 'G_' . strtoupper($row['group_name']);
				$names[] = ((int) $row['group_type'] === GROUP_SPECIAL && $this->language->is_set($key)) ? $this->lang($key) : $row['group_name'];
			}
			$this->db->sql_freeresult($result);
		}
		$this->add($g, 'EDITORPLUS_CHK_IMG_GROUPS', $names ? self::OK : self::WARN, $names ? implode(', ', $names) : $this->lang('EDITORPLUS_CHK_IMG_GROUPS_NONE'),
			$names ? '' : 'EDITORPLUS_CHK_IMG_GROUPS_HINT');

		if ($writable)
		{
			$test = $images->self_test();
			$this->add($g, 'EDITORPLUS_CHK_IMG_SELFTEST', $test['ok'] ? self::OK : self::FAIL,
				$test['ok'] ? $this->lang('EDITORPLUS_CHK_IMG_SELFTEST_OK', $test['size'], $test['thumb']) : ($this->language->is_set($test['detail']) ? $this->lang($test['detail']) : $test['detail']),
				$test['ok'] ? '' : 'EDITORPLUS_CHK_IMG_SELFTEST_HINT');
		}

		$ht = $images->htaccess_status();
		$this->add($g, 'EDITORPLUS_CHK_IMG_HTACCESS', $ht['bad'] ? self::WARN : self::OK,
			$ht['bad'] ? $this->lang('EDITORPLUS_CHK_IMG_HTACCESS_BAD', count($ht['bad'])) . ': ' . implode(', ', array_slice($ht['bad'], 0, 5)) : $this->lang('EDITORPLUS_CHK_IMG_HTACCESS_OK', $ht['total']),
			$ht['bad'] ? 'EDITORPLUS_CHK_IMG_HTACCESS_HINT' : '');

		$scan = $images->scan();
		$untracked = array_sum(array_map('count', $scan['untracked']));
		$problems = count($scan['missing_dirs']) + count($scan['orphan_dirs']) + count($scan['unregistered_dirs']) + $untracked + count($scan['missing_files']);
		$totals = $images->totals();
		$this->add($g, 'EDITORPLUS_CHK_IMG_SYNC', $problems ? self::WARN : self::OK,
			$problems ? $this->lang('EDITORPLUS_CHK_IMG_SYNC_BAD', count($scan['missing_dirs']), count($scan['orphan_dirs']), count($scan['unregistered_dirs']), $untracked, count($scan['missing_files']))
				: $this->lang('EDITORPLUS_CHK_IMG_SYNC_OK', $totals['users'], $totals['images']),
			$problems ? 'EDITORPLUS_CHK_IMG_SYNC_HINT' : '');
	}

	/**
	 * @return \phpbb\textformatter\parser_interface|null
	 */
	protected function parser()
	{
		try
		{
			return $this->container ? $this->container->get('text_formatter.parser') : null;
		}
		catch (\Exception $e)
		{
			return null;
		}
	}
}
