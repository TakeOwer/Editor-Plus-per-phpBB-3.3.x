<?php
/**
 *
 * Editor Plus 1.0.31
 * Selettore del colore con sfumature (e tavolozza classica di phpBB come scheda)
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\migrations;

class v1031_color extends \phpbb\db\migration\migration
{
	public function effectively_installed()
	{
		return isset($this->config['editorplus_color']);
	}

	public static function depends_on()
	{
		return ['\salvocortesiano\editorplus\migrations\v1029_katex_update'];
	}

	public function update_data()
	{
		return [
			['config.add', ['editorplus_color', 1]],
			['config.add', ['editorplus_color_classic', 1]],
		];
	}
}
