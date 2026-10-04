<?php
/**
 *
 * Editor Plus 1.0.45
 * Immagini trascinate o incollate nell'editor: chiedere ogni volta (cartella dell'utente o allegati),
 * oppure sempre nella cartella, oppure sempre come allegati.
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\migrations;

class v1045_drop_mode extends \phpbb\db\migration\migration
{
	public function effectively_installed()
	{
		return isset($this->config['editorplus_img_drop_mode']);
	}

	public static function depends_on()
	{
		return ['\salvocortesiano\editorplus\migrations\v1043_log_names'];
	}

	public function update_data()
	{
		return [
			['config.add', ['editorplus_img_drop_mode', 'ask']],
		];
	}
}
