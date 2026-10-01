<?php
/**
 *
 * Editor Plus 1.0.16
 * GHide: pulsante nella prima riga facoltativo (GHide resta nel menu "Nascosti")
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\migrations;

class v1016_ghide_button extends \phpbb\db\migration\migration
{
	public function effectively_installed()
	{
		return $this->config->offsetExists('editorplus_ghide_button');
	}

	public static function depends_on()
	{
		return ['\salvocortesiano\editorplus\migrations\v1015_wysiwyg_real'];
	}

	public function update_data()
	{
		return [
			['config.add', ['editorplus_ghide_button', 0]],
		];
	}

	public function revert_data()
	{
		return [
			['config.remove', ['editorplus_ghide_button']],
		];
	}
}
