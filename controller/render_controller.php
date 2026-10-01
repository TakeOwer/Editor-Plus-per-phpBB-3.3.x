<?php
/**
 *
 * Editor Plus
 * Trasforma in HTML un testo con BBCode, usando lo stesso motore di phpBB (e i permessi dell'utente):
 * serve all'anteprima dal vivo e all'anteprima delle voci delle combo.
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\controller;

use phpbb\auth\auth;
use phpbb\config\config;
use phpbb\request\request;
use phpbb\user;
use Symfony\Component\HttpFoundation\JsonResponse;

class render_controller
{
	/** Una richiesta non può chiedere più di questo numero di testi (anteprima combo in blocco) */
	const MAX_ITEMS = 40;

	/** @var auth */
	protected $auth;

	/** @var config */
	protected $config;

	/** @var request */
	protected $request;

	/** @var user */
	protected $user;

	/** @var string */
	protected $root_path;

	/** @var string */
	protected $php_ext;

	/** @var \phpbb\db\driver\driver_interface|null */
	protected $db;

	public function __construct(auth $auth, config $config, request $request, user $user, $root_path, $php_ext, $db = null)
	{
		$this->db = $db;
		$this->auth = $auth;
		$this->config = $config;
		$this->request = $request;
		$this->user = $user;
		$this->root_path = $root_path;
		$this->php_ext = $php_ext;
	}

	/**
	 * POST text=... (oppure items[]=... per più testi) e hash di sicurezza
	 *
	 * @return JsonResponse
	 */
	public function render()
	{
		if (!check_link_hash($this->request->variable('hash', ''), 'editorplus_render'))
		{
			return new JsonResponse(['error' => 'FORM_INVALID'], 403);
		}

		// Solo per chi può scrivere messaggi o messaggi privati
		if ($this->user->data['user_id'] == ANONYMOUS && !$this->auth->acl_getf_global('f_post'))
		{
			return new JsonResponse(['error' => 'NOT_AUTHORISED'], 403);
		}

		if (!function_exists('generate_text_for_storage'))
		{
			include $this->root_path . 'includes/functions_content.' . $this->php_ext;
		}

		$max = (int) $this->config['max_post_chars'];

		if ($this->request->is_set_post('items_b64'))
		{
			$items = array_map([$this, 'from_b64'], array_slice((array) $this->request->raw_variable('items_b64', [''], \phpbb\request\request_interface::POST), 0, self::MAX_ITEMS));
			$out = [];
			foreach ($items as $text)
			{
				$out[] = $this->to_html(utf8_substr($text, 0, 2000));
			}

			return new JsonResponse(['items' => $out]);
		}

		if ($this->request->is_set_post('items'))
		{
			$items = array_slice($this->request->variable('items', [''], true), 0, self::MAX_ITEMS);
			$out = [];
			foreach ($items as $text)
			{
				$out[] = $this->to_html(utf8_substr($text, 0, 2000));
			}

			return new JsonResponse(['items' => $out]);
		}

		$text = $this->request->is_set_post('text_b64')
			? $this->from_b64($this->request->raw_variable('text_b64', '', \phpbb\request\request_interface::POST))
			: $this->request->variable('text', '', true);
		if ($max > 0)
		{
			$text = utf8_substr($text, 0, $max);
		}

		$response = ['html' => $this->to_html($text)];
		// allegati citati nell'anteprima: si dice solo se hanno la miniatura (la pagina chiede subito il file giusto)
		if ($this->request->is_set_post('attach_ids'))
		{
			$response['attachments'] = $this->attachment_thumbs($this->request->variable('attach_ids', [0]));
		}

		return new JsonResponse($response);
	}

	/**
	 * @param array $ids identificativi degli allegati presenti nel modulo di scrittura
	 * @return array [attach_id => ['thumb' => bool]] solo per gli allegati dell'utente (o per moderatori/amministratori)
	 */
	protected function attachment_thumbs(array $ids)
	{
		$ids = array_slice(array_unique(array_filter(array_map('intval', $ids))), 0, 50);
		if (!$ids || !$this->db)
		{
			return [];
		}
		$staff = $this->auth->acl_get('a_') || $this->auth->acl_getf_global('m_');
		$sql = 'SELECT attach_id, thumbnail, poster_id
			FROM ' . ATTACHMENTS_TABLE . '
			WHERE ' . $this->db->sql_in_set('attach_id', $ids);
		$result = $this->db->sql_query($sql);
		$out = [];
		while ($row = $this->db->sql_fetchrow($result))
		{
			if ($staff || (int) $row['poster_id'] === (int) $this->user->data['user_id'])
			{
				$out[(int) $row['attach_id']] = ['thumb' => (bool) $row['thumbnail']];
			}
		}
		$this->db->sql_freeresult($result);

		return (object) $out;
	}

	/**
	 * @param string $text Testo già protetto da phpBB (request->variable)
	 * @return string
	 */
	protected function to_html($text)
	{
		$uid = $bitfield = '';
		$flags = 0;

		generate_text_for_storage(
			$text, $uid, $bitfield, $flags,
			(bool) $this->config['allow_bbcode'],
			true,
			(bool) $this->config['allow_smilies'],
			true,
			(bool) $this->config['allow_post_flash'],
			true,
			(bool) $this->config['allow_post_links']
		);

		return generate_text_for_display($text, $uid, $bitfield, $flags);
	}

	/**
	 * Testo arrivato codificato (Base64): decodificato e poi trattato esattamente come
	 * request->variable(..., true), cioè a capo uniformati ed entità HTML come fa phpBB con i messaggi.
	 *
	 * @param string $value
	 * @return string
	 */
	protected function from_b64($value)
	{
		$text = base64_decode((string) $value, true);
		if ($text === false || !preg_match('//u', $text))
		{
			return '';
		}
		$text = str_replace(["\r\n", "\r"], "\n", $text);

		return trim(htmlspecialchars($text, ENT_COMPAT, 'UTF-8'));
	}
}
