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
	'UCP_EDITORPLUS_EXPLAIN'				=> 'Scegli come vuoi la barra di scrittura. Queste scelte valgono solo per te.',
	'UCP_EDITORPLUS_SAVED'					=> 'Preferenze di Editor Plus salvate.',
	'UCP_EDITORPLUS_NOTHING'				=> 'Al momento non ci sono opzioni personalizzabili.',
	'UCP_EDITORPLUS_AUTOSAVE'				=> 'Salvataggio automatico della bozza',
	'UCP_EDITORPLUS_AUTOSAVE_EXPLAIN'		=> 'Il testo viene salvato mentre scrivi, sul server (lo ritrovi da qualsiasi browser o dispositivo) e nel tuo browser, così non lo perdi se la pagina si chiude.',
	'UCP_EDITORPLUS_AUTOGROW'				=> 'Area di testo che si allarga',
	'UCP_EDITORPLUS_AUTOGROW_EXPLAIN'		=> 'L’area di testo cresce mentre scrivi, invece di mostrare la barra di scorrimento.',
	'UCP_EDITORPLUS_COUNTER'				=> 'Contatore di caratteri e parole',
	'UCP_EDITORPLUS_COUNTER_EXPLAIN'		=> 'Mostrato sotto l’area di testo.',
	'UCP_EDITORPLUS_SHORTCUTS'				=> 'Scorciatoie da tastiera',
	'UCP_EDITORPLUS_SHORTCUTS_EXPLAIN'		=> 'Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+K, Ctrl+S, Ctrl+Invio.',
	'UCP_EDITORPLUS_LIVE_OPEN'				=> 'Anteprima dal vivo sempre aperta',
	'UCP_EDITORPLUS_LIVE_OPEN_EXPLAIN'		=> 'Apre l’anteprima del messaggio automaticamente. Puoi comunque aprirla e chiuderla con il suo pulsante.',
	'UCP_EDITORPLUS_COMBO_PREVIEW'			=> 'Anteprima delle voci delle combo',
	'UCP_EDITORPLUS_COMBO_PREVIEW_EXPLAIN'	=> 'Nelle combo della barra mostra l’anteprima della voce su cui ti trovi.',
	'UCP_EDITORPLUS_DROP_UPLOAD'			=> 'Trascina o incolla le immagini',
	'UCP_EDITORPLUS_DROP_UPLOAD_EXPLAIN'	=> 'Le immagini trascinate o incollate nell’area di testo vengono caricate come allegati e inserite nel messaggio.',
	'UCP_EDITORPLUS_SMILEY_BAR'				=> 'Faccine nella barra',
	'UCP_EDITORPLUS_SMILEY_BAR_EXPLAIN'		=> 'Sì: le faccine sono nel pulsante della barra e l’area di testo è più larga. No: resta anche il riquadro faccine a destra.',
	'UCP_EDITORPLUS_LIVE_FORMAT'	=> 'Formattazione mentre scrivi',
	'UCP_EDITORPLUS_LIVE_FORMAT_EXPLAIN'	=> 'Il testo appare già in grassetto, corsivo, colorato… mentre lo scrivi; i codici BBCode restano visibili ma sbiaditi.',
	'UCP_EDITORPLUS_WYSIWYG'	=> 'Editor visuale',
	'UCP_EDITORPLUS_WYSIWYG_EXPLAIN'	=> 'Scrivi vedendo il testo già formattato invece dei codici BBCode. Puoi sempre passare alla modalità BBCode con il suo pulsante.',
	'UCP_EDITORPLUS_SPELLCHECK'	=> 'Correttore ortografico del browser',
	'UCP_EDITORPLUS_SPELLCHECK_EXPLAIN'	=> 'Sottolinea le parole sbagliate mentre scrivi (lo fa il browser, con i suoi dizionari). Con molti codici BBCode può risultare invadente.',
	'UCP_EDITORPLUS_LF_MARKS'	=> 'Segna dimensione e carattere',
	'UCP_EDITORPLUS_LF_MARKS_EXPLAIN'	=> 'Con la formattazione mentre scrivi, sottolinea con un colore il testo dentro [size] e [font].',
]);
