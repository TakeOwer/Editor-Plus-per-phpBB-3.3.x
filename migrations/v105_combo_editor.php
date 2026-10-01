<?php
/**
 *
 * Editor Plus 1.0.5
 * Combo gestite dall'ACP: le combo diventano dati (config_text) invece di essere scritte nell'estensione.
 * Aggiornando un forum che usava le 14 combo di Le Ombre della Rete, queste vengono importate
 * da sole con lo stesso stato (accese/spente), così non cambia nulla.
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\migrations;

use salvocortesiano\editorplus\core\combos;
use salvocortesiano\editorplus\core\helper;

class v105_combo_editor extends \phpbb\db\migration\migration
{
	public function effectively_installed()
	{
		return $this->config_text_exists(combos::CONFIG_KEY);
	}

	public static function depends_on()
	{
		return ['\salvocortesiano\editorplus\migrations\v102_combos'];
	}

	public function update_data()
	{
		return [
			['config_text.add', [combos::CONFIG_KEY, '[]']],
			['custom', [[$this, 'import_existing_combos']]],
			['config.remove', ['editorplus_combos_off']],

			['module.add', ['acp', 'ACP_EDITORPLUS_TITLE', [
				'module_basename'	=> '\salvocortesiano\editorplus\acp\main_module',
				'modes'				=> ['combos'],
			]]],
		];
	}

	public function revert_data()
	{
		return [
			['config_text.remove', [combos::CONFIG_KEY]],
			['config.add', ['editorplus_combos_off', '']],
		];
	}

	/**
	 * Le combo del pacchetto vengono importate solo se il forum ha i loro BBCode
	 * (cioè se prima della 1.0.5 le vedeva nella barra). Su un forum nuovo non si importa nulla.
	 */
	public function import_existing_combos()
	{
		$existing = helper::existing_bbcodes($this->db);
		$pack = combos::read_pack($this->phpbb_root_path);

		if (!combos::pack_usable($pack, $existing))
		{
			return;
		}

		$off = $this->config->offsetExists('editorplus_combos_off') ? explode(',', (string) $this->config['editorplus_combos_off']) : [];
		foreach ($pack as $i => $combo)
		{
			$pack[$i]['enabled'] = !in_array($combo['tag'], $off, true);
		}

		$result = combos::import([], $pack, $existing);

		$sql = 'UPDATE ' . $this->table_prefix . "config_text
			SET config_value = '" . $this->db->sql_escape(json_encode(array_values($result['combos']), JSON_UNESCAPED_UNICODE)) . "'
			WHERE config_name = '" . $this->db->sql_escape(combos::CONFIG_KEY) . "'";
		$this->db->sql_query($sql);
	}

	/**
	 * @param string $name
	 * @return bool
	 */
	protected function config_text_exists($name)
	{
		$sql = 'SELECT config_name
			FROM ' . $this->table_prefix . "config_text
			WHERE config_name = '" . $this->db->sql_escape($name) . "'";
		$result = $this->db->sql_query($sql);
		$exists = (bool) $this->db->sql_fetchfield('config_name');
		$this->db->sql_freeresult($result);

		return $exists;
	}
}
