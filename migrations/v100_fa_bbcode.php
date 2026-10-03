<?php
/**
 *
 * Editor Plus
 * Installa il BBCode [fa=nome]testo facoltativo[/fa] per le icone Font Awesome 4.7 incluse in phpBB.
 * Il valore accetta solo lettere, numeri, trattini e spazi ({SIMPLETEXT}) e finisce dentro l'attributo class:
 * non è possibile iniettare HTML o JavaScript.
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\migrations;

class v100_fa_bbcode extends \phpbb\db\migration\migration
{
	const MATCH = '[fa={SIMPLETEXT}]{TEXT}[/fa]';
	const TPL = '<i class="fa fa-{SIMPLETEXT} ep-fa" aria-hidden="true"></i>{TEXT}';

	public function effectively_installed()
	{
		return $this->config->offsetExists('editorplus_fa_bbcode_id');
	}

	public static function depends_on()
	{
		return ['\salvocortesiano\editorplus\migrations\v100_install'];
	}

	public function update_data()
	{
		// Il valore di config viene scritto alla fine di install_fa_bbcode(): se qualcosa fallisce, la migrazione si ripete
		return [
			['custom', [[$this, 'install_fa_bbcode']]],
		];
	}

	public function revert_data()
	{
		return [
			['custom', [[$this, 'remove_fa_bbcode']]],
			['config.remove', ['editorplus_fa_bbcode_id']],
		];
	}

	/**
	 * Crea il BBCode solo se sul forum non ne esiste già uno chiamato "fa"
	 */
	public function install_fa_bbcode()
	{
		$sql = 'SELECT bbcode_id
			FROM ' . $this->table_prefix . "bbcodes
			WHERE LOWER(bbcode_tag) = 'fa' OR LOWER(bbcode_tag) = 'fa='";
		$result = $this->db->sql_query($sql);
		$existing = (int) $this->db->sql_fetchfield('bbcode_id');
		$this->db->sql_freeresult($result);

		if ($existing)
		{
			// Lascia intatto il BBCode già presente e non lo rimuoverà alla disinstallazione
			$this->config->set('editorplus_fa_bbcode_id', 0);
			return;
		}

		if (!class_exists('acp_bbcodes'))
		{
			include $this->phpbb_root_path . 'includes/acp/acp_bbcodes.' . $this->php_ext;
		}

		$acp_bbcodes = new \acp_bbcodes();
		$match = self::MATCH;
		$tpl = self::TPL;
		$data = $acp_bbcodes->build_regexp($match, $tpl);

		$sql = 'SELECT MAX(bbcode_id) AS max_id
			FROM ' . $this->table_prefix . 'bbcodes';
		$result = $this->db->sql_query($sql);
		$bbcode_id = max((int) $this->db->sql_fetchfield('max_id'), NUM_CORE_BBCODES) + 1;
		$this->db->sql_freeresult($result);

		if ($bbcode_id > BBCODE_LIMIT)
		{
			$this->config->set('editorplus_fa_bbcode_id', 0);
			return;
		}

		$row = [
			'bbcode_id'				=> $bbcode_id,
			'bbcode_tag'			=> $data['bbcode_tag'],
			'bbcode_match'			=> self::MATCH,
			'bbcode_tpl'			=> self::TPL,
			'display_on_posting'	=> 0,
			'bbcode_helpline'		=> $this->helpline(),
			'first_pass_match'		=> $data['first_pass_match'],
			'first_pass_replace'	=> $data['first_pass_replace'],
			'second_pass_match'		=> $data['second_pass_match'],
			'second_pass_replace'	=> $data['second_pass_replace'],
		];

		$this->db->sql_query('INSERT INTO ' . $this->table_prefix . 'bbcodes ' . $this->db->sql_build_array('INSERT', $row));

		$this->config->set('editorplus_fa_bbcode_id', $bbcode_id);
	}

	/**
	 * Descrizione del BBCode nella lingua predefinita del forum
	 *
	 * @return string
	 */
	protected function helpline()
	{
		$lang = \salvocortesiano\editorplus\core\helper::load_language_file($this->phpbb_root_path, $this->php_ext, $this->config['default_lang'], 'common');

		return isset($lang['EP_FA_HELPLINE']) ? $lang['EP_FA_HELPLINE'] : 'Font Awesome icon: [fa=name size effect]optional text[/fa]';
	}

	/**
	 * Rimuove il BBCode solo se è quello creato da Editor Plus
	 */
	public function remove_fa_bbcode()
	{
		$bbcode_id = (int) $this->config['editorplus_fa_bbcode_id'];

		if ($bbcode_id)
		{
			$sql = 'DELETE FROM ' . $this->table_prefix . 'bbcodes
				WHERE bbcode_id = ' . (int) $bbcode_id . "
					AND bbcode_match = '" . $this->db->sql_escape(self::MATCH) . "'";
			$this->db->sql_query($sql);
		}
	}
}
