<?php
/**
 *
 * Editor Plus
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\migrations;

use salvocortesiano\editorplus\core\helper;

class v100_install extends \phpbb\db\migration\migration
{
	/** Interruttori della 1.0.0 (elenco fisso: quelli nuovi vengono aggiunti dalle migrazioni successive) */
	const TOGGLES_100 = [
		'editorplus_ghide'			=> 1,
		'editorplus_font_select'	=> 1,
		'editorplus_image_combos'	=> 1,
		'editorplus_categories'		=> 1,
		'editorplus_fa'				=> 1,
		'editorplus_emoji'			=> 1,
		'editorplus_autosave'		=> 1,
		'editorplus_shortcuts'		=> 1,
		'editorplus_undo'			=> 1,
		'editorplus_fullscreen'		=> 1,
		'editorplus_counter'		=> 1,
		'editorplus_autogrow'		=> 1,
	];

	public function effectively_installed()
	{
		return $this->config->offsetExists('editorplus_ghide_groups');
	}

	public static function depends_on()
	{
		return ['\phpbb\db\migration\data\v330\v330'];
	}

	public function update_data()
	{
		$data = [];

		foreach (self::TOGGLES_100 as $name => $default)
		{
			$data[] = ['config.add', [$name, $default]];
		}

		// Se esiste ancora l'impostazione della vecchia ABBC3 personalizzata, ne riprende i gruppi
		$groups = $this->config->offsetExists('abbc3_ghide_groups') ? (string) $this->config['abbc3_ghide_groups'] : '5,4';

		return array_merge($data, [
			['config.add', ['editorplus_ghide_groups', $groups]],
			['config.add', ['editorplus_autosave_days', 7]],
			['config_text.add', ['editorplus_category_map', helper::default_category_map(
				helper::load_language_file($this->phpbb_root_path, $this->php_ext, $this->config['default_lang'], 'common')
			)]],
			['config_text.add', ['editorplus_hidden_tags', 'flash']],

			['module.add', ['acp', 'ACP_CAT_DOT_MODS', 'ACP_EDITORPLUS_TITLE']],
			['module.add', ['acp', 'ACP_EDITORPLUS_TITLE', [
				'module_basename'	=> '\salvocortesiano\editorplus\acp\main_module',
				'modes'				=> ['settings'],
			]]],
		]);
	}

	public function revert_data()
	{
		$data = [];

		foreach (array_keys(self::TOGGLES_100) as $name)
		{
			$data[] = ['config.remove', [$name]];
		}

		return array_merge($data, [
			['config.remove', ['editorplus_ghide_groups']],
			['config.remove', ['editorplus_autosave_days']],
			['config_text.remove', ['editorplus_category_map']],
			['config_text.remove', ['editorplus_hidden_tags']],
		]);
	}
}
