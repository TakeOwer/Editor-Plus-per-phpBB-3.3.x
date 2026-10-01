<?php
/**
 *
 * Editor Plus 1.0.21
 * Codice colorato: BBCode [syntax=linguaggio], pulsante "Colora codice", colori e numeri di riga
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\migrations;

class v1021_syntax extends \phpbb\db\migration\migration
{
	public function effectively_installed()
	{
		return $this->config->offsetExists('editorplus_syntax');
	}

	public static function depends_on()
	{
		return ['\salvocortesiano\editorplus\migrations\v1019_info_bar'];
	}

	public function update_data()
	{
		return [
			['config.add', ['editorplus_syntax', 1]],
			['config.add', ['editorplus_syntax_code', 0]],
			['config.add', ['editorplus_syntax_theme', 'light']],
			['config.add', ['editorplus_syntax_tab', 4]],
		];
	}

	public function revert_data()
	{
		return [
			['config.remove', ['editorplus_syntax']],
			['config.remove', ['editorplus_syntax_code']],
			['config.remove', ['editorplus_syntax_theme']],
			['config.remove', ['editorplus_syntax_tab']],
		];
	}
}
