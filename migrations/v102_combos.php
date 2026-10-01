<?php
/**
 *
 * Editor Plus 1.0.2
 * Combo immagini attivabili una per una
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\migrations;

class v102_combos extends \phpbb\db\migration\migration
{
	public function effectively_installed()
	{
		return $this->config->offsetExists('editorplus_combos_off');
	}

	public static function depends_on()
	{
		return ['\salvocortesiano\editorplus\migrations\v101_smilies'];
	}

	public function update_data()
	{
		// Vuoto = tutte e 14 le combo visibili, come prima
		return [
			['config.add', ['editorplus_combos_off', '']],
		];
	}

	public function revert_data()
	{
		return [
			['config.remove', ['editorplus_combos_off']],
		];
	}
}
