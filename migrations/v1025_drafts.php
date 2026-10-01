<?php
/**
 *
 * Editor Plus 1.0.25
 * Bozze salvate sul server (si ritrovano da qualsiasi indirizzo, browser o dispositivo)
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\migrations;

class v1025_drafts extends \phpbb\db\migration\migration
{
	public function effectively_installed()
	{
		return $this->db_tools->sql_table_exists($this->table_prefix . 'editorplus_drafts');
	}

	public static function depends_on()
	{
		return ['\salvocortesiano\editorplus\migrations\v1021_syntax'];
	}

	public function update_schema()
	{
		return [
			'add_tables' => [
				$this->table_prefix . 'editorplus_drafts' => [
					'COLUMNS' => [
						'draft_id'		=> ['UINT', null, 'auto_increment'],
						'user_id'		=> ['UINT', 0],
						'draft_key'		=> ['VCHAR:100', ''],
						'draft_subject'	=> ['VCHAR_UNI:255', ''],
						'draft_message'	=> ['MTEXT_UNI', ''],
						'draft_time'	=> ['TIMESTAMP', 0],
					],
					'PRIMARY_KEY' => 'draft_id',
					'KEYS' => [
						'user_key'	=> ['UNIQUE', ['user_id', 'draft_key']],
						'draft_time'	=> ['INDEX', 'draft_time'],
					],
				],
			],
		];
	}

	public function revert_schema()
	{
		return [
			'drop_tables' => [
				$this->table_prefix . 'editorplus_drafts',
			],
		];
	}
}
