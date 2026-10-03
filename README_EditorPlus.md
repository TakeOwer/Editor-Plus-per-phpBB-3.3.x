# Editor Plus per phpBB 3.3

![Versione](https://img.shields.io/badge/versione-1.0.42-blue) ![phpBB](https://img.shields.io/badge/phpBB-3.3.x-teal) ![PHP](https://img.shields.io/badge/PHP-7.4%2B-purple) ![Licenza](https://img.shields.io/badge/licenza-GPL--2.0-green)

**Editor Plus** (`salvocortesiano/editorplus`) potenzia la barra di scrittura di phpBB: menu per categoria, combo di immagini, faccine, icone ed emoji, colori con sfumature, anteprima dal vivo, formattazione mentre scrivi, editor visuale, bozze salvate sul server, codice colorato, formule matematiche e chimiche, calcolatrice scientifica, **immagini degli utenti in una cartella personale** (con gestione completa in ACP e nel Pannello utente) e una scheda **Check-up** che controlla da sola che tutto funzioni.

Funziona **con** Advanced BBCode Box (ABBC3) e **senza**: se ABBC3 è disabilitata o assente usa la barra standard di phpBB, con gli stessi menu per categoria.

Sviluppata da **Salvo Cortesiano** per *Le Ombre della Rete 360°* (netshadows.de/ombra).

---

## Indice

1. [Requisiti](#1-requisiti)
2. [Installazione, aggiornamento, disinstallazione](#2-installazione-aggiornamento-disinstallazione)
3. [La barra di scrittura](#3-la-barra-di-scrittura)
4. [Gli strumenti della barra](#4-gli-strumenti-della-barra)
5. [Colore del testo: sfumature e tavolozza classica](#5-colore-del-testo-sfumature-e-tavolozza-classica)
6. [Scrivere: aiuti automatici](#6-scrivere-aiuti-automatici)
7. [Editor visuale](#7-editor-visuale)
8. [Codice colorato `[syntax]`](#8-codice-colorato-syntax)
9. [Formule matematiche e chimiche `[math]` `[imath]`](#9-formule-matematiche-e-chimiche-math-imath)
10. [Calcolatrice scientifica](#10-calcolatrice-scientifica)
11. [GHide](#11-ghide)
12. [Bozze automatiche](#12-bozze-automatiche)
13. [Stampa / PDF](#13-stampa--pdf)
14. [Pannello utente: le preferenze di ciascuno](#14-pannello-utente-le-preferenze-di-ciascuno)
15. [Immagini degli utenti (cartella personale)](#15-immagini-degli-utenti-cartella-personale)
16. [Pannello di amministrazione (ACP)](#16-pannello-di-amministrazione-acp)
17. [Check-up](#17-check-up)
18. [Aggiornare KaTeX dall'ACP](#18-aggiornare-katex-dallacp)
19. [Sicurezza](#19-sicurezza)
20. [Risoluzione dei problemi](#20-risoluzione-dei-problemi)
21. [Struttura dei file](#21-struttura-dei-file)
22. [Storico delle versioni](#22-storico-delle-versioni)
23. [Licenze e crediti](#23-licenze-e-crediti)

---

## 1. Requisiti

| Cosa | Versione | Note |
|---|---|---|
| phpBB | 3.3.x | provata su 3.3.19 |
| PHP | 7.4 o successivo | consigliate le funzioni `mbstring`; `curl` o `allow_url_fopen` e `zlib` solo per aggiornare KaTeX dall'ACP |
| Advanced BBCode Box (`vse/abbc3`) | 3.3.12 o successiva | **facoltativa**: senza, si usa la barra standard di phpBB |
| GHide (`ntvy95/hide`) | qualsiasi | **facoltativa**: serve solo per il pulsante GHide |
| Database | MySQL / MariaDB, SQLite (e gli altri supportati da phpBB) | provata su MariaDB 10.11 e SQLite |
| Stili | prosilver, ForumUS e derivati | provata con entrambi |

---

## 2. Installazione, aggiornamento, disinstallazione

### Prima installazione

1. Copia la cartella `salvocortesiano/editorplus` in `ext/` del forum, così da avere `ext/salvocortesiano/editorplus/`.
2. ACP → **Personalizza** → **Gestisci estensioni** → *Editor Plus* → **Abilita**.
3. ACP → **Generale** → **Svuota la cache**. Serve a phpBB per registrare i BBCode `[syntax]`, `[math]` e `[imath]`.
4. Apri ACP → **Estensioni** → **Editor Plus** → **Check-up** ed esegui le **prove dal vivo**.

### Pacchetto delle combo di immagini

Il pacchetto `editorplus_pacchetto_ombre.zip` contiene la cartella `data/` con le combo del forum (`combos_ombre.json`). Mettila dentro `ext/salvocortesiano/editorplus/`, oppure importa il file JSON dalla scheda **Combo**.

### Aggiornamento a una nuova versione

1. Metti il forum **offline** (ACP → Impostazioni forum → Disattiva il forum).
2. **Disabilita** Editor Plus. Non usare "Cancella dati", o perdi impostazioni, combo e bozze.
3. Sostituisci la cartella `ext/salvocortesiano/editorplus` e rimetti anche `data/`.
4. **Riabilita** Editor Plus: phpBB esegue da solo gli aggiornamenti del database.
5. **Svuota la cache** dall'ACP.
6. Rimetti il forum online, poi esegui il **Check-up**.

> Il Check-up segnala se l'aggiornamento è rimasto a metà, per esempio se alcuni file non sono stati sovrascritti o se il browser usa ancora file vecchi.

### Disinstallazione

- **Disabilita**: Editor Plus si spegne, ma impostazioni, combo e bozze restano.
- **Cancella dati**: toglie tutto, cioè impostazioni, tabella delle bozze, preferenze degli utenti, copia di sicurezza di KaTeX, area di prova e file di stato.

I messaggi già scritti restano leggibili anche senza l'estensione: `[math]` e `[syntax]` si vedono come testo.

---

## 3. La barra di scrittura

Sopra la barra compare una **riga informativa**, che si può spegnere in ACP. Per esempio: *Editor Plus 1.0.37 · Editor: BBCode (barra ABBC3) · sviluppata da Salvo Cortesiano*. Indica la versione, la modalità (BBCode o visuale) e la barra in uso.

### Con ABBC3 oppure senza

| | Con ABBC3 | Senza ABBC3 (barra standard di phpBB) |
|---|---|---|
| Pulsanti dei BBCode personalizzati | nei **menu per categoria** | nei **menu per categoria**, con le icone di Editor Plus o di ABBC3 |
| Combo **Caratteri** | al posto del menu di ABBC3 | accanto al menu della dimensione, se esiste il BBCode `[font]` |
| Combo della **dimensione** | di Editor Plus | quella di phpBB, con lo stile di Editor Plus |
| Combo delle immagini, strumenti, GHide | ✔ | ✔ |

### Menu per categoria

I BBCode personalizzati sono raggruppati in **Testo, Effetti, Video e audio, Nascosti, Link e download, Strutture, Altro**. Ogni voce mostra icona, nome e descrizione. Le categorie si modificano in ACP, anche trascinando le voci. Chi usa un BBCode non ancora classificato lo trova in **Altro**.

### Combo delle immagini

Menu a tendina con filtro e **anteprima** delle voci, per esempio *Immagini e-Books* e *Immagini Film*. Si creano e si gestiscono in ACP nella scheda **Combo**. Una combo compare solo se il suo BBCode esiste sul forum.

### Aspetto

Tutti i menu a tendina della barra prendono lo stile di Editor Plus, **anche quelli aggiunti da altre estensioni** e anche se compaiono dopo il caricamento della pagina. Su schermi stretti gli strumenti vanno a capo invece di uscire dallo schermo.

---

## 4. Gli strumenti della barra

| Pulsante | Cosa fa |
|---|---|
| 💧 **Colore** | colore del testo con **sfumature** e tavolozza classica ([§5](#5-colore-del-testo-sfumature-e-tavolozza-classica)) |
| 😀 **Faccine** | tutte le faccine del forum in un riquadro, con ricerca |
| ⚑ **Icone** | icone Font Awesome, inserite con il BBCode `[fa]` |
| ☺ **Emoji** | emoji con ricerca in italiano e categorie, più le usate di recente |
| `</>` **Codice colorato** | finestra per inserire codice con i colori ([§8](#8-codice-colorato-syntax)) |
| x² **Formule** | formule matematiche e chimiche ([§9](#9-formule-matematiche-e-chimiche-math-imath)) |
| 🖩 **Calcolatrice** | calcolatrice scientifica ([§10](#10-calcolatrice-scientifica)) |
| 🔍 **Cerca e sostituisci** | con maiuscole/minuscole e "parola intera" |
| ▥ **Anteprima dal vivo** | il messaggio com'è, mentre scrivi, affiancato all'area di testo. Dalla sua barra: **Stampa / PDF** |
| ↶ ↷ **Annulla / Ripeti** | cronologia delle modifiche |
| ⤢ **Schermo intero** | barra e area di testo a tutto schermo |
| ⚙ **Opzioni** | correttore, formattazione mentre scrivi, segni font e size, editor visuale. Le scelte si salvano subito nel profilo |
| **GHide** | testo nascosto a tutti tranne a chi scegli ([§11](#11-ghide)) |
| **Visuale / BBCode** | passa dall'editor visuale ai codici e viceversa ([§7](#7-editor-visuale)) |

In fondo all'area di testo ci sono il **contatore** di caratteri e parole, l'avviso "Bozza salvata alle…" e, sulle icone ⓘ e ⌨, le informazioni e le scorciatoie.

### Scorciatoie da tastiera

| Tasti | Azione |
|---|---|
| `Ctrl+B` / `Ctrl+I` / `Ctrl+U` | grassetto / corsivo / sottolineato |
| `Ctrl+K` | link |
| `Ctrl+S` | salva la bozza |
| `Ctrl+Invio` | invia il messaggio. Nelle finestre (formule, codice) inserisce il contenuto |
| `Invio` (calcolatrice) | calcola |
| `Esc` | chiude la finestra aperta |

Su Mac si usa `⌘` al posto di `Ctrl`.

---

## 5. Colore del testo: sfumature e tavolozza classica

Il pulsante del colore (la **goccia**, sia nella barra di phpBB sia in quella di ABBC3) apre il pannello **Colore del testo**, con due schede. Il risultato è sempre il `[color=#rrggbb]…[/color]` di phpBB: nessun BBCode nuovo, e i messaggi restano leggibili ovunque.

### Scheda Sfumature

1. **Colore di partenza:** 14 colori base (rosso, arancione, giallo, verde, azzurro, blu, viola, rosa, marrone, grigio…).
2. **Sfumature:** sotto compaiono **11 tonalità dello stesso colore**, dalla più chiara alla più scura. Un clic sceglie quella giusta.
3. **Regolazione fine:**
   - il **quadrato**: da sinistra a destra il colore diventa più vivo, dall'alto in basso più scuro. Si trascina con il mouse o col dito, e si muove anche con le frecce della tastiera (con `Maiusc` a passi più grandi);
   - la **barra delle tinte** (arcobaleno) cambia colore mantenendo la sfumatura;
   - il **codice esatto** (`#1e88e5`, anche senza `#`). `Invio` applica;
   - il **contagocce**, per prendere un colore da qualsiasi punto dello schermo, nei browser che lo permettono (Chrome, Edge).
4. **Anteprima:** il testo selezionato appare con quel colore, sullo sfondo dei messaggi.
5. **Avviso di leggibilità:** se il colore si legge male sullo sfondo dei messaggi (contrasto sotto 3:1), un avviso consiglia una sfumatura più scura o più chiara.
6. **Usati di recente:** gli ultimi 12 colori, il più recente per primo. Il pannello riparte dall'ultimo usato.
7. **Applica il colore**: il colore viene messo attorno al testo selezionato.

Se il testo selezionato ha già un `[color=…]`, il pannello riparte da quel colore.

### Scheda Classica

La **tavolozza di sempre di phpBB** (125 colori): un clic e il colore è applicato. Il pannello ricorda l'ultima scheda usata.

### Opzioni in ACP

- **Selettore del colore con sfumature**: se spento, la goccia apre la tavolozza di phpBB come sempre.
- **Tavolozza classica di phpBB**: mostra o nasconde la scheda *Classica*.

Funziona anche nell'**editor visuale**, con la **formattazione mentre scrivi** e **senza ABBC3**.

---

## 6. Scrivere: aiuti automatici

- **Formattazione mentre scrivi.** Il testo appare già in grassetto, corsivo o colorato dentro l'area di testo, mentre i codici BBCode restano visibili ma sbiaditi. A scelta, segna con un colore il testo dentro `[size]` e `[font]`.
- **Immagini trascinate o incollate.** Vengono caricate come **allegati** e inserite nel messaggio.
- **Allegati nell'anteprima dal vivo.** Ogni `[attachment=N]` diventa un **riquadro con la miniatura** dell'immagine e il **nome sotto**, con dimensione ed eventuale commento. Un clic apre l'immagine intera.
  - **Posizione:** un allegato dopo il testo va **sotto**, su una riga sua. Più allegati di seguito (anche su righe separate) si affiancano come una piccola galleria, e il testo successivo resta sotto.
  - **Altri file** (pdf, zip, audio, video…): l'icona del loro tipo.
  - **Allegato eliminato:** il riquadro dice "Allegato non trovato".
  - **Miniature:** si usano quelle di phpBB quando esistono, altrimenti l'immagine rimpicciolita. Il contatore dei download non cambia.
- **Incolla da Word, Google Docs e pagine web** (nell'editor visuale). Il testo viene ripulito: grassetti fantasma, elenchi finti, commenti di Word, caratteri e dimensioni convertiti nelle misure di phpBB, titoli in grassetto, tabelle in righe di testo. Script, eventi, `javascript:` e iframe vengono **eliminati**.
- **Testo formattato incollato → BBCode** (anche senza editor visuale). Incollando da Word, Google Docs o una pagina web, grassetto, corsivo, sottolineato, colori, dimensioni, link, email, immagini, elenchi, citazioni e blocchi di codice diventano BBCode.
  - **Solo BBCode esistenti:** quelli che il forum non ha (per esempio `[s]` senza ABBC3) non vengono usati.
  - **Testo letterale:** dentro `[code]`, `[syntax]` e nelle formule si incolla il testo così com'è.
  - **Senza formattazione:** **Ctrl+Maiusc+V** incolla sempre il testo semplice, e Ctrl+Z annulla la conversione.
  - **Sicurezza:** script, eventi e `javascript:` vengono eliminati.
- **Limite di lunghezza.** Se il forum ha un limite di caratteri (ACP → Messaggi → Numero massimo di caratteri), la lunghezza viene contata **esattamente come la conta phpBB**: con i BBCode, un `&` vale 5 caratteri, un'emoji 1.
  - **Avvisi:** dal 90% un avviso arancione dice quanti caratteri restano; oltre il limite l'avviso diventa rosso.
  - **Invio fermato:** "Invia" e "Anteprima" vengono fermati prima, con un messaggio chiaro, perché phpBB rifiuterebbe comunque il messaggio, e **la bozza resta salvata**.
- **Area di testo che si allarga** mentre scrivi, invece della barra di scorrimento.
- **Contatore** di caratteri e parole.
- **Riconoscimento dei BBCode** anche quando phpBB modifica il testo da solo, per esempio quando elimini un allegato: anteprima, contatore e bozza si aggiornano, e `Ctrl+Z` funziona.

---

## 7. Editor visuale

Si attiva in ACP e, per ciascun utente, dal menu **Opzioni**. Mostra il testo già formattato invece dei codici. Il pulsante **Visuale / BBCode** passa dall'uno all'altro in qualsiasi momento.

- **BBCode personalizzati** (spoiler, hide, video…): diventano **blocchi**, come etichette oppure con l'**aspetto reale** del messaggio (opzione ACP). Un clic li apre in una finestra di modifica con anteprima.
- **Codice colorato e formule:** `[syntax]`, `[math]` e `[imath]` sono blocchi intoccabili, e il loro contenuto non viene mai alterato.
- **Protezione:** passando da BBCode a visuale e ritorno, il testo deve restare **identico**. Se non lo è, resti in modalità BBCode e il testo originale non viene toccato.

---

## 8. Codice colorato `[syntax]`

```
[syntax=php]
<?php echo "Ciao mondo"; ?>
[/syntax]
```

- **Colori per linguaggio:** PHP, JavaScript, HTML/XML, CSS, SQL, Python, Java, C/C++/C#, JSON, Bash e molti altri. Senza linguaggio viene riconosciuto da solo.
- **Nei messaggi:** numeri di riga, nome del linguaggio, pulsante **Copia**, tema chiaro o scuro (ACP).
- **Contenuto letterale:** BBCode e HTML dentro il codice **non** vengono interpretati.
- **Finestra "Colora codice":** `Tab` inserisce una tabulazione, c'è la conversione delle tabulazioni in spazi e la riformattazione automatica di HTML, CSS, JavaScript e JSON.
- **Opzione "Colora anche [code]":** colora anche i vecchi blocchi `[code]` di phpBB.
- **Leggero:** le librerie si scaricano solo nelle pagine che contengono codice.

---

## 9. Formule matematiche e chimiche `[math]` `[imath]`

Le formule si scrivono in **LaTeX** e vengono disegnate con **KaTeX**, veloce e leggero, scaricato solo nelle pagine che contengono formule.

| BBCode | Uso | Esempio |
|---|---|---|
| `[math]…[/math]` | formula **a sé**, centrata | `[math]x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}[/math]` |
| `[imath]…[/imath]` | formula **dentro il testo** | `l'area è [imath]\pi r^2[/imath] metri quadri` |

### La finestra Formule (pulsante x²)

- **Tavolozza a schede:** *Base, Frazioni e potenze, Greco, Analisi, Insiemi e logica, Matrici e sistemi, Chimica*. Un clic inserisce il simbolo, e se c'è testo selezionato finisce dentro: seleziona `x`, premi √ e ottieni `\sqrt{x}`.
- **14 modelli pronti:** secondo grado, Pitagora, Eulero, Einstein, derivata, integrale di Gauss, binomio di Newton, sistema, determinante, Schrödinger, energia del fotone, combustione del metano, sintesi dell'ammoniaca, decadimento del carbonio-14.
- **Anteprima dal vivo** e messaggio chiaro se la formula è sbagliata.
- **Scelta** tra "A sé (centrata)" e "Nel testo".
- **Formula già scritta:** selezionala e apri la finestra per modificarla.
- **Tutti i comandi disponibili:** nel link della finestra (documentazione di KaTeX).

### Promemoria LaTeX

| Scrivi | Ottieni |
|---|---|
| `x^2`, `x_{i}` | potenza, pedice |
| `\frac{a}{b}` | frazione |
| `\sqrt{x}`, `\sqrt[3]{x}` | radice quadrata, cubica |
| `\alpha \beta \pi \Omega` | lettere greche |
| `\sum_{i=1}^{n}`, `\int_a^b`, `\lim_{x\to 0}` | sommatoria, integrale, limite |
| `\le \ge \neq \approx \infty` | ≤ ≥ ≠ ≈ ∞ |
| `\begin{pmatrix} a & b \\ c & d \end{pmatrix}` | matrice |
| `\begin{cases} x+y=1 \\ x-y=0 \end{cases}` | sistema |

### Chimica con `\ce{…}`

| Scrivi | Significato |
|---|---|
| `\ce{H2O}` | formula (i numeri diventano pedici) |
| `\ce{CH4 + 2O2 -> CO2 + 2H2O}` | reazione |
| `\ce{N2 + 3H2 <=> 2NH3}` | equilibrio |
| `\ce{SO4^2-}` | ione |
| `\ce{^{14}_{6}C}` | isotopo |
| `\ce{A ->[\Delta] B}` | condizioni sulla freccia |

> **Sicurezza:** dalle formule non si possono creare collegamenti, immagini o HTML. `\href`, `\url` e `\includegraphics` vengono bloccati. Se la funzione è spenta, le formule restano leggibili come testo LaTeX.

---

## 10. Calcolatrice scientifica

Si apre con il pulsante 🖩. È anche una scheda della finestra Formule. Il risultato compare **mentre scrivi**, e **Invio** o `=` lo conferma.

### Cosa sa fare

| Tipo | Esempi | Risultato |
|---|---|---|
| Aritmetica | `2+3*4` · `(2+3)*4` · `2^3^2` | 14 · 20 · 512 |
| Virgola italiana | `12,5*3` | 37,5 |
| Moltiplicazione implicita | `2pi` · `3(4+1)` · `2√3` | 6,283… · 15 · 3,464… |
| Percentuali | `80*15%` | 12 |
| Radici e potenze | `√16` · `cbrt(27)` · `root(32;5)` · `(-8)^(1/3)` | 4 · 3 · 2 · −2 |
| Logaritmi | `ln(e^2)` · `log(1000)` · `log2(1024)` · `logb(81;3)` | 2 · 3 · 10 · 4 |
| Trigonometria (DEG/RAD) | `sin(30)` in gradi · `sin(pi/2)` in radianti | 0,5 · 1 |
| Combinatoria | `5!` · `nCr(10;3)` · `nPr(5;2)` | 120 · 120 · 20 |
| **Numeri complessi** | `sqrt(-4)` · `(3+4i)/(1-2i)` · `e^(i*pi)` · `abs(3+4i)` | 2i · −1 + 2i · −1 · 5 |
| **Costanti atomiche** | `h*c/(500e-9)` (fotone da 500 nm) · `me*c^2/eV` | 3,97·10⁻¹⁹ J · 510998,95 eV |
| Ultimo risultato | `Ans*2` | |

**Separatore degli argomenti:** `;`, per esempio `nCr(10;3)`, perché la virgola è il separatore decimale.

### Funzioni

`sqrt` `cbrt` `root(x;n)` `abs` `arg` `conj` `re` `im` `exp` `ln` `log` `log2` `logb(x;b)` `sin` `cos` `tan` `asin` `acos` `atan` `sinh` `cosh` `tanh` `floor` `ceil` `round` `mod(a;b)` `nCr(n;k)` `nPr(n;k)` e i simboli `!` `%` `^`.

### Costanti (menu "Costanti…", valori CODATA)

| Nome | Costante | Nome | Costante |
|---|---|---|---|
| `pi` | π | `NA` | numero di Avogadro |
| `e` | numero di Nepero | `kB` | costante di Boltzmann |
| `phi` | sezione aurea | `R` | costante dei gas |
| `c` | velocità della luce | `F` | costante di Faraday |
| `h` | costante di Planck | `G` | costante gravitazionale |
| `hbar` | Planck ridotta (ħ) | `g0` | accelerazione di gravità |
| `qe` | carica elementare | `a0` | raggio di Bohr |
| `me` | massa dell'elettrone | `eps0` | permittività del vuoto |
| `mp` | massa del protone | `mu0` | permeabilità del vuoto |
| `mn` | massa del neutrone | `sigma` | Stefan-Boltzmann |
| `u` | unità di massa atomica | `alpha` | struttura fine |
| `eV` | elettronvolt | `Ry` | costante di Rydberg |

### Altro

- **DEG / RAD:** gradi o radianti. La scelta viene ricordata.
- **Memoria:** `MC` `MR` `M+` `M−`.
- **Cronologia:** gli ultimi 20 calcoli; un clic ne riusa uno.
- **Inserimento nel messaggio:** **il risultato** (`42`), **il calcolo** (`7*6 = 42`) oppure **come formula** (`[math]7 \cdot 6 = 42[/math]`).
- **Errori chiari:** divisione per zero, fuori dominio, parentesi non bilanciate, nome sconosciuto…
- **Sicurezza:** l'espressione viene letta da un interprete apposito e **non viene mai eseguita come codice**.

---

## 11. GHide

Se sul forum c'è l'estensione **ntvy95/hide**, Editor Plus aggiunge **GHide**: testo visibile solo a chi scegli. Si trova nel menu **Nascosti**, o come pulsante separato se lo chiedi in ACP.

- **Quando rispondi a un altro utente**, il menu propone *Autore dell'argomento*, *Io* o *Entrambi*.
- **Gruppi:** in ACP scegli quelli che vedono sempre il testo nascosto (per esempio i moderatori).
- **Riconoscimento:** `[ghide]` viene riconosciuto anche se non è registrato come BBCode di phpBB, perché Editor Plus controlla se è usato nei messaggi. Se serve, c'è l'opzione "Forza riconoscimento".

---

## 12. Bozze automatiche

Mentre scrivi, la bozza viene salvata da sola: in fondo all'area compare *"Bozza salvata alle 10:27"*.

- **Utenti registrati:** la bozza è salvata **sul server** e anche nel browser. Tornando nella stessa sezione compare il riquadro *"C'è una bozza non inviata… Ripristina / Elimina"*, **da qualsiasi browser, dispositivo o indirizzo** (con o senza `www`, `http` o `https`).
- **Allegati:** la bozza ricorda anche gli **allegati caricati**, compresi i commenti. Ripristinandola, gli allegati tornano nell'elenco di phpBB (scheda *Allegati*) come se li avessi appena caricati, con "Inserisci nel messaggio" ed "Elimina" funzionanti. Inviando il messaggio, gli allegati restano attaccati.
  - **Verifica:** tornano solo gli allegati che esistono ancora, sono **tuoi** e non sono già in un altro messaggio. Nome e dimensione vengono dal server, non dalla bozza.
  - **Rinumerazione:** se nella pagina avevi già caricato altri allegati, i `[attachment=N]` del testo vengono rinumerati da soli e puntano sempre al file giusto.
  - **Avviso:** se un allegato non è più disponibile (per esempio eliminato), lo leggi accanto a "Bozza ripristinata".
  - **Bozza aggiornata:** caricare o eliminare un allegato aggiorna la bozza anche se il testo non cambia.
- **Pulizia automatica.** Una volta al giorno (con il cron di phpBB) vengono tolte le bozze scadute di **tutti** gli utenti, anche di chi non torna più.
  - **Allegati orfani:** cioè caricati e mai inviati, per esempio da bozze abbandonate. Si possono cancellare dopo un numero di giorni scelto in ACP, file compresi. Di serie questa parte è spenta (0 giorni).
  - **Nel Check-up:** quanti sono, quanto pesano, quando è stata fatta l'ultima pulizia, e il pulsante **"Pulisci ora"**.
- **Ospiti:** solo nel browser.
- **Messaggi onesti:** "Bozza salvata" compare solo se il salvataggio è riuscito davvero. Altrimenti leggi *"salvata solo in questo browser"* oppure, in rosso, *"Bozza NON salvata"*.
- **Pulizia:** inviando il messaggio o premendo **Elimina** la bozza sparisce ovunque. Le bozze vecchie si tolgono da sole (giorni scelti in ACP, massimo 30 per utente). Ognuno vede solo le proprie.
- **Codifica:** testo e titolo viaggiano e vengono salvati **codificati**, quindi emoji e HTML non creano problemi con database datati o firewall del server.

---

## 13. Stampa / PDF

Nell'**anteprima dal vivo** c'è il pulsante **"Stampa / PDF"**. Prepara una pagina pulita del messaggio che stai scrivendo e apre la finestra di stampa del browser. Da lì puoi stampare oppure scegliere **"Salva come PDF"**.

**Dove si trova:** apri l'**anteprima dal vivo** (pulsante con il riquadro diviso in due colonne nella barra); il pulsante **"Stampa / PDF"** è nella barra blu dell'anteprima, a destra, accanto alla X.

**Impostazioni di stampa.** Prima della finestra del browser (che non permette di cambiare carattere e dimensioni) si apre il pannello di Editor Plus, con l'**anteprima della pagina A4** e il **numero di pagine**, aggiornati a ogni scelta:

| Impostazione | Scelte (di serie in grassetto) |
|---|---|
| Adatta alla pagina | **no**, tutto in 1 pagina A4 (anche con il pulsante **"Adatta a 1 pagina A4"** accanto al numero di pagine) |
| Carattere | **Serif (Georgia)**, senza grazie (Arial), monospazio, come nel messaggio |
| Dimensione del testo | da 9 a 14 punti (**11**) |
| Dimensioni del messaggio (`[size]`) | **attenuate** (titoli e testi ingranditi restano riconoscibili, senza far esplodere la pagina), tutte uguali, originali |
| Interlinea | compatta, **normale**, ampia |
| Righe vuote | **ridotte** (un piccolo spazio tra i paragrafi), come nel messaggio |
| Margini | stretti 10 mm, **normali 15 mm**, ampi 22 mm |
| Immagini | grandi, **medie**, piccole |
| Intestazione | **titolo, autore e data**, nessuna |
| Colori | **originali**, bianco e nero |
| Stile del forum | **no (pagina pulita)**, sì |

- **Adatta a 1 pagina A4:** riduce tutto in proporzione (testo, immagini, spazi) quanto basta per stare in una pagina; accanto al numero di pagine compare la riduzione (es. "ridotto al 57%"). Se il messaggio non ci sta nemmeno ridotto al 45% (sotto non si leggerebbe più), il pannello lo dice in rosso e indica quante pagine servono comunque.
- **Memoria:** le scelte vengono ricordate per le stampe successive; **"Valori consigliati"** le riporta a quelle di serie.
- **Stile del forum:** di serie la pagina **non usa lo stile del forum**, che può ingrandire il testo o stringere la pagina (per esempio ForumUS ingrandisce del 30% il testo dei messaggi). Usa solo gli stili di formule, codice colorato e BBCode di ABBC3, più regole proprie per citazioni, codice, elenchi e tabelle.
- **Stima delle pagine:** è calcolata sulla pagina A4 vera, con i margini scelti, e coincide con il risultato. Le impostazioni della stampante possono cambiarla: per esempio "Intestazioni e piè di pagina" del browser, o un altro formato di carta.

**Nella pagina di stampa**
- **Intestazione:** il titolo dell'argomento, l'autore, la data e il nome del forum.
- **Messaggio formattato:** formule disegnate, codice colorato (senza pulsanti e con le righe lunghe che vanno a capo), colori ed emoji.
- **Allegati a piena risoluzione**, con il nome sotto. Le immagini non si spezzano tra due pagine.
- **Colori leggibili:** quelli troppo chiari per la carta bianca vengono scuriti, mantenendo la stessa tinta.

**Spoiler e contenuti nascosti**
- **Spoiler** (`[spoiler]`, `[spoil]`…): stampati **aperti per tutti**, con il loro titolo.
- **Contenuti nascosti** (`[hidden]`, `[ghide]`, `[hhide]`, `[password]`…): stampati **solo** per i membri dei **gruppi autorizzati in ACP**, di serie Amministratori e Moderatori globali, in un riquadro con l'etichetta "Contenuto nascosto". Per tutti gli altri, al loro posto compare *"[Contenuto nascosto: non stampabile]"*, con una nota in fondo alla pagina.
- **Controllo sul server:** a decidere è il server, non il browser. Il testo nascosto non arriva mai nella pagina di chi non può stamparlo, nemmeno chiedendolo direttamente al server.
- **Codice e formule:** un `[hidden]` scritto **dentro** `[code]`, `[syntax]` o una formula è testo e viene stampato com'è.

**In ACP** (Impostazioni → Stampa / PDF):
- l'interruttore della funzione;
- i **gruppi** che possono stampare i contenuti nascosti;
- l'elenco dei BBCode **nascosti** e quello dei BBCode **spoiler**, perché ogni forum ha i suoi.

---

## 14. Pannello utente: le preferenze di ciascuno

Pannello utente → **Preferenze** → **Editor Plus**. Ogni utente può accendere o spegnere, **solo per sé**, le funzioni che l'amministratore ha lasciato accese:

- salvataggio automatico della bozza;
- area di testo che si allarga;
- contatore di caratteri e parole;
- scorciatoie da tastiera;
- anteprima dal vivo sempre aperta;
- anteprima delle voci delle combo;
- immagini trascinate o incollate (nella propria cartella, o come allegati se le immagini utenti sono spente);
- faccine nella barra, con il riquadro a destra tolto;
- formattazione mentre scrivi e segni per dimensione e carattere;
- editor visuale;
- correttore ortografico del browser.

Le opzioni del menu **⚙ Opzioni** della barra si salvano subito nel profilo, senza ricaricare la pagina.

---

## 15. Immagini degli utenti (cartella personale)

Dalla **1.0.38** le immagini che un utente trascina nell'area di testo, incolla con Ctrl+V o sceglie con il pulsante 🖼 **Le mie immagini** non diventano più allegati: finiscono nella **sua cartella personale** dentro la cartella degli allegati di phpBB (di solito `files/`), e nel messaggio entra il BBCode `[img]`. Tutti gli altri file (zip, pdf…) restano **allegati di phpBB**, come prima.

### La cartella dell'utente

- Nome: **nome utente ripulito + ID**. *Salvo Cortesiano* con ID 2 → `files/salvo_cortesiano_2/`; *Mario Rossì* con ID 58 → `files/mario_rossi_58/` (accenti, spazi e simboli tolti).
- Il nome nasce al **primo caricamento** e poi **non cambia più**, anche se l'utente cambia nome: i link nei vecchi messaggi restano validi.
- Dentro: le immagini, la sottocartella `thumbs/` con le miniature, un `.htaccess`, una pagina vuota `index.htm` (niente elenco dei file) e il file segnaposto `.editorplus`. **Senza il segnaposto l'estensione non cancella mai una cartella**, quindi non può toccare cartelle che non sono sue.
- Il `.htaccess` apre alla lettura **solo** quella cartella (il resto di `files/` resta chiuso come vuole phpBB) e blocca qualsiasi file che non sia un'immagine: PHP, HTML, SVG, JS… Ha la stessa struttura di quello di phpBB, quindi vale per Apache 2.2, 2.4 e LiteSpeed.

### Cosa succede a un'immagine caricata

1. **Nel browser:** se supera le misure massime (di serie 1920×1920) o il peso massimo, viene rimpicciolita **prima dell'invio** (le foto del telefono da 5–10 MB diventano poche centinaia di KB). Le immagini animate non vengono toccate.
2. **Invio con barra di avanzamento** e percentuale reale.
3. **Sul server:** il tipo viene riconosciuto dal **contenuto** del file (non dal nome); l'immagine viene **riaperta e salvata di nuovo**: foto raddrizzata secondo l'EXIF, misure massime rispettate, **dati nascosti tolti** (EXIF, posizione GPS, modello del telefono) e qualsiasi codice infilato nel file eliminato.
4. GIF, PNG e WebP **animate** restano animate. Non vengono ricodificate (si perderebbe l'animazione), ma il file viene **ricostruito con i soli dati dell'immagine**: commenti, dati EXIF e **GPS**, XMP, testi e tutto ciò che sta dopo la fine del file vengono tolti, quindi anche l'eventuale codice nascosto lì. Fotogrammi e pixel restano identici. Un file che non si lascia analizzare correttamente viene **rifiutato**.
5. **Server senza GD** per un formato: l'immagine non può essere ridimensionata né raddrizzata, ma viene comunque ripulita come sopra (anche i JPEG perdono EXIF e GPS). Il Check-up segnala la mancanza di GD.
5. Il **nome del file** lo sceglie l'estensione: nome originale ripulito + 6 caratteri casuali (`tramonto-a1b2c3.jpg`). Un file `.php` non può mai finire nella cartella.
6. Miniatura (di serie 300 px) se l'immagine è più grande.
7. Nel messaggio: `[img]link[/img]`, oppure, se scelto in ACP, la miniatura cliccabile `[url=link][img]miniatura[/img][/url]`.

Formati: **JPG, PNG, GIF, WebP** (scegli quali in ACP). BMP, TIFF, SVG e altri non vengono accettati come immagini.

### Chi può caricare: gruppi e limiti

ACP → Editor Plus → **Immagini utenti** → **Impostazioni e gruppi**. Per ogni gruppo:

| | |
|---|---|
| **Può caricare** | *Non impostato* (il gruppo non dà né toglie), *Sì*, *Mai* |
| **Peso massimo per immagine** | in KB |
| **Numero massimo di immagini** | per utente |
| **Spazio massimo per utente** | in MB |

**Serve anche un permesso per scrivere** (opzione attiva di serie): oltre al gruppo autorizzato, l'utente deve poter scrivere almeno in un modo, cioè aprire argomenti o rispondere in una sezione, mandare messaggi privati o avere una firma. Così il forum non diventa un hosting di immagini per chi non scrive. Si spegne in *Impostazioni e gruppi*.

0 = senza limite. Chi è in più gruppi ha **il limite più generoso** tra i suoi gruppi; **"Mai" vince su tutto** (come il MAI dei permessi di phpBB). Il peso massimo non supera comunque il limite di PHP del server (`upload_max_filesize`, `post_max_size`), che la pagina mostra.

Di serie: Amministratori sì (10 MB, senza limiti), Moderatori globali sì (5 MB, 500 MB di spazio), Utenti registrati sì (2 MB, 200 immagini, 100 MB), **Nuovi utenti registrati: Mai** (tolgono il permesso finché l'utente non esce da quel gruppo; si cambia con un clic).

Chi non può caricare, trascinando o incollando un'immagine riceve un avviso chiaro e l'immagine **non** viene caricata come allegato.

### Nell'editor: pannello "Le mie immagini"

Pulsante 🖼 nella barra: spazio usato e limiti, pulsante **Carica immagini**, tutte le proprie immagini in miniatura. **Clic su una miniatura** = la inserisce nel messaggio. 🔍 la ingrandisce (frecce, tastiera, scorrimento col dito, link e BBCode da copiare); 🗑 la elimina (se l'amministratore lo permette).

### Pannello utente → Panoramica → **Le mie immagini**

Spazio usato con barra, zona di caricamento (trascina o scegli, una barra per file), griglia delle proprie immagini, ingrandimento al clic, **Seleziona tutte**, **Elimina selezionate**, **Elimina tutte** (sempre con conferma). Ognuno vede e cancella **solo le sue**. L'IP lo vede solo l'amministratore.

### ACP → Editor Plus → **Immagini utenti**

In cima: badge e totali (cartelle, immagini, spazio occupato).

**Utenti e immagini:** elenco delle cartelle con utente (link alla sua scheda ACP), nome della cartella, numero di immagini, spazio, ultimo caricamento; **ricerca** per nome utente o cartella, ordinamento, pagine. **Apri** mostra le immagini di quell'utente:

- intestazione con percorso, numero e spazio, permesso e limiti dell'utente, barra dello spazio;
- miniature con nome, misure, peso, **data** e **IP**; al clic si **ingrandiscono** (frecce/tastiera), con **link** e **BBCode** da copiare, **Apri originale**, **Dove è usata?** (cerca nei messaggi, nei messaggi privati e nelle firme, con i link ai messaggi) ed **Elimina**;
- **Elimina selezionate**, **Elimina tutte le immagini**, **Elimina la cartella completa**; ordinamento per data, peso, nome.

Ogni cancellazione chiede conferma e finisce nel **registro amministrazione**.

**Impostazioni e gruppi:** acceso/spento, tipo di link, formati, misure massime, qualità JPEG/WebP, lato delle miniature, cosa inserire nel messaggio, utenti che cancellano le proprie immagini, permesso per scrivere richiesto, cosa fare con la cartella quando l'utente viene cancellato (sempre / solo con i messaggi / mai), tabella dei gruppi.

### Tipo di link

- **Link diretto alla cartella** (di serie): `https://forum/files/mario_rossi_58/foto-a1b2c3.jpg`. Il server manda il file da solo: il modo più leggero.
- **Tramite l'estensione**: `https://forum/app.php/editorplus/img/mario_rossi_58/foto-a1b2c3.jpg`. Il file passa da phpBB. Serve solo se il server **ignora** il `.htaccess` della sottocartella. Il **Check-up** lo prova dal vivo; se scegli questo tipo, vale per le immagini caricate da quel momento (quelle con link diretto continuano a funzionare se il server le apre).

### Immagine eliminata dall'editor

Se elimini un'immagine dal caricatore (finestra "Le mie immagini" nell'editor), dopo la conferma (la finestra di conferma di phpBB, con l'aspetto dello stile del forum) il suo link viene **tolto anche dal messaggio** che stai scrivendo: immagine intera, miniatura cliccabile, link diretto o tramite l'estensione. Se il link stava da solo su una riga, sparisce anche la riga vuota. Un avviso dice quanti link sono stati tolti, e **Ctrl+Z** li rimette. Con l'editor visuale attivo il testo non viene toccato: un avviso invita a togliere l'immagine a mano.

### Utente cancellato

Quando un utente viene eliminato (dall'ACP, o da altre estensioni che usano la funzione di phpBB), la sua cartella viene trattata secondo l'impostazione *Elimina le immagini con l'utente*:

| Scelta | Cosa succede |
|---|---|
| **Sempre** (di serie) | la cartella completa viene eliminata; se avevi scelto di tenere i suoi messaggi, le immagini in quei messaggi risultano rotte |
| **Solo se si cancellano anche i messaggi** | cancellando l'utente *con* i messaggi la cartella sparisce; cancellandolo *tenendo* i messaggi le immagini restano, così i messaggi non hanno link rotti |
| **Mai** | la cartella resta sempre (si può cancellare a mano dall'ACP) |

Ogni eliminazione finisce nel registro amministrazione. Se l'aggiornamento dell'estensione è rimasto a metà e le tabelle delle immagini mancano, la cancellazione dell'utente si completa comunque, senza errori.

### Spegnere la funzione

Con *Caricamento immagini nella cartella dell'utente = No* le immagini trascinate o incollate tornano allegati di phpBB (come fino alla 1.0.37), il pulsante 🖼 e la pagina del Pannello utente spariscono. Le immagini già caricate restano dove sono e i loro link funzionano.

### Check-up

Gruppo **Immagini degli utenti**: acceso/spento e tipo di link, tabelle, GD (JPEG/PNG/GIF/WebP), EXIF, cartella `files/` scrivibile, limiti di PHP, gruppi autorizzati, **prova di elaborazione** (un'immagine 2400×1600 creata, salvata, rimpicciolita e ridotta in miniatura, poi cancellata), `.htaccess` di ogni cartella, **archivio e cartelle allineati**.

Prove dal vivo: **Link diretto alla cartella** (il browser apre un'immagine di prova in `files/editorplus_prova_0/`), **PHP bloccato nelle cartelle** (un file PHP messo lì apposta NON deve essere eseguito), **Link tramite l'estensione**.

Pulsante **Riallinea immagini e cartelle**: riscrive i `.htaccess`, elimina le cartelle di utenti che non esistono più, registra di nuovo cartelle e immagini presenti sul disco ma non nell'archivio, toglie le schede senza file.

> **"Cancella dati" per sbaglio?** Le tabelle spariscono ma **le cartelle con le immagini restano sul disco** (e i link nei messaggi continuano a funzionare). Dopo aver riabilitato l'estensione, Check-up → **Riallinea immagini e cartelle** le registra tutte di nuovo (senza IP, con la data del file).

---

## 16. Pannello di amministrazione (ACP)

ACP → **Estensioni** → **Editor Plus**. In cima a ogni pagina ci sono i riquadri con la versione di Editor Plus, PHP, phpBB, ABBC3 e la licenza.

### Scheda Impostazioni

Le opzioni sono divise in **schede**: *Barra*, *Scrittura e bozze*, *Codice, formule e colore*, *Stampa*, *GHide*, *Diagnostica*.
- **Ultima scheda:** viene ricordata, e si apre anche con un collegamento (per esempio `…&mode=settings#ghide`).
- **Salvataggio:** il pulsante salva **tutte** le schede, non solo quella aperta.
- **Campo non valido:** se un campo non è valido, la sua scheda si apre da sola.

Ogni funzione si accende o si spegne. I gruppi principali sono:

- **Barra e strumenti:** menu per categoria, combo caratteri e dimensione, combo delle immagini, faccine (e riquadro faccine), icone `[fa]`, emoji, cerca e sostituisci, annulla/ripeti, schermo intero, contatore, altezza automatica, scorciatoie, menu Opzioni, riga informativa.
- **Scrittura e bozze:** anteprima dal vivo, anteprima delle combo, immagini trascinate come allegati, formattazione mentre scrivi, conversione in BBCode del testo incollato, bozze automatiche (con i giorni di conservazione), pulizia automatica e giorni per gli allegati orfani.
- **Editor visuale:** attivazione e aspetto reale dei BBCode personalizzati.
- **GHide:** attivazione, pulsante anche in prima riga, gruppi che vedono sempre, scelta predefinita (autore / io / entrambi), forza riconoscimento.
- **Categorie:** quali BBCode vanno in quale menu (anche trascinando le voci), BBCode da nascondere, ripristino delle categorie predefinite.
- **Colore del testo:** selettore con sfumature; tavolozza classica di phpBB come scheda.
- **Stampa / PDF:** attivazione, gruppi che possono stampare i contenuti nascosti, elenchi dei BBCode nascosti e spoiler.
- **Codice colorato:** attivazione, tema chiaro o scuro, larghezza della tabulazione, "colora anche [code]".
- **Formule e calcolatrice:** i due interruttori.
- **Avviso su ABBC3:** se ABBC3 è disabilitata, assente o con la barra spenta, un riquadro lo spiega con il collegamento per sistemarlo.

### Scheda Combo

- Elenco delle combo con **ordinamento**, accensione e spegnimento.
- Creazione e modifica: nome, BBCode, voci con immagine e testo, **anteprima dal vivo**.
- **Importazione ed esportazione** in JSON, per esempio il pacchetto `combos_ombre.json`.

### Scheda Immagini utenti

Vedi il [capitolo 15](#15-immagini-degli-utenti-cartella-personale).

### Scheda Check-up

Vedi il paragrafo successivo.

---

## 17. Check-up

ACP → Editor Plus → **Check-up**. Controlla pezzo per pezzo tutto ciò da cui Editor Plus dipende e **non modifica nulla**. Ogni riga ha l'esito **OK / Da vedere / Problema**, il dettaglio e cosa fare. In cima c'è il riepilogo.

### Controlli automatici

| Gruppo | Cosa controlla |
|---|---|
| **Ambiente** | PHP, phpBB, stato di ABBC3, funzioni PHP necessarie |
| **File dell'estensione** | presenza dei file essenziali e **stessa versione per tutti** (trova gli aggiornamenti rimasti a metà) |
| **Installazione** | aggiornamenti del database, tabella delle bozze, preferenze utenti, schede ACP, indirizzi di servizio |
| **BBCode** | stampa (gruppi autorizzati ancora esistenti, elenchi), selettore del colore (come è impostato), `[fa]`, `[font]`, `[ghide]`, combo accese senza il loro BBCode |
| **Motore dei BBCode** | prova vera di interpretazione e visualizzazione, `[syntax]`, `[math]` e `[imath]` con contenuto letterale |
| **Formule e calcolatrice** | versione di KaTeX e copia di sicurezza, caratteri completi (indica quale manca), aggiornamento dall'ACP possibile, stato delle funzioni |
| **Dati** | caratteri non validi in faccine e BBCode, dati delle combo, categorie, gruppi GHide ancora esistenti, bozze salvate |

### Prove dal vivo

Pulsante **"Esegui le prove dal vivo"**. Le prove passano dal browser, come farebbe un utente.

| Prova | Cosa verifica |
|---|---|
| **Barra nella pagina di scrittura** | apre la pagina in modo invisibile, senza inviare nulla: Editor Plus deve partire senza errori, con la versione giusta, con i pulsanti Formule e Calcolatrice se accesi e con la goccia che apre il pannello del colore. Segnala anche se il browser usa file vecchi o se il server vieta i riquadri |
| **Anteprima dal vivo** | richiesta vera al server |
| **Formule (KaTeX)** | disegna 6 formule, chimica compresa, e controlla i caratteri |
| **Calcolatrice** | 10 calcoli con risultato noto, più 2 che devono dare errore |
| **Bozze sul server** | salva, rilegge identica e cancella una bozza semplice e una con emoji e HTML. In caso di errore mostra la **risposta esatta del server** (errore del database o pagina del firewall) |

**"Copia referto"** copia tutto l'esito in testo semplice, da incollare in una richiesta di aiuto.

### Pulizia dei dati

Bozze scadute da togliere; allegati orfani (numero e peso) e quanti verranno cancellati con l'impostazione attuale; data dell'ultima pulizia; pulsante **"Pulisci ora"**. Ogni pulizia viene annotata nel registro amministratori.

---

## 18. Aggiornare KaTeX dall'ACP

Check-up → sezione **"Aggiornamento di KaTeX"**.

1. **Controlla gli aggiornamenti.** Propone l'ultima versione della **stessa serie**, che è compatibile. A parte, con avviso e conferma, propone l'eventuale **nuova serie**.
2. **Scarica e prova.** Una barra di avanzamento con **percentuale vera** mostra 6 fasi:
   - *Controllo delle versioni*
   - *Scaricamento*, con i byte reali: "721 KB di 1,4 MB", 49%
   - *Verifica dell'impronta digitale* (sha512)
   - *Estrazione dei file*
   - *Preparazione nell'area di prova*
   - *Prova nel browser*, formula per formula e poi i caratteri
3. **Attiva la versione preparata.** Il pulsante si abilita **solo se la prova passa**.
4. **Ripristina.** La versione precedente resta in `store/editorplus_katex_backup/` e si rimette con un clic. La versione tolta diventa la nuova copia, quindi puoi anche tornare avanti.

**Dettagli**
- Se qualcosa va storto, la barra diventa **rossa**, si ferma nella fase esatta e spiega il motivo. La versione in uso non viene toccata.
- Gli aggiornamenti e i ripristini finiscono nel **registro amministratori**.
- I browser usano subito i file nuovi, perché il loro indirizzo cambia.

> **Nota:** ricaricando la cartella di Editor Plus da uno zip, KaTeX torna alla versione contenuta nello zip. Ogni nuova versione di Editor Plus include comunque KaTeX aggiornato.

**Requisiti sul server:** possibilità di scaricare (cURL o `allow_url_fopen`), `zlib`, cartelle dell'estensione e `store/` scrivibili. Il Check-up dice se tutto questo c'è.

---

## 19. Sicurezza

- **Pagine ACP:** solo per gli amministratori con il permesso di gestire il forum. Le azioni sono protette da codici anti-falsificazione.
- **Richieste AJAX** (anteprima, preferenze, bozze): protette allo stesso modo. Le bozze sono sempre dell'utente che le ha scritte.
- **Codice colorato e formule:** contenuto letterale, nessun HTML o BBCode interpretato. Le formule non possono creare link, immagini o HTML.
- **Incolla da pagine web:** script, eventi, `javascript:` e iframe eliminati. Immagini solo `http` e `https`.
- **Calcolatrice:** interprete dedicato, niente esecuzione di codice. Vengono accettati solo nomi di funzioni e costanti dichiarati.
- **Aggiornamento di KaTeX:**
  - scaricamento solo da `registry.npmjs.org`, con indirizzo dell'archivio verificato;
  - **impronta sha512** obbligatoria;
  - **elenco chiuso** dei file estratti: nessun file `.php`, nessun percorso con `..`;
  - limiti di dimensione;
  - prova prima dell'attivazione e copia di sicurezza.
- **Immagini degli utenti:** tipo riconosciuto dal contenuto; immagini fisse risalvate (via EXIF, GPS e codice nascosto); animate controllate; nomi dei file scelti dall'estensione (solo lettere, cifre, trattini ed estensione d'immagine); `.htaccess` per cartella che apre solo le immagini e blocca PHP/HTML/SVG/JS; nessuna cartella cancellata senza il suo segnaposto; ognuno vede e cancella solo le sue immagini; link senza codice di sessione.
- **Dati non validi:** caratteri UTF-8 non validi in faccine e BBCode vengono sostituiti, e la barra non si blocca.

---

## 20. Risoluzione dei problemi

Prima di tutto: **Check-up → Esegui le prove dal vivo**. Quasi sempre la riga gialla o rossa dice già cosa fare. Per chiedere aiuto, usa **"Copia referto"**.

| Sintomo | Causa probabile | Cosa fare |
|---|---|---|
| La barra non cambia dopo un aggiornamento | cache del browser o del forum | `Ctrl+F5`, poi svuota la cache da ACP. Il Check-up segnala "file della versione X invece della Y" |
| "Versione di tutti i file" in rosso | aggiornamento a metà | ricarica **tutta** la cartella dallo zip, disabilita e riabilita, svuota la cache |
| "Aggiornamenti del database" in rosso | migrazione non eseguita | disabilita (senza cancellare i dati) e riabilita |
| `[math]` o `[syntax]` si vedono come testo | cache non svuotata dopo l'installazione | svuota la cache da ACP |
| Formule con caratteri strani | caratteri di KaTeX mancanti | il Check-up indica quale manca: ripristina la copia di KaTeX o ricarica la cartella |
| Bozze "salvate solo in questo browser" | il server rifiuta il salvataggio | prova dal vivo "Bozze": mostra la risposta esatta del server |
| Prova della barra: "il server non permette i riquadri" | intestazione `X-Frame-Options` del server | la barra funziona lo stesso; aprendo la pagina di scrittura, F12 → console → righe `[Editor Plus]` |
| Mancano i menu per categoria | opzione spenta o categorie vuote | ACP → Impostazioni → Categorie → "Ripristina le categorie predefinite" |
| Manca la combo "Caratteri" senza ABBC3 | non esiste il BBCode `[font]` | è previsto: la combo compare solo se `[font]` esiste |
| *SQL ERROR … Unknown column 'bbcode_group'* | versione 1.0.34 o precedente su un forum senza ABBC3 | aggiorna alla 1.0.35 o successiva |
| "Non riesco a caricare questa funzione" | un modulo (formule, colore, stampa, incolla) non si è scaricato | connessione assente o file mancanti: il Check-up indica i file mancanti |
| "Il messaggio supera di N caratteri il limite" | il testo è oltre il limite di phpBB | accorcialo: la bozza resta salvata |
| Le bozze vecchie restano | il cron di phpBB non gira | phpBB esegue il cron quando qualcuno visita il forum; in alternativa usa "Pulisci ora" nel Check-up |
| Immagini rotte nei messaggi con il link diretto | il server non apre le cartelle degli utenti | Check-up → prova dal vivo "Link diretto alla cartella"; se fallisce, ACP → Immagini utenti → Tipo di link → *Tramite l'estensione* |
| "Il tuo gruppo non può caricare immagini" | gruppo su *Mai* (es. Nuovi utenti registrati) | ACP → Immagini utenti → Impostazioni e gruppi |
| "Immagine troppo pesante" anche se piccola | limite di PHP del server più basso | il Check-up mostra `upload_max_filesize` e `post_max_size`: chiedi all'hosting di alzarli |
| "Immagine troppo grande da elaborare" | memoria di PHP insufficiente per foto enormi | il browser di solito le rimpicciolisce prima; altrimenti alza `memory_limit` |
| Immagini sul disco ma non in ACP | "Cancella dati" e reinstallazione, o file copiati a mano | Check-up → **Riallinea immagini e cartelle** |
| Le conferme compaiono come riquadro grigio del browser | lo stile del forum non ha la finestra di conferma di phpBB (`#phpbb_confirm`, presente in prosilver e negli stili derivati) | è il ripiego previsto: la conferma funziona comunque; con uno stile standard compare quella di phpBB |
| Il pulsante GHide non compare | `[ghide]` non riconosciuto | ACP → GHide → "Forza riconoscimento" (se ntvy95/hide è installata) |

---

## 21. Struttura dei file

```
ext/salvocortesiano/editorplus/
├── acp/                    moduli ACP (Impostazioni, Combo, Immagini utenti, Check-up)
├── adm/style/              pagine ACP (anche editorplus_images.html), stile e script del Check-up
├── config/                 servizi e indirizzi (anteprima, preferenze, bozze, immagini)
├── controller/             ACP, immagini (ACP e forum), anteprima, preferenze, bozze
├── core/                   helper, combo, immagini degli utenti, check-up, aggiornamento di KaTeX, filtro di stampa
├── cron/task/              pulizia automatica giornaliera
├── event/                  collegamento con phpBB (barra, BBCode, pagine)
├── language/it, en/        tutti i testi (italiano e inglese)
├── migrations/             aggiornamenti del database, dalla 1.0.0 alla 1.0.39
├── styles/all/template/    barra, finestre e script:
│   ├── js/editorplus.js          la barra e gli strumenti di base
│   ├── js/editorplus_mod_*.js    moduli scaricati solo al primo uso:
│   │                             math (formule e calcolatrice), color, print, paste, images
│   ├── js/editorplus_gallery.js  immagini: ingrandimento, caricamento, selezione (editor, UCP, ACP)
│   ├── js/editorplus_calc.js     motore della calcolatrice
│   ├── js/editorplus_math.js     disegno delle formule nei messaggi
│   ├── js/editorplus_syntax.js   codice colorato nei messaggi
│   ├── js/math/                  KaTeX + mhchem
│   ├── js/syntax/                highlight.js + js-beautify
│   └── js/sceditor/              editor visuale
├── styles/all/theme/       stili; theme/math/ contiene lo stile e i caratteri di KaTeX
├── ucp/                    modulo del Pannello utente (Preferenze, Le mie immagini)
└── data/                   (dal pacchetto combo) combos_ombre.json
```

**Dati nel database**
- impostazioni `editorplus_*`;
- testi di configurazione (combo, categorie);
- tabella `phpbb_editorplus_drafts` (bozze);
- colonna `user_editorplus` (preferenze degli utenti);
- tabelle `phpbb_editorplus_images` (una scheda per immagine: utente, cartella, file, nome originale, misure, peso, data, IP) e `phpbb_editorplus_img_folders` (una cartella per utente).

**Fuori dalla cartella dell'estensione:** `files/<nome_utente>_<ID>/` (immagini degli utenti, restano anche dopo "Cancella dati"), `files/editorplus_prova_0/` (prova dal vivo del Check-up), `store/editorplus_katex_backup/`, cioè la copia di sicurezza di KaTeX, e `store/editorplus_katex_progress.json`, lo stato dell'ultimo aggiornamento.

---

## 22. Storico delle versioni

| Versione | Novità principali |
|---|---|
| **1.0.0 – 1.0.6** | Combo caratteri e dimensione; menu per categoria; icone, emoji e faccine; barra di stato; schermo intero; annulla/ripeti; bozze; scorciatoie; contatore; combo di immagini gestite in ACP; anteprima dal vivo; cerca e sostituisci; immagini trascinate come allegati; Pannello utente; categorie trascinabili |
| 1.0.7 | Correzione critica UTF-8: un carattere non valido nei dati bloccava la barra |
| 1.0.8 – 1.0.11 | Più barre nella stessa pagina; GHide riconosciuto dai messaggi; versione nei nomi dei file (niente cache vecchia); menu GHide *Autore / Io / Entrambi* |
| 1.0.12 | Formattazione mentre scrivi |
| 1.0.13 | Modifiche fatte da phpBB all'area di testo riconosciute (anteprima, bozza, Ctrl+Z) |
| 1.0.14 – 1.0.15 | **Editor visuale** con BBCode personalizzati come blocchi, poi con aspetto reale |
| 1.0.16 | Area di testo che si restringeva; GHide riorganizzato in ACP |
| 1.0.17 | Menu **Opzioni** nella barra con salvataggio immediato |
| 1.0.18 | **ABBC3 non più obbligatoria**: barra standard di phpBB come alternativa |
| 1.0.19 | Riga informativa sopra la barra |
| 1.0.20 | Incolla ripulito da Word, Google Docs e pagine web |
| 1.0.21 | **Codice colorato `[syntax]`** |
| 1.0.22 | Menu per categoria anche senza ABBC3 |
| 1.0.23 | Combo dei caratteri anche senza ABBC3 |
| 1.0.24 | Stesso stile per tutti i menu a tendina della barra |
| 1.0.25 | **Bozze salvate sul server** |
| 1.0.26 | **Scheda Check-up** con prove dal vivo e referto |
| 1.0.27 | Bozze e anteprima codificate (risolto il 503 su server con firewall o database datati); Check-up più preciso |
| 1.0.28 | **Formule `[math]` `[imath]` con KaTeX** (anche chimica) e **calcolatrice scientifica** |
| 1.0.29 | **Aggiornamento di KaTeX dall'ACP**; Check-up con gruppo formule, prove Formule e Calcolatrice |
| 1.0.30 | **Barra di avanzamento con percentuale vera** per l'aggiornamento di KaTeX; guida completa (questo file) |
| 1.0.31 | **Colore del testo con sfumature** (colore di partenza → sfumatura, regolazione fine, codice, contagocce, recenti, avviso di leggibilità) e **tavolozza classica** come scheda, entrambi attivabili in ACP; il riquadro della bozza non separa più la riga informativa dalla barra |
| 1.0.32 | Pulsanti in fondo alle finestre (colore, calcolatrice, formule, codice): il testo non va più a capo dentro il pulsante; su schermi stretti i pulsanti scendono interi alla riga sotto |
| 1.0.33 | **Allegati nell'anteprima dal vivo**: riquadro con miniatura e nome sotto (icona per i file non immagine, avviso per gli allegati eliminati), foto di seguito affiancate; miniature di phpBB usate quando esistono |
| 1.0.34 | **Bozze con gli allegati**: ripristinando una bozza tornano anche gli allegati caricati (verificati dal server, rinumerati se serve, con Inserisci/Elimina funzionanti); prima tornava solo il testo e gli allegati risultavano "non trovati" |
| 1.0.35 | Correzione: su forum **senza ABBC3** (mai installata o con i dati cancellati) la pagina Impostazioni dell'ACP e la pagina di scrittura davano *SQL ERROR: Unknown column 'bbcode_group'*. La colonna (di ABBC3) ora viene letta solo se esiste |
| 1.0.36 | **Stampa / PDF** dall'anteprima dal vivo: pagina pulita con formule, codice colorato e allegati a piena risoluzione; spoiler aperti per tutti, contenuti nascosti solo per i gruppi autorizzati in ACP (controllo sul server) |
| 1.0.37 | **Pulizia automatica** giornaliera (bozze scadute di tutti; allegati orfani su richiesta) con "Pulisci ora" nel Check-up · **moduli scaricati al primo uso** (formule e calcolatrice, colore, stampa, incolla): pagina di scrittura più leggera · **Impostazioni ACP in schede** · **testo incollato convertito in BBCode** anche nell'area di testo · **limite di lunghezza** contato come phpBB, con avvisi e invio fermato senza perdere la bozza · correzioni suggerite dal validatore ufficiale di phpBB (EPV) · provata anche su MySQL/MariaDB |
| 1.0.38 | **Immagini degli utenti nella loro cartella** `files/nome_ID/` invece che come allegati: rimpicciolite già nel browser, risalvate sul server (raddrizzate, senza EXIF/GPS), animate conservate, miniature, `.htaccess` per cartella, link diretto o tramite l'estensione · **gruppi autorizzati** con peso, numero e spazio massimi (e "Mai") · pannello **Le mie immagini** nell'editor · **Pannello utente → Le mie immagini** · **ACP → Immagini utenti** (elenco, ricerca, miniature ingrandibili, link, data, IP, "Dove è usata?", cancellazione singola, selezionate, tutte, cartella; registro) · cartella eliminata quando l'utente viene cancellato · Check-up: 9 controlli, prova di elaborazione, prova dal vivo dei link e del blocco PHP, **Riallinea immagini e cartelle** |
| 1.0.39 | Correzioni delle immagini degli utenti: foto con orientamento EXIF 5 e 7 non più specchiate al contrario · immagini oltre i 16 MB salvate anche su MySQL (prima errore SQL e file orfano), e se il database rifiuta il salvataggio il file viene tolto · immagini animate e server senza GD ripuliti da commenti, EXIF/GPS, XMP e dati in coda · cancellazione degli utenti mai bloccata se mancano le tabelle · nomi con `&` e virgolette mostrati correttamente · nuovo: serve un permesso per scrivere per caricare immagini · nuovo: tre modalità per la cartella dell'utente cancellato |
| 1.0.40 | **Impostazioni di stampa** con anteprima della pagina A4 e numero di pagine: carattere, dimensione, dimensioni del messaggio, interlinea, righe vuote, margini, immagini, intestazione, colori; la pagina di stampa non usa più lo stile del forum (che poteva ingrandire tutto: 8 pagine per 15 righe) |
| 1.0.41 | **"Adatta a 1 pagina A4"** nelle impostazioni di stampa · anteprima dal vivo: un allegato dopo il testo va sotto e non più accanto (galleria solo tra allegati vicini) · un'immagine eliminata dal caricatore viene tolta anche dal messaggio, in tutte le forme del link (annullabile con Ctrl+Z) |
| 1.0.42 | Tutte le conferme dell'estensione usano la **finestra di conferma integrata di phpBB** (stesso aspetto dello stile del forum e dell'ACP) invece del riquadro del browser: eliminazione di un'immagine dall'editor (anche dall'ingrandimento), ripristino di KaTeX e scaricamento di una nuova serie nel Check-up. Esc, "No" e il clic fuori annullano senza chiudere la finestra sottostante |

---

## 23. Licenze e crediti

**Editor Plus** — © 2026 Salvo Cortesiano — licenza **GNU GPL v2**.

Componenti di terze parti inclusi, ciascuno con la propria licenza:

| Componente | Versione | Licenza | Uso |
|---|---|---|---|
| KaTeX (+ mhchem) | 0.18.9 | MIT | disegno delle formule |
| highlight.js | 11.12.0 | BSD-3-Clause | codice colorato |
| js-beautify | 1.15.4 | MIT | riformattazione del codice |
| SCEditor | 3.2.1 | MIT | editor visuale |

Le icone usano Font Awesome, già presente in phpBB.

---

*Editor Plus 1.0.37 · sviluppata da Salvo Cortesiano · Le Ombre della Rete 360°*
