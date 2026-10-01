# Editor Plus per phpBB 3.3

![Versione](https://img.shields.io/badge/versione-1.0.34-blue) ![phpBB](https://img.shields.io/badge/phpBB-3.3.x-teal) ![PHP](https://img.shields.io/badge/PHP-7.4%2B-purple) ![Licenza](https://img.shields.io/badge/licenza-GPL--2.0-green)

**Editor Plus** (`salvocortesiano/editorplus`) potenzia la barra di scrittura di phpBB: menu per categoria, combo di immagini, faccine, icone ed emoji, colori con sfumature, anteprima dal vivo, formattazione mentre scrivi, editor visuale, bozze salvate sul server, codice colorato, formule matematiche e chimiche, calcolatrice scientifica e una scheda **Check-up** che controlla da sola che tutto funzioni.

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
13. [Pannello utente: le preferenze di ciascuno](#13-pannello-utente-le-preferenze-di-ciascuno)
14. [Pannello di amministrazione (ACP)](#14-pannello-di-amministrazione-acp)
15. [Check-up](#15-check-up)
16. [Aggiornare KaTeX dall'ACP](#16-aggiornare-katex-dallacp)
17. [Sicurezza](#17-sicurezza)
18. [Risoluzione dei problemi](#18-risoluzione-dei-problemi)
19. [Struttura dei file](#19-struttura-dei-file)
20. [Storico delle versioni](#20-storico-delle-versioni)
21. [Licenze e crediti](#21-licenze-e-crediti)

---

## 1. Requisiti

| Cosa | Versione | Note |
|---|---|---|
| phpBB | 3.3.x | provata su 3.3.19 |
| PHP | 7.4 o successivo | consigliate le funzioni `mbstring`; `curl` o `allow_url_fopen` e `zlib` solo per aggiornare KaTeX dall'ACP |
| Advanced BBCode Box (`vse/abbc3`) | 3.3.12 o successiva | **facoltativa**: senza, si usa la barra standard di phpBB |
| GHide (`ntvy95/hide`) | qualsiasi | **facoltativa**: serve solo per il pulsante GHide |
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

Sopra la barra compare una **riga informativa**, che si può spegnere in ACP. Per esempio: *Editor Plus 1.0.34 · Editor: BBCode (barra ABBC3) · sviluppata da Salvo Cortesiano*. Indica la versione, la modalità (BBCode o visuale) e la barra in uso.

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
| ▥ **Anteprima dal vivo** | il messaggio com'è, mentre scrivi, affiancato all'area di testo |
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
  - **Più foto di seguito:** si affiancano come una piccola galleria.
  - **Altri file** (pdf, zip, audio, video…): l'icona del loro tipo.
  - **Allegato eliminato:** il riquadro dice "Allegato non trovato".
  - **Miniature:** si usano quelle di phpBB quando esistono, altrimenti l'immagine rimpicciolita. Il contatore dei download non cambia.
- **Incolla da Word, Google Docs e pagine web** (nell'editor visuale). Il testo viene ripulito: grassetti fantasma, elenchi finti, commenti di Word, caratteri e dimensioni convertiti nelle misure di phpBB, titoli in grassetto, tabelle in righe di testo. Script, eventi, `javascript:` e iframe vengono **eliminati**.
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
- **Ospiti:** solo nel browser.
- **Messaggi onesti:** "Bozza salvata" compare solo se il salvataggio è riuscito davvero. Altrimenti leggi *"salvata solo in questo browser"* oppure, in rosso, *"Bozza NON salvata"*.
- **Pulizia:** inviando il messaggio o premendo **Elimina** la bozza sparisce ovunque. Le bozze vecchie si tolgono da sole (giorni scelti in ACP, massimo 30 per utente). Ognuno vede solo le proprie.
- **Codifica:** testo e titolo viaggiano e vengono salvati **codificati**, quindi emoji e HTML non creano problemi con database datati o firewall del server.

---

## 13. Pannello utente: le preferenze di ciascuno

Pannello utente → **Preferenze** → **Editor Plus**. Ogni utente può accendere o spegnere, **solo per sé**, le funzioni che l'amministratore ha lasciato accese:

- salvataggio automatico della bozza;
- area di testo che si allarga;
- contatore di caratteri e parole;
- scorciatoie da tastiera;
- anteprima dal vivo sempre aperta;
- anteprima delle voci delle combo;
- immagini trascinate o incollate come allegati;
- faccine nella barra, con il riquadro a destra tolto;
- formattazione mentre scrivi e segni per dimensione e carattere;
- editor visuale;
- correttore ortografico del browser.

Le opzioni del menu **⚙ Opzioni** della barra si salvano subito nel profilo, senza ricaricare la pagina.

---

## 14. Pannello di amministrazione (ACP)

ACP → **Estensioni** → **Editor Plus**. In cima a ogni pagina ci sono i riquadri con la versione di Editor Plus, PHP, phpBB, ABBC3 e la licenza.

### Scheda Impostazioni

Ogni funzione si accende o si spegne. I gruppi principali sono:

- **Barra e strumenti:** menu per categoria, combo caratteri e dimensione, combo delle immagini, faccine (e riquadro faccine), icone `[fa]`, emoji, cerca e sostituisci, annulla/ripeti, schermo intero, contatore, altezza automatica, scorciatoie, menu Opzioni, riga informativa.
- **Scrittura:** anteprima dal vivo, anteprima delle combo, immagini trascinate come allegati, formattazione mentre scrivi, bozze automatiche (con i giorni di conservazione).
- **Editor visuale:** attivazione e aspetto reale dei BBCode personalizzati.
- **GHide:** attivazione, pulsante anche in prima riga, gruppi che vedono sempre, scelta predefinita (autore / io / entrambi), forza riconoscimento.
- **Categorie:** quali BBCode vanno in quale menu (anche trascinando le voci), BBCode da nascondere, ripristino delle categorie predefinite.
- **Colore del testo:** selettore con sfumature; tavolozza classica di phpBB come scheda.
- **Codice colorato:** attivazione, tema chiaro o scuro, larghezza della tabulazione, "colora anche [code]".
- **Formule e calcolatrice:** i due interruttori.
- **Avviso su ABBC3:** se ABBC3 è disabilitata, assente o con la barra spenta, un riquadro lo spiega con il collegamento per sistemarlo.

### Scheda Combo

- Elenco delle combo con **ordinamento**, accensione e spegnimento.
- Creazione e modifica: nome, BBCode, voci con immagine e testo, **anteprima dal vivo**.
- **Importazione ed esportazione** in JSON, per esempio il pacchetto `combos_ombre.json`.

### Scheda Check-up

Vedi il paragrafo successivo.

---

## 15. Check-up

ACP → Editor Plus → **Check-up**. Controlla pezzo per pezzo tutto ciò da cui Editor Plus dipende e **non modifica nulla**. Ogni riga ha l'esito **OK / Da vedere / Problema**, il dettaglio e cosa fare. In cima c'è il riepilogo.

### Controlli automatici

| Gruppo | Cosa controlla |
|---|---|
| **Ambiente** | PHP, phpBB, stato di ABBC3, funzioni PHP necessarie |
| **File dell'estensione** | presenza dei file essenziali e **stessa versione per tutti** (trova gli aggiornamenti rimasti a metà) |
| **Installazione** | aggiornamenti del database, tabella delle bozze, preferenze utenti, schede ACP, indirizzi di servizio |
| **BBCode** | selettore del colore (come è impostato), `[fa]`, `[font]`, `[ghide]`, combo accese senza il loro BBCode |
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

---

## 16. Aggiornare KaTeX dall'ACP

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

## 17. Sicurezza

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
- **Dati non validi:** caratteri UTF-8 non validi in faccine e BBCode vengono sostituiti, e la barra non si blocca.

---

## 18. Risoluzione dei problemi

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
| Il pulsante GHide non compare | `[ghide]` non riconosciuto | ACP → GHide → "Forza riconoscimento" (se ntvy95/hide è installata) |

---

## 19. Struttura dei file

```
ext/salvocortesiano/editorplus/
├── acp/                    moduli ACP (Impostazioni, Combo, Check-up)
├── adm/style/              pagine ACP, stile e script del Check-up
├── config/                 servizi e indirizzi (anteprima, preferenze, bozze)
├── controller/             ACP, anteprima, preferenze, bozze
├── core/                   helper, combo, check-up, aggiornamento di KaTeX
├── event/                  collegamento con phpBB (barra, BBCode, pagine)
├── language/it, en/        tutti i testi (italiano e inglese)
├── migrations/             aggiornamenti del database, dalla 1.0.0 alla 1.0.34
├── styles/all/template/    barra, finestre e script:
│   ├── js/editorplus.js          la barra e tutti gli strumenti
│   ├── js/editorplus_calc.js     motore della calcolatrice
│   ├── js/editorplus_math.js     disegno delle formule nei messaggi
│   ├── js/editorplus_syntax.js   codice colorato nei messaggi
│   ├── js/math/                  KaTeX + mhchem
│   ├── js/syntax/                highlight.js + js-beautify
│   └── js/sceditor/              editor visuale
├── styles/all/theme/       stili; theme/math/ contiene lo stile e i caratteri di KaTeX
├── ucp/                    modulo del Pannello utente
└── data/                   (dal pacchetto combo) combos_ombre.json
```

**Dati nel database**
- impostazioni `editorplus_*`;
- testi di configurazione (combo, categorie);
- tabella `phpbb_editorplus_drafts` (bozze);
- colonna `user_editorplus` (preferenze degli utenti).

**Fuori dalla cartella dell'estensione:** `store/editorplus_katex_backup/`, cioè la copia di sicurezza di KaTeX, e `store/editorplus_katex_progress.json`, lo stato dell'ultimo aggiornamento.

---

## 20. Storico delle versioni

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

---

## 21. Licenze e crediti

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

*Editor Plus 1.0.34 · sviluppata da Salvo Cortesiano · Le Ombre della Rete 360°*
