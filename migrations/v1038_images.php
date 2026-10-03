<?php
/**
 *
 * Editor Plus 1.0.38
 * Immagini degli utenti: ognuno ha la sua cartella dentro files/ (nome utente + ID).
 * Archivio delle immagini, impostazioni, gruppi autorizzati, scheda ACP e pagina nel Pannello utente.
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\migrations;

use salvocortesiano\editorplus\core\images;

class v1038_images extends \phpbb\db\migration\migration
{
	public function effectively_installed()
	{
		return isset($this->config['editorplus_images']);
	}

	public static function depends_on()
	{
		return ['\salvocortesiano\editorplus\migrations\v1037_cleanup'];
	}

	public function update_schema()
	{
		return [
			'add_tables' => [
				$this->table_prefix . 'editorplus_images' => [
					'COLUMNS' => [
						'image_id'		=> ['UINT', null, 'auto_increment'],
						'user_id'		=> ['UINT', 0],
						'image_folder'	=> ['VCHAR:100', ''],
						'image_file'	=> ['VCHAR:100', ''],
						'image_name'	=> ['VCHAR_UNI:255', ''],
						'image_mime'	=> ['VCHAR:30', ''],
						'image_size'	=> ['UINT', 0],
						'image_width'	=> ['UINT', 0],
						'image_height'	=> ['UINT', 0],
						'image_thumb'	=> ['BOOL', 0],
						'image_time'	=> ['TIMESTAMP', 0],
						'image_ip'		=> ['VCHAR:40', ''],
					],
					'PRIMARY_KEY' => 'image_id',
					'KEYS' => [
						'user_id'		=> ['INDEX', 'user_id'],
						'image_time'	=> ['INDEX', 'image_time'],
						'folder_file'	=> ['UNIQUE', ['image_folder', 'image_file']],
					],
				],
				$this->table_prefix . 'editorplus_img_folders' => [
					'COLUMNS' => [
						'user_id'			=> ['UINT', 0],
						'folder_name'		=> ['VCHAR:100', ''],
						'folder_username'	=> ['VCHAR_UNI:255', ''],
						'folder_time'		=> ['TIMESTAMP', 0],
					],
					'PRIMARY_KEY' => 'user_id',
					'KEYS' => [
						'folder_name'	=> ['UNIQUE', 'folder_name'],
					],
				],
			],
		];
	}

	public function revert_schema()
	{
		// Le cartelle con le immagini restano sul disco: dopo una reinstallazione il Check-up le ritrova
		return [
			'drop_tables' => [
				$this->table_prefix . 'editorplus_images',
				$this->table_prefix . 'editorplus_img_folders',
			],
		];
	}

	public function update_data()
	{
		return [
			['config.add', ['editorplus_images', 1]],
			['config.add', ['editorplus_img_link', 'direct']],
			['config.add', ['editorplus_img_types', 'jpg,png,gif,webp']],
			['config.add', ['editorplus_img_max_w', 1920]],
			['config.add', ['editorplus_img_max_h', 1920]],
			['config.add', ['editorplus_img_quality', 85]],
			['config.add', ['editorplus_img_thumb', 300]],
			['config.add', ['editorplus_img_insert', 'full']],
			['config.add', ['editorplus_img_user_delete', 1]],
			['config.add', ['editorplus_img_delete_with_user', 1]],
			['config_text.add', ['editorplus_img_groups', '{}']],
			['custom', [[$this, 'default_groups']]],

			['module.add', ['acp', 'ACP_EDITORPLUS_TITLE', [
				'module_basename'	=> '\salvocortesiano\editorplus\acp\main_module',
				'modes'				=> ['images'],
			]]],
			['module.add', ['ucp', 'UCP_MAIN', [
				'module_basename'	=> '\salvocortesiano\editorplus\ucp\main_module',
				'modes'				=> ['images'],
			]]],
		];
	}

	/**
	 * Gruppi di serie: amministratori, moderatori e utenti registrati possono caricare;
	 * i "Nuovi utenti registrati" no, finché non escono da quel gruppo (si cambia in ACP).
	 */
	public function default_groups()
	{
		$names = array_keys(images::DEFAULT_GROUPS);
		$sql = 'SELECT group_id, group_name
			FROM ' . $this->table_prefix . 'groups
			WHERE ' . $this->db->sql_in_set('group_name', $names) . '
				AND group_type = ' . GROUP_SPECIAL;
		$result = $this->db->sql_query($sql);

		$groups = [];
		while ($row = $this->db->sql_fetchrow($result))
		{
			$groups[(int) $row['group_id']] = images::DEFAULT_GROUPS[$row['group_name']];
		}
		$this->db->sql_freeresult($result);

		$sql = 'UPDATE ' . $this->table_prefix . "config_text
			SET config_value = '" . $this->db->sql_escape(json_encode((object) images::normalise_groups($groups))) . "'
			WHERE config_name = 'editorplus_img_groups'";
		$this->db->sql_query($sql);
	}
}
