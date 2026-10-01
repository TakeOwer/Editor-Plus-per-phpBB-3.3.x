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
	'ACP_EDITORPLUS_SETTINGS'	=> 'Impostazioni',
	'LOG_EDITORPLUS_SETTINGS'	=> '<strong>Editor Plus: impostazioni aggiornate</strong>',
	'EDITORPLUS_REQUIRE_PHPBB'	=> 'Editor Plus richiede phpBB 3.3.x.',
	'EDITORPLUS_REQUIRE_PHP'	=> 'Editor Plus richiede PHP 7.4 o superiore.',
	'ACP_EDITORPLUS_COMBOS'	=> 'Combo',
	'LOG_EDITORPLUS_COMBO_SAVED'	=> '<strong>Editor Plus: combo salvata</strong><br>» %s',
	'LOG_EDITORPLUS_COMBO_DELETED'	=> '<strong>Editor Plus: combo eliminata</strong><br>» %s',
	'LOG_EDITORPLUS_COMBO_IMPORTED'	=> '<strong>Editor Plus: combo importate</strong><br>» %s',
	'ACP_EDITORPLUS_CHECK'	=> 'Check-up',
	'LOG_EDITORPLUS_KATEX_UPDATED'	=> '<strong>Editor Plus: KaTeX aggiornato</strong><br>» da %1$s a %2$s',
	'LOG_EDITORPLUS_KATEX_RESTORED'	=> '<strong>Editor Plus: KaTeX ripristinato</strong><br>» da %1$s a %2$s',
]);
