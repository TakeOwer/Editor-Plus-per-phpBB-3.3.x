<?php
/**
 *
 * Editor Plus 1.0.34
 * Bozze: anche l'elenco degli allegati (ripristinati insieme al testo)
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\migrations;

class v1034_draft_attachments extends \phpbb\db\migration\migration
{
	public function effectively_installed()
	{
		return $this->db_tools->sql_column_exists($this->table_prefix . 'editorplus_drafts', 'draft_attachments');
	}

	public static function depends_on()
	{
		return ['\salvocortesiano\editorplus\migrations\v1031_color'];
	}

	public function update_schema()
	{
		return [
			'add_columns' => [
				$this->table_prefix . 'editorplus_drafts' => [
					'draft_attachments' => ['TEXT_UNI', ''],
				],
			],
		];
	}

	public function revert_schema()
	{
		return [
			'drop_columns' => [
				$this->table_prefix . 'editorplus_drafts' => ['draft_attachments'],
			],
		];
	}
}
