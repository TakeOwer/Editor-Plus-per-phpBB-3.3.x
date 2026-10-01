<?php
/**
 *
 * Editor Plus 1.0.15
 * Editor visuale: aspetto reale dei BBCode personalizzati
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\migrations;

class v1015_wysiwyg_real extends \phpbb\db\migration\migration
{
	public function effectively_installed()
	{
		return $this->config->offsetExists('editorplus_wysiwyg_real');
	}

	public static function depends_on()
	{
		return ['\salvocortesiano\editorplus\migrations\v1014_wysiwyg'];
	}

	public function update_data()
	{
		return [
			['config.add', ['editorplus_wysiwyg_real', 1]],
		];
	}

	public function revert_data()
	{
		return [
			['config.remove', ['editorplus_wysiwyg_real']],
		];
	}
}
