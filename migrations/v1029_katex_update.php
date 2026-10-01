<?php
/**
 *
 * Editor Plus 1.0.29
 * Aggiornamento di KaTeX dall'ACP: versione installata e, alla cancellazione dei dati,
 * rimozione della copia di sicurezza (store/) e dell'area di prova.
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\migrations;

class v1029_katex_update extends \phpbb\db\migration\migration
{
	public function effectively_installed()
	{
		return isset($this->config['editorplus_katex_version']);
	}

	public static function depends_on()
	{
		return ['\salvocortesiano\editorplus\migrations\v1028_math'];
	}

	public function update_data()
	{
		return [
			['config.add', ['editorplus_katex_version', '']],
		];
	}

	public function revert_data()
	{
		return [
			['custom', [[$this, 'remove_katex_files']]],
		];
	}

	/**
	 * Copia di sicurezza di KaTeX (store/) e area di prova: tolte quando si cancellano i dati di Editor Plus
	 */
	public function remove_katex_files()
	{
		// stato dell'ultimo aggiornamento (barra di avanzamento)
		foreach ((array) glob($this->phpbb_root_path . 'store/editorplus_katex_progress.json*') as $file)
		{
			@unlink($file);
		}

		$dirs = [
			$this->phpbb_root_path . 'store/editorplus_katex_backup/',
			$this->phpbb_root_path . 'store/editorplus_katex_swap/',
			$this->phpbb_root_path . 'ext/salvocortesiano/editorplus/styles/all/theme/math-staging/',
		];
		foreach ($dirs as $dir)
		{
			if (!is_dir($dir))
			{
				continue;
			}
			$it = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($dir, \FilesystemIterator::SKIP_DOTS), \RecursiveIteratorIterator::CHILD_FIRST);
			foreach ($it as $f)
			{
				$f->isDir() ? @rmdir($f->getPathname()) : @unlink($f->getPathname());
			}
			@rmdir($dir);
		}
	}
}
