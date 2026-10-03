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
	'LOG_EDITORPLUS_CLEANUP'	=> '<strong>Editor Plus: pulizia dei dati</strong><br>» %1$d bozze scadute e %2$d allegati orfani tolti',
	'ACP_EDITORPLUS_IMAGES'	=> 'Immagini utenti',
	'LOG_EDITORPLUS_IMG_SETTINGS'	=> '<strong>Editor Plus: impostazioni delle immagini utenti aggiornate</strong>',
	'LOG_EDITORPLUS_IMG_DELETED'	=> '<strong>Editor Plus: immagini eliminate</strong><br>» %1$d immagini di %2$s',
	'LOG_EDITORPLUS_IMG_FOLDER_DELETED'	=> '<strong>Editor Plus: cartella delle immagini eliminata</strong><br>» %1$s (%2$s, %3$d immagini)',
	'LOG_EDITORPLUS_IMG_USERS_DELETED'	=> '<strong>Editor Plus: cartelle delle immagini di utenti cancellati eliminate</strong><br>» %s',
	'LOG_EDITORPLUS_IMG_REPAIR'	=> '<strong>Editor Plus: immagini riallineate</strong><br>» %1$d cartelle tolte, %2$d cartelle e %3$d immagini registrate, %4$d schede senza file tolte',
	// nomi dei moduli del Pannello utente: servono anche nell'ACP (registro amministratori, gestione dei moduli)
	'UCP_EDITORPLUS_TITLE'	=> 'Editor Plus',
	'UCP_EDITORPLUS_IMAGES'	=> 'Le mie immagini',
]);
