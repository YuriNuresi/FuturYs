# Piano: Redesign Layout + Refactor CSS - FuturYs

## Obiettivo
Refactor completo del CSS (da inline a file dedicati con design system) + redesign UX con layout dock/tabs: sidebar sinistra collassabile, vista 3D centrale, bottom dock con tab, pannello info pianeta a destra on-demand. Include creazione pannelli Research (tech tree) e Economy (tabella bilancio). Responsive completo desktop/tablet/mobile.

---

## Fase 1: CSS Design System e Refactor Architettura

### Step 1.1 - Creare `css/variables.css` (design tokens)
- Variabili colori: `--space-dark`, `--accent-cyan`, `--accent-blue`, `--text-primary`, `--text-muted`, `--success`, `--error`, `--warning`
- Variabili spacing: `--gap-sm`, `--gap-md`, `--gap-lg`
- Variabili layout: `--sidebar-width`, `--sidebar-collapsed-width`, `--dock-height`, `--dock-collapsed-height`, `--navbar-height`
- Variabili glass: `--glass-bg`, `--glass-border`, `--glass-blur`
- Breakpoints reference (commenti): mobile 480px, tablet 768px, desktop 1024px, wide 1440px
- Z-index scale: `--z-canvas`, `--z-hud`, `--z-panels`, `--z-overlay`, `--z-modal`, `--z-tutorial`

### Step 1.2 - Creare `css/base.css` (reset + tipografia)
- CSS reset moderno
- Tipografia base (font family, sizes, weights)
- Utility classes comuni (`.hidden`, `.flex-center`, `.glass-panel`, etc.)

### Step 1.3 - Riscrivere `css/game.css` (layout principale)
- Layout grid/flex per la struttura dock: sidebar | main-viewport | right-panel, con bottom dock
- Stili per `#nav-menu` (navbar top)
- Stili per HUD overlay sulla vista 3D

### Step 1.4 - Creare `css/panels.css` (tutti i pannelli)
- `.sidebar` (sinistra, collassabile)
- `.panel-planet-info` (destra, slide-in)
- `.bottom-dock` (basso, ridimensionabile)
- `.panel-header`, `.panel-content`, `.panel-tabs` (componenti condivisi)
- Stili per ogni contenuto pannello: resources, buildings, research, economy, missions

### Step 1.5 - Riscrivere `css/responsive.css`
- Breakpoint tablet (768px): sidebar collassa a icone, bottom dock ridotto
- Breakpoint mobile (480px): sidebar nascosta (hamburger), dock full-width, pannelli a schermo intero

### Step 1.6 - Aggiornare `css/main.css`
- Solo import/orchestrazione dei file CSS
- Rimuovere definizioni duplicate

---

## Fase 2: Ristrutturazione HTML di game.html

### Step 2.1 - Rimuovere tutti gli `<style>` inline da game.html
- Linkare i nuovi file CSS: variables.css, base.css, game.css, panels.css, responsive.css
- Eliminare le ~650 righe di CSS inline

### Step 2.2 - Ristrutturare il markup HTML con layout dock/tabs
Nuova struttura:
```
body
  #app-container (CSS grid)
    #nav-bar (top, full width)
      nav tabs: Solar System | Missions | Buildings | Research | Economy
    #sidebar-left (collapsible, left)
      #sidebar-toggle (collapse/expand button)
      #resources-section (risorse con rates)
      #buildings-section (build + lista)
    #main-viewport (center)
      canvas#solar-system-canvas (Three.js)
      #hud-overlay (anno, controlli - overlay sopra il canvas)
      #planet-info-panel (slide-in da destra, overlay)
    #bottom-dock (bottom, tabs)
      dock-tabs: Missions | Economy | Log
      #missions-tab-content
      #economy-tab-content
      #log-tab-content (notifications history)
    #launch-sequence-overlay
    #tutorial-overlay + #tutorial-tooltip
    #notifications-container
```

### Step 2.3 - Aggiornare gli ID/classi per coerenza
- Rinominare elementi per match con nuove CSS classes
- Mantenere gli ID usati dal JS esistente o aggiornare i riferimenti

---

## Fase 3: Pannello Research (Tech Tree)

### Step 3.1 - Creare `js/ui/ResearchPanel.js`
- Classe ResearchPanel che gestisce il rendering del tech tree
- Struttura dati tech tree con nodi e dipendenze
- Categorie: Propulsion, Habitat, Mining, Energy, Communication
- Ogni nodo: id, name, description, cost (science + budget), duration, prerequisites, effects
- Stato: locked, available, researching, completed

### Step 3.2 - Creare il tech tree nella sidebar sinistra
- Visualizzazione a nodi connessi con linee SVG/canvas
- Nodi cliccabili con dettagli (costo, tempo, effetto)
- Progress bar per ricerca in corso
- Filtro per categoria
- Zoom/pan per navigare l'albero

