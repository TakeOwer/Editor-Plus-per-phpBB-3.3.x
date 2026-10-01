<?php
/**
 *
 * Editor Plus 1.0.19
 * Riga informativa sopra la barra (editor in uso, versione, crediti)
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\migrations;

class v1019_info_bar extends \phpbb\db\migration\migration
{
	public function effectively_installed()
	{
		return $this->config->offsetExists('editorplus_info_bar');
	}

	public static function depends_on()
	{
		return ['\salvocortesiano\editorplus\migrations\v1017_options_menu'];
	}

	public function update_data()
	{
		return [
			['config.add', ['editorplus_info_bar', 1]],
		];
	}

	public function revert_data()
	{
		return [
			['config.remove', ['editorplus_info_bar']],
		];
	}
}
