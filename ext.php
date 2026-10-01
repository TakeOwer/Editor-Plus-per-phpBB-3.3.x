<?php
/**
 *
 * Editor Plus
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus;

class ext extends \phpbb\extension\base
{
	/**
	 * Richiede phpBB 3.3+, PHP 7.4+ e Advanced BBCode Box (vse/abbc3) abilitata,
	 * perché Editor Plus si aggancia agli eventi della sua barra.
	 *
	 * @return bool|array
	 */
	public function is_enableable()
	{
		$config = $this->container->get('config');
		$language = $this->container->get('language');
		$language->add_lang('info_acp_editorplus', 'salvocortesiano/editorplus');

		$errors = [];

		if (!phpbb_version_compare($config['version'], '3.3.0', '>=') || !phpbb_version_compare($config['version'], '4.0.0-dev', '<'))
		{
			$errors[] = $language->lang('EDITORPLUS_REQUIRE_PHPBB');
		}

		if (version_compare(PHP_VERSION, '7.4.0', '<'))
		{
			$errors[] = $language->lang('EDITORPLUS_REQUIRE_PHP');
		}

		// Advanced BBCode Box non è più obbligatoria: senza, Editor Plus usa la barra standard di phpBB

		return empty($errors) ? true : $errors;
	}
}
