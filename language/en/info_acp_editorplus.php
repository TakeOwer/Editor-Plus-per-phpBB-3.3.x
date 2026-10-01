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
	'ACP_EDITORPLUS_TITLE'		=> 'Editor Plus',
	'ACP_EDITORPLUS_SETTINGS'	=> 'Settings',
	'LOG_EDITORPLUS_SETTINGS'	=> '<strong>Editor Plus: settings updated</strong>',
	'EDITORPLUS_REQUIRE_PHPBB'	=> 'Editor Plus requires phpBB 3.3.x.',
	'EDITORPLUS_REQUIRE_PHP'	=> 'Editor Plus requires PHP 7.4 or newer.',
	'ACP_EDITORPLUS_COMBOS'	=> 'Select boxes',
	'LOG_EDITORPLUS_COMBO_SAVED'	=> '<strong>Editor Plus: select box saved</strong><br>» %s',
	'LOG_EDITORPLUS_COMBO_DELETED'	=> '<strong>Editor Plus: select box deleted</strong><br>» %s',
	'LOG_EDITORPLUS_COMBO_IMPORTED'	=> '<strong>Editor Plus: select boxes imported</strong><br>» %s',
	'ACP_EDITORPLUS_CHECK'	=> 'Check-up',
	'LOG_EDITORPLUS_KATEX_UPDATED'	=> '<strong>Editor Plus: KaTeX updated</strong><br>» from %1$s to %2$s',
	'LOG_EDITORPLUS_KATEX_RESTORED'	=> '<strong>Editor Plus: KaTeX restored</strong><br>» from %1$s to %2$s',
]);
