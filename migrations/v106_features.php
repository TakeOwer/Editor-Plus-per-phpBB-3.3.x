<?php
/**
 *
 * Editor Plus 1.0.6
 * Anteprima dal vivo, anteprima delle combo, immagini trascinate/incollate, cerca e sostituisci,
 * preferenze personali nel Pannello utente.
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\migrations;

class v106_features extends \phpbb\db\migration\migration
{
	public function effectively_installed()
	{
		return $this->config->offsetExists('editorplus_live_preview');
	}

	public static function depends_on()
	{
		return ['\salvocortesiano\editorplus\migrations\v105_combo_editor'];
	}

	public function update_schema()
	{
		return [
			'add_columns' => [
				$this->table_prefix . 'users' => [
					'user_editorplus' => ['VCHAR:255', ''],
				],
			],
		];
	}

	public function revert_schema()
	{
		return [
			'drop_columns' => [
				$this->table_prefix . 'users' => ['user_editorplus'],
			],
		];
	}

	public function update_data()
	{
		return [
			['config.add', ['editorplus_live_preview', 1]],
			['config.add', ['editorplus_combo_preview', 1]],
			['config.add', ['editorplus_drop_upload', 1]],
			['config.add', ['editorplus_search_replace', 1]],

			['module.add', ['ucp', 'UCP_PREFS', [
				'module_basename'	=> '\salvocortesiano\editorplus\ucp\main_module',
				'modes'				=> ['prefs'],
			]]],
		];
	}

	public function revert_data()
	{
		return [
			['config.remove', ['editorplus_live_preview']],
			['config.remove', ['editorplus_combo_preview']],
			['config.remove', ['editorplus_drop_upload']],
			['config.remove', ['editorplus_search_replace']],
		];
	}
}
