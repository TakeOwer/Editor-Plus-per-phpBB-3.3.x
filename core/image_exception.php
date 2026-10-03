<?php
/**
 *
 * Editor Plus
 * Errore delle immagini degli utenti: porta la chiave di lingua e i valori da inserire nel testo,
 * così chi la riceve (caricamento dal forum, ACP, Pannello utente) la traduce nella lingua giusta.
 *
 * @copyright (c) 2026 Salvo Cortesiano <https://netshadows.de/ombra>
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace salvocortesiano\editorplus\core;

class image_exception extends \RuntimeException
{
	/** @var string */
	protected $lang_key;

	/** @var array */
	protected $params;

	/**
	 * @param string $lang_key es. 'EP_IMG_ERR_TOO_BIG'
	 * @param array  $params   valori per i segnaposto della stringa
	 * @param int    $status   codice HTTP suggerito per la risposta
	 */
	public function __construct($lang_key, array $params = [], $status = 400)
	{
		parent::__construct($lang_key, (int) $status);
		$this->lang_key = (string) $lang_key;
		$this->params = $params;
	}

	/**
	 * @return string
	 */
	public function get_lang_key()
	{
		return $this->lang_key;
	}

	/**
	 * @return array
	 */
	public function get_params()
	{
		return $this->params;
	}

	/**
	 * Messaggio tradotto
	 *
	 * @param \phpbb\language\language $language
	 * @return string
	 */
	public function translate($language)
	{
		return call_user_func_array([$language, 'lang'], array_merge([$this->lang_key], $this->params));
	}
}
