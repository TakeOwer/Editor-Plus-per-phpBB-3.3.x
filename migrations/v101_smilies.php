<?php
/**
 *
 * Editor Plus 1.0.1
 * Faccine di phpBB nella barra, in un riquadro con schede
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\migrations;

class v101_smilies extends \phpbb\db\migration\migration
{
	public function effectively_installed()
	{
		return $this->config->offsetExists('editorplus_smilies');
	}

	public static function depends_on()
	{
		return ['\salvocortesiano\editorplus\migrations\v100_fa_bbcode'];
	}

	public function update_data()
	{
		return [
			['config.add', ['editorplus_smilies', 1]],
			['config.add', ['editorplus_hide_smiley_box', 1]],
		];
	}

	public function revert_data()
	{
		return [
			['config.remove', ['editorplus_smilies']],
			['config.remove', ['editorplus_hide_smiley_box']],
		];
	}
}
