<?php
/**
 *
 * Editor Plus 1.0.37
 * Pulizia automatica (cron): bozze scadute e, se acceso, allegati orfani vecchi.
 * Conversione in BBCode del testo incollato nell'area di testo.
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\migrations;

class v1037_cleanup extends \phpbb\db\migration\migration
{
	public function effectively_installed()
	{
		return isset($this->config['editorplus_cleanup']);
	}

	public static function depends_on()
	{
		return ['\salvocortesiano\editorplus\migrations\v1036_print'];
	}

	public function update_data()
	{
		return [
			['config.add', ['editorplus_cleanup', 1]],
			['config.add', ['editorplus_cleanup_last', 0, true]],
			// 0 = gli allegati orfani non vengono cancellati (lo decide l'amministratore)
			['config.add', ['editorplus_orphan_days', 0]],
			['config.add', ['editorplus_paste_bbcode', 1]],
		];
	}
}
