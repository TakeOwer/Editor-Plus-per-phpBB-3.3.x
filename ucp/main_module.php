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
}
