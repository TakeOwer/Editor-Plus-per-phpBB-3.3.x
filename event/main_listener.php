<?php
/**
 *
 * Editor Plus
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\event;

use phpbb\config\config;
use phpbb\config\db_text;
use phpbb\db\driver\driver_interface;
use phpbb\extension\manager;
use phpbb\language\language;
use phpbb\template\template;
use phpbb\user;
use salvocortesiano\editorplus\core\combos;
use salvocortesiano\editorplus\core\helper;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

class main_listener implements EventSubscriberInterface
{
	/** @var config */
	protected $config;

	/** @var db_text */
	protected $config_text;

	/** @var driver_interface */
	protected $db;

	/** @var manager */
	protected $ext_manager;

	/** @var language */
	protected $language;

	/** @var template */
	protected $template;

	/** @var user */
	protected $user;

	/** @var \phpbb\controller\helper */
	protected $helper;

	/** @var string */
	protected $root_path;

	/** @var \Symfony\Component\DependencyInjection\ContainerInterface */
	protected $container;

	/** @var array|null Autore dell'argomento in cui si sta rispondendo ['id' => int, 'name' => string] */
	protected $topic_author = null;

	/** @var array|null Icone di Editor Plus [tag => percorso] */
	protected $icons;

	public function __construct(config $config, db_text $config_text, driver_interface $db, manager $ext_manager, language $language, template $template, user $user, \phpbb\controller\helper $helper, $root_path, $container = null)
	{
		$this->config = $config;
		$this->config_text = $config_text;
		$this->db = $db;
		$this->ext_manager = $ext_manager;
		$this->language = $language;
		$this->template = $template;
		$this->user = $user;
		$this->helper = $helper;
		$this->root_path = $root_path;
		$this->container = $container;
	}

	public static function getSubscribedEvents()
	{
		return [
			'core.user_setup'							=> 'load_language',
			'core.page_header_after'					=> 'assign_template_vars',
			'core.adm_page_header_after'				=> 'assign_user_vars',
			// Dopo ABBC3 (priorità 0): completa le icone mancanti con quelle di Editor Plus
			'core.display_custom_bbcodes_modify_row'	=> ['add_missing_icons', -10],
			// BBCode [syntax=linguaggio] per il codice colorato (distinto da [code] di phpBB)
			'core.text_formatter_s9e_configure_after'	=> 'configure_syntax',
			// Autore dell'argomento, per il pulsante GHide (risposta completa e risposta rapida)
			'core.posting_modify_template_vars'			=> 'remember_topic_author_posting',
			'core.viewtopic_assign_template_vars_before'	=> 'remember_topic_author_viewtopic',
			// 1.0.38: utente cancellato (dall'ACP o da sé) => via anche la sua cartella delle immagini
			'core.delete_user_after'					=> 'delete_user_images',
		];
	}

	/**
	 * [syntax=linguaggio]codice[/syntax]: come [code], il contenuto resta testo letterale (niente BBCode,
	 * faccine o link automatici dentro), gli a capo e gli spazi restano quelli scritti.
	 * La colorazione e i numeri di riga li aggiunge il browser nelle pagine che contengono codice.
	 * Registrato sempre (anche con la funzione spenta) così i messaggi già scritti si vedono bene.
	 */
	public function configure_syntax($event)
	{
		$configurator = $event['configurator'];
		if (isset($configurator->BBCodes['SYNTAX']))
		{
			return;
		}

		$configurator->BBCodes->addCustom(
			'[SYNTAX lang={IDENTIFIER;optional}]{TEXT}[/SYNTAX]',
			'<div class="ep-syntax" data-lang="{IDENTIFIER}"><pre><code>{TEXT}</code></pre></div>'
		);
		$configurator->BBCodes['SYNTAX']->defaultAttribute = 'lang';

		$tag = $configurator->tags['SYNTAX'];
		$tag->rules->ignoreTags();
		$tag->rules->disableAutoLineBreaks();

		$this->configure_math($configurator);
	}

	/**
	 * [math]formula[/math] (a sé, centrata) e [imath]formula[/imath] (dentro il testo), in LaTeX.
	 * Il contenuto resta testo letterale: lo disegna KaTeX nel browser. Senza lo script (o con la funzione
	 * spenta) la formula si legge comunque, come testo LaTeX.
	 *
	 * @param \s9e\TextFormatter\Configurator $configurator
	 */
	protected function configure_math($configurator)
	{
		$defs = [
			'MATH'	=> '<div class="ep-math ep-math-block">{TEXT}</div>',
			'IMATH'	=> '<span class="ep-math ep-math-inline">{TEXT}</span>',
		];
		foreach ($defs as $name => $html)
		{
			if (isset($configurator->BBCodes[$name]))
			{
				continue;
			}
			$configurator->BBCodes->addCustom('[' . $name . ']{TEXT}[/' . $name . ']', $html);
			$tag = $configurator->tags[$name];
			$tag->rules->ignoreTags();
			$tag->rules->disableAutoLineBreaks();
		}
	}

	/**
	 * Pagina di risposta, citazione o modifica: chi ha aperto l'argomento
	 */
	public function remember_topic_author_posting($event)
	{
		$post_data = $event['post_data'];
		if (in_array($event['mode'], ['reply', 'quote', 'edit'], true) && !empty($post_data['topic_poster']))
		{
			$this->topic_author = [
				'id'	=> (int) $post_data['topic_poster'],
				'name'	=> isset($post_data['topic_first_poster_name']) ? (string) $post_data['topic_first_poster_name'] : '',
			];
		}
	}

	/**
	 * Risposta rapida in fondo all'argomento: chi ha aperto l'argomento
	 */
	public function remember_topic_author_viewtopic($event)
	{
		$topic_data = $event['topic_data'];
		if (!empty($topic_data['topic_poster']))
		{
			$this->topic_author = [
				'id'	=> (int) $topic_data['topic_poster'],
				'name'	=> isset($topic_data['topic_first_poster_name']) ? (string) $topic_data['topic_first_poster_name'] : '',
			];
		}
	}

	/**
	 * Utenti cancellati: le loro cartelle delle immagini vengono eliminate (se l'opzione è accesa)
	 */
	public function delete_user_images($event)
	{
		// 0 = mai, 1 = sempre, 2 = solo quando vengono cancellati anche i messaggi
		$mode = (int) $this->config['editorplus_img_delete_with_user'];
		if (!$mode || ($mode === 2 && (isset($event['mode']) ? $event['mode'] : '') !== 'remove')
			|| !$this->container || !$this->container->has('salvocortesiano.editorplus.images') || !$this->container->has('dbal.tools'))
		{
			return;
		}

		// In phpBB un errore SQL non è un'eccezione (ferma la pagina): se le tabelle non ci sono ancora
		// (aggiornamento a metà) non si tocca nulla, così la cancellazione dell'utente si completa
		$tools = $this->container->get('dbal.tools');
		$prefix = $this->container->getParameter('core.table_prefix');
		if (!$tools->sql_table_exists($prefix . 'editorplus_images') || !$tools->sql_table_exists($prefix . 'editorplus_img_folders'))
		{
			return;
		}

		/** @var \salvocortesiano\editorplus\core\images $images */
		$images = $this->container->get('salvocortesiano.editorplus.images');
		$done = $images->delete_users((array) $event['user_ids']);

		if ($done && $this->container->has('log'))
		{
			$names = [];
			foreach ($done as $folder => $count)
			{
				$names[] = $folder . ' (' . (int) $count . ')';
			}
			$this->container->get('log')->add('admin', (int) $this->user->data['user_id'], (string) $this->user->ip, 'LOG_EDITORPLUS_IMG_USERS_DELETED', false, [implode(', ', $names)]);
		}
	}

	/**
	 * Configurazione del caricamento immagini per l'editor (chi non può caricare la vede comunque,
	 * così l'editor sa che le immagini non vanno negli allegati e lo dice)
	 *
	 * @return array
	 */
	protected function images_config()
	{
		if (empty($this->config['editorplus_images']) || !$this->container || !$this->container->has('salvocortesiano.editorplus.images'))
		{
			return ['enabled' => false];
		}

		try
		{
			/** @var \salvocortesiano\editorplus\core\images $images */
			$images = $this->container->get('salvocortesiano.editorplus.images');
			$limits = $images->limits($this->user->data);
		}
		catch (\Exception $e)
		{
			return ['enabled' => false];
		}

		$upload = $this->route_or_null('salvocortesiano_editorplus_image_upload');
		$list = $this->route_or_null('salvocortesiano_editorplus_image_list');
		$delete = $this->route_or_null('salvocortesiano_editorplus_image_delete');
		if ($upload === null || $list === null || $delete === null)
		{
			// rotte non disponibili: le immagini trascinate tornano allegati di phpBB
			return ['enabled' => false];
		}

		return [
			'enabled'	=> true,
			'allowed'	=> $limits['allowed'],
			'reason'	=> $limits['allowed'] ? '' : $this->language->lang($limits['reason'] ?: 'EP_IMG_ERR_NO_GROUP'),
			'maxSize'	=> $limits['max_size'],
			'maxW'		=> (int) $this->config['editorplus_img_max_w'],
			'maxH'		=> (int) $this->config['editorplus_img_max_h'],
			'types'		=> $images->allowed_types(),
			'canDelete'	=> !empty($this->config['editorplus_img_user_delete']),
			// immagini trascinate o incollate: ask = chiedi ogni volta, folder = cartella, attach = allegati
			'dropMode'	=> in_array($this->config['editorplus_img_drop_mode'], ['ask', 'folder', 'attach'], true) ? $this->config['editorplus_img_drop_mode'] : 'ask',
			'uploadUrl'	=> $upload,
			'listUrl'	=> $list,
			'deleteUrl'	=> $delete,
			'hash'		=> generate_link_hash('editorplus_images'),
			'ucpUrl'	=> append_sid($this->root_path . 'ucp.php', 'i=-salvocortesiano-editorplus-ucp-main_module&mode=images', false),
		];
	}

	/**
	 * Indirizzo di una rotta di Editor Plus, o null se phpBB non la conosce (la generazione lancerebbe
	 * un'eccezione e farebbe cadere la pagina intera)
	 *
	 * @param string $name
	 * @return string|null
	 */
	protected function route_or_null($name)
	{
		try
		{
			return $this->helper->route($name);
		}
		catch (\Exception $e)
		{
			return null;
		}
	}

	/**
	 * Carica le stringhe di lingua della barra
	 */
	public function load_language($event)
	{
		$lang_set_ext = $event['lang_set_ext'];
		$lang_set_ext[] = [
			'ext_name'	=> 'salvocortesiano/editorplus',
			'lang_set'	=> 'common',
		];
		// ABBC3 disabilitata ma presente: le descrizioni dei suoi BBCode (ABBC3_..._HELPLINE) sono nei suoi
		// file di lingua; li si carica comunque, così i menu della barra standard mostrano testi veri
		if (!$this->ext_manager->is_enabled('vse/abbc3') && is_dir($this->root_path . 'ext/vse/abbc3/language'))
		{
			$lang_set_ext[] = [
				'ext_name'	=> 'vse/abbc3',
				'lang_set'	=> 'abbc3',
			];
		}
		$event['lang_set_ext'] = $lang_set_ext;
	}

	/**
	 * S_USER_ID e gruppi GHide anche nell'ACP (compatibilità con eventuali template personalizzati)
	 */
	public function assign_user_vars()
	{
		$groups = implode(',', helper::parse_group_ids($this->config['editorplus_ghide_groups']));

		$this->template->assign_vars([
			'S_EDITORPLUS_ADMIN'	=> $this->is_admin(),
			'S_EDITORPLUS_SYNTAX_VIEW'	=> !empty($this->config['editorplus_syntax']),
			'S_EDITORPLUS_MATH_VIEW'	=> !empty($this->config['editorplus_math']),
			'EDITORPLUS_MATH_ASSET'		=> helper::VERSION . '-' . (int) @filemtime($this->root_path . 'ext/salvocortesiano/editorplus/styles/all/template/js/math/katex.min.js'),
			'S_EDITORPLUS_SYNTAX_CODE'	=> !empty($this->config['editorplus_syntax_code']),
			'EDITORPLUS_SYNTAX_THEME'	=> $this->config['editorplus_syntax_theme'] === 'dark' ? 'dark' : 'light',
			'EDITORPLUS_SYNTAX_TAB'		=> in_array((int) $this->config['editorplus_syntax_tab'], [2, 4, 8], true) ? (int) $this->config['editorplus_syntax_tab'] : 4,
			'EDITORPLUS_SYNTAX_VERSION'	=> helper::VERSION,
			'S_USER_ID'				=> (int) $this->user->data['user_id'],
			'S_ABBC3_GHIDE_GROUPS'	=> $groups,
		]);
	}

	/**
	 * Variabili per la barra dell'editor (lato forum)
	 */
	public function assign_template_vars()
	{
		// formule e codice colorato nei messaggi: per tutti (anche i motori di ricerca)
		$this->assign_user_vars();

		// I bot non scrivono: per loro niente editor (e niente letture e calcoli inutili su ogni pagina)
		if (!empty($this->user->data['is_bot']))
		{
			return;
		}

		// L'utente ha spento Editor Plus nel Pannello utente: resta la barra normale (ABBC3 o phpBB),
		// con una riga discreta per riattivarlo. Formule e codice colorato nei messaggi restano visibili.
		$own = helper::user_prefs(isset($this->user->data['user_editorplus']) ? $this->user->data['user_editorplus'] : '');
		if (empty($own['enabled']))
		{
			$this->template->assign_vars([
				'S_EDITORPLUS_USER_OFF'	=> true,
				'U_EDITORPLUS_UCP'		=> append_sid($this->root_path . 'ucp.php', 'i=-salvocortesiano-editorplus-ucp-main_module&mode=prefs'),
			]);
			return;
		}

		// Indirizzi dei servizi dell'editor. Se phpBB non conosce le rotte (cache delle rotte non ancora
		// rigenerata, per esempio durante un aggiornamento dell'estensione), la pagina NON deve cadere:
		// Editor Plus semplicemente non si attiva in questa pagina e resta l'editor di phpBB.
		$urls = [];
		foreach (['render', 'prefs', 'draft', 'print'] as $name)
		{
			$urls[$name] = $this->route_or_null('salvocortesiano_editorplus_' . $name);
			if ($urls[$name] === null)
			{
				return;
			}
		}

		// Nessun filtro sul nome della pagina: l'editor può comparire in pagine diverse
		// (scrittura, risposta rapida, MP, firma, pagine di altre estensioni o URL riscritti).
		// Le letture pesanti sono in cache, quelle di config_text sono una sola query.
		$texts = array_merge(['editorplus_category_map' => '', 'editorplus_hidden_tags' => ''], (array) $this->config_text->get_array(['editorplus_category_map', 'editorplus_hidden_tags']));

		$toggles = [];
		foreach (array_keys(helper::TOGGLES) as $name)
		{
			$toggles[substr($name, strlen('editorplus_'))] = (bool) $this->config[$name];
		}

		// Il selettore Font Awesome funziona solo se il BBCode [fa] di Editor Plus esiste davvero
		$toggles['fa'] = $toggles['fa'] && $this->fa_bbcode_exists();

		// Preferenze personali (Pannello utente): possono solo spegnere ciò che l'ACP ha acceso
		$prefs = helper::user_prefs(isset($this->user->data['user_editorplus']) ? $this->user->data['user_editorplus'] : '');
		foreach (['autosave', 'autogrow', 'counter', 'shortcuts', 'combo_preview', 'drop_upload', 'live_format', 'wysiwyg'] as $key)
		{
			$toggles[$key] = $toggles[$key] && $prefs[$key];
		}
		$toggles['hide_smiley_box'] = $toggles['hide_smiley_box'] && $prefs['smiley_bar'];
		$toggles['live_open'] = $toggles['live_preview'] && $prefs['live_open'];

		// Combo della barra: solo quelle accese il cui BBCode esiste davvero sul forum
		$bar_combos = [];
		if ($this->config['editorplus_image_combos'])
		{
			$all_combos = combos::load($this->config_text);
			// BBCode dell'ACP e anche quelli registrati da estensioni
			$existing = helper::known_tags($this->db, $this->parser(), array_column($all_combos, 'tag'));
			$bbcode_groups = helper::bbcode_groups($this->db);
			$my_groups = null;

			foreach ($all_combos as $combo)
			{
				if (!$combo['enabled'] || empty($combo['options']) || !in_array($combo['tag'], $existing, true))
				{
					continue;
				}

				// Gruppi: quelli scelti per la combo e quelli che ABBC3 ammette per il suo BBCode
				$needed = [$combo['groups'], isset($bbcode_groups[$combo['tag']]) ? $bbcode_groups[$combo['tag']] : []];
				foreach ($needed as $allowed)
				{
					if (!empty($allowed))
					{
						$my_groups = $my_groups === null ? helper::user_groups($this->db, $this->user->data['user_id']) : $my_groups;
						if (!array_intersect($allowed, $my_groups))
						{
							continue 2;
						}
					}
				}

				$bar_combos[] = $combo;
			}
		}

		$js_config = [
			'userId'		=> (int) $this->user->data['user_id'],
			'ghideGroups'	=> helper::parse_group_ids($this->config['editorplus_ghide_groups']),
			'userName'		=> (string) $this->user->data['username'],
			'topicAuthor'	=> $this->topic_author,
			'ghideDefault'	=> in_array($this->config['editorplus_ghide_default'], ['author', 'me', 'both'], true) ? $this->config['editorplus_ghide_default'] : 'author',
			'ghide'			=> $this->config['editorplus_ghide'] && helper::ghide_available($this->db, $this->parser(), $this->config),
			'features'		=> $toggles,
			'categories'	=> $this->config['editorplus_categories'] ? helper::parse_category_map($texts['editorplus_category_map']) : [],
			'hidden'		=> helper::parse_tags($texts['editorplus_hidden_tags']),
			'autosaveDays'	=> max(1, (int) $this->config['editorplus_autosave_days']),
			'maxChars'		=> (int) $this->config['max_post_chars'],
			// BBCode esistenti sul forum (per convertire il testo incollato solo in BBCode che esistono)
			'bbcodeTags'	=> array_values(array_map('strtolower', helper::existing_bbcodes($this->db))),
			'smilies'		=> $toggles['smilies'] ? $this->get_smilies() : [],
			'smiliesPath'	=> trim((string) $this->config['smilies_path'], '/') . '/',
			'smiliesQr'		=> (bool) $this->config['allow_smilies'],
			'renderUrl'		=> $urls['render'],
			'renderHash'	=> generate_link_hash('editorplus_render'),
			'prefsUrl'		=> $urls['prefs'],
			'draftUrl'		=> $urls['draft'],
			'printUrl'		=> $urls['print'],
			'siteName'		=> (string) $this->config['sitename'],
			'userName'		=> (string) $this->user->data['username'],
			'draftHash'		=> generate_link_hash('editorplus_draft'),
			'coreIcons'		=> $this->core_icons(),
			// senza ABBC3 la combo dei caratteri compare solo se il BBCode [font] esiste
			'hasFont'		=> in_array('font', helper::existing_bbcodes($this->db), true),
			'prefsHash'		=> generate_link_hash('editorplus_prefs'),
			'prefs'			=> $prefs,
			'adminFeatures'	=> [
				'live_format'	=> (bool) $this->config['editorplus_live_format'],
				'wysiwyg'		=> (bool) $this->config['editorplus_wysiwyg'],
				'options_menu'	=> (bool) $this->config['editorplus_options_menu'],
			],
			'version'		=> helper::VERSION,
			// Editor visuale: i BBCode personalizzati diventano blocchi con etichetta
			'customTags'	=> $this->config['editorplus_wysiwyg'] ? array_values(array_unique(array_merge(
				helper::existing_bbcodes($this->db),
				helper::ghide_available($this->db, $this->parser(), $this->config) ? ['ghide'] : []
			))) : [],
			'assetsVersion'	=> (int) $this->config['assets_version'],
			'uploadMax'		=> (int) $this->config['max_filesize'],
			'isGuest'		=> $this->user->data['user_id'] == ANONYMOUS,
			// 1.0.47: riga informativa, "per tornare al vecchio editor…": scheda Editor Plus del Pannello utente
			'ucpPrefsUrl'	=> $this->user->data['user_id'] != ANONYMOUS ? append_sid($this->root_path . 'ucp.php', 'i=-salvocortesiano-editorplus-ucp-main_module&mode=prefs', false) : '',
			// limite di allegati per messaggio (amministratori e moderatori globali non ce l'hanno)
			'maxAttach'		=> (int) $this->config['max_attachments'],
			'maxAttachPm'	=> (int) $this->config['max_attachments_pm'],
			'attachUnlimited'	=> $this->attach_unlimited(),
			'images'		=> ($this->user->data['user_id'] != ANONYMOUS) ? $this->images_config() : ['enabled' => false],
		];

		$this->template->assign_vars([
			'EDITORPLUS_JSON'		=> helper::safe_json($js_config),
			'EDITORPLUS_ICON_PATH'	=> 'ext/salvocortesiano/editorplus/images/icons/',
			'EDITORPLUS_ICON_EXT'	=> $this->icon_type(),
			'S_EDITORPLUS_WYSIWYG'	=> (bool) $this->config['editorplus_wysiwyg'],
			// senza menu per categoria il pulsante è l'unico modo di usare GHide
			'S_EDITORPLUS_GHIDE_BUTTON'	=> $toggles['ghide_button'] || !$toggles['categories'],
			'S_EDITORPLUS_GHIDE'	=> $this->config['editorplus_ghide'] && helper::ghide_available($this->db, $this->parser(), $this->config),
			'S_EDITORPLUS_FONT'		=> (bool) $this->config['editorplus_font_select'],
			'S_EDITORPLUS_CALC_JS'	=> !empty($this->config['editorplus_calc']),
			'S_EDITORPLUS_COMBOS'	=> (bool) $this->config['editorplus_image_combos'],
			'EDITORPLUS_COMBOS'		=> $bar_combos,
			'EDITORPLUS_GALLERY_LANG'	=> !empty($js_config['images']['enabled']) ? \salvocortesiano\editorplus\core\images::js_lang($this->language) : '',
		]);
	}

	/**
	 * Se ABBC3 non ha trovato un'icona per un BBCode personalizzato, usa quella di Editor Plus.
	 * Così le icone personalizzate non vanno più copiate dentro ABBC3 a ogni aggiornamento.
	 */
	public function add_missing_icons($event)
	{
		$custom_tags = $event['custom_tags'];

		if (!empty($custom_tags['BBCODE_IMG']))
		{
			return;
		}

		$tag = strtolower(rtrim($event['row']['bbcode_tag'], '='));
		$icons = $this->get_icons();

		if (isset($icons[$tag]))
		{
			$custom_tags['BBCODE_IMG'] = $icons[$tag];
			$event['custom_tags'] = $custom_tags;
		}
	}

	/**
	 * Tutte le faccine del forum (anche quelle non mostrate nel riquadro di scrittura),
	 * una per immagine come fa phpBB, divise tra quelle di serie e quelle personalizzate.
	 *
	 * @return array [[codice, file, descrizione, larghezza, altezza, gruppo], ...]
	 */
	protected function get_smilies()
	{
		$sql = 'SELECT code, emotion, smiley_url, smiley_width, smiley_height
			FROM ' . SMILIES_TABLE . '
			ORDER BY display_on_posting DESC, smiley_order ASC';
		$result = $this->db->sql_query($sql, 3600);

		$smilies = [];
		$seen = [];
		while ($row = $this->db->sql_fetchrow($result))
		{
			if (isset($seen[$row['smiley_url']]))
			{
				continue;
			}
			$seen[$row['smiley_url']] = true;

			$smilies[] = [
				$row['code'],
				$row['smiley_url'],
				$row['emotion'],
				(int) $row['smiley_width'],
				(int) $row['smiley_height'],
				in_array($row['smiley_url'], helper::PHPBB_SMILIES, true) ? 'phpbb' : 'custom',
			];
		}
		$this->db->sql_freeresult($result);

		return $smilies;
	}

	/**
	 * @return array [tag => percorso relativo alla root del forum]
	 */
	protected function get_icons()
	{
		if ($this->icons === null)
		{
			$this->icons = [];
			$ext = $this->icon_type();
			$dir = 'ext/salvocortesiano/editorplus/images/icons/';

			foreach ((array) glob($this->root_path . $dir . '*.' . $ext) as $file)
			{
				$this->icons[strtolower(basename($file, '.' . $ext))] = $dir . basename($file);
			}
		}

		return $this->icons;
	}

	/**
	 * Icone dei BBCode personalizzati per i menu nella barra standard di phpBB (senza ABBC3, i pulsanti non
	 * hanno icona): prima quelle di Editor Plus, poi quelle di ABBC3 (i file restano anche se è disabilitata).
	 *
	 * @return array [tag => percorso relativo alla radice del forum]
	 */
	protected function core_icons()
	{
		$icons = [];
		$own = $this->get_icons();
		$abbc3 = 'ext/vse/abbc3/images/icons/';
		$ext = $this->icon_type();

		foreach (helper::existing_bbcodes($this->db) as $tag)
		{
			$tag = strtolower($tag);
			if (isset($own[$tag]))
			{
				$icons[$tag] = $own[$tag];
				continue;
			}
			foreach (array_unique([$ext, 'png', 'svg']) as $type)
			{
				if (file_exists($this->root_path . $abbc3 . $tag . '.' . $type))
				{
					$icons[$tag] = $abbc3 . $tag . '.' . $type;
					break;
				}
			}
		}

		return $icons;
	}

	/**
	 * Motore dei BBCode di phpBB (caricato solo quando serve)
	 *
	 * @return \phpbb\textformatter\parser_interface|null
	 */
	protected function parser()
	{
		try
		{
			return $this->container ? $this->container->get('text_formatter.parser') : null;
		}
		catch (\Exception $e)
		{
			return null;
		}
	}

	/**
	 * @return bool
	 */
	protected function attach_unlimited()
	{
		global $auth;

		return isset($auth) && ($auth->acl_get('a_') || $auth->acl_get('m_'));
	}

	protected function is_admin()
	{
		global $auth;

		return isset($auth) && $auth->acl_get('a_');
	}

	/**
	 * Stesso formato di icone scelto nelle impostazioni di ABBC3 (png o svg)
	 *
	 * @return string
	 */
	protected function icon_type()
	{
		return $this->config['abbc3_icons_type'] === 'svg' ? 'svg' : 'png';
	}

	/**
	 * @return bool
	 */
	protected function fa_bbcode_exists()
	{
		$bbcode_id = (int) $this->config['editorplus_fa_bbcode_id'];

		if (!$bbcode_id)
		{
			return false;
		}

		$sql = 'SELECT bbcode_id
			FROM ' . BBCODES_TABLE . '
			WHERE bbcode_id = ' . (int) $bbcode_id;
		$result = $this->db->sql_query($sql, 3600);
		$exists = (bool) $this->db->sql_fetchfield('bbcode_id');
		$this->db->sql_freeresult($result);

		return $exists;
	}
}
