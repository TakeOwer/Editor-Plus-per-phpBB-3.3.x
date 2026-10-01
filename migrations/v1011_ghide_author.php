<?php
/**
 *
 * Editor Plus 1.0.11
 * Pulsante GHide: scelta tra l'autore dell'argomento, chi risponde o entrambi
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\migrations;

class v1011_ghide_author extends \phpbb\db\migration\migration
{
	public function effectively_installed()
	{
		return $this->config->offsetExists('editorplus_ghide_default');
	}

	public static function depends_on()
	{
		return ['\salvocortesiano\editorplus\migrations\v1010_ghide'];
	}

	public function update_data()
	{
		return [
			['config.add', ['editorplus_ghide_default', 'author']],
		];
	}

	public function revert_data()
	{
		return [
			['config.remove', ['editorplus_ghide_default']],
		];
	}
}
