<?php
/**
 *
 * Editor Plus 1.0.14
 * Editor visuale (sperimentale, spento di default)
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\migrations;

class v1014_wysiwyg extends \phpbb\db\migration\migration
{
	public function effectively_installed()
	{
		return $this->config->offsetExists('editorplus_wysiwyg');
	}

	public static function depends_on()
	{
		return ['\salvocortesiano\editorplus\migrations\v1012_live_format'];
	}

	public function update_data()
	{
		return [
			['config.add', ['editorplus_wysiwyg', 0]],
		];
	}

	public function revert_data()
	{
		return [
			['config.remove', ['editorplus_wysiwyg']],
		];
	}
}