### Step 3.3 - Creare endpoint API `php/api/research.php`
- GET: lista tecnologie con stato per sessione
- POST: avvia ricerca (verifica risorse, prerequisiti)
- Backend: tabella `technologies` nel DB (o riusa quella esistente)

---

## Fase 4: Pannello Economy (Tabella Bilancio)

### Step 4.1 - Creare `js/ui/EconomyPanel.js`
- Classe EconomyPanel nel bottom dock tab "Economy"
- Tabella bilancio con colonne: Risorsa | Produzione/h | Consumo/h | Saldo Netto
- Per ogni risorsa, breakdown dettagliato:
  - Quali edifici producono quanto
  - Quali consumi attivi (missioni, costruzioni in corso)
- Totali e indicatori positivo/negativo con colori

### Step 4.2 - Sezione proiezioni semplice
- "A questo ritmo, tra X ore avrai Y di [risorsa]"
- Warning se una risorsa andrà a zero

---

## Fase 5: Logica Sidebar e Dock

### Step 5.1 - Implementare sidebar collapsibile
- Bottone toggle per espandere/collassare
- Stato collapsed: solo icone (risorse icona + valore, edifici icona)
- Stato expanded: contenuto completo
- Animazione smooth con CSS transition
- Salvare stato sidebar in localStorage

### Step 5.2 - Implementare bottom dock con tabs
- Tab switching: Missions | Economy | Log
- Dock ridimensionabile (drag handle per altezza)
- Stato minimizzato: solo tab bar visibile
- Doppio click su tab: minimizza/espandi
- Tab "Log": storico notifiche (riusa NotificationManager)

### Step 5.3 - Implementare nav-bar tabs
- Highlight tab attiva
- Click tab cambia contesto:
  - "Solar System": vista 3D (default)
  - "Missions": focus su bottom dock tab missioni
  - "Buildings": apre sidebar su sezione edifici
  - "Research": apre sidebar su sezione research
  - "Economy": focus su bottom dock tab economy

---

## Fase 6: Responsive Design

### Step 6.1 - Desktop (>1024px)
- Layout completo: sidebar espansa + 3D + bottom dock
- Pannello pianeta slide-in da destra

### Step 6.2 - Tablet (768px-1024px)
- Sidebar auto-collassata a icone (espandibile)
- Bottom dock altezza ridotta
- Nav menu compatto

### Step 6.3 - Mobile (<768px)
- Sidebar nascosta, attivabile con hamburger menu
- Bottom dock full-width, altezza fissa
- Pannello info pianeta = overlay full screen
- Nav menu: icone piccole o hamburger
- Touch: swipe per aprire/chiudere sidebar

---

## Fase 7: Aggiornamento JS e Integrazione

### Step 7.1 - Aggiornare UIController.js
- Gestione nuovo layout (sidebar toggle, dock tabs, responsive)
- Event listeners per resize/orientation change
- Coordinamento tra pannelli (click pianeta apre info, click nav switcha tab)

### Step 7.2 - Aggiornare riferimenti JS in game.html
- Aggiornare querySelector/getElementById per nuovi ID/classi
- Integrare ResearchPanel e EconomyPanel nel game loop
- Aggiornare TutorialManager per nuovi step e nuovi elementi

### Step 7.3 - Aggiornare NotificationManager
- Aggiungere persistenza notifiche per tab "Log" nel dock

---

## Fase 8: Test e Polish

### Step 8.1 - Verificare che tutto il gameplay esistente funzioni
- Selezione pianeti, lancio missioni, costruzione edifici
- Save/load, tempo, risorse

### Step 8.2 - Test responsive
- Desktop Chrome/Firefox
- Tablet (iPad emulation)
- Mobile (iPhone/Android emulation)

### Step 8.3 - Aggiornare _Ykan_data.json
- Creare nuove card per i task completati
- Aggiornare board Kanban

---

## Ordine di Esecuzione Consigliato
1. Fase 1 (CSS) - fondamenta
2. Fase 2 (HTML) - ristrutturazione
3. Fase 5 (Sidebar + Dock logic) - interattività base
4. Fase 7.1-7.2 (JS update) - far funzionare il tutto
5. Fase 3 (Research) - nuovo pannello
6. Fase 4 (Economy) - nuovo pannello
7. Fase 6 (Responsive) - adattamento
8. Fase 8 (Test) - verifica finale

## Stima Complessità
- File da creare: ~6-8 nuovi file (CSS + JS)
- File da modificare: game.html (pesante), UIController.js, game.css, responsive.css, main.css, _Ykan_data.json
- Rischio: alto sul refactor game.html (tutto inline, molti riferimenti JS)
