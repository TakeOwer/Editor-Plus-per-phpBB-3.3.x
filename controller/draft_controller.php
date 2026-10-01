<?php
/**
 *
 * Editor Plus
 * Bozze salvate sul server per gli utenti registrati: salvataggio, lettura e cancellazione.
 * Ogni utente vede e modifica solo le proprie bozze.
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\controller;

use phpbb\config\config;
use phpbb\db\driver\driver_interface;
use phpbb\request\request;
use phpbb\user;
use Symfony\Component\HttpFoundation\JsonResponse;

class draft_controller
{
	/** Limiti di sicurezza */
	const MAX_MESSAGE = 262144;
	const MAX_DRAFTS = 30;

	/** @var config */
	protected $config;

	/** @var driver_interface */
	protected $db;

	/** @var request */
	protected $request;

	/** @var user */
	protected $user;

	/** @var string */
	protected $table;

	public function __construct(config $config, driver_interface $db, request $request, user $user, $table_prefix)
	{
		$this->config = $config;
		$this->db = $db;
		$this->request = $request;
		$this->user = $user;
		$this->table = $table_prefix . 'editorplus_drafts';
	}

	/**
	 * POST hash, action (save|load|delete), key, subject, message
	 *
	 * @return JsonResponse
	 */
	public function handle()
	{
		if (!check_link_hash($this->request->variable('hash', ''), 'editorplus_draft'))
		{
			return new JsonResponse(['error' => 'FORM_INVALID'], 403);
		}
		$user_id = (int) $this->user->data['user_id'];
		if ($user_id == ANONYMOUS || (int) $this->user->data['user_type'] === USER_IGNORE)
		{
			return new JsonResponse(['error' => 'NOT_AUTHORISED'], 403);
		}

		// valori originali: phpBB trasformerebbe & e < in entità (chiave rifiutata, bozza alterata).
		// La bozza torna solo nell'area di testo dell'utente, come testo: non viene mai mostrata come HTML.
		$key = (string) $this->request->raw_variable('key', '', \phpbb\request\request_interface::POST);
		if (!preg_match('/^[A-Za-z0-9_.?&=:\/-]{1,100}$/', $key))
		{
			return new JsonResponse(['error' => 'INVALID_KEY'], 400);
		}

		switch ($this->request->variable('action', ''))
		{
			case 'save':
				return $this->save($user_id, $key);

			case 'load':
				return $this->load($user_id, $key);

			case 'delete':
				$this->delete($user_id, $key);
				return new JsonResponse(['deleted' => true]);

			case 'attachments':
				return new JsonResponse($this->check_attachments($user_id, $this->attachment_list($this->incoming('attachments'))));
		}

		return new JsonResponse(['error' => 'UNKNOWN_ACTION'], 400);
	}

	protected function save($user_id, $key)
	{
		$message = str_replace("\r\n", "\n", $this->incoming('message'));
		$subject = utf8_substr($this->incoming('subject'), 0, 255);
		if (!preg_match('//u', $message . $subject))
		{
			return new JsonResponse(['error' => 'INVALID_UTF8'], 400);
		}

		if (trim($message) === '')
		{
			$this->delete($user_id, $key);
			return new JsonResponse(['saved' => false, 'empty' => true]);
		}
		if (strlen($message) > self::MAX_MESSAGE)
		{
			return new JsonResponse(['error' => 'TOO_LONG'], 413);
		}

		$now = time();
		// salvate codificate (Base64): nel database solo lettere e numeri, quindi nessun problema con emoji
		// anche nei database con il vecchio set di caratteri utf8 (non utf8mb4)
		$this->db->sql_return_on_error(true);
		$this->db->sql_transaction('begin');
		$this->delete($user_id, $key);
		$this->db->sql_query('INSERT INTO ' . $this->table . ' ' . $this->db->sql_build_array('INSERT', [
			'user_id'		=> $user_id,
			'draft_key'		=> $key,
			'draft_subject'	=> 'b64:' . base64_encode($subject),
			'draft_message'	=> 'b64:' . base64_encode($message),
			'draft_attachments'	=> json_encode($this->attachment_list($this->incoming('attachments'))),
			'draft_time'	=> $now,
		]));
		$failed = $this->db->get_sql_error_triggered();
		$error = $failed ? $this->db->get_sql_error_returned() : [];
		$this->db->sql_transaction($failed ? 'rollback' : 'commit');
		$this->db->sql_return_on_error(false);
		if ($failed)
		{
			// errore del database mostrato in chiaro (il check-up lo riporta), invece del generico 503 di phpBB
			return new JsonResponse(['error' => 'DB', 'detail' => isset($error['message']) ? $error['message'] : ''], 500);
		}

		$this->cleanup($user_id);

		return new JsonResponse(['saved' => true, 'time' => $now]);
	}

	protected function load($user_id, $key)
	{
		$sql = 'SELECT draft_subject, draft_message, draft_attachments, draft_time
			FROM ' . $this->table . '
			WHERE user_id = ' . (int) $user_id . "
				AND draft_key = '" . $this->db->sql_escape($key) . "'";
		$result = $this->db->sql_query($sql);
		$row = $this->db->sql_fetchrow($result);
		$this->db->sql_freeresult($result);

		if (!$row)
		{
			return new JsonResponse(['draft' => null]);
		}

		return new JsonResponse(['draft' => [
			'm' => $this->stored($row['draft_message']),
			's' => $this->stored($row['draft_subject']),
			'a' => $this->attachment_list((string) $row['draft_attachments']),
			't' => (int) $row['draft_time'] * 1000,
		]]);
	}

	protected function delete($user_id, $key)
	{
		$this->db->sql_query('DELETE FROM ' . $this->table . '
			WHERE user_id = ' . (int) $user_id . "
				AND draft_key = '" . $this->db->sql_escape($key) . "'");
	}

	/**
	 * Bozze troppo vecchie (giorni scelti in ACP) o in eccesso per questo utente
	 */
	protected function cleanup($user_id)
	{
		$days = max(1, (int) $this->config['editorplus_autosave_days']);
		$this->db->sql_query('DELETE FROM ' . $this->table . '
			WHERE user_id = ' . (int) $user_id . '
				AND draft_time < ' . (time() - $days * 86400));

		$sql = 'SELECT draft_id
			FROM ' . $this->table . '
			WHERE user_id = ' . (int) $user_id . '
			ORDER BY draft_time DESC';
		$result = $this->db->sql_query_limit($sql, 1000, self::MAX_DRAFTS);
		$old = [];
		while ($row = $this->db->sql_fetchrow($result))
		{
			$old[] = (int) $row['draft_id'];
		}
		$this->db->sql_freeresult($result);
		if ($old)
		{
			$this->db->sql_query('DELETE FROM ' . $this->table . ' WHERE ' . $this->db->sql_in_set('draft_id', $old));
		}
	}

	/**
	 * Valore in arrivo: codificato (campo_b64) o, per compatibilità, in chiaro (campo)
	 *
	 * @param string $name
	 * @return string
	 */
	protected function incoming($name)
	{
		if ($this->request->is_set_post($name . '_b64'))
		{
			$text = base64_decode((string) $this->request->raw_variable($name . '_b64', '', \phpbb\request\request_interface::POST), true);
			return $text === false ? '' : $text;
		}

		return (string) $this->request->raw_variable($name, '', \phpbb\request\request_interface::POST);
	}

	/**
	 * Valore salvato: le bozze nuove sono codificate ("b64:..."), quelle della 1.0.25 in chiaro
	 *
	 * @param string $value
	 * @return string
	 */
	protected function stored($value)
	{
		if (strpos((string) $value, 'b64:') === 0)
		{
			$text = base64_decode(substr($value, 4), true);
			return $text === false ? '' : $text;
		}

		return (string) $value;
	}

	/**
	 * Elenco degli allegati di una bozza, ripulito: solo identificativi numerici e commenti brevi
	 *
	 * @param string $json [{"id":123,"c":"commento"}, ...]
	 * @return array
	 */
	protected function attachment_list($json)
	{
		$list = json_decode((string) $json, true);
		$out = [];
		foreach (is_array($list) ? array_slice($list, 0, 50) : [] as $item)
		{
			$id = isset($item['id']) ? (int) $item['id'] : 0;
			if ($id > 0)
			{
				$out[] = ['id' => $id, 'c' => utf8_substr(isset($item['c']) ? (string) $item['c'] : '', 0, 255)];
			}
		}

		return $out;
	}

	/**
	 * Allegati da rimettere nel modulo al ripristino della bozza: solo quelli che esistono ancora,
	 * sono dell'utente e non sono ancora assegnati a un messaggio (allegati "orfani").
	 * Nome e dimensione vengono dal database, mai dalla bozza.
	 *
	 * @return array ['attachments' => [...nell'ordine della bozza], 'missing' => numero]
	 */
	protected function check_attachments($user_id, array $list)
	{
		if (!$list)
		{
			return ['attachments' => [], 'missing' => 0];
		}
		$ids = array_column($list, 'id');
		$sql = 'SELECT attach_id, real_filename, filesize, attach_comment
			FROM ' . ATTACHMENTS_TABLE . '
			WHERE ' . $this->db->sql_in_set('attach_id', $ids) . '
				AND poster_id = ' . (int) $user_id . '
				AND is_orphan = 1';
		$result = $this->db->sql_query($sql);
		$found = [];
		while ($row = $this->db->sql_fetchrow($result))
		{
			$found[(int) $row['attach_id']] = $row;
		}
		$this->db->sql_freeresult($result);

		$out = [];
		foreach ($list as $item)
		{
			if (isset($found[$item['id']]))
			{
				$row = $found[$item['id']];
				$out[] = [
					'attach_id'			=> (int) $row['attach_id'],
					'is_orphan'			=> 1,
					'real_filename'		=> $row['real_filename'],
					// il commento scritto nella bozza (anche se non ancora inviato), altrimenti quello salvato
					'attach_comment'	=> $item['c'] !== '' ? $item['c'] : $row['attach_comment'],
					'filesize'			=> (int) $row['filesize'],
				];
			}
		}

		return ['attachments' => $out, 'missing' => count($list) - count($out)];
	}
}
