<?php
/**
 *
 * Editor Plus
 * Aggiornamento di KaTeX dall'ACP, in tre passi sorvegliati:
 *   1. prepare(): scarica dal registro ufficiale (registry.npmjs.org), verifica l'impronta sha512,
 *      estrae SOLO i file necessari in un'area di prova (non tocca la versione in uso);
 *   2. il browser dell'amministratore prova la versione preparata (formule e chimica);
 *   3. activate(): copia di sicurezza della versione in uso (in store/) e attivazione; restore() la rimette.
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\core;

class katex_updater
{
	const REGISTRY = 'https://registry.npmjs.org/katex';
	const TARBALL_PREFIX = 'https://registry.npmjs.org/katex/-/katex-';
	const MAX_TARBALL = 12582912;	// 12 MB
	const MAX_FILE = 4194304;		// 4 MB per singolo file

	/** @var \phpbb\config\config */
	protected $config;

	/** @var string */
	protected $root_path;

	/** @var string ultimo errore (chiave di lingua) */
	protected $error = '';

	/** @var string dettaglio dell'errore */
	protected $detail = '';

	public function __construct($config, $root_path)
	{
		$this->config = $config;
		$this->root_path = $root_path;
	}

	/** @var float ultima scrittura dell'avanzamento (per non scrivere a ogni byte) */
	protected $progress_at = 0.0;

	/** @var array ultima fase di lavoro (per dire DOVE ci si è fermati o conclusi) */
	protected $last_phase = ['phase' => 'check', 'done' => 0, 'total' => 0];

	/** @var bool avanzamento attivo (durante prepare, activate, restore) */
	protected $tracking = false;

	/** @var string identificativo dell'operazione (la pagina ignora lo stato di operazioni precedenti) */
	protected $op = '';

	public function set_operation($op)
	{
		$this->op = preg_match('/^[a-z0-9]{6,32}$/', (string) $op) ? $op : '';
	}

	public function get_error()
	{
		return $this->error;
	}

	/* ---------------- avanzamento (letto dalla pagina mentre il server lavora) ---------------- */

	public function progress_file()
	{
		return $this->root_path . 'store/editorplus_katex_progress.json';
	}

	/**
	 * Annota lo stato reale di una fase: quanto è fatto sul totale (byte per lo scaricamento, file per il resto)
	 *
	 * @param string $phase check|download|verify|extract|stage|backup|install|done|error
	 */
	public function progress($phase, $done = 0, $total = 0, $force = true)
	{
		if ($phase !== 'error' && $phase !== 'done')
		{
			$this->last_phase = ['phase' => $phase, 'done' => (int) $done, 'total' => (int) $total];
		}
		$now = microtime(true);
		if (!$force && $now - $this->progress_at < 0.12)
		{
			return;
		}
		$this->progress_at = $now;
		$data = [
			'phase'	=> $phase,
			'done'	=> (int) $done,
			'total'	=> (int) $total,
			'pct'	=> $total > 0 ? min(100, (int) floor($done * 100 / $total)) : ($phase === 'done' ? 100 : 0),
			'error'	=> $phase === 'error' ? $this->error : '',
			'time'	=> time(),
			'op'	=> $this->op,
			// fase in cui ci si è fermati (errore) o conclusi, con il punto raggiunto
			'at'		=> $this->last_phase['phase'],
			'at_done'	=> $this->last_phase['done'],
			'at_total'	=> $this->last_phase['total'],
		];
		// scrittura atomica: la pagina non legge mai un file a metà
		$tmp = $this->progress_file() . '.' . getmypid();
		if (@file_put_contents($tmp, json_encode($data)) !== false)
		{
			@rename($tmp, $this->progress_file());
		}
	}

	/**
	 * @return array stato dell'avanzamento, o fase 'idle' se non c'è nulla in corso
	 */
	public function read_progress()
	{
		$data = @json_decode((string) @file_get_contents($this->progress_file()), true);

		return is_array($data) ? $data : ['phase' => 'idle', 'done' => 0, 'total' => 0, 'pct' => 0, 'error' => ''];
	}

	public function get_detail()
	{
		return $this->detail;
	}

	protected function fail($key, $detail = '')
	{
		$this->error = $key;
		$this->detail = (string) $detail;
		if ($this->tracking)
		{
			$this->progress('error', 0, 0);
		}

		return false;
	}

	/* ---------------- percorsi ---------------- */

	protected function ext()
	{
		return $this->root_path . 'ext/salvocortesiano/editorplus/styles/all/';
	}

	/** Versione in uso: file => percorso */
	public function active_paths()
	{
		return [
			'js'		=> $this->ext() . 'template/js/math/katex.min.js',
			'mhchem'	=> $this->ext() . 'template/js/math/mhchem.min.js',
			'license'	=> $this->ext() . 'template/js/math/LICENSE-KaTeX.txt',
			'css'		=> $this->ext() . 'theme/math/katex.min.css',
			'fonts'		=> $this->ext() . 'theme/math/fonts/',
		];
	}

	/** Area di prova (raggiungibile dal browser, per provarla prima di attivarla) */
	public function staging_dir()
	{
		return $this->ext() . 'theme/math-staging/';
	}

	public function staging_url($root_url)
	{
		return $root_url . 'ext/salvocortesiano/editorplus/styles/all/theme/math-staging/';
	}

	/** Copia di sicurezza (fuori dalla cartella dell'estensione: resta anche se la si ricarica) */
	public function backup_dir()
	{
		return $this->root_path . 'store/editorplus_katex_backup/';
	}

	/* ---------------- stato ---------------- */

	/**
	 * Versione di un katex.min.js (dalla stringa version:"x.y.z" presente nel file)
	 */
	public static function version_of($file)
	{
		if (!is_readable($file))
		{
			return '';
		}
		$head = (string) @file_get_contents($file);

		return preg_match('/version:"(\d+\.\d+\.\d+)"/', $head, $m) ? $m[1] : '';
	}

	public function installed_version()
	{
		return self::version_of($this->active_paths()['js']);
	}

	public function staged_version()
	{
		return self::version_of($this->staging_dir() . 'katex.min.js');
	}

	public function backup_version()
	{
		return self::version_of($this->backup_dir() . 'katex.min.js');
	}

	/**
	 * Caratteri richiesti dal foglio di stile ma assenti: se ce ne sono, l'installazione è incompleta
	 *
	 * @return array nomi dei file mancanti
	 */
	public function missing_fonts($css_file = null, $fonts_dir = null)
	{
		$paths = $this->active_paths();
		$css = (string) @file_get_contents($css_file ?: $paths['css']);
		$dir = $fonts_dir ?: $paths['fonts'];
		preg_match_all('/url\(fonts\/([^)]+)\)/', $css, $m);
		$missing = [];
		foreach (array_unique($m[1]) as $font)
		{
			if (!is_file($dir . $font))
			{
				$missing[] = $font;
			}
		}

		return $missing;
	}

	/**
	 * Il server può scaricare e scrivere?
	 *
	 * @return array ['network' => bool, 'writable' => bool, 'gzip' => bool, 'not_writable' => array]
	 */
	public function capabilities()
	{
		$paths = $this->active_paths();
		$dirs = [dirname($paths['js']), dirname($paths['css']), $paths['fonts'], dirname($this->staging_dir()), $this->root_path . 'store/'];
		$bad = [];
		foreach ($dirs as $d)
		{
			if (!is_dir($d) || !is_writable($d))
			{
				$bad[] = str_replace($this->root_path, '', $d);
			}
		}

		return [
			'network'		=> function_exists('curl_init') || filter_var(ini_get('allow_url_fopen'), FILTER_VALIDATE_BOOLEAN),
			'gzip'			=> function_exists('gzdecode'),
			'writable'		=> !$bad,
			'not_writable'	=> $bad,
		];
	}

	/* ---------------- rete ---------------- */

	protected function http_get($url, $accept = '', $track = false)
	{
		$self = $this;
		if (function_exists('curl_init'))
		{
			$c = curl_init($url);
			if ($track)
			{
				curl_setopt($c, CURLOPT_NOPROGRESS, false);
				curl_setopt($c, CURLOPT_XFERINFOFUNCTION, function ($ch, $dl_total, $dl_now) use ($self) {
					$self->progress('download', $dl_now, $dl_total, false);
					// oltre il limite si interrompe subito
					return $dl_now > katex_updater::MAX_TARBALL ? 1 : 0;
				});
			}
			curl_setopt_array($c, [
				CURLOPT_RETURNTRANSFER	=> true,
				CURLOPT_FOLLOWLOCATION	=> false,
				CURLOPT_TIMEOUT			=> 30,
				CURLOPT_CONNECTTIMEOUT	=> 10,
				CURLOPT_SSL_VERIFYPEER	=> true,
				CURLOPT_USERAGENT		=> 'phpBB Editor Plus',
				CURLOPT_HTTPHEADER		=> $accept ? ['Accept: ' . $accept] : [],
			]);
			$body = curl_exec($c);
			$code = (int) curl_getinfo($c, CURLINFO_HTTP_CODE);
			$err = curl_error($c);
			curl_close($c);
			if ($body === false || $code !== 200)
			{
				return $this->fail('EDITORPLUS_KATEX_ERR_NETWORK', $err ?: 'HTTP ' . $code);
			}

			return $body;
		}

		$params = [];
		if ($track)
		{
			$total = 0;
			$params['notification'] = function ($code, $severity, $msg, $msg_code, $bytes, $max) use ($self, &$total) {
				if ($code === STREAM_NOTIFY_FILE_SIZE_IS)
				{
					$total = $max;
				}
				else if ($code === STREAM_NOTIFY_PROGRESS)
				{
					$self->progress('download', $bytes, $max ?: $total, false);
				}
			};
		}
		$ctx = stream_context_create(['http' => [
			'timeout'		=> 30,
			'header'		=> 'User-Agent: phpBB Editor Plus' . ($accept ? "\r\nAccept: " . $accept : ''),
			'follow_location' => 0,
		]], $params);
		$body = @file_get_contents($url, false, $ctx);
		if ($body === false)
		{
			return $this->fail('EDITORPLUS_KATEX_ERR_NETWORK', 'file_get_contents');
		}

		return $body;
	}

	/**
	 * Versioni disponibili: l'ultima della stessa serie (0.18.x → 0.18.y) e l'ultima in assoluto
	 *
	 * @return array|false ['installed', 'same' => [version, tarball, integrity]|null, 'latest' => [...]|null]
	 */
	public function check()
	{
		$json = $this->http_get(self::REGISTRY, 'application/vnd.npm.install-v1+json');
		if ($json === false)
		{
			return false;
		}
		$data = json_decode($json, true);
		if (!is_array($data) || empty($data['versions']) || empty($data['dist-tags']['latest']))
		{
			return $this->fail('EDITORPLUS_KATEX_ERR_REGISTRY');
		}

		$installed = $this->installed_version();
		$series = implode('.', array_slice(explode('.', $installed), 0, 2));
		$best_same = null;
		foreach (array_keys($data['versions']) as $v)
		{
			// solo versioni stabili (niente -beta, -rc)
			if (!preg_match('/^\d+\.\d+\.\d+$/', $v))
			{
				continue;
			}
			if (strpos($v, $series . '.') === 0 && ($best_same === null || version_compare($v, $best_same, '>')))
			{
				$best_same = $v;
			}
		}
		$latest = $data['dist-tags']['latest'];

		$pick = function ($v) use ($data, $installed) {
			if (!$v || !isset($data['versions'][$v]['dist']) || !version_compare($v, $installed, '>'))
			{
				return null;
			}
			$dist = $data['versions'][$v]['dist'];

			return [
				'version'	=> $v,
				'tarball'	=> isset($dist['tarball']) ? $dist['tarball'] : '',
				'integrity'	=> isset($dist['integrity']) ? $dist['integrity'] : '',
			];
		};

		$same = $pick($best_same);
		$other = $latest !== $best_same ? $pick($latest) : null;

		return [
			'installed'	=> $installed,
			'same'		=> $same,
			'latest'	=> $other,
		];
	}

	/* ---------------- preparazione ---------------- */

	/**
	 * Scarica la versione richiesta (solo se è davvero offerta dal registro) e la prepara nell'area di prova
	 */
	public function prepare($version)
	{
		$this->tracking = true;
		$this->progress('check', 0, 1);
		if (!preg_match('/^\d+\.\d+\.\d+$/', $version))
		{
			return $this->fail('EDITORPLUS_KATEX_ERR_VERSION');
		}
		$caps = $this->capabilities();
		if (!$caps['writable'])
		{
			return $this->fail('EDITORPLUS_KATEX_ERR_WRITE', implode(', ', $caps['not_writable']));
		}
		if (!$caps['gzip'])
		{
			return $this->fail('EDITORPLUS_KATEX_ERR_GZIP');
		}

		$offer = $this->check();
		if ($offer === false)
		{
			return false;
		}
		$chosen = null;
		foreach (['same', 'latest'] as $k)
		{
			if (!empty($offer[$k]) && $offer[$k]['version'] === $version)
			{
				$chosen = $offer[$k];
			}
		}
		if (!$chosen)
		{
			return $this->fail('EDITORPLUS_KATEX_ERR_VERSION');
		}
		// l'archivio deve venire proprio dal registro ufficiale, con il nome atteso
		if ($chosen['tarball'] !== self::TARBALL_PREFIX . $version . '.tgz')
		{
			return $this->fail('EDITORPLUS_KATEX_ERR_SOURCE', $chosen['tarball']);
		}
		if (!preg_match('/^sha512-([A-Za-z0-9+\/=]+)$/', $chosen['integrity'], $im))
		{
			return $this->fail('EDITORPLUS_KATEX_ERR_INTEGRITY');
		}

		$this->progress('download', 0, 0);
		$tgz = $this->http_get($chosen['tarball'], '', true);
		if ($tgz === false)
		{
			return false;
		}
		$this->progress('download', strlen($tgz), strlen($tgz));
		if (strlen($tgz) > self::MAX_TARBALL)
		{
			return $this->fail('EDITORPLUS_KATEX_ERR_SIZE');
		}
		// impronta digitale: un archivio alterato viene rifiutato
		$this->progress('verify', 0, 1);
		if (!hash_equals(base64_decode($im[1]), hash('sha512', $tgz, true)))
		{
			return $this->fail('EDITORPLUS_KATEX_ERR_INTEGRITY');
		}
		$this->progress('verify', 1, 1);

		$tar = @gzdecode($tgz, self::MAX_TARBALL * 4);
		if ($tar === false)
		{
			return $this->fail('EDITORPLUS_KATEX_ERR_ARCHIVE');
		}
		$files = $this->untar($tar);
		if ($files === false)
		{
			return false;
		}

		return $this->stage($files, $version);
	}

	/**
	 * Legge un archivio tar e restituisce SOLO i file che servono (elenco chiuso)
	 *
	 * @return array|false [nome nell'area di prova => contenuto]
	 */
	protected function untar($tar)
	{
		$wanted = [
			'package/dist/katex.min.js'				=> 'katex.min.js',
			'package/dist/katex.min.css'			=> 'katex.min.css',
			'package/dist/contrib/mhchem.min.js'	=> 'mhchem.min.js',
			'package/LICENSE'						=> 'LICENSE-KaTeX.txt',
		];
		$out = [];
		$len = strlen($tar);
		$pos = 0;
		$this->progress('extract', 0, $len);
		while ($pos + 512 <= $len)
		{
			$this->progress('extract', $pos, $len, false);
			$header = substr($tar, $pos, 512);
			if (trim($header, "\0") === '')
			{
				break;
			}
			$name = rtrim(substr($header, 0, 100), "\0");
			$prefix = rtrim(substr($header, 345, 155), "\0");
			if ($prefix !== '' && substr($header, 257, 5) === 'ustar')
			{
				$name = $prefix . '/' . $name;
			}
			$size = octdec(trim(substr($header, 124, 12), "\0 "));
			$type = substr($header, 156, 1);
			$pos += 512;
			if ($size < 0 || $size > self::MAX_FILE || $pos + $size > $len)
			{
				return $this->fail('EDITORPLUS_KATEX_ERR_ARCHIVE', $name);
			}
			if ($type === '0' || $type === "\0")
			{
				if (isset($wanted[$name]))
				{
					$out[$wanted[$name]] = substr($tar, $pos, $size);
				}
				else if (preg_match('#^package/dist/fonts/(KaTeX_[A-Za-z0-9_-]+\.woff2)$#', $name, $fm))
				{
					$out['fonts/' . $fm[1]] = substr($tar, $pos, $size);
				}
			}
			$pos += (int) (ceil($size / 512) * 512);
		}

		$this->progress('extract', $len, $len);
		foreach (['katex.min.js', 'katex.min.css', 'mhchem.min.js'] as $need)
		{
			if (empty($out[$need]))
			{
				return $this->fail('EDITORPLUS_KATEX_ERR_INCOMPLETE', $need);
			}
		}

		return $out;
	}

	/**
	 * Scrive i file nell'area di prova. Il foglio di stile viene alleggerito (solo caratteri WOFF2),
	 * come la versione inclusa nell'estensione.
	 */
	protected function stage(array $files, $version)
	{
		if (self::version_from_string($files['katex.min.js']) !== $version)
		{
			return $this->fail('EDITORPLUS_KATEX_ERR_INCOMPLETE', 'version');
		}
		$files['katex.min.css'] = self::woff2_only($files['katex.min.css']);

		$dir = $this->staging_dir();
		$this->progress('stage', 0, count($files));
		$this->remove_dir($dir);
		if (!@mkdir($dir . 'fonts', 0755, true))
		{
			return $this->fail('EDITORPLUS_KATEX_ERR_WRITE', str_replace($this->root_path, '', $dir));
		}
		$n = 0;
		foreach ($files as $name => $content)
		{
			if (@file_put_contents($dir . $name, $content) === false)
			{
				return $this->fail('EDITORPLUS_KATEX_ERR_WRITE', $name);
			}
			$this->progress('stage', ++$n, count($files), $n === count($files));
		}
		$missing = $this->missing_fonts($dir . 'katex.min.css', $dir . 'fonts/');
		if ($missing)
		{
			$this->remove_dir($dir);

			return $this->fail('EDITORPLUS_KATEX_ERR_INCOMPLETE', implode(', ', array_slice($missing, 0, 5)));
		}

		$this->progress('done', 1, 1);

		return ['version' => $version, 'files' => count($files)];
	}

	public static function version_from_string($js)
	{
		return preg_match('/version:"(\d+\.\d+\.\d+)"/', $js, $m) ? $m[1] : '';
	}

	/** Solo i caratteri WOFF2 (quelli inclusi); i riferimenti a WOFF e TTF si tolgono */
	public static function woff2_only($css)
	{
		$css = preg_replace('/,\s*url\(fonts\/[^)]+\.woff\)\s*format\("woff"\)/', '', $css);

		return preg_replace('/,\s*url\(fonts\/[^)]+\.ttf\)\s*format\("truetype"\)/', '', $css);
	}

	/* ---------------- attivazione, scarto, ripristino ---------------- */

	/**
	 * Attiva la versione preparata (dopo la prova nel browser), tenendo una copia di quella in uso
	 */
	public function activate()
	{
		$this->tracking = true;
		$staged = $this->staging_dir();
		$version = $this->staged_version();
		if ($version === '' || $this->missing_fonts($staged . 'katex.min.css', $staged . 'fonts/'))
		{
			return $this->fail('EDITORPLUS_KATEX_ERR_NOTHING_STAGED');
		}
		if (!$this->backup_current())
		{
			return false;
		}
		if (!$this->install_from($staged))
		{
			// qualcosa è andato storto a metà: si rimette la versione di prima
			$this->install_from($this->backup_dir());

			return $this->fail('EDITORPLUS_KATEX_ERR_WRITE', 'activate');
		}
		$this->remove_dir($staged);
		$this->config->set('editorplus_katex_version', $version);
		$this->progress('done', 1, 1);

		return ['version' => $version];
	}

	public function discard()
	{
		$this->remove_dir($this->staging_dir());

		return true;
	}

	public function restore()
	{
		$this->tracking = true;
		$version = $this->backup_version();
		if ($version === '')
		{
			return $this->fail('EDITORPLUS_KATEX_ERR_NO_BACKUP');
		}
		// la versione attuale diventa a sua volta la copia di sicurezza (si può tornare avanti)
		$swap = $this->root_path . 'store/editorplus_katex_swap/';
		$this->remove_dir($swap);
		if (!$this->copy_active_to($swap))
		{
			return $this->fail('EDITORPLUS_KATEX_ERR_WRITE', 'store/');
		}
		if (!$this->install_from($this->backup_dir()))
		{
			$this->install_from($swap);

			return $this->fail('EDITORPLUS_KATEX_ERR_WRITE', 'restore');
		}
		$this->remove_dir($this->backup_dir());
		@rename($swap, $this->backup_dir());
		$this->config->set('editorplus_katex_version', $version);
		$this->progress('done', 1, 1);

		return ['version' => $version];
	}

	protected function backup_current()
	{
		$dir = $this->backup_dir();
		$this->remove_dir($dir);
		if (!$this->copy_active_to($dir))
		{
			return $this->fail('EDITORPLUS_KATEX_ERR_WRITE', 'store/');
		}

		return true;
	}

	/** Copia la versione in uso in una cartella (stessa struttura dell'area di prova) */
	protected function copy_active_to($dir)
	{
		$p = $this->active_paths();
		if (!@mkdir($dir . 'fonts', 0755, true))
		{
			return false;
		}
		$fonts = (array) glob($p['fonts'] . '*.woff2');
		$total = 4 + count($fonts);
		$n = 0;
		$this->progress('backup', 0, $total);
		foreach (['katex.min.js' => $p['js'], 'mhchem.min.js' => $p['mhchem'], 'katex.min.css' => $p['css'], 'LICENSE-KaTeX.txt' => $p['license']] as $name => $src)
		{
			if (is_file($src) && !@copy($src, $dir . $name))
			{
				return false;
			}
			$this->progress('backup', ++$n, $total, false);
		}
		foreach ($fonts as $font)
		{
			if (!@copy($font, $dir . 'fonts/' . basename($font)))
			{
				return false;
			}
			$this->progress('backup', ++$n, $total, $n === $total);
		}

		return true;
	}

	/** Installa i file di una cartella (area di prova o copia di sicurezza) al posto di quelli in uso */
	protected function install_from($dir)
	{
		$p = $this->active_paths();
		$ok = true;
		$fonts = (array) glob($dir . 'fonts/*.woff2');
		$total = 4 + count($fonts);
		$n = 0;
		$this->progress('install', 0, $total);
		foreach (['katex.min.js' => $p['js'], 'mhchem.min.js' => $p['mhchem'], 'katex.min.css' => $p['css'], 'LICENSE-KaTeX.txt' => $p['license']] as $name => $dst)
		{
			if (is_file($dir . $name))
			{
				$ok = @copy($dir . $name, $dst) && $ok;
			}
			$this->progress('install', ++$n, $total, false);
		}
		if ($fonts)
		{
			foreach ((array) glob($p['fonts'] . '*.woff2') as $old)
			{
				@unlink($old);
			}
			foreach ($fonts as $font)
			{
				$ok = @copy($font, $p['fonts'] . basename($font)) && $ok;
				$this->progress('install', ++$n, $total, $n === $total);
			}
		}

		return $ok;
	}

	protected function remove_dir($dir)
	{
		if (!is_dir($dir))
		{
			return;
		}
		foreach (new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($dir, \FilesystemIterator::SKIP_DOTS), \RecursiveIteratorIterator::CHILD_FIRST) as $f)
		{
			$f->isDir() ? @rmdir($f->getPathname()) : @unlink($f->getPathname());
		}
		@rmdir($dir);
	}
}
