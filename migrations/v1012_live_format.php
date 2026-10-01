<?php
/**
 *
 * Editor Plus 1.0.12
 * Formattazione mentre scrivi
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\migrations;

class v1012_live_format extends \phpbb\db\migration\migration
{
	public function effectively_installed()
	{
		return $this->config->offsetExists('editorplus_live_format');
	}

	public static function depends_on()
	{
		return ['\salvocortesiano\editorplus\migrations\v1011_ghide_author'];
	}

	public function update_data()
	{
		return [
			['config.add', ['editorplus_live_format', 1]],
		];
	}

	public function revert_data()
	{
		return [
			['config.remove', ['editorplus_live_format']],
		];
	}
}
