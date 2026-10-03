<?php
/**
 *
 * Editor Plus
 * Pulizia automatica (una volta al giorno, con il sistema cron di phpBB):
 *  - bozze più vecchie dei giorni scelti in ACP, di tutti gli utenti;
 *  - allegati "orfani" (caricati e mai inviati) più vecchi dei giorni scelti in ACP
 *    (0 = spento), cancellati con il gestore ufficiale di phpBB (file e righe del database).
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\cron\task;

class cleanup extends \phpbb\cron\task\base
{
	/** Ogni quanto (secondi) */
	const INTERVAL = 86400;

	/** Limite per giro: un forum enorme si ripulisce in più giorni, senza appesantire una pagina */
	const BATCH = 500;

	/** @var \phpbb\config\config */
	protected $config;

	/** @var \phpbb\db\driver\driver_interface */
	protected $db;

	/** @var \phpbb\attachment\manager */
	protected $attachments;

	/** @var \phpbb\log\log_interface */
	protected $log;

	/** @var string */
	protected $drafts_table;

	public function __construct(\phpbb\config\config $config, \phpbb\db\driver\driver_interface $db, \phpbb\attachment\manager $attachments, \phpbb\log\log_interface $log, $table_prefix)
	{
		$this->config = $config;
		$this->db = $db;
		$this->attachments = $attachments;
		$this->log = $log;
		$this->drafts_table = $table_prefix . 'editorplus_drafts';
	}

	public function is_runnable()
	{
		return !empty($this->config['editorplus_cleanup']);
	}

	public function should_run()
	{
		return (int) $this->config['editorplus_cleanup_last'] < time() - self::INTERVAL;
	}

	public function run()
	{
		$this->config->set('editorplus_cleanup_last', time(), false);
		$result = $this->cleanup();

		if ($result['drafts'] || $result['orphans'])
		{
			$this->log->add('admin', ANONYMOUS, '', 'LOG_EDITORPLUS_CLEANUP', false, [$result['drafts'], $result['orphans']]);
		}

		return $result;
	}

	/**
	 * La pulizia vera e propria (usata anche dal pulsante "Pulisci ora" del Check-up)
	 *
	 * @return array ['drafts' => n, 'orphans' => n]
	 */
	public function cleanup()
	{
		$out = ['drafts' => 0, 'orphans' => 0];

		// bozze scadute di tutti gli utenti
		$days = max(1, (int) $this->config['editorplus_autosave_days']);
		$this->db->sql_query('DELETE FROM ' . $this->drafts_table . '
			WHERE draft_time < ' . (int) (time() - $days * 86400));
		$out['drafts'] = (int) $this->db->sql_affectedrows();

		// allegati orfani vecchi (solo se acceso in ACP)
		$orphan_days = (int) $this->config['editorplus_orphan_days'];
		if ($orphan_days > 0)
		{
			$sql = 'SELECT attach_id
				FROM ' . ATTACHMENTS_TABLE . '
				WHERE is_orphan = 1
					AND filetime < ' . (int) (time() - $orphan_days * 86400);
			$result = $this->db->sql_query_limit($sql, self::BATCH);
			$ids = [];
			while ($row = $this->db->sql_fetchrow($result))
			{
				$ids[] = (int) $row['attach_id'];
			}
			$this->db->sql_freeresult($result);

			if ($ids)
			{
				$out['orphans'] = (int) $this->attachments->delete('attach', $ids);
			}
		}

		return $out;
	}

	/**
	 * Quanti dati la pulizia toglierebbe (per il Check-up)
	 *
	 * @return array ['drafts' => n, 'orphans' => n, 'orphans_size' => byte, 'orphans_old' => n]
	 */
	public function stats()
	{
		$days = max(1, (int) $this->config['editorplus_autosave_days']);
		$result = $this->db->sql_query('SELECT COUNT(draft_id) AS n FROM ' . $this->drafts_table . '
			WHERE draft_time < ' . (int) (time() - $days * 86400));
		$drafts = (int) $this->db->sql_fetchfield('n');
		$this->db->sql_freeresult($result);

		// tutti gli orfani con più di un giorno (quelli di oggi possono essere messaggi in scrittura)
		$result = $this->db->sql_query('SELECT COUNT(attach_id) AS n, SUM(filesize) AS s FROM ' . ATTACHMENTS_TABLE . '
			WHERE is_orphan = 1
				AND filetime < ' . (int) (time() - 86400));
		$row = $this->db->sql_fetchrow($result);
		$this->db->sql_freeresult($result);

		$orphan_days = (int) $this->config['editorplus_orphan_days'];
		$old = 0;
		if ($orphan_days > 0)
		{
			$result = $this->db->sql_query('SELECT COUNT(attach_id) AS n FROM ' . ATTACHMENTS_TABLE . '
				WHERE is_orphan = 1
					AND filetime < ' . (int) (time() - $orphan_days * 86400));
			$old = (int) $this->db->sql_fetchfield('n');
			$this->db->sql_freeresult($result);
		}

		return [
			'drafts'		=> $drafts,
			'orphans'		=> (int) $row['n'],
			'orphans_size'	=> (int) $row['s'],
			'orphans_old'	=> $old,
		];
	}
}
