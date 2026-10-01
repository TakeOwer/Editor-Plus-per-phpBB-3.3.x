<?php
/**
 *
 * Editor Plus 1.0.10
 * GHide: il pulsante compare se il forum usa già [ghide] nei messaggi, oppure se l'amministratore
 * lo chiede esplicitamente, anche quando il BBCode non è riconoscibile in altro modo.
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\migrations;

use salvocortesiano\editorplus\core\helper;

class v1010_ghide extends \phpbb\db\migration\migration
{
	public function effectively_installed()
	{
		return $this->config->offsetExists('editorplus_ghide_force');
	}

	public static function depends_on()
	{
		return ['\salvocortesiano\editorplus\migrations\v106_features'];
	}

	public function update_data()
	{
		return [
			['config.add', ['editorplus_ghide_force', 0]],
			['config.add', ['editorplus_ghide_used', 0]],
			['custom', [[$this, 'detect_ghide']]],
		];
	}

	public function revert_data()
	{
		return [
			['config.remove', ['editorplus_ghide_force']],
			['config.remove', ['editorplus_ghide_used']],
		];
	}

	/**
	 * Se i messaggi contengono già [ghide], il forum lo usa: il pulsante deve esserci
	 */
	public function detect_ghide()
	{
		$this->config->set('editorplus_ghide_used', helper::ghide_in_posts($this->db, $this->table_prefix . 'posts') ? 1 : 0);
	}
}
