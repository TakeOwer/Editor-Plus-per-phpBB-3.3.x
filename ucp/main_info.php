<?php
/**
 *
 * Editor Plus
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\ucp;

class main_info
{
	public function module()
	{
		return [
			'filename'	=> '\salvocortesiano\editorplus\ucp\main_module',
			'title'		=> 'UCP_EDITORPLUS_TITLE',
			'modes'		=> [
				'prefs'	=> [
					'title'	=> 'UCP_EDITORPLUS_TITLE',
					'auth'	=> 'ext_salvocortesiano/editorplus',
					'cat'	=> ['UCP_PREFS'],
				],
			],
		];
	}
}
