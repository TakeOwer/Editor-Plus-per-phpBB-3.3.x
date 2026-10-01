<?php
/**
 *
 * Editor Plus
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\acp;

class main_module
{
	public $page_title;
	public $tpl_name;
	public $u_action;

	public function main($id, $mode)
	{
		global $phpbb_container;

		/** @var \salvocortesiano\editorplus\controller\acp_controller $controller */
		$controller = $phpbb_container->get('salvocortesiano.editorplus.acp_controller');
		$language = $phpbb_container->get('language');

		$controller->set_page_url($this->u_action);

		if ($mode === 'check')
		{
			$this->tpl_name = 'editorplus_check';
			$this->page_title = $language->lang('ACP_EDITORPLUS_CHECK');
			$controller->display_check();
			return;
		}

		if ($mode === 'combos')
		{
			$this->tpl_name = 'editorplus_combos';
			$this->page_title = $language->lang('ACP_EDITORPLUS_COMBOS');
			$controller->display_combos();
			return;
		}

		$this->tpl_name = 'editorplus_acp';
		$this->page_title = $language->lang('ACP_EDITORPLUS_TITLE');
		$controller->display_options();
	}
}
