<?php
/**
 *
 * Editor Plus 1.0.36
 * Stampa / PDF del messaggio dall'anteprima dal vivo (contenuti nascosti solo per i gruppi autorizzati)
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\migrations;

class v1036_print extends \phpbb\db\migration\migration
{
	public function effectively_installed()
	{
		return isset($this->config['editorplus_print']);
	}

	public static function depends_on()
	{
		return ['\salvocortesiano\editorplus\migrations\v1034_draft_attachments'];
	}

	public function update_data()
	{
		return [
			['config.add', ['editorplus_print', 1]],
			// Amministratori e Moderatori globali
			['config.add', ['editorplus_print_groups', '5,4']],
			['config.add', ['editorplus_print_hidden_tags', 'ghide,hide,hhide,hidden,password']],
			['config.add', ['editorplus_print_spoiler_tags', 'spoiler,spoil']],
		];
	}
}
