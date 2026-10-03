<?php
/**
 *
 * Editor Plus 1.0.39
 * - image_size fino a 4 GB (prima MEDIUMINT su MySQL: oltre 16 MB il salvataggio falliva)
 * - per caricare immagini serve anche un permesso per scrivere (messaggi, MP o firma)
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\migrations;

class v1039_images_fix extends \phpbb\db\migration\migration
{
	public function effectively_installed()
	{
		return isset($this->config['editorplus_img_need_post']);
	}

	public static function depends_on()
	{
		return ['\salvocortesiano\editorplus\migrations\v1038_images'];
	}

	public function update_schema()
	{
		return [
			'change_columns' => [
				$this->table_prefix . 'editorplus_images' => [
					'image_size' => ['UINT:11', 0],
				],
			],
		];
	}

	public function revert_schema()
	{
		// la tabella viene tolta da v1038_images
		return [];
	}

	public function update_data()
	{
		return [
			['config.add', ['editorplus_img_need_post', 1]],
		];
	}
}
