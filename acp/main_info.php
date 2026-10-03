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

class main_info
{
	public function module()
	{
		return [
			'filename'	=> '\salvocortesiano\editorplus\acp\main_module',
			'title'		=> 'ACP_EDITORPLUS_TITLE',
			'modes'		=> [
				'settings'	=> [
					'title'	=> 'ACP_EDITORPLUS_SETTINGS',
					'auth'	=> 'ext_salvocortesiano/editorplus && acl_a_board',
					'cat'	=> ['ACP_EDITORPLUS_TITLE'],
				],
				'combos'	=> [
					'title'	=> 'ACP_EDITORPLUS_COMBOS',
					'auth'	=> 'ext_salvocortesiano/editorplus && acl_a_board',
					'cat'	=> ['ACP_EDITORPLUS_TITLE'],
				],
				'images'	=> [
					'title'	=> 'ACP_EDITORPLUS_IMAGES',
					'auth'	=> 'ext_salvocortesiano/editorplus && acl_a_board',
					'cat'	=> ['ACP_EDITORPLUS_TITLE'],
					'before'	=> 'ACP_EDITORPLUS_CHECK',
				],
				'check'		=> [
					'title'	=> 'ACP_EDITORPLUS_CHECK',
					'auth'	=> 'ext_salvocortesiano/editorplus && acl_a_board',
					'cat'	=> ['ACP_EDITORPLUS_TITLE'],
				],
			],
		];
	}
}
