<?php
/**
 *
 * Editor Plus 1.0.26
 * Scheda "Check-up" nel modulo ACP
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\migrations;

class v1026_checkup extends \phpbb\db\migration\migration
{
	public function effectively_installed()
	{
		$sql = 'SELECT module_id
			FROM ' . $this->table_prefix . "modules
			WHERE module_class = 'acp'
				AND module_basename = '" . $this->db->sql_escape('\\salvocortesiano\\editorplus\\acp\\main_module') . "'
				AND module_mode = 'check'";
		$result = $this->db->sql_query($sql);
		$id = $this->db->sql_fetchfield('module_id');
		$this->db->sql_freeresult($result);

		return (bool) $id;
	}

	public static function depends_on()
	{
		return ['\salvocortesiano\editorplus\migrations\v1025_drafts'];
	}

	public function update_data()
	{
		return [
			['module.add', ['acp', 'ACP_EDITORPLUS_TITLE', [
				'module_basename'	=> '\salvocortesiano\editorplus\acp\main_module',
				'modes'				=> ['check'],
			]]],
		];
	}

	public function revert_data()
	{
		return [
			['module.remove', ['acp', 'ACP_EDITORPLUS_TITLE', [
				'module_basename'	=> '\salvocortesiano\editorplus\acp\main_module',
				'modes'				=> ['check'],
			]]],
		];
	}
}
