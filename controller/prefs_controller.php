<?php
/**
 *
 * Editor Plus
 * Salvataggio immediato delle preferenze scelte dal menu "Opzioni" della barra
 * (le stesse del Pannello utente > Preferenze > Editor Plus).
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\controller;

use phpbb\db\driver\driver_interface;
use phpbb\request\request;
use phpbb\user;
use salvocortesiano\editorplus\core\helper;
use Symfony\Component\HttpFoundation\JsonResponse;

class prefs_controller
{
	/** @var driver_interface */
	protected $db;

	/** @var request */
	protected $request;

	/** @var user */
	protected $user;

	public function __construct(driver_interface $db, request $request, user $user)
	{
		$this->db = $db;
		$this->request = $request;
		$this->user = $user;
	}

	/**
	 * POST hash, key, value (0/1)
	 *
	 * @return JsonResponse
	 */
	public function save()
	{
		if (!check_link_hash($this->request->variable('hash', ''), 'editorplus_prefs'))
		{
			return new JsonResponse(['error' => 'FORM_INVALID'], 403);
		}
		if ($this->user->data['user_id'] == ANONYMOUS || in_array((int) $this->user->data['user_type'], [USER_IGNORE], true))
		{
			return new JsonResponse(['error' => 'NOT_AUTHORISED'], 403);
		}

		$key = $this->request->variable('key', '');

		// 1.0.48: ordine delle righe della barra (testo, non sì/no)
		if ($key === 'rows')
		{
			$rows = $this->request->variable('value', '');
			if (!helper::valid_rows($rows))
			{
				return new JsonResponse(['error' => 'INVALID_VALUE'], 400);
			}
			$prefs = helper::user_prefs($this->user->data['user_editorplus']);
			$prefs['rows'] = $rows;
			$this->db->sql_query('UPDATE ' . USERS_TABLE . "
				SET user_editorplus = '" . $this->db->sql_escape(json_encode($prefs)) . "'
				WHERE user_id = " . (int) $this->user->data['user_id']);

			return new JsonResponse(['saved' => true, 'prefs' => $prefs]);
		}

		if (!array_key_exists($key, helper::USER_PREFS))
		{
			return new JsonResponse(['error' => 'UNKNOWN_KEY'], 400);
		}

		$prefs = helper::user_prefs($this->user->data['user_editorplus']);
		$prefs[$key] = $this->request->variable('value', 0) ? 1 : 0;

		$sql = 'UPDATE ' . USERS_TABLE . "
			SET user_editorplus = '" . $this->db->sql_escape(json_encode($prefs)) . "'
			WHERE user_id = " . (int) $this->user->data['user_id'];
		$this->db->sql_query($sql);

		return new JsonResponse(['saved' => true, 'prefs' => $prefs]);
	}
}
