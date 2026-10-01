<?php
/**
 *
 * Editor Plus 1.0.17
 * Menu "Opzioni" nella barra (correttore del browser, formattazione, segni, editor visuale)
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\migrations;

class v1017_options_menu extends \phpbb\db\migration\migration
{
	public function effectively_installed()
	{
		return $this->config->offsetExists('editorplus_options_menu');
	}

	public static function depends_on()
	{
		return ['\salvocortesiano\editorplus\migrations\v1016_ghide_button'];
	}

	public function update_data()
	{
		return [
			['config.add', ['editorplus_options_menu', 1]],
		];
	}

	public function revert_data()
	{
		return [
			['config.remove', ['editorplus_options_menu']],
		];
	}
}
