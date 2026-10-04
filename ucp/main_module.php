<?php
/**
 *
 * Editor Plus
 * Pannello utente > Preferenze > Editor Plus: ogni utente sceglie le comodità che preferisce.
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\ucp;

use salvocortesiano\editorplus\core\helper;

class main_module
{
	public $page_title;
	public $tpl_name;
	public $u_action;

	/** Preferenza utente => interruttore ACP che la rende disponibile */
	const REQUIRES = [
		'autosave'		=> 'editorplus_autosave',
		'autogrow'		=> 'editorplus_autogrow',
		'counter'		=> 'editorplus_counter',
		'shortcuts'		=> 'editorplus_shortcuts',
		'live_open'		=> 'editorplus_live_preview',
		'combo_preview'	=> 'editorplus_combo_preview',
		'drop_upload'	=> 'editorplus_drop_upload',
		'smiley_bar'	=> 'editorplus_smilies',
		'live_format'	=> 'editorplus_live_format',
		'wysiwyg'		=> 'editorplus_wysiwyg',
		'spellcheck'	=> 'editorplus_options_menu',
		'lf_marks'		=> 'editorplus_live_format',
	];

	public function main($id, $mode)
	{
		global $phpbb_container;

		/** @var \phpbb\config\config $config */
		$config = $phpbb_container->get('config');
		/** @var \phpbb\db\driver\driver_interface $db */
		$db = $phpbb_container->get('dbal.conn');
		/** @var \phpbb\language\language $language */
		$language = $phpbb_container->get('language');
		/** @var \phpbb\request\request $request */
		$request = $phpbb_container->get('request');
		/** @var \phpbb\template\template $template */
		$template = $phpbb_container->get('template');
		/** @var \phpbb\user $user */
		$user = $phpbb_container->get('user');

		$language->add_lang('ucp', 'salvocortesiano/editorplus');

		if ($mode === 'images')
		{
			$this->images_page($config, $language, $request, $template, $user);
			return;
		}

		$this->tpl_name = 'ucp_editorplus';
		$this->page_title = $language->lang('UCP_EDITORPLUS_TITLE');

		add_form_key('salvocortesiano_editorplus_ucp');
		$prefs = helper::user_prefs($user->data['user_editorplus']);

		if ($request->is_set_post('submit'))
		{
			if (!check_form_key('salvocortesiano_editorplus_ucp'))
			{
				trigger_error($language->lang('FORM_INVALID') . '<br><br>' . $language->lang('RETURN_UCP', '<a href="' . $this->u_action . '">', '</a>'), E_USER_WARNING);
			}

			foreach (array_keys(helper::USER_PREFS) as $key)
			{
				if ($request->is_set_post('ep_' . $key))
				{
					$prefs[$key] = $request->variable('ep_' . $key, 0) ? 1 : 0;
				}
			}

			$sql = 'UPDATE ' . USERS_TABLE . "
				SET user_editorplus = '" . $db->sql_escape(json_encode($prefs)) . "'
				WHERE user_id = " . (int) $user->data['user_id'];
			$db->sql_query($sql);

			meta_refresh(3, $this->u_action);
			trigger_error($language->lang('UCP_EDITORPLUS_SAVED') . '<br><br>' . $language->lang('RETURN_UCP', '<a href="' . $this->u_action . '">', '</a>'));
		}

		// "Usa Editor Plus": sempre per prima, e sempre disponibile
		$template->assign_block_vars('ep_prefs', [
			'KEY'		=> 'enabled',
			'TITLE'		=> $language->lang('UCP_EDITORPLUS_ENABLED'),
			'EXPLAIN'	=> $language->lang('UCP_EDITORPLUS_ENABLED_EXPLAIN'),
			'S_ON'		=> (bool) $prefs['enabled'],
			'S_MAIN'	=> true,
		]);

		foreach (self::REQUIRES as $key => $switch)
		{
			if (empty($config[$switch]))
			{
				continue; // funzione spenta dall'amministratore: la preferenza non viene mostrata
			}

			$template->assign_block_vars('ep_prefs', [
				'KEY'		=> $key,
				'TITLE'		=> $language->lang('UCP_EDITORPLUS_' . strtoupper($key)),
				'EXPLAIN'	=> $language->lang('UCP_EDITORPLUS_' . strtoupper($key) . '_EXPLAIN'),
				'S_ON'		=> (bool) $prefs[$key],
			]);
		}

		$template->assign_vars([
			'U_ACTION'	=> $this->u_action,
		]);
	}

	/**
	 * Pannello utente > Panoramica > Le mie immagini: le immagini caricate con l'editor,
	 * con caricamento, ingrandimento, link da copiare e cancellazione.
	 */
	protected function images_page($config, $language, $request, $template, $user)
	{
		global $phpbb_container, $phpbb_root_path;

		/** @var \salvocortesiano\editorplus\core\images $images */
		$images = $phpbb_container->get('salvocortesiano.editorplus.images');
		/** @var \phpbb\pagination $pagination */
		$pagination = $phpbb_container->get('pagination');
		/** @var \phpbb\controller\helper $controller_helper */
		$controller_helper = $phpbb_container->get('controller.helper');

		$this->tpl_name = 'ucp_editorplus_images';
		$this->page_title = $language->lang('UCP_EDITORPLUS_IMAGES');
		$user_id = (int) $user->data['user_id'];
		$can_delete = !empty($config['editorplus_img_user_delete']);

		add_form_key('salvocortesiano_editorplus_images');

		if ($request->is_set_post('ep_delete') || $request->is_set_post('ep_delete_all'))
		{
			if (!$can_delete)
			{
				trigger_error('EP_IMG_ERR_NO_DELETE');
			}
			$all = $request->is_set_post('ep_delete_all') || $request->variable('what', '') === 'all';
			$ids = array_values(array_filter(array_map('intval', $request->variable('ids', [0]))));
			if (!$all && !$ids)
			{
				trigger_error($language->lang('UCP_EDITORPLUS_IMG_NOTHING') . '<br><br>' . $language->lang('RETURN_UCP', '<a href="' . $this->u_action . '">', '</a>'));
			}

			if (confirm_box(true))
			{
				$deleted = $all ? $images->delete_all($user_id) : $images->delete_images($ids, $user_id);
				meta_refresh(3, $this->u_action);
				trigger_error($language->lang('UCP_EDITORPLUS_IMG_DELETED', count($deleted)) . '<br><br>' . $language->lang('RETURN_UCP', '<a href="' . $this->u_action . '">', '</a>'));
			}
			else if (!$request->is_set_post('cancel'))
			{
				confirm_box(false, $all ? $language->lang('UCP_EDITORPLUS_IMG_CONFIRM_ALL') : $language->lang('UCP_EDITORPLUS_IMG_CONFIRM', count($ids)), build_hidden_fields([
					'ep_delete'	=> 1,
					'what'		=> $all ? 'all' : 'some',
					'ids'		=> $ids,
				]));
			}
			redirect($this->u_action);
		}

		$per_page = 48;
		$start = max(0, $request->variable('start', 0));
		$usage = $images->usage($user_id);
		$limits = $images->limits($user->data);

		$items = [];
		foreach ($images->list_images($user_id, $start, $per_page) as $row)
		{
			$img = $images->present($row);
			unset($img['ip']);
			$img['date'] = $user->format_date($img['time']);
			$img['sizeText'] = get_formatted_filesize($img['size']);
			$items[] = $img;
			$template->assign_block_vars('ep_images', [
				'ID'		=> $img['id'],
				'INDEX'		=> count($items) - 1,
				'THUMB'		=> $img['thumb'],
				'NAME'		=> utf8_htmlspecialchars($img['name']),
				'DIMENSIONS'	=> $img['width'] . '×' . $img['height'],
				'SIZE'		=> $img['sizeText'],
				'DATE'		=> $img['date'],
			]);
		}
		$pagination->generate_template_pagination($this->u_action, 'pagination', 'start', $usage['count'], $per_page, $start);

		$template->assign_vars([
			'U_ACTION'			=> $this->u_action . ($start ? '&amp;start=' . $start : ''),
			'S_EP_CAN_DELETE'	=> $can_delete,
			'S_EP_CAN_UPLOAD'	=> $limits['allowed'],
			'EP_NO_UPLOAD'		=> $limits['allowed'] ? '' : $language->lang($limits['reason'] ?: 'EP_IMG_ERR_NO_GROUP'),
			'EP_COUNT'			=> $usage['count'],
			'EP_BYTES'			=> get_formatted_filesize($usage['bytes']),
			'EP_MAX_COUNT'		=> $limits['max_count'],
			'EP_MAX_QUOTA'		=> $limits['max_quota'] ? get_formatted_filesize($limits['max_quota']) : '',
			'EP_MAX_SIZE'		=> $limits['max_size'] ? get_formatted_filesize($limits['max_size']) : '',
			'EP_QUOTA_PERCENT'	=> $limits['max_quota'] ? min(100, (int) round($usage['bytes'] * 100 / $limits['max_quota'])) : 0,
			'EP_ITEMS_JSON'		=> \salvocortesiano\editorplus\core\helper::safe_json($items),
			'EP_UPLOAD_JSON'	=> \salvocortesiano\editorplus\core\helper::safe_json([
				'url'		=> $controller_helper->route('salvocortesiano_editorplus_image_upload'),
				'hash'		=> generate_link_hash('editorplus_images'),
				'maxSize'	=> $limits['max_size'],
				'maxW'		=> (int) $config['editorplus_img_max_w'],
				'maxH'		=> (int) $config['editorplus_img_max_h'],
				'types'		=> $images->allowed_types(),
			]),
			'EP_GALLERY_LANG'	=> \salvocortesiano\editorplus\core\images::js_lang($language),
			'EP_GALLERY_JS'		=> $phpbb_root_path . 'ext/salvocortesiano/editorplus/styles/all/template/js/editorplus_gallery.js?v=' . \salvocortesiano\editorplus\core\helper::VERSION,
			'EP_GALLERY_CSS'	=> $phpbb_root_path . 'ext/salvocortesiano/editorplus/styles/all/theme/editorplus_gallery.css?v=' . \salvocortesiano\editorplus\core\helper::VERSION,
		]);
	}
}
