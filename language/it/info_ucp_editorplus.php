<?php
/**
 *
 * Editor Plus
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

if (!defined('IN_PHPBB'))
{
	exit;
}

if (empty($lang) || !is_array($lang))
{
	$lang = [];
}
$lang = array_merge($lang, [
	'UCP_EDITORPLUS_TITLE'	=> 'Editor Plus',
	'UCP_EDITORPLUS_IMAGES'	=> 'Le mie immagini',
]);
