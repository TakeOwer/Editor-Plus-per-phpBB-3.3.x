<?php
/**
 *
 * Editor Plus 1.0.38
 * Immagini degli utenti dal forum: caricamento (con barra di avanzamento nel browser), elenco delle
 * proprie immagini, cancellazione delle proprie immagini e, se in ACP si sceglie quel tipo di link,
 * invio dei file al posto del link diretto.
 * Ogni utente vede e cancella solo le sue immagini.
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\controller;

use salvocortesiano\editorplus\core\image_exception;
use salvocortesiano\editorplus\core\images;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class image_controller
{
	/** @var \phpbb\config\config */
	protected $config;

	/** @var \phpbb\language\language */
	protected $language;

	/** @var \phpbb\request\request */
	protected $request;

	/** @var \phpbb\user */
	protected $user;

	/** @var images */
	protected $images;

	public function __construct($config, $language, $request, $user, images $images)
	{
		$this->config = $config;
		$this->language = $language;
		$this->request = $request;
		$this->user = $user;
		$this->images = $images;
	}

	/**
	 * POST hash + file (multipart): salva l'immagine nella cartella dell'utente
	 *
	 * @return JsonResponse
	 */
	public function upload()
	{
		// Un file oltre post_max_size arriva senza nessun campo (nemmeno il codice di sicurezza):
		// meglio dire che è troppo grande che "modulo non valido"
		$length = (int) $this->request->server('CONTENT_LENGTH', 0);
		$post_max = images::ini_bytes(ini_get('post_max_size'));
		if ($post_max && $length > $post_max)
		{
			return $this->error(new image_exception('EP_IMG_ERR_TOO_BIG', [get_formatted_filesize($length), get_formatted_filesize($post_max)], 413));
		}

		if ($response = $this->guard())
		{
			return $response;
		}

		$file = $this->request->file('file');
		if (empty($file) || !isset($file['error']))
		{
			return $this->error(new image_exception('EP_IMG_ERR_NO_FILE'));
		}
		if ((int) $file['error'] !== UPLOAD_ERR_OK)
		{
			if (in_array((int) $file['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true))
			{
				$limit = images::php_upload_limit();
				return $this->error(new image_exception('EP_IMG_ERR_TOO_BIG', [$this->language->lang('EP_IMG_UNKNOWN_SIZE'), get_formatted_filesize($limit)], 413));
			}
			return $this->error(new image_exception((int) $file['error'] === UPLOAD_ERR_PARTIAL ? 'EP_IMG_ERR_PARTIAL' : 'EP_IMG_ERR_NO_FILE'));
		}
		if (!is_uploaded_file($file['tmp_name']))
		{
			return $this->error(new image_exception('EP_IMG_ERR_NO_FILE'));
		}

		try
		{
			$row = $this->images->store($this->user->data, $file['tmp_name'], (string) $file['name'], (string) $this->user->ip);
		}
		catch (image_exception $e)
		{
			return $this->error($e);
		}
		catch (\Exception $e)
		{
			return $this->error(new image_exception('EP_IMG_ERR_PROCESS', [], 500));
		}

		return new JsonResponse([
			'ok'	=> true,
			'image'	=> $this->describe($row),
			'usage'	=> $this->usage_info(),
		]);
	}

	/**
	 * POST hash, start: le immagini dell'utente (pannello nell'editor)
	 *
	 * @return JsonResponse
	 */
	public function list_own()
	{
		if ($response = $this->guard(false))
		{
			return $response;
		}

		$start = max(0, $this->request->variable('start', 0));
		$limit = min(60, max(1, $this->request->variable('limit', 40)));
		$user_id = (int) $this->user->data['user_id'];

		$list = [];
		foreach ($this->images->list_images($user_id, $start, $limit) as $row)
		{
			$list[] = $this->describe($row);
		}

		return new JsonResponse([
			'ok'		=> true,
			'images'	=> $list,
			'usage'		=> $this->usage_info(),
			'canDelete'	=> !empty($this->config['editorplus_img_user_delete']),
		]);
	}

	/**
	 * POST hash, ids[]: elimina immagini proprie
	 *
	 * @return JsonResponse
	 */
	public function delete_own()
	{
		if ($response = $this->guard(false))
		{
			return $response;
		}
		if (empty($this->config['editorplus_img_user_delete']))
		{
			return $this->error(new image_exception('EP_IMG_ERR_NO_DELETE', [], 403));
		}

		$ids = $this->request->variable('ids', [0]);
		$deleted = $this->images->delete_images($ids, (int) $this->user->data['user_id']);

		return new JsonResponse([
			'ok'		=> true,
			'deleted'	=> array_map('intval', array_column($deleted, 'image_id')),
			'usage'		=> $this->usage_info(),
		]);
	}

	/**
	 * GET: immagine intera (solo con il tipo di link "tramite l'estensione")
	 *
	 * @param string $folder
	 * @param string $file
	 * @return Response
	 */
	public function view($folder, $file)
	{
		return $this->send($folder, $file, false);
	}

	/**
	 * GET: miniatura
	 *
	 * @param string $folder
	 * @param string $file
	 * @return Response
	 */
	public function thumb($folder, $file)
	{
		return $this->send($folder, $file, true);
	}

	/* ------------------------------------------------------------------ */

	/**
	 * Codice di sicurezza, utente registrato, funzione accesa
	 *
	 * @param bool $need_permission Il caricamento richiede il permesso; elenco e cancellazione no
	 *                              (chi ha perso il permesso può ancora vedere e togliere le sue immagini)
	 * @return JsonResponse|null
	 */
	protected function guard($need_permission = true)
	{
		if (!check_link_hash($this->request->variable('hash', ''), 'editorplus_images'))
		{
			return $this->error(new image_exception('EP_IMG_ERR_SESSION', [], 403));
		}
		if (!$this->images->enabled())
		{
			return $this->error(new image_exception('EP_IMG_ERR_OFF', [], 403));
		}
		$user_id = (int) $this->user->data['user_id'];
		if ($user_id == ANONYMOUS || (int) $this->user->data['user_type'] === USER_IGNORE)
		{
			return $this->error(new image_exception('EP_IMG_ERR_GUEST', [], 403));
		}
		if ($need_permission)
		{
			$limits = $this->images->limits($this->user->data);
			if (!$limits['allowed'])
			{
				return $this->error(new image_exception($limits['reason'], [], 403));
			}
		}

		return null;
	}

	/**
	 * @param array $row
	 * @return array
	 */
	protected function describe(array $row)
	{
		$data = $this->images->present($row);
		$data['date'] = $this->user->format_date((int) $row['image_time']);
		$data['sizeText'] = get_formatted_filesize((int) $row['image_size']);
		unset($data['ip']); // l'IP lo vede solo l'amministratore

		return $data;
	}

	/**
	 * Spazio usato e limiti dell'utente
	 *
	 * @return array
	 */
	protected function usage_info()
	{
		$limits = $this->images->limits($this->user->data);
		$usage = $this->images->usage((int) $this->user->data['user_id']);

		return [
			'allowed'		=> $limits['allowed'],
			'count'			=> $usage['count'],
			'bytes'			=> $usage['bytes'],
			'bytesText'		=> get_formatted_filesize($usage['bytes']),
			'maxCount'		=> $limits['max_count'],
			'maxQuota'		=> $limits['max_quota'],
			'maxQuotaText'	=> $limits['max_quota'] ? get_formatted_filesize($limits['max_quota']) : '',
			'maxSize'		=> $limits['max_size'],
			'maxSizeText'	=> $limits['max_size'] ? get_formatted_filesize($limits['max_size']) : '',
		];
	}

	/**
	 * @param image_exception $e
	 * @return JsonResponse
	 */
	protected function error(image_exception $e)
	{
		$status = (int) $e->getCode();

		return new JsonResponse([
			'ok'	=> false,
			'code'	=> $e->get_lang_key(),
			'error'	=> $e->translate($this->language),
		], $status >= 400 && $status < 600 ? $status : 400);
	}

	/**
	 * Invia un file della cartella di un utente
	 *
	 * @param string $folder
	 * @param string $file
	 * @param bool   $thumb
	 * @return Response
	 */
	protected function send($folder, $file, $thumb)
	{
		if (!preg_match(images::FOLDER_REGEX, $folder) || !preg_match(images::FILE_REGEX, $file) || !$this->images->is_own_folder($folder))
		{
			return new Response('', 404);
		}
		$path = $this->images->base_dir() . $folder . '/' . ($thumb ? images::THUMBS . '/' : '') . $file;
		if ($thumb && !is_file($path))
		{
			// immagine piccola: non ha una miniatura, si usa l'immagine stessa
			$path = $this->images->base_dir() . $folder . '/' . $file;
		}
		if (!is_file($path))
		{
			return new Response('', 404);
		}

		$ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
		$response = new BinaryFileResponse($path, 200, [
			'Content-Type'				=> images::MIMES[$ext],
			'X-Content-Type-Options'	=> 'nosniff',
			'Cache-Control'				=> 'public, max-age=2592000',
		], true, 'inline', true, true);

		global $phpbb_container;
		if ($phpbb_container && $phpbb_container->has('symfony_request'))
		{
			$response->isNotModified($phpbb_container->get('symfony_request'));
		}

		return $response;
	}
}
