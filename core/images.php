<?php
/**
 *
 * Editor Plus 1.0.38
 * Immagini degli utenti: ogni utente ha la sua cartella dentro la cartella degli allegati di phpBB
 * (di solito files/), con il nome utente e l'ID (es. files/salvo_cortesiano_2/).
 *
 * - Chi può caricare e quanto lo decidono i gruppi (ACP > Editor Plus > Immagini utenti).
 * - Le immagini fisse vengono riaperte e salvate di nuovo: spariscono i dati nascosti (EXIF, posizione GPS)
 *   e qualsiasi codice infilato dentro il file. Quelle animate restano come sono, dopo un controllo.
 * - I nomi dei file li sceglie l'estensione (solo lettere, cifre e trattini, sempre con estensione
 *   d'immagine): un file .php non può mai finire nella cartella.
 * - Ogni cartella ha il suo .htaccess (lettura delle sole immagini), una pagina vuota contro l'elenco
 *   dei file e un file segnaposto: senza quel segnaposto l'estensione non cancella mai una cartella.
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\core;

use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

class images
{
	/** Tipi accettati: tipo di getimagesize() => estensione */
	const TYPES = [
		IMAGETYPE_JPEG	=> 'jpg',
		IMAGETYPE_PNG	=> 'png',
		IMAGETYPE_GIF	=> 'gif',
		IMAGETYPE_WEBP	=> 'webp',
	];

	const MIMES = [
		'jpg'	=> 'image/jpeg',
		'png'	=> 'image/png',
		'gif'	=> 'image/gif',
		'webp'	=> 'image/webp',
	];

	/** File segnaposto: solo le cartelle che lo contengono sono di Editor Plus */
	const MARKER = '.editorplus';

	/** Sottocartella delle miniature */
	const THUMBS = 'thumbs';

	/** Nome della cartella: nome utente ripulito + _ + ID */
	const FOLDER_REGEX = '/^[a-z0-9][a-z0-9_]{0,60}_[0-9]{1,10}$/';

	/** Nome del file: lettere minuscole, cifre e trattini + estensione d'immagine */
	const FILE_REGEX = '/^[a-z0-9][a-z0-9-]{0,80}\.(jpg|png|gif|webp)$/';

	/** Cartella della prova dal vivo del Check-up (ID 0: nessun utente può averla) */
	const PROBE = 'editorplus_prova_0';

	/** Limiti di sicurezza indipendenti dalle impostazioni */
	const MAX_SIDE = 20000;
	const MAX_PIXELS = 60000000;

	/** Valori predefiniti per gruppo (nome del gruppo di serie => impostazioni) */
	const DEFAULT_GROUPS = [
		'ADMINISTRATORS'	=> ['mode' => 'yes', 'size' => 10240, 'count' => 0, 'quota' => 0],
		'GLOBAL_MODERATORS'	=> ['mode' => 'yes', 'size' => 5120, 'count' => 0, 'quota' => 500],
		'REGISTERED'		=> ['mode' => 'yes', 'size' => 2048, 'count' => 200, 'quota' => 100],
		'NEWLY_REGISTERED'	=> ['mode' => 'never', 'size' => 0, 'count' => 0, 'quota' => 0],
	];

	/** Testi usati da editorplus_gallery.js, editorplus_mod_images.js e dalle pagine ACP/Pannello utente */
	const JS_LANG = [
		'EP_IMG_TITLE', 'EP_IMG_COPIED', 'EP_IMG_COPY_FAIL', 'EP_IMG_PREV', 'EP_IMG_NEXT', 'EP_IMG_CLOSE', 'EP_IMG_LOAD_FAILED',
		'EP_IMG_DIMENSIONS', 'EP_IMG_SIZE', 'EP_IMG_DATE', 'EP_IMG_IP', 'EP_IMG_FILE', 'EP_IMG_LINK', 'EP_IMG_BBCODE', 'EP_IMG_COPY',
		'EP_IMG_OPEN', 'EP_IMG_SERVER_ERROR', 'EP_IMG_NETWORK_ERROR', 'EP_IMG_TYPE_NOT_ALLOWED', 'EP_IMG_TOO_BIG', 'EP_IMG_RESIZED',
		'EP_IMG_UPLOADED', 'EP_IMG_FAILED', 'EP_IMG_CHOOSE', 'EP_IMG_DROP', 'EP_IMG_SELECTED', 'EP_IMG_ERR_NO_GROUP', 'EP_IMG_USAGE',
		'EP_IMG_USAGE_QUOTA', 'EP_IMG_USAGE_COUNT', 'EP_IMG_USAGE_SIZE', 'EP_IMG_CONFIRM_DELETE', 'EP_IMG_DELETED_ONE', 'EP_IMG_DELETED_FROM_MSG', 'EP_IMG_DELETED_WY', 'EP_IMG_INSERT',
		'EP_IMG_DELETE', 'EP_IMG_NONE', 'EP_IMG_INSERT_HINT', 'EP_IMG_ZOOM', 'EP_IMG_MORE', 'EP_IMG_MANAGE', 'EP_IMG_PANEL_HINT',
		'EP_IMG_WHERE', 'EP_IMG_WHERE_LOADING', 'EP_IMG_WHERE_NONE', 'EP_IMG_WHERE_POSTS', 'EP_IMG_WHERE_PMS', 'EP_IMG_WHERE_SIGS',
	];

	/**
	 * Testi per JavaScript (window.EditorPlusGalleryLang)
	 *
	 * @param \phpbb\language\language $language
	 * @return string JSON
	 */
	public static function js_lang($language)
	{
		$texts = [];
		foreach (self::JS_LANG as $key)
		{
			$texts[$key] = $language->lang($key);
		}

		return helper::safe_json($texts);
	}

	/** @var \phpbb\config\config */
	protected $config;

	/** @var \phpbb\config\db_text */
	protected $config_text;

	/** @var \phpbb\db\driver\driver_interface */
	protected $db;

	/** @var \phpbb\controller\helper|null */
	protected $helper;

	/** @var string */
	protected $root_path;

	/** @var string */
	protected $table;

	/** @var string */
	protected $folders_table;

	/** @var array|null */
	protected $group_cache;

	public function __construct($config, $config_text, $db, $helper, $root_path, $table_prefix)
	{
		$this->config = $config;
		$this->config_text = $config_text;
		$this->db = $db;
		$this->helper = $helper;
		$this->root_path = $root_path;
		$this->table = $table_prefix . 'editorplus_images';
		$this->folders_table = $table_prefix . 'editorplus_img_folders';
	}

	/* ================================================================== */
	/* Impostazioni                                                        */
	/* ================================================================== */

	/**
	 * @return bool
	 */
	public function enabled()
	{
		return !empty($this->config['editorplus_images']);
	}

	/**
	 * @return string 'direct' (link al file) o 'route' (il file passa dall'estensione)
	 */
	public function link_mode()
	{
		return $this->config['editorplus_img_link'] === 'route' ? 'route' : 'direct';
	}

	/**
	 * Tipi ammessi dall'amministratore
	 *
	 * @return string[] es. ['jpg', 'png', 'gif', 'webp']
	 */
	public function allowed_types()
	{
		$types = array_intersect(array_map('trim', explode(',', strtolower((string) $this->config['editorplus_img_types']))), array_values(self::TYPES));
		return $types ? array_values($types) : array_values(self::TYPES);
	}

	/**
	 * Impostazioni per gruppo: [group_id => ['mode' => yes|never, 'size' => KB, 'count' => n, 'quota' => MB]]
	 * 0 = senza limite. Un gruppo assente non dà né toglie il permesso.
	 *
	 * @return array
	 */
	public function group_settings()
	{
		if ($this->group_cache === null)
		{
			$raw = json_decode((string) $this->config_text->get('editorplus_img_groups'), true);
			$this->group_cache = self::normalise_groups(is_array($raw) ? $raw : []);
		}

		return $this->group_cache;
	}

	/**
	 * @param array $groups
	 */
	public function save_group_settings(array $groups)
	{
		$this->group_cache = self::normalise_groups($groups);
		$this->config_text->set('editorplus_img_groups', json_encode((object) $this->group_cache));
	}

	/**
	 * Ripulisce le impostazioni dei gruppi (anche quelle lette dal database)
	 *
	 * @param array $groups
	 * @return array
	 */
	public static function normalise_groups(array $groups)
	{
		$clean = [];
		foreach ($groups as $group_id => $set)
		{
			$group_id = (int) $group_id;
			if ($group_id <= 0 || !is_array($set) || !isset($set['mode']) || !in_array($set['mode'], ['yes', 'never'], true))
			{
				continue;
			}
			$clean[$group_id] = [
				'mode'	=> $set['mode'],
				'size'	=> isset($set['size']) ? min(1048576, max(0, (int) $set['size'])) : 0,
				'count'	=> isset($set['count']) ? min(1000000, max(0, (int) $set['count'])) : 0,
				'quota'	=> isset($set['quota']) ? min(1048576, max(0, (int) $set['quota'])) : 0,
			];
		}
		ksort($clean);

		return $clean;
	}

	/**
	 * Limite di PHP sul caricamento (upload_max_filesize e post_max_size), in byte; 0 = nessuno
	 *
	 * @return int
	 */
	public static function php_upload_limit()
	{
		$limits = array_filter([self::ini_bytes(ini_get('upload_max_filesize')), self::ini_bytes(ini_get('post_max_size'))]);

		return $limits ? (int) min($limits) : 0;
	}

	/**
	 * "8M" => 8388608
	 *
	 * @param string $value
	 * @return int
	 */
	public static function ini_bytes($value)
	{
		$value = trim((string) $value);
		if ($value === '' || $value === '-1')
		{
			return 0;
		}
		$number = (float) $value;
		switch (strtolower(substr($value, -1)))
		{
			case 'g':
				$number *= 1024;
			// no break
			case 'm':
				$number *= 1024;
			// no break
			case 'k':
				$number *= 1024;
		}

		return (int) $number;
	}

	/* ================================================================== */
	/* Permessi e limiti dell'utente                                       */
	/* ================================================================== */

	/**
	 * Cosa può fare un utente. Con più gruppi vale il limite più generoso; un gruppo impostato su "Mai"
	 * toglie il permesso anche se un altro gruppo lo dà (come il MAI dei permessi di phpBB).
	 *
	 * @param array $user Riga dell'utente (user_id, user_type)
	 * @return array ['allowed' => bool, 'reason' => string, 'max_size' => byte, 'max_count' => n, 'max_quota' => byte] (0 = senza limite)
	 */
	public function limits(array $user)
	{
		$result = ['allowed' => false, 'reason' => '', 'max_size' => 0, 'max_count' => 0, 'max_quota' => 0];

		if (!$this->enabled())
		{
			$result['reason'] = 'EP_IMG_ERR_OFF';
			return $result;
		}
		if (empty($user['user_id']) || (int) $user['user_id'] === ANONYMOUS || (isset($user['user_type']) && (int) $user['user_type'] === USER_IGNORE))
		{
			$result['reason'] = 'EP_IMG_ERR_GUEST';
			return $result;
		}

		$settings = $this->group_settings();
		$allowed = $never = false;
		$size = $count = $quota = -1;

		foreach (helper::user_groups($this->db, (int) $user['user_id']) as $group_id)
		{
			if (!isset($settings[$group_id]))
			{
				continue;
			}
			$set = $settings[$group_id];
			if ($set['mode'] === 'never')
			{
				$never = true;
				continue;
			}
			$allowed = true;
			// 0 = senza limite: vince su qualsiasi numero
			$size = ($size === 0 || $set['size'] === 0) ? 0 : max($size, $set['size']);
			$count = ($count === 0 || $set['count'] === 0) ? 0 : max($count, $set['count']);
			$quota = ($quota === 0 || $set['quota'] === 0) ? 0 : max($quota, $set['quota']);
		}

		if ($never)
		{
			$result['reason'] = 'EP_IMG_ERR_NEVER';
			return $result;
		}
		if (!$allowed)
		{
			$result['reason'] = 'EP_IMG_ERR_NO_GROUP';
			return $result;
		}
		// Le immagini servono per scrivere: chi non può scrivere da nessuna parte non le carica
		// (altrimenti il forum diventerebbe un hosting di immagini per chiunque sia registrato)
		if (!empty($this->config['editorplus_img_need_post']) && !$this->can_write((int) $user['user_id']))
		{
			$result['reason'] = 'EP_IMG_ERR_NO_POST';
			return $result;
		}

		$max_size = $size > 0 ? $size * 1024 : 0;
		$php = self::php_upload_limit();
		if ($php && (!$max_size || $max_size > $php))
		{
			$max_size = $php;
		}

		return [
			'allowed'	=> true,
			'reason'	=> '',
			'max_size'	=> $max_size,
			'max_count'	=> max(0, $count),
			'max_quota'	=> $quota > 0 ? $quota * 1048576 : 0,
		];
	}

	/**
	 * L'utente che sta navigando può scrivere da qualche parte (argomenti, risposte, messaggi privati, firma)?
	 * Vale solo per l'utente collegato: per gli altri (es. elenchi dell'ACP) non si applica.
	 *
	 * @param int $user_id
	 * @return bool
	 */
	protected function can_write($user_id)
	{
		global $auth, $user;
		if (!$auth || !$user || (int) $user->data['user_id'] !== $user_id)
		{
			return true;
		}

		return (bool) ($auth->acl_getf_global('f_post') || $auth->acl_getf_global('f_reply')
			|| $auth->acl_get('u_sendpm') || $auth->acl_get('u_sig'));
	}

	/**
	 * Immagini e spazio già usati da un utente
	 *
	 * @param int $user_id
	 * @return array ['count' => n, 'bytes' => byte]
	 */
	public function usage($user_id)
	{
		$sql = 'SELECT COUNT(image_id) AS total, SUM(image_size) AS bytes
			FROM ' . $this->table . '
			WHERE user_id = ' . (int) $user_id;
		$result = $this->db->sql_query($sql);
		$row = $this->db->sql_fetchrow($result);
		$this->db->sql_freeresult($result);

		return ['count' => (int) $row['total'], 'bytes' => (int) $row['bytes']];
	}

	/* ================================================================== */
	/* Cartelle                                                            */
	/* ================================================================== */

	/**
	 * Cartella degli allegati di phpBB (percorso sul disco, con la barra finale)
	 *
	 * @return string
	 */
	public function base_dir()
	{
		return $this->root_path . trim((string) $this->config['upload_path'], '/') . '/';
	}

	/**
	 * Testo semplice, solo lettere minuscole senza accenti, cifre e il separatore
	 *
	 * @param string $text
	 * @param int    $max
	 * @param string $sep
	 * @return string
	 */
	public static function clean_name($text, $max, $sep = '_')
	{
		$text = (string) $text;
		$done = false;
		if (function_exists('transliterator_transliterate'))
		{
			$t = @transliterator_transliterate('Any-Latin; Latin-ASCII; Lower()', $text);
			if (is_string($t))
			{
				$text = $t;
				$done = true;
			}
		}
		if (!$done)
		{
			$text = strtr($text, [
				'à' => 'a', 'á' => 'a', 'â' => 'a', 'ä' => 'a', 'ã' => 'a', 'å' => 'a', 'À' => 'a', 'Á' => 'a', 'Â' => 'a', 'Ä' => 'a',
				'è' => 'e', 'é' => 'e', 'ê' => 'e', 'ë' => 'e', 'È' => 'e', 'É' => 'e', 'Ê' => 'e', 'Ë' => 'e',
				'ì' => 'i', 'í' => 'i', 'î' => 'i', 'ï' => 'i', 'Ì' => 'i', 'Í' => 'i', 'Î' => 'i', 'Ï' => 'i',
				'ò' => 'o', 'ó' => 'o', 'ô' => 'o', 'ö' => 'o', 'õ' => 'o', 'Ò' => 'o', 'Ó' => 'o', 'Ô' => 'o', 'Ö' => 'o',
				'ù' => 'u', 'ú' => 'u', 'û' => 'u', 'ü' => 'u', 'Ù' => 'u', 'Ú' => 'u', 'Û' => 'u', 'Ü' => 'u',
				'ñ' => 'n', 'Ñ' => 'n', 'ç' => 'c', 'Ç' => 'c', 'ß' => 'ss', 'ÿ' => 'y', 'ø' => 'o', 'æ' => 'ae', 'œ' => 'oe',
			]);
		}
		$text = preg_replace('/[^a-z0-9]+/', $sep, strtolower($text));
		$text = trim(substr(trim($text, $sep), 0, $max), $sep);

		return $text;
	}

	/**
	 * Nome della cartella di un utente: "Salvo Cortesiano" con ID 2 => salvo_cortesiano_2
	 *
	 * @param string $username
	 * @param int    $user_id
	 * @return string
	 */
	public static function folder_name($username, $user_id)
	{
		$name = self::clean_name($username, 40, '_');

		return ($name !== '' ? $name : 'utente') . '_' . (int) $user_id;
	}

	/**
	 * Riga della cartella di un utente
	 *
	 * @param int $user_id
	 * @return array|null
	 */
	public function folder_of($user_id)
	{
		$sql = 'SELECT *
			FROM ' . $this->folders_table . '
			WHERE user_id = ' . (int) $user_id;
		$result = $this->db->sql_query($sql);
		$row = $this->db->sql_fetchrow($result);
		$this->db->sql_freeresult($result);

		return $row ?: null;
	}

	/**
	 * Crea (se manca) la cartella dell'utente. Il nome nasce al primo caricamento e poi non cambia più,
	 * anche se l'utente cambia nome: così i link nei vecchi messaggi restano validi.
	 *
	 * @param int    $user_id
	 * @param string $username
	 * @return string Nome della cartella
	 * @throws image_exception
	 */
	public function ensure_folder($user_id, $username)
	{
		$row = $this->folder_of($user_id);
		$name = $row ? $row['folder_name'] : self::folder_name($username, $user_id);
		$dir = $this->base_dir() . $name . '/';

		if (!is_dir($this->base_dir()) || !is_writable($this->base_dir()))
		{
			throw new image_exception('EP_IMG_ERR_BASE_DIR', [trim((string) $this->config['upload_path'], '/')], 500);
		}

		if (!is_dir($dir))
		{
			if (!@mkdir($dir, 0755) && !is_dir($dir))
			{
				throw new image_exception('EP_IMG_ERR_MKDIR', [$name], 500);
			}
			@chmod($dir, 0755);
		}
		$this->write_folder_files($dir, $user_id);

		if (!$row)
		{
			$this->db->sql_query('INSERT INTO ' . $this->folders_table . ' ' . $this->db->sql_build_array('INSERT', [
				'user_id'			=> (int) $user_id,
				'folder_name'		=> $name,
				'folder_username'	=> (string) $username,
				'folder_time'		=> time(),
			]));
		}

		return $name;
	}

	/**
	 * .htaccess, pagina vuota e segnaposto (riscritti se mancano o se sono vecchi)
	 *
	 * @param string $dir
	 * @param int    $user_id
	 */
	protected function write_folder_files($dir, $user_id)
	{
		$files = [
			'.htaccess'		=> self::htaccess(),
			'index.htm'		=> "<html>\n<head>\n<title></title>\n<meta http-equiv=\"content-type\" content=\"text/html; charset=UTF-8\">\n</head>\n\n<body bgcolor=\"#FFFFFF\" text=\"#000000\">\n\n</body>\n</html>\n",
			self::MARKER	=> 'Editor Plus ' . (int) $user_id . "\n",
		];
		foreach ($files as $file => $content)
		{
			if (!is_file($dir . $file) || @file_get_contents($dir . $file) !== $content)
			{
				@file_put_contents($dir . $file, $content);
				@chmod($dir . $file, 0644);
			}
		}
	}

	/**
	 * .htaccess della cartella di un utente: apre la lettura (la cartella degli allegati di phpBB la nega)
	 * e blocca qualsiasi file che non sia un'immagine. Stessa struttura di quello di phpBB, così funziona
	 * con Apache 2.2, 2.4 e LiteSpeed.
	 *
	 * @return string
	 */
	public static function htaccess()
	{
		$allow = "\t\tOrder Allow,Deny\n\t\tAllow from All\n";
		$deny = "\t\tOrder Allow,Deny\n\t\tDeny from All\n";

		$block = function ($old, $new, $indent) {
			$pad = str_repeat("\t", $indent);
			return $pad . "<IfModule mod_version.c>\n"
				. $pad . "\t<IfVersion < 2.4>\n" . preg_replace('/^/m', $pad . "\t", $old)
				. $pad . "\t</IfVersion>\n"
				. $pad . "\t<IfVersion >= 2.4>\n" . $pad . "\t\t" . $new . "\n"
				. $pad . "\t</IfVersion>\n"
				. $pad . "</IfModule>\n"
				. $pad . "<IfModule !mod_version.c>\n"
				. $pad . "\t<IfModule !mod_authz_core.c>\n" . preg_replace('/^/m', $pad . "\t", $old)
				. $pad . "\t</IfModule>\n"
				. $pad . "\t<IfModule mod_authz_core.c>\n" . $pad . "\t\t" . $new . "\n"
				. $pad . "\t</IfModule>\n"
				. $pad . "</IfModule>\n";
		};

		return "# Editor Plus: immagini caricate da un utente.\n"
			. "# Le immagini si possono aprire; qualsiasi altro tipo di file resta bloccato.\n"
			. $block($allow, 'Require all granted', 0)
			. "<FilesMatch \"\\.(?i:php[0-9]?|phtml|pht|phar|inc|cgi|pl|py|sh|asp|aspx|jsp|htm|html|shtml|xhtml|svg|svgz|js|json|xml|htaccess|editorplus)$\">\n"
			. $block($deny, 'Require all denied', 1)
			. "</FilesMatch>\n"
			. "<IfModule mod_headers.c>\n"
			. "\tHeader set X-Content-Type-Options \"nosniff\"\n"
			. "</IfModule>\n";
	}

	/**
	 * La cartella è davvero una cartella di Editor Plus (segnaposto presente)?
	 *
	 * @param string $name
	 * @return bool
	 */
	public function is_own_folder($name)
	{
		return preg_match(self::FOLDER_REGEX, (string) $name) && is_file($this->base_dir() . $name . '/' . self::MARKER);
	}

	/* ================================================================== */
	/* Indirizzi                                                           */
	/* ================================================================== */

	/**
	 * Indirizzo pubblico di un'immagine (o della sua miniatura)
	 *
	 * @param string $folder
	 * @param string $file
	 * @param bool   $thumb
	 * @param string|null $mode 'direct' o 'route'; null = quello scelto in ACP
	 * @return string
	 */
	public function url($folder, $file, $thumb = false, $mode = null)
	{
		$mode = $mode ?: $this->link_mode();

		if ($mode === 'route' && $this->helper)
		{
			$params = ['folder' => $folder, 'file' => $file];
			$url = $this->helper->route($thumb ? 'salvocortesiano_editorplus_image_thumb' : 'salvocortesiano_editorplus_image_view', $params, false, false, UrlGeneratorInterface::ABSOLUTE_URL);
			// mai il codice di sessione dentro un link che finisce nei messaggi
			return preg_replace('/[?&]sid=[0-9a-f]*$/i', '', preg_replace('/([?&])sid=[0-9a-f]*&/i', '$1', $url));
		}

		return generate_board_url() . '/' . trim((string) $this->config['upload_path'], '/') . '/' . $folder . '/' . ($thumb ? self::THUMBS . '/' : '') . $file;
	}

	/**
	 * Dati di un'immagine pronti per JavaScript e template
	 *
	 * @param array $row
	 * @return array
	 */
	public function present(array $row)
	{
		$url = $this->url($row['image_folder'], $row['image_file']);
		$thumb = !empty($row['image_thumb']) ? $this->url($row['image_folder'], $row['image_file'], true) : $url;

		return [
			'id'		=> (int) $row['image_id'],
			'user_id'	=> (int) $row['user_id'],
			// testo semplice: gli script lo inseriscono come testo; i template lo devono rendere sicuro da sé
			'name'		=> html_entity_decode((string) $row['image_name'], ENT_QUOTES, 'UTF-8'),
			'file'		=> (string) $row['image_file'],
			'folder'	=> (string) $row['image_folder'],
			'url'		=> $url,
			'thumb'		=> $thumb,
			'width'		=> (int) $row['image_width'],
			'height'	=> (int) $row['image_height'],
			'size'		=> (int) $row['image_size'],
			'mime'		=> (string) $row['image_mime'],
			'time'		=> (int) $row['image_time'],
			'ip'		=> (string) $row['image_ip'],
			'bbcode'	=> $this->bbcode($url, $thumb, !empty($row['image_thumb'])),
		];
	}

	/**
	 * BBCode da inserire nel messaggio
	 *
	 * @param string $url
	 * @param string $thumb
	 * @param bool   $has_thumb
	 * @return string
	 */
	public function bbcode($url, $thumb, $has_thumb)
	{
		if ($has_thumb && $this->config['editorplus_img_insert'] === 'thumb')
		{
			return '[url=' . $url . '][img]' . $thumb . '[/img][/url]';
		}

		return '[img]' . $url . '[/img]';
	}

	/* ================================================================== */
	/* Caricamento                                                         */
	/* ================================================================== */

	/**
	 * Salva un'immagine caricata da un utente
	 *
	 * @param array  $user          Riga dell'utente (user_id, username, user_type)
	 * @param string $tmp           File temporaneo
	 * @param string $original_name Nome scelto dall'utente (solo per il nome del file e per l'elenco)
	 * @param string $ip
	 * @param bool   $check_limits  false solo per il recupero dalle cartelle
	 * @return array Riga salvata
	 * @throws image_exception
	 */
	public function store(array $user, $tmp, $original_name, $ip, $check_limits = true)
	{
		if (!is_file($tmp) || !is_readable($tmp))
		{
			throw new image_exception('EP_IMG_ERR_NO_FILE');
		}
		$bytes = (int) filesize($tmp);
		if ($bytes <= 0)
		{
			throw new image_exception('EP_IMG_ERR_NO_FILE');
		}

		$limits = $this->limits($user);
		if ($check_limits)
		{
			if (!$limits['allowed'])
			{
				throw new image_exception($limits['reason'], [], 403);
			}
			if ($limits['max_size'] && $bytes > $limits['max_size'])
			{
				throw new image_exception('EP_IMG_ERR_TOO_BIG', [get_formatted_filesize($bytes), get_formatted_filesize($limits['max_size'])], 413);
			}
			$used = $this->usage($user['user_id']);
			if ($limits['max_count'] && $used['count'] >= $limits['max_count'])
			{
				throw new image_exception('EP_IMG_ERR_COUNT', [$limits['max_count']], 403);
			}
			if ($limits['max_quota'] && $used['bytes'] + $bytes > $limits['max_quota'])
			{
				throw new image_exception('EP_IMG_ERR_QUOTA', [get_formatted_filesize($limits['max_quota']), get_formatted_filesize(max(0, $limits['max_quota'] - $used['bytes']))], 403);
			}
		}

		// Cos'è davvero il file (non conta il nome né quello che dice il browser)
		$info = @getimagesize($tmp);
		if (!$info || !isset(self::TYPES[$info[2]]))
		{
			throw new image_exception('EP_IMG_ERR_NOT_IMAGE');
		}
		$ext = self::TYPES[$info[2]];
		if (!in_array($ext, $this->allowed_types(), true))
		{
			throw new image_exception('EP_IMG_ERR_TYPE', [strtoupper($ext), strtoupper(implode(', ', $this->allowed_types()))]);
		}
		$width = (int) $info[0];
		$height = (int) $info[1];
		if ($width < 1 || $height < 1 || $width > self::MAX_SIDE || $height > self::MAX_SIDE || $width * $height > self::MAX_PIXELS)
		{
			throw new image_exception('EP_IMG_ERR_DIMENSIONS', [$width, $height]);
		}

		$data = (string) file_get_contents($tmp);
		$animated = self::is_animated($data, $ext);

		$folder = $this->ensure_folder((int) $user['user_id'], (string) $user['username']);
		$dir = $this->base_dir() . $folder . '/';
		$file = $this->unique_file($dir, $original_name, $ext);
		$part = $dir . '.' . $file . '.part';

		try
		{
			if ($animated || !self::gd_can($ext))
			{
				// Animazione (GD la perderebbe) o server senza GD per questo tipo: niente ricodifica, ma il file
				// viene ricostruito con i soli dati dell'immagine (via commenti, EXIF/GPS, XMP, testi, dati in coda)
				$data = self::strip_metadata($data, $ext);
				if ($data === false)
				{
					throw new image_exception('EP_IMG_ERR_NOT_IMAGE');
				}
				if (preg_match('/<\?php|<script|<html|<body|<iframe|<svg/i', $data))
				{
					throw new image_exception('EP_IMG_ERR_UNSAFE');
				}
				if (@file_put_contents($part, $data) !== strlen($data))
				{
					throw new image_exception('EP_IMG_ERR_WRITE', [], 500);
				}
				// deve essere ancora un'immagine valida dello stesso tipo
				$check = @getimagesize($part);
				if (!$check || !isset(self::TYPES[$check[2]]) || self::TYPES[$check[2]] !== $ext)
				{
					throw new image_exception('EP_IMG_ERR_NOT_IMAGE');
				}
			}
			else
			{
				list($width, $height) = $this->reencode($tmp, $part, $ext, $width, $height);
			}
			unset($data);

			if (!@rename($part, $dir . $file))
			{
				throw new image_exception('EP_IMG_ERR_WRITE', [], 500);
			}
			@chmod($dir . $file, 0644);
		}
		catch (\Exception $e)
		{
			@unlink($part);
			throw $e instanceof image_exception ? $e : new image_exception('EP_IMG_ERR_PROCESS', [], 500);
		}

		$final = (int) filesize($dir . $file);
		$has_thumb = $this->make_thumb($dir, $file, $ext, $width, $height);

		$row = [
			'user_id'		=> (int) $user['user_id'],
			'image_folder'	=> $folder,
			'image_file'	=> $file,
			'image_name'	=> utf8_substr(self::display_name($original_name, $ext), 0, 255),
			'image_mime'	=> self::MIMES[$ext],
			'image_size'	=> $final,
			'image_width'	=> $width,
			'image_height'	=> $height,
			'image_thumb'	=> $has_thumb ? 1 : 0,
			'image_time'	=> time(),
			'image_ip'		=> substr((string) $ip, 0, 40),
		];
		// Se il database rifiuta la riga, il file non deve restare sul disco senza nessuno che lo conosca
		$this->db->sql_return_on_error(true);
		$this->db->sql_query('INSERT INTO ' . $this->table . ' ' . $this->db->sql_build_array('INSERT', $row));
		$failed = $this->db->get_sql_error_triggered();
		$this->db->sql_return_on_error(false);
		if ($failed)
		{
			@unlink($dir . $file);
			@unlink($dir . self::THUMBS . '/' . $file);
			throw new image_exception('EP_IMG_ERR_DB', [], 500);
		}
		$row['image_id'] = (int) $this->db->sql_nextid();

		return $row;
	}

	/**
	 * Nome leggibile del file caricato (solo per l'elenco)
	 *
	 * @param string $name
	 * @param string $ext
	 * @return string
	 */
	protected static function display_name($name, $ext)
	{
		$name = trim(str_replace(["\0", '/', '\\', '%22'], ['', '', '', '&quot;'], (string) $name));
		if (!preg_match('//u', $name) || $name === '')
		{
			$name = 'immagine.' . $ext;
		}

		return $name;
	}

	/**
	 * Nome del file sul disco: nome originale ripulito + 6 caratteri casuali (es. tramonto-a1b2c3.jpg)
	 *
	 * @param string $dir
	 * @param string $original
	 * @param string $ext
	 * @return string
	 */
	protected function unique_file($dir, $original, $ext)
	{
		$base = self::clean_name(preg_replace('/\.[^.]*$/', '', (string) $original), 40, '-');
		$base = $base !== '' ? $base : 'immagine';

		do
		{
			$file = $base . '-' . bin2hex(random_bytes(3)) . '.' . $ext;
		}
		while (file_exists($dir . $file));

		return $file;
	}

	/* ================================================================== */
	/* Pulizia dei file salvati senza ricodifica (animati, o server senza GD) */
	/* Il file viene ricostruito con i soli dati che servono a mostrare     */
	/* l'immagine: commenti, EXIF/GPS, XMP, testi e dati in coda vengono    */
	/* scartati. Un file che non si lascia analizzare viene rifiutato.      */
	/* ================================================================== */

	/**
	 * @param string $data
	 * @param string $ext jpg|png|gif|webp
	 * @return string|false File ripulito, false se il formato non è valido
	 */
	public static function strip_metadata($data, $ext)
	{
		switch ($ext)
		{
			case 'gif':
				return self::strip_gif($data);
			case 'png':
				return self::strip_png($data);
			case 'webp':
				return self::strip_webp($data);
			case 'jpg':
				return self::strip_jpeg($data);
		}

		return false;
	}

	/** GIF: si tengono intestazione, tavolozze, fotogrammi, controllo dei tempi e ripetizione (NETSCAPE) */
	protected static function strip_gif($d)
	{
		$len = strlen($d);
		if ($len < 13 || (substr($d, 0, 6) !== 'GIF87a' && substr($d, 0, 6) !== 'GIF89a'))
		{
			return false;
		}
		$packed = ord($d[10]);
		$pos = 13 + (($packed & 0x80) ? 3 * (2 << ($packed & 7)) : 0);
		if ($pos > $len)
		{
			return false;
		}
		$out = substr($d, 0, $pos);

		// sotto-blocchi: [dimensione][dati]... fino a un blocco di dimensione 0
		$blocks = function ($p) use ($d, $len) {
			while ($p < $len)
			{
				$size = ord($d[$p]);
				$p++;
				if ($size === 0)
				{
					return $p;
				}
				$p += $size;
			}
			return false;
		};

		while ($pos < $len)
		{
			$b = ord($d[$pos]);
			if ($b === 0x3B)
			{
				return $out . "\x3B";
			}
			if ($b === 0x21)
			{
				if ($pos + 2 > $len)
				{
					return false;
				}
				$label = ord($d[$pos + 1]);
				$end = $blocks($pos + 2);
				if ($end === false)
				{
					return false;
				}
				$keep = $label === 0xF9;
				if ($label === 0xFF && $pos + 3 < $len)
				{
					$app = substr($d, $pos + 3, 11);
					$keep = $app === 'NETSCAPE2.0' || $app === 'ANIMEXTS1.0';
				}
				if ($keep)
				{
					$out .= substr($d, $pos, $end - $pos);
				}
				$pos = $end;
				continue;
			}
			if ($b === 0x2C)
			{
				if ($pos + 11 > $len)
				{
					return false;
				}
				$ip = ord($d[$pos + 9]);
				$p = $pos + 10 + (($ip & 0x80) ? 3 * (2 << ($ip & 7)) : 0) + 1;
				$end = $p <= $len ? $blocks($p) : false;
				if ($end === false)
				{
					return false;
				}
				$out .= substr($d, $pos, $end - $pos);
				$pos = $end;
				continue;
			}

			return false;
		}

		// manca la chiusura del file: la si aggiunge (molti programmi la omettono)
		return $out . "\x3B";
	}

	/** PNG / APNG: solo i blocchi d'immagine, colore e animazione; via testi, EXIF, data e blocchi sconosciuti */
	protected static function strip_png($d)
	{
		$keep = ['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS', 'gAMA', 'cHRM', 'sRGB', 'iCCP', 'sBIT', 'bKGD', 'pHYs', 'acTL', 'fcTL', 'fdAT'];
		$len = strlen($d);
		if ($len < 8 || substr($d, 0, 8) !== "\x89PNG\r\n\x1a\n")
		{
			return false;
		}
		$out = substr($d, 0, 8);
		$pos = 8;
		while ($pos + 12 <= $len)
		{
			$size = unpack('N', substr($d, $pos, 4))[1];
			$type = substr($d, $pos + 4, 4);
			if ($size > $len - $pos - 12 || !preg_match('/^[A-Za-z]{4}$/', $type))
			{
				return false;
			}
			if (in_array($type, $keep, true))
			{
				$out .= substr($d, $pos, 12 + $size);
			}
			$pos += 12 + $size;
			if ($type === 'IEND')
			{
				return $out;
			}
		}

		return false;
	}

	/** WebP: via i blocchi EXIF e XMP (e i relativi indicatori in VP8X), via i dati dopo il contenitore */
	protected static function strip_webp($d)
	{
		$len = strlen($d);
		if ($len < 20 || substr($d, 0, 4) !== 'RIFF' || substr($d, 8, 4) !== 'WEBP')
		{
			return false;
		}
		$riff_end = min($len, 8 + unpack('V', substr($d, 4, 4))[1]);
		$body = '';
		$pos = 12;
		while ($pos + 8 <= $riff_end)
		{
			$type = substr($d, $pos, 4);
			$size = unpack('V', substr($d, $pos + 4, 4))[1];
			$padded = $size + ($size & 1);
			if ($pos + 8 + $size > $riff_end)
			{
				return false;
			}
			$chunk = substr($d, $pos, 8 + $padded);
			if ($type === 'VP8X' && $size >= 1)
			{
				// indicatori: 0x08 = EXIF presente, 0x04 = XMP presente
				$chunk[8] = chr(ord($chunk[8]) & ~0x0C);
			}
			if ($type !== 'EXIF' && $type !== 'XMP ')
			{
				$body .= $chunk;
			}
			$pos += 8 + $padded;
		}

		return 'RIFF' . pack('V', 4 + strlen($body)) . 'WEBP' . $body;
	}

	/** JPEG (solo server senza GD): via EXIF/GPS, XMP, IPTC, commenti e dati dopo la fine */
	protected static function strip_jpeg($d)
	{
		$len = strlen($d);
		if ($len < 4 || substr($d, 0, 2) !== "\xFF\xD8")
		{
			return false;
		}
		$out = "\xFF\xD8";
		$pos = 2;
		while ($pos + 4 <= $len)
		{
			if ($d[$pos] !== "\xFF")
			{
				return false;
			}
			$marker = ord($d[$pos + 1]);
			if ($marker === 0xFF)
			{
				$pos++;
				continue;
			}
			$size = unpack('n', substr($d, $pos + 2, 2))[1];
			if ($size < 2 || $pos + 2 + $size > $len)
			{
				return false;
			}
			if ($marker === 0xDA)
			{
				// dati dell'immagine fino all'ultima chiusura (FF D9); ciò che segue viene scartato
				$eoi = strrpos($d, "\xFF\xD9", $pos);
				if ($eoi === false)
				{
					return false;
				}
				return $out . substr($d, $pos, $eoi + 2 - $pos);
			}
			// via: APP1 (EXIF/XMP), APP3-APP13 (IPTC...), APP15, commenti (FE)
			$drop = $marker === 0xE1 || ($marker >= 0xE3 && $marker <= 0xED) || $marker === 0xEF || $marker === 0xFE;
			if (!$drop)
			{
				$out .= substr($d, $pos, 2 + $size);
			}
			$pos += 2 + $size;
		}

		return false;
	}

	/**
	 * GIF, PNG (APNG) o WebP con più fotogrammi
	 *
	 * @param string $data
	 * @param string $ext
	 * @return bool
	 */
	public static function is_animated($data, $ext)
	{
		switch ($ext)
		{
			case 'gif':
				return preg_match_all('#\x00\x21\xF9\x04.{4}\x00(\x2C|\x21)#s', $data) > 1;
			case 'png':
				$idat = strpos($data, 'IDAT');
				$actl = strpos($data, 'acTL');
				return $actl !== false && ($idat === false || $actl < $idat);
			case 'webp':
				return strpos(substr($data, 0, 64), 'VP8X') !== false && strpos($data, 'ANMF') !== false;
		}

		return false;
	}

	/**
	 * GD può aprire e salvare questo tipo?
	 *
	 * @param string $ext
	 * @return bool
	 */
	public static function gd_can($ext)
	{
		$map = ['jpg' => ['imagecreatefromjpeg', 'imagejpeg'], 'png' => ['imagecreatefrompng', 'imagepng'], 'gif' => ['imagecreatefromgif', 'imagegif'], 'webp' => ['imagecreatefromwebp', 'imagewebp']];

		return isset($map[$ext]) && function_exists('imagecreatetruecolor') && function_exists($map[$ext][0]) && function_exists($map[$ext][1]);
	}

	/**
	 * Memoria che GD userà, rispetto a quella disponibile (prova ad alzare il limite se serve)
	 *
	 * @param int $pixels
	 * @throws image_exception
	 */
	protected function ensure_memory($pixels)
	{
		$need = (int) ($pixels * 5 * 1.7) + 8388608;
		$limit = self::ini_bytes(ini_get('memory_limit'));
		if (!$limit)
		{
			return;
		}
		$free = $limit - memory_get_usage(true);
		if ($free >= $need)
		{
			return;
		}
		$wanted = memory_get_usage(true) + $need + 16777216;
		if (@ini_set('memory_limit', (string) $wanted) !== false && self::ini_bytes(ini_get('memory_limit')) >= $wanted)
		{
			return;
		}
		$max_mp = max(1, floor(($free - 8388608) / (5 * 1.7) / 1000000));
		throw new image_exception('EP_IMG_ERR_MEMORY', [round($pixels / 1000000, 1), $max_mp], 413);
	}

	/**
	 * Apre un'immagine con GD
	 *
	 * @param string $path
	 * @param string $ext
	 * @return resource|\GdImage|false
	 */
	protected static function gd_open($path, $ext)
	{
		switch ($ext)
		{
			case 'jpg':
				return @imagecreatefromjpeg($path);
			case 'png':
				return @imagecreatefrompng($path);
			case 'gif':
				return @imagecreatefromgif($path);
			case 'webp':
				return @imagecreatefromwebp($path);
		}

		return false;
	}

	/**
	 * Salva un'immagine GD
	 *
	 * @param resource|\GdImage $img
	 * @param string $path
	 * @param string $ext
	 * @param int    $quality 1-100
	 * @return bool
	 */
	protected static function gd_save($img, $path, $ext, $quality)
	{
		switch ($ext)
		{
			case 'jpg':
				imageinterlace($img, true);
				return @imagejpeg($img, $path, $quality);
			case 'png':
				imagesavealpha($img, true);
				return @imagepng($img, $path, 6);
			case 'gif':
				return @imagegif($img, $path);
			case 'webp':
				imagesavealpha($img, true);
				return @imagewebp($img, $path, $quality);
		}

		return false;
	}

	/**
	 * Ridimensiona mantenendo la trasparenza
	 *
	 * @param resource|\GdImage $src
	 * @param int $w
	 * @param int $h
	 * @param int $nw
	 * @param int $nh
	 * @param string $ext
	 * @return resource|\GdImage
	 */
	protected static function gd_resize($src, $w, $h, $nw, $nh, $ext)
	{
		$dst = imagecreatetruecolor($nw, $nh);
		if ($ext === 'jpg')
		{
			imagefill($dst, 0, 0, imagecolorallocate($dst, 255, 255, 255));
		}
		else
		{
			imagealphablending($dst, false);
			imagesavealpha($dst, true);
			imagefill($dst, 0, 0, imagecolorallocatealpha($dst, 0, 0, 0, 127));
		}
		imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);

		return $dst;
	}

	/**
	 * Riapre e salva di nuovo l'immagine: raddrizza le foto dei telefoni, la rimpicciolisce se supera le
	 * misure massime e toglie i dati nascosti. Restituisce le misure finali.
	 *
	 * @param string $src_path
	 * @param string $dst_path
	 * @param string $ext
	 * @param int    $w
	 * @param int    $h
	 * @return int[] [larghezza, altezza]
	 * @throws image_exception
	 */
	protected function reencode($src_path, $dst_path, $ext, $w, $h)
	{
		$max_w = max(0, (int) $this->config['editorplus_img_max_w']);
		$max_h = max(0, (int) $this->config['editorplus_img_max_h']);
		$scale = 1;
		if ($max_w && $w > $max_w)
		{
			$scale = min($scale, $max_w / $w);
		}
		if ($max_h && $h > $max_h)
		{
			$scale = min($scale, $max_h / $h);
		}
		$this->ensure_memory($w * $h + (int) ($w * $h * $scale * $scale));

		$img = self::gd_open($src_path, $ext);
		if (!$img)
		{
			throw new image_exception('EP_IMG_ERR_NOT_IMAGE');
		}

		// Foto scattate col telefono: l'orientamento è scritto nei dati EXIF, che vengono tolti
		if ($ext === 'jpg' && function_exists('exif_read_data'))
		{
			$exif = @exif_read_data($src_path);
			$orientation = isset($exif['Orientation']) ? (int) $exif['Orientation'] : 1;
			if ($orientation > 1 && $orientation <= 8)
			{
				if (in_array($orientation, [2, 4, 5, 7], true) && function_exists('imageflip'))
				{
					imageflip($img, $orientation === 4 ? IMG_FLIP_VERTICAL : IMG_FLIP_HORIZONTAL);
				}
				// GD ruota in senso antiorario. 5 = specchiata + 90° antiorario (trasposta), 7 = specchiata + 270° (trasversa)
				$angle = [3 => 180, 4 => 0, 5 => 90, 6 => 270, 7 => 270, 8 => 90][$orientation] ?? 0;
				if ($angle)
				{
					$rotated = imagerotate($img, $angle, 0);
					if ($rotated)
					{
						imagedestroy($img);
						$img = $rotated;
					}
				}
				$w = imagesx($img);
				$h = imagesy($img);
				// le misure massime valgono sull'immagine raddrizzata
				$scale = 1;
				if ($max_w && $w > $max_w)
				{
					$scale = min($scale, $max_w / $w);
				}
				if ($max_h && $h > $max_h)
				{
					$scale = min($scale, $max_h / $h);
				}
			}
		}

		if ($ext !== 'jpg' && $ext !== 'gif')
		{
			imagealphablending($img, false);
			imagesavealpha($img, true);
		}

		if ($scale < 1)
		{
			$nw = max(1, (int) round($w * $scale));
			$nh = max(1, (int) round($h * $scale));
			$resized = self::gd_resize($img, $w, $h, $nw, $nh, $ext);
			imagedestroy($img);
			$img = $resized;
			$w = $nw;
			$h = $nh;
		}

		$quality = min(100, max(40, (int) $this->config['editorplus_img_quality']));
		$ok = self::gd_save($img, $dst_path, $ext, $quality);
		imagedestroy($img);

		if (!$ok || !is_file($dst_path) || !filesize($dst_path))
		{
			throw new image_exception('EP_IMG_ERR_WRITE', [], 500);
		}

		return [$w, $h];
	}

	/**
	 * Miniatura (per l'ACP, il Pannello utente, il pannello nell'editor e l'inserimento come miniatura).
	 * Solo se l'immagine è più grande della miniatura; per le animate si usa il primo fotogramma.
	 *
	 * @param string $dir
	 * @param string $file
	 * @param string $ext
	 * @param int    $w
	 * @param int    $h
	 * @return bool
	 */
	protected function make_thumb($dir, $file, $ext, $w, $h)
	{
		$size = max(64, (int) $this->config['editorplus_img_thumb']);
		if (($w <= $size && $h <= $size) || !self::gd_can($ext))
		{
			return false;
		}

		try
		{
			$scale = min($size / $w, $size / $h);
			$nw = max(1, (int) round($w * $scale));
			$nh = max(1, (int) round($h * $scale));
			$this->ensure_memory($w * $h + $nw * $nh);

			$src = self::gd_open($dir . $file, $ext);
			if (!$src)
			{
				return false;
			}
			$thumb = self::gd_resize($src, $w, $h, $nw, $nh, $ext);
			imagedestroy($src);

			if (!is_dir($dir . self::THUMBS))
			{
				@mkdir($dir . self::THUMBS, 0755);
			}
			$ok = self::gd_save($thumb, $dir . self::THUMBS . '/' . $file, $ext, 82);
			imagedestroy($thumb);
			@chmod($dir . self::THUMBS . '/' . $file, 0644);

			return $ok && is_file($dir . self::THUMBS . '/' . $file);
		}
		catch (\Exception $e)
		{
			// senza miniatura si usa l'immagine intera: non è un motivo per rifiutare il caricamento
			return false;
		}
	}

	/* ================================================================== */
	/* Lettura                                                             */
	/* ================================================================== */

	/**
	 * @param int $image_id
	 * @return array|null
	 */
	public function get($image_id)
	{
		$result = $this->db->sql_query('SELECT * FROM ' . $this->table . ' WHERE image_id = ' . (int) $image_id);
		$row = $this->db->sql_fetchrow($result);
		$this->db->sql_freeresult($result);

		return $row ?: null;
	}

	/**
	 * Immagini di un utente, dalla più recente
	 *
	 * @param int    $user_id
	 * @param int    $start
	 * @param int    $limit
	 * @param string $sort new|old|big|name
	 * @return array
	 */
	public function list_images($user_id, $start = 0, $limit = 60, $sort = 'new')
	{
		$orders = [
			'new'	=> 'image_time DESC, image_id DESC',
			'old'	=> 'image_time ASC, image_id ASC',
			'big'	=> 'image_size DESC, image_id DESC',
			'name'	=> 'image_name ASC, image_id ASC',
		];
		$sql = 'SELECT *
			FROM ' . $this->table . '
			WHERE user_id = ' . (int) $user_id . '
			ORDER BY ' . (isset($orders[$sort]) ? $orders[$sort] : $orders['new']);
		$result = $this->db->sql_query_limit($sql, max(1, (int) $limit), max(0, (int) $start));
		$rows = $this->db->sql_fetchrowset($result);
		$this->db->sql_freeresult($result);

		return $rows;
	}

	/**
	 * Utenti con una cartella, con numero di immagini e spazio occupato
	 *
	 * @param string $search Parte del nome utente o della cartella
	 * @param string $sort   name|images|bytes|last
	 * @param int    $start
	 * @param int    $limit
	 * @return array ['rows' => [...], 'total' => n]
	 */
	public function users_overview($search = '', $sort = 'last', $start = 0, $limit = 25)
	{
		$where = '';
		$search = trim((string) $search);
		if ($search !== '')
		{
			$like = $this->db->sql_like_expression($this->db->get_any_char() . utf8_clean_string($search) . $this->db->get_any_char());
			$like_folder = $this->db->sql_like_expression($this->db->get_any_char() . self::clean_name($search, 60, '_') . $this->db->get_any_char());
			$where = ' WHERE (u.username_clean ' . $like . ' OR f.folder_name ' . $like_folder . ')';
		}

		$result = $this->db->sql_query('SELECT COUNT(f.user_id) AS total
			FROM ' . $this->folders_table . ' f
			LEFT JOIN ' . USERS_TABLE . ' u ON (u.user_id = f.user_id)' . $where);
		$total = (int) $this->db->sql_fetchfield('total');
		$this->db->sql_freeresult($result);

		$orders = [
			'name'		=> 'f.folder_name ASC',
			'images'	=> 'images DESC, f.folder_name ASC',
			'bytes'		=> 'bytes DESC, f.folder_name ASC',
			'last'		=> 'last_time DESC, f.folder_name ASC',
		];
		$sql = 'SELECT f.user_id, f.folder_name, f.folder_username, f.folder_time, u.username, u.user_colour,
				COUNT(i.image_id) AS images, SUM(i.image_size) AS bytes, MAX(i.image_time) AS last_time
			FROM ' . $this->folders_table . ' f
			LEFT JOIN ' . USERS_TABLE . ' u ON (u.user_id = f.user_id)
			LEFT JOIN ' . $this->table . ' i ON (i.user_id = f.user_id)' . $where . '
			GROUP BY f.user_id, f.folder_name, f.folder_username, f.folder_time, u.username, u.user_colour
			ORDER BY ' . (isset($orders[$sort]) ? $orders[$sort] : $orders['last']);
		$result = $this->db->sql_query_limit($sql, max(1, (int) $limit), max(0, (int) $start));
		$rows = $this->db->sql_fetchrowset($result);
		$this->db->sql_freeresult($result);

		return ['rows' => $rows, 'total' => $total];
	}

	/**
	 * Totali di tutto il forum
	 *
	 * @return array ['users' => n, 'images' => n, 'bytes' => byte]
	 */
	public function totals()
	{
		$result = $this->db->sql_query('SELECT COUNT(image_id) AS images, SUM(image_size) AS bytes FROM ' . $this->table);
		$row = $this->db->sql_fetchrow($result);
		$this->db->sql_freeresult($result);
		$result = $this->db->sql_query('SELECT COUNT(user_id) AS users FROM ' . $this->folders_table);
		$users = (int) $this->db->sql_fetchfield('users');
		$this->db->sql_freeresult($result);

		return ['users' => $users, 'images' => (int) $row['images'], 'bytes' => (int) $row['bytes']];
	}

	/**
	 * Dove è usata un'immagine: messaggi, messaggi privati e firme che contengono il suo indirizzo
	 *
	 * @param array $row
	 * @param int   $limit
	 * @return array ['posts' => [[post_id, topic_id, forum_id, subject]], 'pms' => n, 'sigs' => [[user_id, username]]]
	 */
	public function find_usage(array $row, $limit = 30)
	{
		// "cartella/file" compare sia nel link diretto sia in quello che passa dall'estensione
		$needle = $this->db->sql_like_expression($this->db->get_any_char() . $row['image_folder'] . '/' . $row['image_file'] . $this->db->get_any_char());

		$posts = [];
		$result = $this->db->sql_query_limit('SELECT post_id, topic_id, forum_id, post_subject
			FROM ' . POSTS_TABLE . '
			WHERE post_text ' . $needle . '
			ORDER BY post_id DESC', (int) $limit);
		while ($p = $this->db->sql_fetchrow($result))
		{
			$posts[] = ['post_id' => (int) $p['post_id'], 'topic_id' => (int) $p['topic_id'], 'forum_id' => (int) $p['forum_id'], 'subject' => (string) $p['post_subject']];
		}
		$this->db->sql_freeresult($result);

		$result = $this->db->sql_query('SELECT COUNT(msg_id) AS total FROM ' . PRIVMSGS_TABLE . ' WHERE message_text ' . $needle);
		$pms = (int) $this->db->sql_fetchfield('total');
		$this->db->sql_freeresult($result);

		$sigs = [];
		$result = $this->db->sql_query_limit('SELECT user_id, username FROM ' . USERS_TABLE . ' WHERE user_sig ' . $needle, (int) $limit);
		while ($s = $this->db->sql_fetchrow($result))
		{
			$sigs[] = ['user_id' => (int) $s['user_id'], 'username' => (string) $s['username']];
		}
		$this->db->sql_freeresult($result);

		return ['posts' => $posts, 'pms' => $pms, 'sigs' => $sigs];
	}

	/* ================================================================== */
	/* Cancellazione                                                       */
	/* ================================================================== */

	/**
	 * Elimina immagini (file, miniatura e riga)
	 *
	 * @param int[] $ids
	 * @param int   $owner_id Se diverso da 0, solo immagini di questo utente
	 * @return array Righe eliminate
	 */
	public function delete_images(array $ids, $owner_id = 0)
	{
		$ids = array_values(array_unique(array_filter(array_map('intval', $ids))));
		if (!$ids)
		{
			return [];
		}

		$sql = 'SELECT *
			FROM ' . $this->table . '
			WHERE ' . $this->db->sql_in_set('image_id', $ids) . ($owner_id ? ' AND user_id = ' . (int) $owner_id : '');
		$result = $this->db->sql_query($sql);
		$rows = $this->db->sql_fetchrowset($result);
		$this->db->sql_freeresult($result);

		return $this->remove_rows($rows);
	}

	/**
	 * Elimina tutte le immagini di un utente (la cartella resta)
	 *
	 * @param int $user_id
	 * @return array Righe eliminate
	 */
	public function delete_all($user_id)
	{
		$result = $this->db->sql_query('SELECT * FROM ' . $this->table . ' WHERE user_id = ' . (int) $user_id);
		$rows = $this->db->sql_fetchrowset($result);
		$this->db->sql_freeresult($result);

		return $this->remove_rows($rows);
	}

	/**
	 * Elimina la cartella completa di un utente, con tutto quello che contiene
	 *
	 * @param int $user_id
	 * @return array ['folder' => nome, 'images' => n] o [] se l'utente non ha una cartella
	 */
	public function delete_folder($user_id)
	{
		$folder = $this->folder_of($user_id);
		$deleted = $this->delete_all($user_id);
		if (!$folder)
		{
			return $deleted ? ['folder' => '', 'images' => count($deleted)] : [];
		}

		$this->remove_dir($folder['folder_name']);
		$this->db->sql_query('DELETE FROM ' . $this->folders_table . ' WHERE user_id = ' . (int) $user_id);

		return ['folder' => $folder['folder_name'], 'images' => count($deleted)];
	}

	/**
	 * Utenti cancellati dal forum: via anche le loro cartelle
	 *
	 * @param int[] $user_ids
	 * @return array [nome cartella => numero di immagini]
	 */
	public function delete_users(array $user_ids)
	{
		$done = [];
		foreach (array_unique(array_map('intval', $user_ids)) as $user_id)
		{
			$res = $this->delete_folder($user_id);
			if ($res)
			{
				$done[$res['folder'] !== '' ? $res['folder'] : '#' . $user_id] = $res['images'];
			}
		}

		return $done;
	}

	/**
	 * @param array $rows
	 * @return array
	 */
	protected function remove_rows(array $rows)
	{
		if (!$rows)
		{
			return [];
		}
		foreach ($rows as $row)
		{
			if (!preg_match(self::FOLDER_REGEX, $row['image_folder']) || !preg_match(self::FILE_REGEX, $row['image_file']))
			{
				continue;
			}
			$dir = $this->base_dir() . $row['image_folder'] . '/';
			@unlink($dir . $row['image_file']);
			@unlink($dir . self::THUMBS . '/' . $row['image_file']);
		}
		$this->db->sql_query('DELETE FROM ' . $this->table . ' WHERE ' . $this->db->sql_in_set('image_id', array_map('intval', array_column($rows, 'image_id'))));

		return $rows;
	}

	/**
	 * Cancella dal disco una cartella di Editor Plus (solo se ha il segnaposto)
	 *
	 * @param string $name
	 * @return bool
	 */
	public function remove_dir($name)
	{
		if (!$this->is_own_folder($name))
		{
			return false;
		}
		$dir = $this->base_dir() . $name;
		$real = realpath($dir);
		$base = realpath($this->base_dir());
		if ($real === false || $base === false || strpos($real, $base . DIRECTORY_SEPARATOR) !== 0)
		{
			return false;
		}

		foreach ([$real . '/' . self::THUMBS, $real] as $path)
		{
			if (!is_dir($path))
			{
				continue;
			}
			foreach ((array) scandir($path) as $item)
			{
				if ($item === '.' || $item === '..' || is_dir($path . '/' . $item))
				{
					continue;
				}
				@unlink($path . '/' . $item);
			}
		}
		@rmdir($real . '/' . self::THUMBS);

		return @rmdir($real);
	}

	/* ================================================================== */
	/* Controlli e riallineamento (Check-up)                               */
	/* ================================================================== */

	/**
	 * Confronta l'archivio con le cartelle sul disco
	 *
	 * @return array [
	 *   'folders' => n, 'missing_dirs' => [nomi], 'untracked' => [cartella => [file]], 'missing_files' => [image_id],
	 *   'orphan_dirs' => [nomi di cartelle di utenti che non esistono più], 'unregistered_dirs' => [nomi]
	 * ]
	 */
	public function scan()
	{
		$report = ['folders' => 0, 'missing_dirs' => [], 'untracked' => [], 'missing_files' => [], 'orphan_dirs' => [], 'unregistered_dirs' => []];

		$folders = [];
		$result = $this->db->sql_query('SELECT f.user_id, f.folder_name, u.user_id AS existing
			FROM ' . $this->folders_table . ' f
			LEFT JOIN ' . USERS_TABLE . ' u ON (u.user_id = f.user_id)');
		while ($row = $this->db->sql_fetchrow($result))
		{
			$folders[$row['folder_name']] = $row;
		}
		$this->db->sql_freeresult($result);
		$report['folders'] = count($folders);

		$known = [];
		$result = $this->db->sql_query('SELECT image_id, image_folder, image_file FROM ' . $this->table);
		while ($row = $this->db->sql_fetchrow($result))
		{
			$known[$row['image_folder']][$row['image_file']] = (int) $row['image_id'];
		}
		$this->db->sql_freeresult($result);

		foreach ($folders as $name => $row)
		{
			if (!is_dir($this->base_dir() . $name))
			{
				$report['missing_dirs'][] = $name;
			}
			if (empty($row['existing']))
			{
				$report['orphan_dirs'][] = $name;
			}
		}

		// cartelle di Editor Plus sul disco
		foreach ((array) @scandir($this->base_dir()) as $name)
		{
			if ($name === self::PROBE || !preg_match(self::FOLDER_REGEX, (string) $name) || !$this->is_own_folder($name))
			{
				continue;
			}
			if (!isset($folders[$name]))
			{
				$report['unregistered_dirs'][] = $name;
			}
			foreach ((array) @scandir($this->base_dir() . $name) as $file)
			{
				if (preg_match(self::FILE_REGEX, (string) $file) && !isset($known[$name][$file]))
				{
					$report['untracked'][$name][] = $file;
				}
			}
		}

		foreach ($known as $folder => $files)
		{
			foreach ($files as $file => $image_id)
			{
				if (!is_file($this->base_dir() . $folder . '/' . $file))
				{
					$report['missing_files'][] = $image_id;
				}
			}
		}

		return $report;
	}

	/**
	 * Rimette in ordine archivio e cartelle:
	 * - cartelle di utenti cancellati: eliminate (come per un utente cancellato adesso);
	 * - cartelle senza scheda (es. dopo "Cancella dati" e reinstallazione): di nuovo registrate, se l'utente esiste;
	 * - immagini sul disco senza scheda: registrate (senza IP, con la data del file);
	 * - schede di immagini il cui file non c'è più: tolte.
	 *
	 * @return array ['removed_dirs' => n, 'folders' => n, 'images' => n, 'dropped' => n]
	 */
	public function repair()
	{
		$this->refresh_folders();
		$report = $this->scan();
		$done = ['removed_dirs' => 0, 'folders' => 0, 'images' => 0, 'dropped' => 0];

		foreach ($report['orphan_dirs'] as $name)
		{
			$result = $this->db->sql_query('SELECT user_id FROM ' . $this->folders_table . " WHERE folder_name = '" . $this->db->sql_escape($name) . "'");
			$row = $this->db->sql_fetchrow($result);
			$this->db->sql_freeresult($result);
			if ($row)
			{
				$this->delete_folder((int) $row['user_id']);
				$done['removed_dirs']++;
			}
		}

		foreach ($report['unregistered_dirs'] as $name)
		{
			$user_id = $this->marker_user($name);
			$user = $user_id ? $this->user_row($user_id) : null;
			if (!$user)
			{
				// utente che non esiste più: la cartella segue la sua sorte
				$this->remove_dir($name);
				$done['removed_dirs']++;
				unset($report['untracked'][$name]);
				continue;
			}
			if ($this->folder_of($user_id))
			{
				continue; // l'utente ha già un'altra cartella registrata: questa resta solo sul disco
			}
			$this->db->sql_query('INSERT INTO ' . $this->folders_table . ' ' . $this->db->sql_build_array('INSERT', [
				'user_id'			=> $user_id,
				'folder_name'		=> $name,
				'folder_username'	=> (string) $user['username'],
				'folder_time'		=> (int) @filemtime($this->base_dir() . $name . '/' . self::MARKER),
			]));
			$done['folders']++;
		}

		foreach ($report['untracked'] as $name => $files)
		{
			$user_id = $this->marker_user($name);
			$folder = $user_id ? $this->folder_of($user_id) : null;
			if (!$folder || $folder['folder_name'] !== $name)
			{
				continue;
			}
			foreach ($files as $file)
			{
				$path = $this->base_dir() . $name . '/' . $file;
				$info = @getimagesize($path);
				if (!$info || !isset(self::TYPES[$info[2]]))
				{
					continue;
				}
				$ext = self::TYPES[$info[2]];
				$this->db->sql_query('INSERT INTO ' . $this->table . ' ' . $this->db->sql_build_array('INSERT', [
					'user_id'		=> $user_id,
					'image_folder'	=> $name,
					'image_file'	=> $file,
					'image_name'	=> $file,
					'image_mime'	=> self::MIMES[$ext],
					'image_size'	=> (int) filesize($path),
					'image_width'	=> (int) $info[0],
					'image_height'	=> (int) $info[1],
					'image_thumb'	=> is_file($this->base_dir() . $name . '/' . self::THUMBS . '/' . $file) ? 1 : 0,
					'image_time'	=> (int) filemtime($path),
					'image_ip'		=> '',
				]));
				$done['images']++;
			}
		}

		if ($report['missing_files'])
		{
			$this->db->sql_query('DELETE FROM ' . $this->table . ' WHERE ' . $this->db->sql_in_set('image_id', $report['missing_files']));
			$done['dropped'] = count($report['missing_files']);
		}

		return $done;
	}

	/**
	 * ID utente scritto nel segnaposto della cartella
	 *
	 * @param string $name
	 * @return int
	 */
	protected function marker_user($name)
	{
		$text = (string) @file_get_contents($this->base_dir() . $name . '/' . self::MARKER);
		if (preg_match('/^Editor Plus (\d+)/', $text, $m))
		{
			return (int) $m[1];
		}
		// segnaposto illeggibile: l'ID è comunque in fondo al nome della cartella
		return preg_match('/_(\d+)$/', $name, $m) ? (int) $m[1] : 0;
	}

	/**
	 * @param int $user_id
	 * @return array|null
	 */
	public function user_row($user_id)
	{
		$result = $this->db->sql_query('SELECT user_id, username, user_type, user_colour FROM ' . USERS_TABLE . ' WHERE user_id = ' . (int) $user_id);
		$row = $this->db->sql_fetchrow($result);
		$this->db->sql_freeresult($result);

		return $row ?: null;
	}

	/**
	 * Cartelle di Editor Plus sul disco e quante hanno il .htaccess attuale
	 *
	 * @return array ['total' => n, 'bad' => [nomi]]
	 */
	public function htaccess_status()
	{
		$status = ['total' => 0, 'bad' => []];
		$expected = self::htaccess();
		foreach ((array) @scandir($this->base_dir()) as $name)
		{
			if ($name === self::PROBE || !preg_match(self::FOLDER_REGEX, (string) $name) || !$this->is_own_folder($name))
			{
				continue;
			}
			$status['total']++;
			if (@file_get_contents($this->base_dir() . $name . '/.htaccess') !== $expected)
			{
				$status['bad'][] = $name;
			}
		}

		return $status;
	}

	/**
	 * Riscrive .htaccess, pagina vuota e segnaposto in tutte le cartelle
	 *
	 * @return int cartelle sistemate
	 */
	public function refresh_folders()
	{
		$n = 0;
		foreach ((array) @scandir($this->base_dir()) as $name)
		{
			if ($name === self::PROBE || !preg_match(self::FOLDER_REGEX, (string) $name) || !$this->is_own_folder($name))
			{
				continue;
			}
			$this->write_folder_files($this->base_dir() . $name . '/', $this->marker_user($name));
			$n++;
		}

		return $n;
	}

	/**
	 * Prova vera di elaborazione: un'immagine 2400×1600 creata qui viene salvata, rimpicciolita e ridotta
	 * in miniatura come se l'avesse caricata un utente, poi tutto viene cancellato.
	 *
	 * @return array ['ok' => bool, 'detail' => string, 'size' => 'LxA', 'thumb' => 'LxA']
	 */
	public function self_test()
	{
		if (!self::gd_can('jpg'))
		{
			return ['ok' => false, 'detail' => 'GD JPEG'];
		}
		$dir = $this->base_dir() . self::PROBE . '/';
		if (!is_dir($dir) && !@mkdir($dir, 0755))
		{
			return ['ok' => false, 'detail' => 'mkdir ' . self::PROBE];
		}
		$this->write_folder_files($dir, 0);

		$src = $dir . 'selftest-src.jpg';
		$img = imagecreatetruecolor(2400, 1600);
		for ($x = 0; $x < 2400; $x += 200)
		{
			imagefilledrectangle($img, $x, 0, $x + 199, 1599, imagecolorallocate($img, ($x / 10) % 255, 120, 200));
		}
		imagejpeg($img, $src, 90);
		imagedestroy($img);

		try
		{
			$out = 'selftest-out.jpg';
			list($w, $h) = $this->reencode($src, $dir . $out, 'jpg', 2400, 1600);
			$thumb = $this->make_thumb($dir, $out, 'jpg', $w, $h);
			$tinfo = $thumb ? @getimagesize($dir . self::THUMBS . '/' . $out) : false;
			$result = [
				'ok'		=> is_file($dir . $out) && (!(int) $this->config['editorplus_img_max_w'] || $w <= (int) $this->config['editorplus_img_max_w']),
				'detail'	=> '',
				'size'		=> $w . '×' . $h,
				'thumb'		=> $tinfo ? $tinfo[0] . '×' . $tinfo[1] : '-',
			];
		}
		catch (image_exception $e)
		{
			$result = ['ok' => false, 'detail' => $e->get_lang_key()];
		}
		catch (\Throwable $e)
		{
			$result = ['ok' => false, 'detail' => $e->getMessage()];
		}

		@unlink($src);
		@unlink($dir . 'selftest-out.jpg');
		@unlink($dir . self::THUMBS . '/selftest-out.jpg');
		@rmdir($dir . self::THUMBS);

		return $result;
	}

	/**
	 * Prepara una cartella di prova con un'immagine vera, per controllare dal browser che il server la mostri
	 * (e che non esegua un file PHP messo lì apposta). Restituisce gli indirizzi da provare.
	 *
	 * @return array ['image' => url, 'php' => url, 'folder' => nome] o [] se non si riesce a scrivere
	 */
	public function prepare_probe()
	{
		$name = self::PROBE;
		$dir = $this->base_dir() . $name . '/';
		if (!is_dir($dir) && !@mkdir($dir, 0755))
		{
			return [];
		}
		$this->write_folder_files($dir, 0);
		// PNG 1x1 trasparente
		@file_put_contents($dir . 'prova.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='));
		@file_put_contents($dir . 'prova.php', "<?php echo 'EP-PHP-' . (40 + 2);\n");

		$base = generate_board_url() . '/' . trim((string) $this->config['upload_path'], '/') . '/' . $name . '/';

		return ['image' => $base . 'prova.png', 'php' => $base . 'prova.php', 'folder' => $name];
	}

	/**
	 * Toglie la cartella di prova
	 */
	public function remove_probe()
	{
		$this->remove_dir(self::PROBE);
	}
}
