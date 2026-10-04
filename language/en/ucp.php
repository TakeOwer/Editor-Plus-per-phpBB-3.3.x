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
	'UCP_EDITORPLUS_EXPLAIN'				=> 'Choose how you want the posting toolbar. These choices apply only to you.',
	'UCP_EDITORPLUS_SAVED'					=> 'Editor Plus preferences saved.',
	'UCP_EDITORPLUS_NOTHING'				=> 'There are no customisable options at the moment.',
	'UCP_EDITORPLUS_AUTOSAVE'				=> 'Draft autosave',
	'UCP_EDITORPLUS_AUTOSAVE_EXPLAIN'		=> 'Your text is saved while you type, on the server (you find it again from any browser or device) and in your browser, so you do not lose it if the page closes.',
	'UCP_EDITORPLUS_AUTOGROW'				=> 'Auto-growing text area',
	'UCP_EDITORPLUS_AUTOGROW_EXPLAIN'		=> 'The text area grows while you type instead of showing a scrollbar.',
	'UCP_EDITORPLUS_COUNTER'				=> 'Character and word counter',
	'UCP_EDITORPLUS_COUNTER_EXPLAIN'		=> 'Shown below the text area.',
	'UCP_EDITORPLUS_SHORTCUTS'				=> 'Keyboard shortcuts',
	'UCP_EDITORPLUS_SHORTCUTS_EXPLAIN'		=> 'Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+K, Ctrl+S, Ctrl+Enter.',
	'UCP_EDITORPLUS_LIVE_OPEN'				=> 'Live preview always open',
	'UCP_EDITORPLUS_LIVE_OPEN_EXPLAIN'		=> 'Opens the post preview automatically. You can still open and close it with its button.',
	'UCP_EDITORPLUS_COMBO_PREVIEW'			=> 'Select box entry preview',
	'UCP_EDITORPLUS_COMBO_PREVIEW_EXPLAIN'	=> 'In the toolbar select boxes, shows a preview of the entry under the pointer.',
	'UCP_EDITORPLUS_DROP_UPLOAD'			=> 'Drag or paste images',
	'UCP_EDITORPLUS_DROP_UPLOAD_EXPLAIN'	=> 'Images dragged or pasted into the text area are uploaded as attachments and inserted into the post.',
	'UCP_EDITORPLUS_SMILEY_BAR'				=> 'Smilies in the toolbar',
	'UCP_EDITORPLUS_SMILEY_BAR_EXPLAIN'		=> 'Yes: smilies are in the toolbar button and the text area is wider. No: the smilies box on the right stays too.',
	'UCP_EDITORPLUS_LIVE_FORMAT'	=> 'Formatting while typing',
	'UCP_EDITORPLUS_LIVE_FORMAT_EXPLAIN'	=> 'Text already appears bold, italic, coloured… while you type; BBCode tags stay visible but faded.',
	'UCP_EDITORPLUS_WYSIWYG'	=> 'Visual editor',
	'UCP_EDITORPLUS_WYSIWYG_EXPLAIN'	=> 'Write seeing the formatted text instead of BBCode tags. You can always switch to BBCode mode with its button.',
	'UCP_EDITORPLUS_SPELLCHECK'	=> 'Browser spell checker',
	'UCP_EDITORPLUS_SPELLCHECK_EXPLAIN'	=> 'Underlines misspelled words while you type (done by the browser with its dictionaries). With many BBCode tags it can be intrusive.',
	'UCP_EDITORPLUS_LF_MARKS'	=> 'Mark font size and face',
	'UCP_EDITORPLUS_LF_MARKS_EXPLAIN'	=> 'With formatting while typing, underlines text inside [size] and [font] with a colour.',

	// 1.0.38: My images
	'UCP_EDITORPLUS_IMG_EXPLAIN'	=> 'The images you uploaded while writing posts (dropped, pasted or chosen with “My images” in the editor). Click a thumbnail to enlarge it and copy its link or BBCode.',
	'UCP_EDITORPLUS_IMG_NOTHING'	=> 'You did not select any image.',
	'UCP_EDITORPLUS_IMG_DELETED'	=> 'Images deleted: %d.',
	'UCP_EDITORPLUS_IMG_CONFIRM'	=> 'Delete the %d selected images? Posts where you used them will show broken images.',
	'UCP_EDITORPLUS_IMG_CONFIRM_ALL'	=> 'Delete ALL your images? Posts where you used them will show broken images.',
	'UCP_EDITORPLUS_IMG_SELECT_ALL'	=> 'Select all',
	'UCP_EDITORPLUS_IMG_DELETE_SEL'	=> 'Delete selected',
	'UCP_EDITORPLUS_IMG_DELETE_ALL'	=> 'Delete all',
	'UCP_EDITORPLUS_IMG_NONE'	=> 'You have not uploaded any images yet.',
	'UCP_EDITORPLUS_IMG_SPACE'	=> 'Space used',
	'UCP_EDITORPLUS_IMG_LIMITS'	=> 'Maximum size per image: %s',
	'UCP_EDITORPLUS_ENABLED'	=> 'Use Editor Plus',
	'UCP_EDITORPLUS_ENABLED_EXPLAIN'	=> 'With “No” you write with the board’s normal toolbar, without the Editor Plus features (live preview, drafts, images, formulas, printing…). Formulas and highlighted code in other people’s posts stay visible. You can turn it back on here at any time; the other preferences below apply when Editor Plus is on.',
]);
