<?php
/**
 *
 * Editor Plus 1.0.28
 * Formule (KaTeX: matematica e chimica) e calcolatrice scientifica
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\migrations;

class v1028_math extends \phpbb\db\migration\migration
{
	public function effectively_installed()
	{
		return isset($this->config['editorplus_math']);
	}

	public static function depends_on()
	{
		return ['\salvocortesiano\editorplus\migrations\v1026_checkup'];
	}

	public function update_data()
	{
		return [
			['config.add', ['editorplus_math', 1]],
			['config.add', ['editorplus_calc', 1]],
		];
	}
}
