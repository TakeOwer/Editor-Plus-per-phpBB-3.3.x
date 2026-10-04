<?php
/**
 *
 * Editor Plus 1.0.38
 * ACP > Editor Plus > Immagini utenti
 * - Utenti e cartelle: elenco con ricerca, ordinamento, numero di immagini e spazio occupato.
 * - Immagini di un utente: miniature (al clic si ingrandiscono), link, data, IP, dove sono usate,
 *   cancellazione di una, di quelle scelte, di tutte o dell'intera cartella.
 * - Impostazioni: gruppi autorizzati e loro limiti, tipi di file, misure, miniature, tipo di link.
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\controller;

use salvocortesiano\editorplus\core\helper;
use salvocortesiano\editorplus\core\images;

class acp_images_controller
{
	const PER_PAGE_USERS = 25;
	const PER_PAGE_IMAGES = 48;

	/** @var \phpbb\config\config */
	protected $config;

	/** @var \phpbb\db\driver\driver_interface */
	protected $db;

	/** @var \phpbb\extension\manager */
	protected $ext_manager;

	/** @var \phpbb\language\language */
	protected $language;

	/** @var \phpbb\log\log_interface */
	protected $log;

	/** @var \phpbb\pagination */
	protected $pagination;

	/** @var \phpbb\request\request */
	protected $request;

	/** @var \phpbb\template\template */
	protected $template;

	/** @var \phpbb\user */
	protected $user;

	/** @var images */
	protected $images;

	/** @var string */
	protected $root_path;

	/** @var string */
	protected $php_ext;

	/** @var string */
	protected $u_action;

	public function __construct($config, $db, $ext_manager, $language, $log, $pagination, $request, $template, $user, images $images, $root_path, $php_ext)
	{
		$this->config = $config;
		$this->db = $db;
		$this->ext_manager = $ext_manager;
		$this->language = $language;
		$this->log = $log;
		$this->pagination = $pagination;
		$this->request = $request;
		$this->template = $template;
		$this->user = $user;
		$this->images = $images;
		$this->root_path = $root_path;
		$this->php_ext = $php_ext;
	}

	/**
	 * @param string $u_action
	 */
	public function set_page_url($u_action)
	{
		$this->u_action = $u_action;
	}

	/**
	 * Pagina principale: decide quale vista mostrare
	 */
	public function display()
	{
		$this->language->add_lang(['acp', 'common'], 'salvocortesiano/editorplus');
		add_form_key('editorplus_images');

		// "Dove è usata?" dalla finestra dell'immagine (risposta JSON)
		if ($this->request->variable('action', '') === 'usage')
		{
			$this->usage_json();
		}

		$view = $this->request->variable('view', '');
		$user_id = $this->request->variable('u', 0);

		if ($this->request->is_set_post('ep_img_delete') || $this->request->is_set_post('ep_img_delete_all')
			|| $this->request->is_set_post('ep_img_delete_folder') || $this->request->variable('action', '') === 'delete')
		{
			$this->delete_action($user_id);
		}

		$this->assign_common($view, $user_id);

		if ($view === 'settings')
		{
			$this->settings();
		}
		else if ($user_id)
		{
			$this->user_view($user_id);
		}
		else
		{
			$this->overview();
		}
	}

	/* ------------------------------------------------------------------ */

	/**
	 * Riquadri, schede e totali
	 *
	 * @param string $view
	 * @param int    $user_id
	 */
	protected function assign_common($view, $user_id)
	{
		$totals = $this->images->totals();
		$base = preg_replace('/&(amp;)?(view|u|start|sk|q)=[^&]*/', '', $this->u_action);

		$this->template->assign_vars([
			'EDITORPLUS_VERSION'		=> $this->get_version('salvocortesiano/editorplus'),
			'EDITORPLUS_ABBC3_VERSION'	=> $this->get_version('vse/abbc3'),
			'EDITORPLUS_PHPBB_VERSION'	=> $this->config['version'],
			'EDITORPLUS_PHP_VERSION'	=> PHP_VERSION,

			'S_IMG_ENABLED'		=> $this->images->enabled(),
			'S_IMG_VIEW_SETTINGS'	=> $view === 'settings',
			'S_IMG_VIEW_USER'	=> $view !== 'settings' && $user_id > 0,
			'IMG_TOTAL_USERS'	=> $totals['users'],
			'IMG_TOTAL_IMAGES'	=> $totals['images'],
			'IMG_TOTAL_SIZE'	=> get_formatted_filesize($totals['bytes']),
			'IMG_BASE_DIR'		=> trim((string) $this->config['upload_path'], '/') . '/',
			'U_IMG_OVERVIEW'	=> $base,
			'U_IMG_SETTINGS'	=> $base . '&amp;view=settings',
			'U_IMG_CHECK'		=> str_replace('mode=images', 'mode=check', $base),
			'U_ACTION'			=> $this->u_action,
			'IMG_USAGE_HASH'	=> generate_link_hash('editorplus_img_usage'),
			'IMG_GALLERY_JS'	=> $this->asset_url('styles/all/template/js/editorplus_gallery.js'),
			'IMG_GALLERY_CSS'	=> $this->asset_url('styles/all/theme/editorplus_gallery.css'),
			'IMG_JS_LANG'		=> images::js_lang($this->language),
		]);
	}

	/**
	 * Elenco degli utenti con una cartella
	 */
	protected function overview()
	{
		$search = $this->request->variable('q', '', true);
		$sort = $this->request->variable('sk', 'last');
		$sort = in_array($sort, ['name', 'images', 'bytes', 'last'], true) ? $sort : 'last';
		$start = max(0, $this->request->variable('start', 0));

		$data = $this->images->users_overview($search, $sort, $start, self::PER_PAGE_USERS);
		$base = preg_replace('/&(amp;)?(view|u|start|sk|q)=[^&]*/', '', $this->u_action);

		foreach ($data['rows'] as $row)
		{
			$exists = $row['username'] !== null && $row['username'] !== '';
			$this->template->assign_block_vars('img_users', [
				'USER_ID'		=> (int) $row['user_id'],
				'USERNAME'		=> $exists ? $row['username'] : $row['folder_username'],
				'USER_COLOUR'	=> $exists ? (string) $row['user_colour'] : '',
				'S_GONE'		=> !$exists,
				'FOLDER'		=> $row['folder_name'],
				'IMAGES'		=> (int) $row['images'],
				'SIZE'			=> get_formatted_filesize((int) $row['bytes']),
				'LAST'			=> $row['last_time'] ? $this->user->format_date((int) $row['last_time']) : '-',
				'CREATED'		=> $this->user->format_date((int) $row['folder_time']),
				'U_VIEW'		=> $base . '&amp;u=' . (int) $row['user_id'],
				'U_USER'		=> $exists ? append_sid($this->root_path . 'adm/index.' . $this->php_ext, 'i=users&amp;mode=overview&amp;u=' . (int) $row['user_id']) : '',
			]);
		}

		$url = $base . ($search !== '' ? '&amp;q=' . urlencode($search) : '') . '&amp;sk=' . $sort;
		$this->pagination->generate_template_pagination($url, 'pagination', 'start', $data['total'], self::PER_PAGE_USERS, $start);

		foreach (['last', 'name', 'images', 'bytes'] as $key)
		{
			$this->template->assign_block_vars('img_sorts', [
				'KEY'		=> $key,
				'NAME'		=> $this->language->lang('EDITORPLUS_IMG_SORT_' . strtoupper($key)),
				'S_ON'		=> $key === $sort,
			]);
		}

		$this->template->assign_vars([
			'IMG_SEARCH'		=> $search,
			'IMG_LIST_TOTAL'	=> $data['total'],
			'S_IMG_HAS_USERS'	=> !empty($data['rows']),
		]);
	}

	/**
	 * Immagini di un utente
	 *
	 * @param int $user_id
	 */
	protected function user_view($user_id)
	{
		$folder = $this->images->folder_of($user_id);
		$user = $this->images->user_row($user_id);
		if (!$folder && !$user)
		{
			trigger_error($this->language->lang('EDITORPLUS_IMG_NO_USER') . adm_back_link($this->u_action), E_USER_WARNING);
		}

		$start = max(0, $this->request->variable('start', 0));
		$sort = $this->request->variable('sk', 'new');
		$sort = in_array($sort, ['new', 'old', 'big', 'name'], true) ? $sort : 'new';
		$usage = $this->images->usage($user_id);
		$limits = $user ? $this->images->limits($user) : ['allowed' => false, 'reason' => 'EP_IMG_ERR_GUEST', 'max_size' => 0, 'max_count' => 0, 'max_quota' => 0];

		$items = [];
		foreach ($this->images->list_images($user_id, $start, self::PER_PAGE_IMAGES, $sort) as $row)
		{
			$img = $this->images->present($row);
			$img['date'] = $this->user->format_date($img['time']);
			$img['sizeText'] = get_formatted_filesize($img['size']);
			$items[] = $img;
			$this->template->assign_block_vars('img_items', [
				'ID'		=> $img['id'],
				'INDEX'		=> count($items) - 1,
				'THUMB'		=> $img['thumb'],
				'URL'		=> $img['url'],
				'NAME'		=> utf8_htmlspecialchars($img['name']),
				'FILE'		=> $img['file'],
				'DIMENSIONS'	=> $img['width'] . '×' . $img['height'],
				'SIZE'		=> $img['sizeText'],
				'DATE'		=> $img['date'],
				'IP'		=> $img['ip'],
			]);
		}

		$base = preg_replace('/&(amp;)?(view|u|start|sk|q)=[^&]*/', '', $this->u_action) . '&amp;u=' . (int) $user_id;
		$this->pagination->generate_template_pagination($base . '&amp;sk=' . $sort, 'pagination', 'start', $usage['count'], self::PER_PAGE_IMAGES, $start);

		foreach (['new', 'old', 'big', 'name'] as $key)
		{
			$this->template->assign_block_vars('img_sorts', [
				'KEY'	=> $key,
				'NAME'	=> $this->language->lang('EDITORPLUS_IMG_ISORT_' . strtoupper($key)),
				'S_ON'	=> $key === $sort,
			]);
		}

		$folder_name = $folder ? $folder['folder_name'] : '';
		$this->template->assign_vars([
			'IMG_USER_ID'		=> (int) $user_id,
			'IMG_USERNAME'		=> $user ? $user['username'] : ($folder ? $folder['folder_username'] : ''),
			'IMG_USER_COLOUR'	=> $user ? (string) $user['user_colour'] : '',
			'S_IMG_USER_GONE'	=> !$user,
			'U_IMG_USER'		=> $user ? append_sid($this->root_path . 'adm/index.' . $this->php_ext, 'i=users&amp;mode=overview&amp;u=' . (int) $user_id) : '',
			'IMG_FOLDER'		=> $folder_name,
			'IMG_FOLDER_PATH'	=> trim((string) $this->config['upload_path'], '/') . '/' . $folder_name . '/',
			'S_IMG_FOLDER_ON_DISK'	=> $folder_name !== '' && is_dir($this->images->base_dir() . $folder_name),
			'IMG_COUNT'			=> $usage['count'],
			'IMG_BYTES'			=> get_formatted_filesize($usage['bytes']),
			'IMG_PERMISSION'	=> $limits['allowed'] ? $this->language->lang('EDITORPLUS_IMG_CAN_UPLOAD') : $this->language->lang($limits['reason'] ?: 'EP_IMG_ERR_NO_GROUP'),
			'S_IMG_ALLOWED'		=> $limits['allowed'],
			'IMG_LIMIT_SIZE'	=> $limits['max_size'] ? get_formatted_filesize($limits['max_size']) : $this->language->lang('EDITORPLUS_IMG_UNLIMITED'),
			'IMG_LIMIT_COUNT'	=> $limits['max_count'] ?: $this->language->lang('EDITORPLUS_IMG_UNLIMITED'),
			'IMG_LIMIT_QUOTA'	=> $limits['max_quota'] ? get_formatted_filesize($limits['max_quota']) : $this->language->lang('EDITORPLUS_IMG_UNLIMITED'),
			'IMG_QUOTA_PERCENT'	=> $limits['max_quota'] ? min(100, (int) round($usage['bytes'] * 100 / $limits['max_quota'])) : 0,
			'IMG_ITEMS_JSON'	=> helper::safe_json($items),
			'U_IMG_USER_VIEW'	=> $base,
			'U_IMG_USER_ACTION'	=> $base . '&amp;start=' . $start . '&amp;sk=' . $sort,
		]);
	}

	/**
	 * Cancellazioni (sempre con conferma)
	 *
	 * @param int $user_id
	 */
	protected function delete_action($user_id)
	{
		$back = preg_replace('/&(amp;)?(view|start|sk|q)=[^&]*/', '', $this->u_action);
		$back_user = $back . '&amp;u=' . (int) $user_id;

		$what = $this->request->is_set_post('ep_img_delete_folder') ? 'folder' : ($this->request->is_set_post('ep_img_delete_all') ? 'all' : 'some');
		$what = $this->request->variable('what', $what);
		$ids = array_values(array_filter(array_map('intval', $this->request->variable('ids', [0]))));

		if (!$user_id || ($what === 'some' && !$ids))
		{
			trigger_error($this->language->lang('EDITORPLUS_IMG_NOTHING_SELECTED') . adm_back_link($back_user), E_USER_WARNING);
		}

		$user = $this->images->user_row($user_id);
		$folder = $this->images->folder_of($user_id);
		$name = $user ? $user['username'] : ($folder ? $folder['folder_username'] : '#' . $user_id);

		if (confirm_box(true))
		{
			switch ($what)
			{
				case 'folder':
					$done = $this->images->delete_folder($user_id);
					$count = $done ? $done['images'] : 0;
					$this->log->add('admin', $this->user->data['user_id'], $this->user->ip, 'LOG_EDITORPLUS_IMG_FOLDER_DELETED', false, [$done ? $done['folder'] : '-', $name, $count]);
					trigger_error($this->language->lang('EDITORPLUS_IMG_FOLDER_DELETED', $done ? $done['folder'] : '-', $count) . adm_back_link($back));
				break;

				case 'all':
					$deleted = $this->images->delete_all($user_id);
					$this->log->add('admin', $this->user->data['user_id'], $this->user->ip, 'LOG_EDITORPLUS_IMG_DELETED', false, [count($deleted), $name]);
					trigger_error($this->language->lang('EDITORPLUS_IMG_DELETED', count($deleted)) . adm_back_link($back_user));
				break;

				default:
					$deleted = $this->images->delete_images($ids, $user_id);
					$this->log->add('admin', $this->user->data['user_id'], $this->user->ip, 'LOG_EDITORPLUS_IMG_DELETED', false, [count($deleted), $name]);
					trigger_error($this->language->lang('EDITORPLUS_IMG_DELETED', count($deleted)) . adm_back_link($back_user));
				break;
			}
		}

		$question = [
			'folder'	=> $this->language->lang('EDITORPLUS_IMG_CONFIRM_FOLDER', $folder ? $folder['folder_name'] : '-', $name),
			'all'		=> $this->language->lang('EDITORPLUS_IMG_CONFIRM_ALL', $name),
			'some'		=> $this->language->lang('EDITORPLUS_IMG_CONFIRM_SOME', count($ids), $name),
		];
		confirm_box(false, $question[$what], build_hidden_fields([
			'u'			=> (int) $user_id,
			'what'		=> $what,
			'ids'		=> $ids,
			'action'	=> 'delete',
		]));

		// "No" nella conferma: si torna dove si era
		redirect(str_replace('&amp;', '&', $back_user));
	}

	/**
	 * Impostazioni e gruppi
	 */
	protected function settings()
	{
		if ($this->request->is_set_post('submit'))
		{
			if (!check_form_key('editorplus_images'))
			{
				trigger_error($this->language->lang('FORM_INVALID') . adm_back_link($this->u_action . '&amp;view=settings'), E_USER_WARNING);
			}
			$this->save_settings();
			$this->log->add('admin', $this->user->data['user_id'], $this->user->ip, 'LOG_EDITORPLUS_IMG_SETTINGS');
			trigger_error($this->language->lang('EDITORPLUS_SAVED') . adm_back_link($this->u_action . '&amp;view=settings'));
		}

		$types = $this->images->allowed_types();
		foreach (array_values(images::TYPES) as $type)
		{
			$this->template->assign_block_vars('img_types', [
				'TYPE'			=> $type,
				'NAME'			=> strtoupper($type),
				'S_CHECKED'		=> in_array($type, $types, true),
				'S_SUPPORTED'	=> images::gd_can($type),
			]);
		}

		$settings = $this->images->group_settings();
		$sql = 'SELECT group_id, group_name, group_type
			FROM ' . GROUPS_TABLE . "
			WHERE group_name NOT IN ('GUESTS', 'BOTS')
			ORDER BY group_type DESC, group_name ASC";
		$result = $this->db->sql_query($sql);
		while ($row = $this->db->sql_fetchrow($result))
		{
			$id = (int) $row['group_id'];
			$set = isset($settings[$id]) ? $settings[$id] : ['mode' => '', 'size' => 0, 'count' => 0, 'quota' => 0];
			$key = 'G_' . strtoupper($row['group_name']);
			$this->template->assign_block_vars('img_groups', [
				'ID'		=> $id,
				'NAME'		=> ((int) $row['group_type'] === GROUP_SPECIAL && $this->language->is_set($key)) ? $this->language->lang($key) : $row['group_name'],
				'S_SPECIAL'	=> (int) $row['group_type'] === GROUP_SPECIAL,
				'MODE'		=> $set['mode'],
				'SIZE'		=> $set['size'],
				'COUNT'		=> $set['count'],
				'QUOTA'		=> $set['quota'],
			]);
		}
		$this->db->sql_freeresult($result);

		$php_limit = images::php_upload_limit();
		$this->template->assign_vars([
			'IMG_LINK'				=> $this->images->link_mode(),
			'IMG_MAX_W'				=> (int) $this->config['editorplus_img_max_w'],
			'IMG_MAX_H'				=> (int) $this->config['editorplus_img_max_h'],
			'IMG_QUALITY'			=> (int) $this->config['editorplus_img_quality'],
			'IMG_THUMB'				=> (int) $this->config['editorplus_img_thumb'],
			'IMG_INSERT'			=> $this->config['editorplus_img_insert'] === 'thumb' ? 'thumb' : 'full',
			'S_IMG_USER_DELETE'		=> !empty($this->config['editorplus_img_user_delete']),
			'IMG_DELETE_WITH_USER'		=> (int) $this->config['editorplus_img_delete_with_user'],
			'S_IMG_NEED_POST'			=> !empty($this->config['editorplus_img_need_post']),
			'IMG_DROP_MODE'				=> (string) $this->config['editorplus_img_drop_mode'],
			'IMG_PHP_LIMIT'			=> $php_limit ? get_formatted_filesize($php_limit) : $this->language->lang('EDITORPLUS_IMG_UNLIMITED'),
			'S_IMG_GD'				=> function_exists('imagecreatetruecolor'),
			'IMG_LINK_EXAMPLE_DIRECT'	=> $this->images->url('mario_rossi_123', 'tramonto-a1b2c3.jpg', false, 'direct'),
			'IMG_LINK_EXAMPLE_ROUTE'	=> $this->images->url('mario_rossi_123', 'tramonto-a1b2c3.jpg', false, 'route'),
		]);
	}

	protected function save_settings()
	{
		$this->config->set('editorplus_images', $this->request->variable('editorplus_images', 0) ? 1 : 0);
		$this->config->set('editorplus_img_link', $this->request->variable('editorplus_img_link', 'direct') === 'route' ? 'route' : 'direct');

		$types = array_intersect($this->request->variable('editorplus_img_types', ['']), array_values(images::TYPES));
		$this->config->set('editorplus_img_types', implode(',', $types ?: array_values(images::TYPES)));

		$this->config->set('editorplus_img_max_w', min(10000, max(0, $this->request->variable('editorplus_img_max_w', 1920))));
		$this->config->set('editorplus_img_max_h', min(10000, max(0, $this->request->variable('editorplus_img_max_h', 1920))));
		$this->config->set('editorplus_img_quality', min(100, max(40, $this->request->variable('editorplus_img_quality', 85))));
		$this->config->set('editorplus_img_thumb', min(800, max(64, $this->request->variable('editorplus_img_thumb', 300))));
		$this->config->set('editorplus_img_insert', $this->request->variable('editorplus_img_insert', 'full') === 'thumb' ? 'thumb' : 'full');
		$this->config->set('editorplus_img_user_delete', $this->request->variable('editorplus_img_user_delete', 0) ? 1 : 0);
		$this->config->set('editorplus_img_delete_with_user', min(2, max(0, $this->request->variable('editorplus_img_delete_with_user', 1))));
		$this->config->set('editorplus_img_need_post', $this->request->variable('editorplus_img_need_post', 0) ? 1 : 0);
		$drop = $this->request->variable('editorplus_img_drop_mode', 'ask');
		$this->config->set('editorplus_img_drop_mode', in_array($drop, ['ask', 'folder', 'attach'], true) ? $drop : 'ask');

		$modes = $this->request->variable('grp_mode', [0 => '']);
		$sizes = $this->request->variable('grp_size', [0 => 0]);
		$counts = $this->request->variable('grp_count', [0 => 0]);
		$quotas = $this->request->variable('grp_quota', [0 => 0]);

		$groups = [];
		foreach ($modes as $group_id => $mode)
		{
			if (!in_array($mode, ['yes', 'never'], true))
			{
				continue;
			}
			$groups[(int) $group_id] = [
				'mode'	=> $mode,
				'size'	=> isset($sizes[$group_id]) ? (int) $sizes[$group_id] : 0,
				'count'	=> isset($counts[$group_id]) ? (int) $counts[$group_id] : 0,
				'quota'	=> isset($quotas[$group_id]) ? (int) $quotas[$group_id] : 0,
			];
		}

		// solo gruppi che esistono davvero
		if ($groups)
		{
			$result = $this->db->sql_query('SELECT group_id FROM ' . GROUPS_TABLE . ' WHERE ' . $this->db->sql_in_set('group_id', array_keys($groups)));
			$existing = array_map('intval', array_column($this->db->sql_fetchrowset($result), 'group_id'));
			$this->db->sql_freeresult($result);
			$groups = array_intersect_key($groups, array_flip($existing));
		}
		$this->images->save_group_settings($groups);
	}

	/**
	 * JSON: dove è usata un'immagine
	 */
	protected function usage_json()
	{
		$json = new \phpbb\json_response();
		if (!check_link_hash($this->request->variable('hash', ''), 'editorplus_img_usage'))
		{
			$json->send(['ok' => false, 'error' => $this->language->lang('FORM_INVALID')]);
		}
		$row = $this->images->get($this->request->variable('id', 0));
		if (!$row)
		{
			$json->send(['ok' => false, 'error' => $this->language->lang('EDITORPLUS_IMG_NOT_FOUND')]);
		}

		$found = $this->images->find_usage($row);
		$posts = [];
		foreach ($found['posts'] as $p)
		{
			$posts[] = [
				'subject'	=> $p['subject'] !== '' ? html_entity_decode($p['subject'], ENT_QUOTES, 'UTF-8') : '#' . $p['post_id'],
				'url'		=> append_sid(generate_board_url() . '/viewtopic.' . $this->php_ext, 'p=' . $p['post_id']) . '#p' . $p['post_id'],
			];
		}
		$sigs = [];
		foreach ($found['sigs'] as $s)
		{
			$sigs[] = [
				'name'	=> html_entity_decode($s['username'], ENT_QUOTES, 'UTF-8'),
				'url'	=> append_sid($this->root_path . 'adm/index.' . $this->php_ext, 'i=users&amp;mode=sig&amp;u=' . $s['user_id']),
			];
		}

		$json->send(['ok' => true, 'posts' => $posts, 'pms' => $found['pms'], 'sigs' => $sigs]);
	}

	/**
	 * Indirizzo di un file dell'estensione, con la versione (cache del browser)
	 *
	 * @param string $file
	 * @return string
	 */
	protected function asset_url($file)
	{
		return $this->root_path . 'ext/salvocortesiano/editorplus/' . $file . '?v=' . helper::VERSION;
	}

	/**
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
