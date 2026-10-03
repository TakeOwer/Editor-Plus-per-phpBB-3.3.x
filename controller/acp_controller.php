<?php
/**
 *
 * Editor Plus
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\controller;

use phpbb\cache\driver\driver_interface as cache;
use phpbb\config\config;
use phpbb\config\db_text;
use phpbb\db\driver\driver_interface;
use phpbb\extension\manager;
use phpbb\language\language;
use phpbb\log\log_interface;
use phpbb\request\request;
use phpbb\template\template;
use phpbb\user;
use salvocortesiano\editorplus\core\combos;
use salvocortesiano\editorplus\core\helper;

class acp_controller
{
	/** @var cache */
	protected $cache;

	/** @var config */
	protected $config;

	/** @var db_text */
	protected $config_text;

	/** @var driver_interface */
	protected $db;

	/** @var manager */
	protected $ext_manager;

	/** @var language */
	protected $language;

	/** @var log_interface */
	protected $log;

	/** @var request */
	protected $request;

	/** @var template */
	protected $template;

	/** @var user */
	protected $user;

	/** @var string */
	protected $u_action;

	public function __construct(cache $cache, config $config, db_text $config_text, driver_interface $db, manager $ext_manager, language $language, log_interface $log, request $request, template $template, user $user)
	{
		$this->cache = $cache;
		$this->config = $config;
		$this->config_text = $config_text;
		$this->db = $db;
		$this->ext_manager = $ext_manager;
		$this->language = $language;
		$this->log = $log;
		$this->request = $request;
		$this->template = $template;
		$this->user = $user;
	}

	/**
	 * @param string $u_action
	 */
	public function set_page_url($u_action)
	{
		$this->u_action = $u_action;
	}

	/**
	 * Pagina delle impostazioni
	 */
	public function display_options()
	{
		$this->language->add_lang('acp', 'salvocortesiano/editorplus');

		$form_key = 'salvocortesiano_editorplus';
		add_form_key($form_key);

		$errors = [];

		if ($this->request->is_set_post('submit'))
		{
			if (!check_form_key($form_key))
			{
				$errors[] = $this->language->lang('FORM_INVALID');
			}

			if (empty($errors))
			{
				$this->save_settings();

				$this->log->add('admin', $this->user->data['user_id'], $this->user->ip, 'LOG_EDITORPLUS_SETTINGS');
				trigger_error($this->language->lang('EDITORPLUS_SAVED') . adm_back_link($this->u_action));
			}
		}

		if ($this->request->is_set_post('reset_categories'))
		{
			if (!check_form_key($form_key))
			{
				trigger_error($this->language->lang('FORM_INVALID') . adm_back_link($this->u_action), E_USER_WARNING);
			}

			$names = [];
			foreach (array_keys(helper::DEFAULT_CATEGORIES) as $key)
			{
				$names[$key] = $this->language->lang($key);
			}
			$this->config_text->set('editorplus_category_map', helper::default_category_map($names));
			trigger_error($this->language->lang('EDITORPLUS_CATEGORIES_RESET_DONE') . adm_back_link($this->u_action));
		}

		$toggles = [];
		foreach (array_keys(helper::TOGGLES) as $name)
		{
			$toggles['S_' . strtoupper($name)] = (bool) $this->config[$name];
		}

		$this->template->assign_vars(array_merge($toggles, [
			'S_ERROR'						=> !empty($errors),
			'ERROR_MSG'						=> implode('<br>', $errors),
			'EDITORPLUS_CATEGORY_MAP'		=> $this->config_text->get('editorplus_category_map'),
			'EDITORPLUS_HIDDEN_TAGS'		=> $this->config_text->get('editorplus_hidden_tags'),
			'EDITORPLUS_AUTOSAVE_DAYS'		=> (int) $this->config['editorplus_autosave_days'],
			'EDITORPLUS_ORPHAN_DAYS'		=> (int) $this->config['editorplus_orphan_days'],
			'S_EDITORPLUS_FA_BBCODE'		=> (bool) $this->config['editorplus_fa_bbcode_id'],
			'S_EDITORPLUS_SVG_ICONS'		=> $this->config['abbc3_icons_type'] === 'svg',
			'S_EDITORPLUS_FLASH_ON'			=> (bool) $this->config['allow_post_flash'],
			'U_ACTION'						=> $this->u_action,
		]));

		$this->display_groups();
		$this->display_groups('editorplus_print_groups', 'print_groups', 'EDITORPLUS_PRINT');
		$this->template->assign_vars([
			'EDITORPLUS_PRINT_HIDDEN_TAGS'	=> implode(', ', \salvocortesiano\editorplus\core\print_filter::tags($this->config['editorplus_print_hidden_tags'])),
			'EDITORPLUS_PRINT_SPOILER_TAGS'	=> implode(', ', \salvocortesiano\editorplus\core\print_filter::tags($this->config['editorplus_print_spoiler_tags'])),
		]);
		$this->assign_badges();
		$this->display_diagnostics();
		$this->display_abbc3_notice();

		// Se il forum non risultava usare [ghide], si ricontrolla nei messaggi (utile dopo un'importazione)
		if (empty($this->config['editorplus_ghide_used']) && helper::ghide_in_posts($this->db, POSTS_TABLE))
		{
			$this->config->set('editorplus_ghide_used', 1);
		}
		$ghide_source = helper::ghide_source($this->db, $this->parser(), $this->config);

		$this->template->assign_vars([
			'S_EDITORPLUS_GHIDE_FORCE'	=> (bool) $this->config['editorplus_ghide_force'],
			'EDITORPLUS_SYNTAX_THEME'	=> $this->config['editorplus_syntax_theme'] === 'dark' ? 'dark' : 'light',
			'EDITORPLUS_SYNTAX_TAB'		=> (int) $this->config['editorplus_syntax_tab'],
			'EDITORPLUS_GHIDE_DEFAULT'	=> (string) $this->config['editorplus_ghide_default'],
			'EDITORPLUS_GHIDE_SOURCE'	=> $this->language->lang('EDITORPLUS_GHIDE_SOURCE_' . strtoupper($ghide_source ?: 'none')),
			'S_EDITORPLUS_GHIDE_FOUND'	=> $ghide_source !== '',
			'S_EDITORPLUS_GHIDE_DETECTED'	=> $ghide_source !== '' && $ghide_source !== 'force',
			'S_EDITORPLUS_HAS_GHIDE'	=> true,
			'EDITORPLUS_COMBOS_COUNT'	=> count(combos::load($this->config_text)),
			'U_EDITORPLUS_COMBOS'		=> str_replace('mode=settings', 'mode=combos', $this->u_action),
			'EDITORPLUS_BBCODES_JSON'	=> helper::safe_json($this->bbcodes_for_editor()),
		]);
	}

	/**
	 * Salva tutte le impostazioni
	 */
	protected function save_settings()
	{
		// Solo gli interruttori presenti nel modulo: quelli di sezioni nascoste (GHide, combo) restano come sono
		foreach (array_keys(helper::TOGGLES) as $name)
		{
			if ($this->request->is_set_post($name))
			{
				$this->config->set($name, $this->request->variable($name, 0) ? 1 : 0);
			}
		}

		$this->config->set('editorplus_autosave_days', min(90, max(1, $this->request->variable('editorplus_autosave_days', 7))));
		if ($this->request->is_set_post('editorplus_orphan_days'))
		{
			$this->config->set('editorplus_orphan_days', min(365, max(0, $this->request->variable('editorplus_orphan_days', 0))));
		}

		// Mappa delle categorie: salvata già normalizzata ("Nome: tag, tag")
		$map = helper::parse_category_map($this->request->variable('editorplus_category_map', '', true));
		$lines = [];
		foreach ($map as $name => $tags)
		{
			$lines[] = $name . ': ' . implode(', ', $tags);
		}
		$this->config_text->set('editorplus_category_map', implode("\n", $lines));

		$this->config_text->set('editorplus_hidden_tags', implode(', ', helper::parse_tags($this->request->variable('editorplus_hidden_tags', ''))));

		if ($this->request->is_set_post('editorplus_ghide_present'))
		{
			$this->save_groups();
		}
		if ($this->request->is_set_post('editorplus_print_present'))
		{
			$this->save_groups('editorplus_print_groups');
			$this->config->set('editorplus_print_hidden_tags', implode(',', \salvocortesiano\editorplus\core\print_filter::tags($this->request->variable('editorplus_print_hidden_tags', ''))));
			$this->config->set('editorplus_print_spoiler_tags', implode(',', \salvocortesiano\editorplus\core\print_filter::tags($this->request->variable('editorplus_print_spoiler_tags', ''))));
		}
		if ($this->request->is_set_post('editorplus_syntax_theme'))
		{
			$this->config->set('editorplus_syntax_theme', $this->request->variable('editorplus_syntax_theme', 'light') === 'dark' ? 'dark' : 'light');
			$tab = $this->request->variable('editorplus_syntax_tab', 4);
			$this->config->set('editorplus_syntax_tab', in_array($tab, [2, 4, 8], true) ? $tab : 4);
		}
		if ($this->request->is_set_post('editorplus_ghide_default'))
		{
			$default = $this->request->variable('editorplus_ghide_default', 'author');
			$this->config->set('editorplus_ghide_default', in_array($default, ['author', 'me', 'both'], true) ? $default : 'author');
		}
		if ($this->request->is_set_post('editorplus_ghide_force'))
		{
			$this->config->set('editorplus_ghide_force', $this->request->variable('editorplus_ghide_force', 0) ? 1 : 0);
		}
	}

	/**
	 * Diagnostica: controlla sul forum reale ciò che può impedire a Editor Plus di partire
	 */
	protected function display_diagnostics()
	{
		$checks = [];
		$add = function ($ok, $label, $detail = '') use (&$checks) {
			$checks[] = ['S_OK' => $ok === true, 'S_WARN' => $ok === null, 'LABEL' => $label, 'DETAIL' => $detail];
		};

		// ABBC3
		$abbc3 = $this->ext_manager->is_enabled('vse/abbc3');
		$add($abbc3 ? true : null, $this->language->lang('EDITORPLUS_DIAG_ABBC3'), $abbc3 ? $this->get_version('vse/abbc3') : $this->language->lang('EDITORPLUS_DIAG_ABBC3_OFF'));

		// Testi non UTF-8 validi (bloccavano la configurazione prima della 1.0.7)
		$bad = [];
		$sql = 'SELECT code, emotion FROM ' . SMILIES_TABLE;
		$result = $this->db->sql_query($sql);
		while ($row = $this->db->sql_fetchrow($result))
		{
			if (!preg_match('//u', $row['code'] . $row['emotion']))
			{
				$bad[] = $this->language->lang('EDITORPLUS_DIAG_SMILEY') . ' ' . utf8_htmlspecialchars(mb_convert_encoding($row['code'], 'UTF-8', 'UTF-8'));
			}
		}
		$this->db->sql_freeresult($result);
		$sql = 'SELECT bbcode_tag, bbcode_helpline FROM ' . BBCODES_TABLE;
		$result = $this->db->sql_query($sql);
		while ($row = $this->db->sql_fetchrow($result))
		{
			if (!preg_match('//u', $row['bbcode_tag'] . $row['bbcode_helpline']))
			{
				$bad[] = 'BBCode [' . utf8_htmlspecialchars(mb_convert_encoding($row['bbcode_tag'], 'UTF-8', 'UTF-8')) . ']';
			}
		}
		$this->db->sql_freeresult($result);
		$add(empty($bad) ? true : null, $this->language->lang('EDITORPLUS_DIAG_UTF8'), empty($bad) ? $this->language->lang('EDITORPLUS_DIAG_NONE') : $this->language->lang('EDITORPLUS_DIAG_UTF8_FIXED') . ' ' . implode(', ', array_slice($bad, 0, 10)));

		// Combo: quante ne vedi tu e perché le altre no
		$list = combos::load($this->config_text);
		$existing = helper::known_tags($this->db, $this->parser(), array_column($list, 'tag'));
		$bbcode_groups = helper::bbcode_groups($this->db);
		$mine = helper::user_groups($this->db, $this->user->data['user_id']);
		$reasons = ['off' => [], 'missing' => [], 'groups' => [], 'abbc3' => []];
		$visible = 0;
		foreach ($list as $combo)
		{
			if (!in_array($combo['tag'], $existing, true))
			{
				$reasons['missing'][] = $combo['name'];
			}
			else if (!$combo['enabled'])
			{
				$reasons['off'][] = $combo['name'];
			}
			else if (!empty($combo['groups']) && !array_intersect($combo['groups'], $mine))
			{
				$reasons['groups'][] = $combo['name'];
			}
			else if (!empty($bbcode_groups[$combo['tag']]) && !array_intersect($bbcode_groups[$combo['tag']], $mine))
			{
				$reasons['abbc3'][] = $combo['name'] . ' [' . $combo['tag'] . ']';
			}
			else
			{
				$visible++;
			}
		}
		$detail = $this->language->lang('EDITORPLUS_DIAG_COMBOS_COUNT', $visible, count($list));
		foreach ($reasons as $why => $names)
		{
			if ($names)
			{
				$detail .= '<br>' . $this->language->lang('EDITORPLUS_DIAG_COMBOS_' . strtoupper($why)) . ' ' . utf8_htmlspecialchars(implode(', ', $names));
			}
		}
		if (!$this->config['editorplus_image_combos'])
		{
			$detail .= '<br>' . $this->language->lang('EDITORPLUS_DIAG_COMBOS_SWITCH');
		}
		$add(($visible === count($list) && $this->config['editorplus_image_combos']) ? true : null, $this->language->lang('ACP_EDITORPLUS_COMBOS'), $detail);

		// GHide
		$source = helper::ghide_source($this->db, $this->parser(), $this->config);
		$add($source !== '' ? true : null, 'GHide', $this->language->lang('EDITORPLUS_GHIDE_SOURCE_' . strtoupper($source ?: 'none')));

		// Pacchetto e BBCode [fa]
		$add(true, $this->language->lang('EDITORPLUS_DIAG_PACK'), $this->language->lang(file_exists($this->root_path() . 'ext/salvocortesiano/editorplus/' . combos::PACK_FILE) ? 'EDITORPLUS_DIAG_PACK_YES' : 'EDITORPLUS_DIAG_PACK_NO'));
		$add((bool) $this->config['editorplus_fa_bbcode_id'] ? true : null, 'BBCode [fa]', $this->language->lang($this->config['editorplus_fa_bbcode_id'] ? 'EDITORPLUS_DIAG_FA_YES' : 'EDITORPLUS_DIAG_FA_NO'));

		// Stile predefinito
		$sql = 'SELECT style_name, style_path FROM ' . STYLES_TABLE . ' WHERE style_id = ' . (int) $this->config['default_style'];
		$result = $this->db->sql_query($sql);
		$style = $this->db->sql_fetchrow($result);
		$this->db->sql_freeresult($result);
		$add(true, $this->language->lang('EDITORPLUS_DIAG_STYLE'), $style ? utf8_htmlspecialchars($style['style_name']) : '?');

		foreach ($checks as $check)
		{
			$this->template->assign_block_vars('ep_diag', $check);
		}
	}

	/**
	 * Stato di Advanced BBCode Box e consiglio all'amministratore:
	 * con ABBC3 (e la sua barra accesa) Editor Plus è completo; senza, usa la barra standard di phpBB.
	 */
	protected function display_abbc3_notice()
	{
		global $phpbb_admin_path, $phpEx;

		$available = $this->ext_manager->is_available('vse/abbc3');
		$enabled = $this->ext_manager->is_enabled('vse/abbc3');
		$bar = $enabled && !empty($this->config['abbc3_bbcode_bar']);

		if ($bar)
		{
			$state = 'full';
		}
		else if ($enabled)
		{
			$state = 'bar_off';
		}
		else if ($available)
		{
			$state = 'disabled';
		}
		else
		{
			$state = 'missing';
		}

		$link = '';
		if ($state === 'bar_off')
		{
			$link = append_sid("{$phpbb_admin_path}index.$phpEx", 'i=-vse-abbc3-acp-abbc3_module&amp;mode=settings');
		}
		else if ($state === 'disabled')
		{
			$link = append_sid("{$phpbb_admin_path}index.$phpEx", 'i=acp_extensions&amp;mode=main&amp;action=enable_pre&amp;ext_name=vse%2Fabbc3');
		}
		else if ($state === 'missing')
		{
			$link = 'https://www.phpbb.com/customise/db/extension/advanced_bbcode_box/';
		}

		$this->template->assign_vars([
			'S_EDITORPLUS_ABBC3_FULL'	=> $state === 'full',
			'EDITORPLUS_ABBC3_STATE'	=> $state,
			'EDITORPLUS_ABBC3_NOTICE'	=> $state === 'full' ? '' : $this->language->lang('EDITORPLUS_ABBC3_' . strtoupper($state), $link),
		]);
	}

	/**
	 * Riquadri in cima alle pagine ACP
	 */
	protected function assign_badges()
	{
		$this->template->assign_vars([
			'EDITORPLUS_VERSION'		=> $this->get_version('salvocortesiano/editorplus'),
			'EDITORPLUS_ABBC3_VERSION'	=> $this->get_version('vse/abbc3'),
			'EDITORPLUS_PHPBB_VERSION'	=> $this->config['version'],
			'EDITORPLUS_PHP_VERSION'	=> PHP_VERSION,
		]);
	}

	/**
	 * Pagina "Check-up": controlli automatici (lato server) + dati per le prove dal vivo nel browser
	 */
	public function display_check()
	{
		global $phpbb_container, $auth, $phpbb_root_path, $phpEx;

		$this->language->add_lang('acp', 'salvocortesiano/editorplus');
		$this->assign_badges();

		/** @var \salvocortesiano\editorplus\core\katex_updater $katex */
		$katex = $phpbb_container->get('salvocortesiano.editorplus.katex_updater');
		if ($this->request->is_set_post('katex_action'))
		{
			$this->katex_action($katex);
		}

		/** @var \salvocortesiano\editorplus\cron\task\cleanup $cleanup */
		$cleanup = $phpbb_container->get('salvocortesiano.editorplus.cron.task.cleanup');
		$cleanup_done = null;
		if ($this->request->is_set_post('cleanup_now'))
		{
			if (!check_form_key('editorplus_cleanup'))
			{
				trigger_error($this->language->lang('FORM_INVALID') . adm_back_link($this->u_action), E_USER_WARNING);
			}
			$cleanup_done = $cleanup->cleanup();
			$this->config->set('editorplus_cleanup_last', time(), false);
			$this->log->add('admin', $this->user->data['user_id'], $this->user->ip, 'LOG_EDITORPLUS_CLEANUP', false, [$cleanup_done['drafts'], $cleanup_done['orphans']]);
		}
		/** @var \salvocortesiano\editorplus\core\images $images */
		$images = $phpbb_container->get('salvocortesiano.editorplus.images');
		$repair_done = '';
		if ($this->request->is_set_post('img_repair'))
		{
			if (!check_form_key('editorplus_cleanup'))
			{
				trigger_error($this->language->lang('FORM_INVALID') . adm_back_link($this->u_action), E_USER_WARNING);
			}
			$r = $images->repair();
			$this->log->add('admin', $this->user->data['user_id'], $this->user->ip, 'LOG_EDITORPLUS_IMG_REPAIR', false, [$r['removed_dirs'], $r['folders'], $r['images'], $r['dropped']]);
			$repair_done = $this->language->lang('EDITORPLUS_IMG_REPAIR_DONE', $r['removed_dirs'], $r['folders'], $r['images'], $r['dropped']);
		}

		add_form_key('editorplus_cleanup');
		$stats = $cleanup->stats();

		/** @var \salvocortesiano\editorplus\core\checkup $checkup */
		$checkup = $phpbb_container->get('salvocortesiano.editorplus.checkup');
		$rows = $checkup->run();
		$summary = $checkup->summarise($rows);

		$group = '';
		foreach ($rows as $row)
		{
			if ($row['group'] !== $group)
			{
				$group = $row['group'];
				$this->template->assign_block_vars('checkgroup', ['NAME' => $this->language->lang($group)]);
			}
			$this->template->assign_block_vars('checkgroup.item', [
				'LABEL'		=> $this->language->lang($row['label']),
				'STATUS'	=> $row['status'],
				'DETAIL'	=> $row['detail'],
				'HINT'		=> $row['hint'] !== '' ? $this->language->lang($row['hint']) : '',
			]);
		}

		// forum in cui l'amministratore può scrivere: lì si apre la pagina di scrittura per la prova dal vivo
		$forum_id = 0;
		$forums = array_keys($auth->acl_getf('f_post', true));
		if ($forums)
		{
			$sql = 'SELECT forum_id
				FROM ' . FORUMS_TABLE . '
				WHERE forum_type = ' . FORUM_POST . '
					AND forum_status = ' . ITEM_UNLOCKED . '
					AND ' . $this->db->sql_in_set('forum_id', $forums) . '
				ORDER BY left_id ASC';
			$result = $this->db->sql_query_limit($sql, 1);
			$forum_id = (int) $this->db->sql_fetchfield('forum_id');
			$this->db->sql_freeresult($result);
		}

		$helper = $phpbb_container->get('controller.helper');
		$root_url = generate_board_url() . '/';
		$this->template->assign_vars([
			'CHECK_OK'			=> $summary['ok'],
			'CHECK_WARN'		=> $summary['warn'],
			'CHECK_FAIL'		=> $summary['fail'],
			'CHECK_TIME'		=> $this->user->format_date(time()),
			'EDITORPLUS_EXPECTED_VERSION'	=> \salvocortesiano\editorplus\core\helper::VERSION,
			'U_LIVE_POSTING'	=> $forum_id ? append_sid(generate_board_url() . "/posting.$phpEx", 'mode=post&amp;f=' . $forum_id) : '',
			'U_LIVE_RENDER'		=> $helper->route('salvocortesiano_editorplus_render'),
			'U_LIVE_DRAFT'		=> $helper->route('salvocortesiano_editorplus_draft'),
			'LIVE_RENDER_HASH'	=> generate_link_hash('editorplus_render'),
			'LIVE_DRAFT_HASH'	=> generate_link_hash('editorplus_draft'),
			'KATEX_HASH'		=> generate_link_hash('editorplus_katex'),
			'KATEX_INSTALLED'	=> $katex->installed_version(),
			'KATEX_STAGED'		=> $katex->staged_version(),
			'KATEX_BACKUP'		=> $katex->backup_version(),
			'U_KATEX_ACTIVE'	=> $root_url . 'ext/salvocortesiano/editorplus/styles/all/',
			'U_KATEX_STAGING'	=> $katex->staging_url($root_url),
			'U_CALC_ENGINE'		=> $root_url . 'ext/salvocortesiano/editorplus/styles/all/template/js/editorplus_calc.js?v=' . \salvocortesiano\editorplus\core\helper::VERSION,
			'S_MATH_ON'			=> !empty($this->config['editorplus_math']),
			'S_CALC_ON'			=> !empty($this->config['editorplus_calc']),
			'S_COLOR_ON'		=> !empty($this->config['editorplus_color']),
			'S_CLEANUP_DONE'	=> $cleanup_done !== null,
			'CLEANUP_DONE'		=> $cleanup_done !== null ? $this->language->lang('EDITORPLUS_CLEANUP_DONE', $cleanup_done['drafts'], $cleanup_done['orphans']) : '',
			'CLEANUP_DRAFTS'	=> $stats['drafts'],
			'CLEANUP_ORPHANS'	=> $stats['orphans'],
			'CLEANUP_ORPHANS_SIZE'	=> get_formatted_filesize($stats['orphans_size']),
			'CLEANUP_ORPHANS_OLD'	=> $stats['orphans_old'],
			'CLEANUP_ORPHAN_DAYS'	=> (int) $this->config['editorplus_orphan_days'],
			'CLEANUP_LAST'		=> (int) $this->config['editorplus_cleanup_last'] ? $this->user->format_date((int) $this->config['editorplus_cleanup_last']) : $this->language->lang('EDITORPLUS_CLEANUP_NEVER'),
			'S_CLEANUP_ON'		=> !empty($this->config['editorplus_cleanup']),
			'IMG_REPAIR_DONE'	=> $repair_done,
			'U_IMG_PAGE'		=> str_replace('mode=check', 'mode=images', $this->u_action),
		]);

		// cartella di prova per la prova dal vivo dei link (immagine vera + file PHP che non deve essere eseguito)
		$probe = [];
		try
		{
			$probe = $images->prepare_probe();
		}
		catch (\Exception $e)
		{
			$probe = [];
		}
		$this->template->assign_vars([
			'IMG_PROBE_OK'		=> !empty($probe),
			'IMG_PROBE_JSON'	=> $probe ? helper::safe_json([
				'image'	=> $probe['image'],
				'php'	=> $probe['php'],
				'route'	=> $images->url($probe['folder'], 'prova.png', false, 'route'),
				'mode'	=> $images->link_mode(),
			]) : '',
		]);
	}

	/**
	 * Aggiornamento di KaTeX: azioni chiamate dalla pagina Check-up (solo amministratori, richiesta protetta).
	 * Risponde sempre in JSON.
	 */
	protected function katex_action(\salvocortesiano\editorplus\core\katex_updater $katex)
	{
		$json = new \phpbb\json_response();
		if (!check_link_hash($this->request->variable('hash', ''), 'editorplus_katex'))
		{
			$json->send(['ok' => false, 'error' => $this->language->lang('FORM_INVALID')]);
		}

		$action = $this->request->variable('katex_action', '');
		$katex->set_operation($this->request->variable('op', ''));
		$result = false;
		switch ($action)
		{
			case 'check':
				$result = $katex->check();
			break;

			case 'progress':
				// stato reale dell'operazione in corso (letto dalla pagina ogni frazione di secondo)
				$result = $katex->read_progress();
			break;

			case 'prepare':
				$result = $katex->prepare($this->request->variable('version', ''));
			break;

			case 'activate':
				$before = $katex->installed_version();
				$result = $katex->activate();
				if ($result)
				{
					$this->log->add('admin', $this->user->data['user_id'], $this->user->ip, 'LOG_EDITORPLUS_KATEX_UPDATED', false, [$before, $result['version']]);
				}
			break;

			case 'discard':
				$result = $katex->discard() ? ['discarded' => true] : false;
			break;

			case 'restore':
				$before = $katex->installed_version();
				$result = $katex->restore();
				if ($result)
				{
					$this->log->add('admin', $this->user->data['user_id'], $this->user->ip, 'LOG_EDITORPLUS_KATEX_RESTORED', false, [$before, $result['version']]);
				}
			break;
		}

		if ($result === false)
		{
			$key = $katex->get_error() ?: 'EDITORPLUS_KATEX_ERR_UNKNOWN';
			$json->send(['ok' => false, 'error' => $this->language->lang($key), 'detail' => $katex->get_detail()]);
		}
		$json->send(['ok' => true, 'result' => $result]);
	}

	/**
	 * Pagina "Combo": elenco, creazione, modifica, ordinamento, importazione ed esportazione
	 */
	public function display_combos()
	{
		$this->language->add_lang('acp', 'salvocortesiano/editorplus');

		$form_key = 'salvocortesiano_editorplus_combos';
		add_form_key($form_key);

		$action = $this->request->variable('action', '');
		$id = $this->request->variable('id', 0);
		$list = combos::load($this->config_text);
		$existing = helper::known_tags($this->db, $this->parser(), array_column($list, 'tag'));
		$errors = [];

		// Azioni rapide dai link (protette da hash)
		if (in_array($action, ['move_up', 'move_down', 'toggle'], true))
		{
			if (!check_link_hash($this->request->variable('hash', ''), 'editorplus_combos'))
			{
				trigger_error($this->language->lang('FORM_INVALID') . adm_back_link($this->u_action), E_USER_WARNING);
			}

			$index = $this->find($list, $id);
			if ($index !== null)
			{
				if ($action === 'toggle')
				{
					$list[$index]['enabled'] = !$list[$index]['enabled'];
				}
				else
				{
					$other = $action === 'move_up' ? $index - 1 : $index + 1;
					if (isset($list[$other]))
					{
						list($list[$index], $list[$other]) = [$list[$other], $list[$index]];
					}
				}
				combos::save($this->config_text, $list);
			}

			if ($this->request->is_ajax())
			{
				$json = new \phpbb\json_response();
				$json->send(['success' => true]);
			}
			redirect($this->u_action);
		}

		if ($action === 'delete')
		{
			$index = $this->find($list, $id);
			if ($index === null)
			{
				trigger_error($this->language->lang('EDITORPLUS_COMBO_NOT_FOUND') . adm_back_link($this->u_action), E_USER_WARNING);
			}

			if (confirm_box(true))
			{
				$name = $list[$index]['name'];
				array_splice($list, $index, 1);
				combos::save($this->config_text, $list);
				$this->log->add('admin', $this->user->data['user_id'], $this->user->ip, 'LOG_EDITORPLUS_COMBO_DELETED', false, [$name]);
				trigger_error($this->language->lang('EDITORPLUS_COMBO_DELETED') . adm_back_link($this->u_action));
			}

			confirm_box(false, $this->language->lang('EDITORPLUS_COMBO_DELETE_CONFIRM', $list[$index]['name']), build_hidden_fields([
				'action'	=> 'delete',
				'id'		=> $id,
			]));
			redirect($this->u_action);
		}

		// Salvataggio di una combo nuova o modificata
		if ($this->request->is_set_post('save_combo'))
		{
			$combo = [
				'id'		=> $id,
				// phpBB restituisce il testo già con le entità HTML: si salva il testo vero e si protegge in uscita
				'name'		=> htmlspecialchars_decode($this->request->variable('combo_name', '', true), ENT_COMPAT),
				'tag'		=> $this->request->variable('combo_tag', ''),
				'mode'		=> $this->request->variable('combo_mode', 'content'),
				'enabled'	=> (bool) $this->request->variable('combo_enabled', 0),
				'options'	=> combos::parse_options(htmlspecialchars_decode($this->request->variable('combo_options', '', true), ENT_COMPAT)),
				'groups'	=> $this->request->variable('combo_groups', [0]),
			];

			if (!check_form_key($form_key))
			{
				$errors[] = $this->language->lang('FORM_INVALID');
			}
			if (trim($combo['name']) === '')
			{
				$errors[] = $this->language->lang('EDITORPLUS_COMBO_ERR_NAME');
			}
			if (!in_array(strtolower(rtrim($combo['tag'], '=')), $existing, true))
			{
				$errors[] = $this->language->lang('EDITORPLUS_COMBO_ERR_TAG');
			}
			$normalized = combos::normalize($combo);
			if ($normalized !== null && empty($normalized['options']))
			{
				$errors[] = $this->language->lang('EDITORPLUS_COMBO_ERR_OPTIONS');
			}

			if (empty($errors) && $normalized !== null)
			{
				$index = $id ? $this->find($list, $id) : null;
				if ($index === null)
				{
					$normalized['id'] = 0;
					$list[] = $normalized;
				}
				else
				{
					$list[$index] = $normalized;
				}
				combos::save($this->config_text, $list);
				$this->log->add('admin', $this->user->data['user_id'], $this->user->ip, 'LOG_EDITORPLUS_COMBO_SAVED', false, [$normalized['name']]);
				trigger_error($this->language->lang('EDITORPLUS_COMBO_SAVED') . adm_back_link($this->u_action));
			}

			$action = $id ? 'edit' : 'add';
		}

		// Importazione (pacchetto incluso oppure JSON incollato)
		if ($this->request->is_set_post('import_pack') || $this->request->is_set_post('import_json'))
		{
			if (!check_form_key($form_key))
			{
				trigger_error($this->language->lang('FORM_INVALID') . adm_back_link($this->u_action), E_USER_WARNING);
			}

			$incoming = $this->request->is_set_post('import_pack')
				? combos::read_pack($this->root_path())
				: combos::decode(htmlspecialchars_decode($this->request->variable('import_text', '', true), ENT_COMPAT));

			if (empty($incoming))
			{
				trigger_error($this->language->lang('EDITORPLUS_COMBO_IMPORT_INVALID') . adm_back_link($this->u_action), E_USER_WARNING);
			}

			$result = combos::import($list, $incoming, $existing);
			combos::save($this->config_text, $result['combos']);
			$this->log->add('admin', $this->user->data['user_id'], $this->user->ip, 'LOG_EDITORPLUS_COMBO_IMPORTED', false, [count($result['added']) + count($result['updated'])]);

			$message = $this->language->lang('EDITORPLUS_COMBO_IMPORT_DONE', count($result['added']), count($result['updated']));
			if (!empty($result['skipped']))
			{
				$message .= '<br><br>' . $this->language->lang('EDITORPLUS_COMBO_IMPORT_SKIPPED') . '<br>' . implode('<br>', array_map('htmlspecialchars', $result['skipped']));
			}
			trigger_error($message . adm_back_link($this->u_action));
		}

		$this->assign_badges();
		$hash = generate_link_hash('editorplus_combos');

		// Modulo di creazione/modifica
		if ($action === 'add' || $action === 'edit')
		{
			$index = $action === 'edit' ? $this->find($list, $id) : null;
			if ($action === 'edit' && $index === null)
			{
				trigger_error($this->language->lang('EDITORPLUS_COMBO_NOT_FOUND') . adm_back_link($this->u_action), E_USER_WARNING);
			}

			$combo = isset($combo) ? $combo : ($index !== null ? $list[$index] : ['name' => '', 'tag' => '', 'mode' => 'content', 'enabled' => true, 'options' => []]);
			$tag = strtolower(rtrim($combo['tag'], '='));

			foreach ($this->custom_bbcodes() as $row)
			{
				$this->template->assign_block_vars('bbcodes', [
					'TAG'			=> $row['tag'],
					'HELP'			=> $row['help'],
					'S_SELECTED'	=> $row['tag'] === $tag,
				]);
			}

			$selected_groups = isset($combo['groups']) ? array_map('intval', (array) $combo['groups']) : [];
			$sql = 'SELECT group_id, group_name, group_type
				FROM ' . GROUPS_TABLE . '
				ORDER BY group_type DESC, group_name ASC';
			$result = $this->db->sql_query($sql);
			while ($row = $this->db->sql_fetchrow($result))
			{
				$this->template->assign_block_vars('combo_groups', [
					'ID'			=> (int) $row['group_id'],
					'NAME'			=> $this->group_name($row['group_name'], (int) $row['group_type']),
					'S_SPECIAL'		=> (int) $row['group_type'] === GROUP_SPECIAL,
					'S_SELECTED'	=> in_array((int) $row['group_id'], $selected_groups, true),
				]);
			}
			$this->db->sql_freeresult($result);

			$this->template->assign_vars([
				'S_COMBO_FORM'		=> true,
				'S_COMBO_EDIT'		=> $action === 'edit',
				'S_ERROR'			=> !empty($errors),
				'ERROR_MSG'			=> implode('<br>', $errors),
				'COMBO_ID'			=> $action === 'edit' ? $id : 0,
				'COMBO_NAME'		=> $combo['name'],
				'COMBO_MODE'		=> $combo['mode'],
				'S_COMBO_ENABLED'	=> $combo['enabled'],
				'COMBO_OPTIONS'		=> combos::options_to_text(combos::normalize(array_merge($combo, ['name' => 'x', 'tag' => 'x'])) ['options']),
				'U_ACTION'			=> $this->u_action,
				'U_BACK'			=> $this->u_action,
			]);
			return;
		}

		// Elenco
		$pack = combos::read_pack($this->root_path());
		$last = count($list) - 1;
		foreach ($list as $i => $combo)
		{
			$base = $this->u_action . '&amp;id=' . $combo['id'];
			$this->template->assign_block_vars('combos', [
				'NAME'			=> $combo['name'],
				'TAG'			=> $combo['tag'],
				'MODE'			=> $combo['mode'],
				'OPTIONS'		=> count($combo['options']),
				'S_ENABLED'		=> $combo['enabled'],
				'S_MISSING'		=> !in_array($combo['tag'], $existing, true),
				'GROUPS'		=> count($combo['groups']),
				'U_EDIT'		=> $base . '&amp;action=edit',
				'U_DELETE'		=> $base . '&amp;action=delete',
				'U_TOGGLE'		=> $base . '&amp;action=toggle&amp;hash=' . $hash,
				'U_MOVE_UP'		=> $i > 0 ? $base . '&amp;action=move_up&amp;hash=' . $hash : '',
				'U_MOVE_DOWN'	=> $i < $last ? $base . '&amp;action=move_down&amp;hash=' . $hash : '',
			]);
		}

		$this->template->assign_vars([
			'S_COMBO_LIST'			=> true,
			'S_COMBOS_ON'			=> (bool) $this->config['editorplus_image_combos'],
			'S_PACK_USABLE'			=> combos::pack_usable($pack, $existing),
			'PACK_COUNT'			=> count($pack),
			'EXPORT_JSON'			=> combos::export($list, $this->config['sitename']),
			'U_ACTION'				=> $this->u_action,
			'U_ADD'					=> $this->u_action . '&amp;action=add',
			'U_SETTINGS'			=> str_replace('mode=combos', 'mode=settings', $this->u_action),
		]);
	}

	/**
	 * @param array $list
	 * @param int   $id
	 * @return int|null posizione della combo nell'elenco
	 */
	protected function find(array $list, $id)
	{
		foreach ($list as $i => $combo)
		{
			if ((int) $combo['id'] === (int) $id)
			{
				return $i;
			}
		}

		return null;
	}

	/**
	 * BBCode personalizzati del forum (per la scelta nel modulo della combo)
	 *
	 * @return array [['tag' => ..., 'help' => ...], ...]
	 */
	protected function custom_bbcodes()
	{
		$sql = 'SELECT bbcode_tag, bbcode_helpline
			FROM ' . BBCODES_TABLE . '
			ORDER BY bbcode_tag ASC';
		$result = $this->db->sql_query($sql);

		$rows = [];
		while ($row = $this->db->sql_fetchrow($result))
		{
			$rows[] = [
				'tag'	=> strtolower(rtrim($row['bbcode_tag'], '=')),
				'help'	=> utf8_substr($row['bbcode_helpline'], 0, 80),
			];
		}
		$this->db->sql_freeresult($result);

		return $rows;
	}

	/**
	 * BBCode per l'editor delle categorie: quelli dell'ACP più quelli registrati da estensioni
	 * (per esempio [ghide]) tra quelli nominati nelle categorie
	 *
	 * @return array [tag => descrizione]
	 */
	protected function bbcodes_for_editor()
	{
		$list = array_column($this->custom_bbcodes(), 'help', 'tag');
		$named = [];
		foreach (helper::parse_category_map($this->config_text->get('editorplus_category_map')) as $tags)
		{
			$named = array_merge($named, $tags);
		}
		$known = helper::known_tags($this->db, $this->parser(), $named);
		if (helper::ghide_available($this->db, $this->parser(), $this->config))
		{
			$known[] = 'ghide';
		}
		foreach (array_unique($known) as $tag)
		{
			if (!isset($list[$tag]))
			{
				$list[$tag] = $this->language->lang('EDITORPLUS_BBCODE_FROM_EXT');
			}
		}
		ksort($list);

		return $list;
	}

	/**
	 * @return \phpbb\textformatter\parser_interface|null
	 */
	protected function parser()
	{
		global $phpbb_container;

		try
		{
			return $phpbb_container->get('text_formatter.parser');
		}
		catch (\Exception $e)
		{
			return null;
		}
	}

	/**
	 * @return string
	 */
	protected function root_path()
	{
		global $phpbb_root_path;

		return $phpbb_root_path;
	}

	/**
	 * Listbox dei gruppi per GHide
	 */
	protected function display_groups($config_key = 'editorplus_ghide_groups', $block = 'ghide_groups', $prefix = 'EDITORPLUS_GHIDE')
	{
		$selected = helper::parse_group_ids($this->config[$config_key]);

		$sql = 'SELECT group_id, group_name, group_type
			FROM ' . GROUPS_TABLE . '
			ORDER BY group_type DESC, group_name ASC';
		$result = $this->db->sql_query($sql);

		$names = [];
		while ($row = $this->db->sql_fetchrow($result))
		{
			$name = $this->group_name($row['group_name'], (int) $row['group_type']);
			$is_selected = in_array((int) $row['group_id'], $selected, true);

			if ($is_selected)
			{
				$names[(int) $row['group_id']] = $name . ' (' . (int) $row['group_id'] . ')';
			}

			$this->template->assign_block_vars($block, [
				'ID'			=> (int) $row['group_id'],
				'NAME'			=> $name,
				'S_SPECIAL'		=> (int) $row['group_type'] === GROUP_SPECIAL,
				'S_SELECTED'	=> $is_selected,
			]);
		}
		$this->db->sql_freeresult($result);

		// Nomi nell'ordine salvato
		$ordered = [];
		foreach ($selected as $id)
		{
			if (isset($names[$id]))
			{
				$ordered[] = $names[$id];
			}
		}

		$this->template->assign_vars([
			$prefix . '_TEXT'	=> implode(', ', $ordered),
			$prefix . '_CODE'	=> implode(',', $selected),
		]);
	}

	/**
	 * Salva i gruppi scelti, scartando ID inesistenti
	 */
	protected function save_groups($config_key = 'editorplus_ghide_groups')
	{
		$group_ids = array_values(array_unique(array_filter(array_map('intval', $this->request->variable($config_key, [0])))));

		if (!empty($group_ids))
		{
			$sql = 'SELECT group_id
				FROM ' . GROUPS_TABLE . '
				WHERE ' . $this->db->sql_in_set('group_id', $group_ids);
			$result = $this->db->sql_query($sql);

			$existing = [];
			while ($row = $this->db->sql_fetchrow($result))
			{
				$existing[] = (int) $row['group_id'];
			}
			$this->db->sql_freeresult($result);

			$group_ids = array_values(array_intersect($group_ids, $existing));
		}

		$this->config->set($config_key, implode(',', $group_ids));
	}

	/**
	 * Nome leggibile del gruppo (i gruppi predefiniti vengono tradotti)
	 *
	 * @param string $group_name
	 * @param int    $group_type
	 * @return string
	 */
	protected function group_name($group_name, $group_type)
	{
		$key = 'G_' . strtoupper($group_name);

		return ($group_type === GROUP_SPECIAL && $this->language->is_set($key)) ? $this->language->lang($key) : $group_name;
	}

	/**
	 * Versione dichiarata nel composer.json di un'estensione
	 *
	 * @param string $name
	 * @return string
	 */
	protected function get_version($name)
	{
		try
		{
			$metadata = $this->ext_manager->create_extension_metadata_manager($name)->get_metadata('all');
			return isset($metadata['version']) ? $metadata['version'] : '?';
		}
		catch (\Exception $e)
		{
			return '?';
		}
	}
}
