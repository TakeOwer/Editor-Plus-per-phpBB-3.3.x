<?php
/**
 *
 * Editor Plus 1.0.43
 * Registro amministratori: le voci "Modulo aggiunto / rimosso" dei moduli del Pannello utente erano state
 * salvate con il nome tecnico (UCP_EDITORPLUS_TITLE, UCP_EDITORPLUS_IMAGES), perché durante l'installazione
 * la traduzione del Pannello utente non è caricata. phpBB mostra il registro così come è salvato: qui si
 * sostituisce il nome tecnico con quello tradotto nella lingua predefinita del forum.
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\migrations;

class v1043_log_names extends \phpbb\db\migration\migration
{
	public static function depends_on()
	{
		return ['\salvocortesiano\editorplus\migrations\v1039_images_fix'];
	}

	public function update_data()
	{
		return [
			['custom', [[$this, 'fix_log_names']]],
		];
	}

	/**
	 * Nomi tradotti dei moduli del Pannello utente, nella lingua predefinita del forum (o in inglese)
	 *
	 * @return array [nome tecnico => nome tradotto]
	 */
	protected function module_names()
	{
		$base = $this->phpbb_root_path . 'ext/salvocortesiano/editorplus/language/';
		$iso = basename((string) $this->config['default_lang']);
		$file = $base . $iso . '/info_ucp_editorplus.' . $this->php_ext;
		if (!is_file($file))
		{
			$file = $base . 'en/info_ucp_editorplus.' . $this->php_ext;
		}
		$lang = [];
		include $file;

		$out = [];
		foreach (['UCP_EDITORPLUS_TITLE', 'UCP_EDITORPLUS_IMAGES'] as $key)
		{
			if (!empty($lang[$key]))
			{
				$out[$key] = $lang[$key];
			}
		}

		return $out;
	}

	public function fix_log_names()
	{
		$names = $this->module_names();
		if (!$names)
		{
			return;
		}

		$conditions = [];
		foreach (array_keys($names) as $key)
		{
			$conditions[] = 'log_data ' . $this->db->sql_like_expression($this->db->get_any_char() . $key . $this->db->get_any_char());
		}
		$sql = 'SELECT log_id, log_data
			FROM ' . LOG_TABLE . '
			WHERE ' . $this->db->sql_in_set('log_operation', ['LOG_MODULE_ADD', 'LOG_MODULE_REMOVED', 'LOG_MODULE_EDIT', 'LOG_MODULE_ENABLE', 'LOG_MODULE_DISABLE', 'LOG_MODULE_MOVE_UP', 'LOG_MODULE_MOVE_DOWN']) . '
				AND (' . implode(' OR ', $conditions) . ')';
		$result = $this->db->sql_query($sql);
		$rows = $this->db->sql_fetchrowset($result);
		$this->db->sql_freeresult($result);

		// I dati del registro sono salvati da phpBB in forma serializzata: il nome compare esattamente come
		// s:<lunghezza in byte>:"<nome>"; e lo si sostituisce così, senza decodificare i dati
		$replace = [];
		foreach ($names as $key => $value)
		{
			$replace['s:' . strlen($key) . ':"' . $key . '";'] = 's:' . strlen($value) . ':"' . $value . '";';
		}

		foreach ($rows as $row)
		{
			$data = strtr((string) $row['log_data'], $replace);
			if ($data !== $row['log_data'])
			{
				$this->db->sql_query('UPDATE ' . LOG_TABLE . "
					SET log_data = '" . $this->db->sql_escape($data) . "'
					WHERE log_id = " . (int) $row['log_id']);
			}
		}
	}
}
