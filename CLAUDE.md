# CLAUDE.MD - Project Guidelines for FuturYs

## 🎯 REGOLE PRINCIPALI (SEMPRE DA SEGUIRE)

### 1. **LEGGERE SEMPRE I FILE YKAN**
Prima di iniziare qualsiasi task o rispondere a domande sul progetto:

```bash
# Cerca e leggi SEMPRE questi file:
- _Ykan.php          # Sistema Kanban e struttura task
- _Ykan_data.json    # Task attivi, epic, sprint e stato progetto
```

**Perché?** Questi file contengono:
- Tutti i task del progetto organizzati per Epic
- Lo stato corrente di sviluppo (To Do, In Progress, Done, Blocked)
- Le priorità e le dipendenze tra task
- Il contesto completo del progetto FuturY

### 2. **CONSULTARE IL KANBAN PRIMA DI PROPORRE MODIFICHE**
- Verifica se il task è già presente nel backlog
- Controlla le priorità definite nel board
- Rispetta l'organizzazione in Epic e Sprint
- Non duplicare lavoro già completato (colonna "Done")

---

## 📋 ALTRE REGOLE UTILI

### **Gestione Task e Board Kanban**

1. **Aggiornare il Kanban dopo completamento**
   - Quando completi un task, suggerisci di aggiornare `_Ykan_data.json`
   - Sposta le card da "To Do" → "In Progress" → "Done"
   - Documenta eventuali blocchi nella colonna "Blocked"

2. **Rispettare le Epic e gli Sprint**
   - Epic 1: Project Foundation
   - Epic 2: 3D Solar System
   - Epic 3: Core Game Systems
   - Epic 4: User Interface
   - Epic 5: Basic Gameplay Loop
   - Epic 6: MVP Polish

3. **Story Points e Priorità**
   - Considera i story_points per stimare la complessità
   - Dai priorità ai task marcati come "high" priority
   - I task "Blocked" necessitano risoluzione dipendenze

---

### **Architettura e Tech Stack**

1. **Stack Tecnologico Principale**
   ```
   Frontend: JavaScript (ES6+), Three.js per 3D
   Backend:  PHP 8.2+, SQLite
   Server:   Herd (local dev environment)
   ```

2. **Struttura Cartelle da Rispettare**
   ```
   /js/        → Moduli JavaScript (GameEngine, TimeManager, etc.)
   /php/       → Backend PHP (API, Database)
   /css/       → Stili
   /database/  → SQLite database
   /assets/    → Texture, immagini, modelli 3D
   ```

3. **File Core Esistenti** (da leggere prima di modificare)
   ```
   js/GameEngine.js      → Core game loop
   js/TimeManager.js     → Sistema tempo (24h = 1 anno)
   js/ResourceManager.js → Gestione 8 risorse
   js/SolarSystemScene.js → Scena 3D Three.js
   php/config/database.php → Database singleton
   ```

---

### **Best Practices di Sviluppo**

1. **Prima di Creare Nuovo Codice**
   - Cerca se esiste già un'implementazione simile
   - Leggi i file correlati per mantenere coerenza
   - Verifica convenzioni di naming nel codebase

2. **Sistema di Risorse**
   - 8 risorse: Budget, Science, Population, Energy, Materials, Food, Water, Oxygen
   - Produzione passiva basata su edifici
   - Consumo per missioni e costruzioni

3. **Sistema Tempo**
   - 1 giorno reale = 1 anno di gioco (24h = 365 giorni)
   - Tutte le durate devono scalare proporzionalmente
   - Offline time calculation quando utente ritorna

4. **Missioni Spaziali**
   - Terra → Marte: 6-9 mesi gioco (2-3 giorni reali)
   - Terra → Giove: 12-18 mesi gioco (5-6 giorni reali)
   - Stati: Preparing → Traveling → Arrived

5. **Performance 3D**
   - Target: 60 FPS su hardware medio
   - Usare texture procedurali per pianeti
   - Implementare LOD (Level of Detail) se necessario
   - Ottimizzare rendering con frustum culling

---

### **Testing e Quality Assurance**

1. **Test da Eseguire**
   - Cross-browser: Chrome, Firefox, Safari, Edge
   - Performance: Profiling Three.js con DevTools
   - Time system: Verifica accuratezza calcoli
   - Save/Load: Integrità dati dopo reload

2. **Casi Limite da Considerare**
   - Risorse negative (bloccare azioni)
   - Offline time > 7 giorni
   - Missioni simultanee multiple
   - Ricaricamento pagina durante animazioni

---

### **Documentazione**

1. **Quando Aggiungere Docs**
   - Nuove API endpoints (parametri, response)
   - Algoritmi complessi (es. orbital mechanics)
   - Configurazioni di gioco (bilanciamento risorse)

2. **Stile Commenti**
   ```javascript
   // Brevi commenti inline per logica complessa

   /**
    * Docstrings per funzioni pubbliche
    * @param {type} name - description
    * @returns {type} description
    */
   ```

---

### **Game Design Constraints**

1. **Bilanciamento**
   - MVP deve essere giocabile in 1-2 settimane reali
   - Prima missione Marte completabile in 2-3 giorni
   - Progressione: Terra → Luna → Marte → Sistema Solare

2. **Scope MVP**
   - Focus su Terra → Marte pipeline
   - 4 nazioni giocabili (USA, China, Russia, ESA)
   - 8 pianeti visualizzabili, 2-3 colonizzabili
   - 4 tipi edifici base

---

### **Git e Versioning**

1. **Commit Messages**
   - Seguire conventional commits
   - Referenziare card ID quando applicabile
   - Es: `feat: Implement Mars mission launch (card_401)`

2. **Branch Strategy**
   - Usa il branch fornito per sviluppo
   - Non pushare direttamente su main
   - Crea PR descrittive con riferimenti ai task

---

### **Debugging e Troubleshooting**

1. **Log Strategici**
   ```javascript
   console.log('[GameEngine] State:', this.state);
   console.log('[TimeManager] Year:', this.getCurrentYear());
   ```

2. **Common Issues**
   - Three.js scene non visibile: Verifica camera position e lights
   - Tempo non avanza: Controllare TimeManager tick rate
   - Risorse non si aggiornano: Verificare loop produzione
   - SQLite lock: Chiudere correttamente connessioni DB

---

## 🚀 Quick Start per Claude

Quando inizi a lavorare su questo progetto:

1. ✅ Leggi `_Ykan.php` e `_Ykan_data.json`
2. ✅ Identifica l'Epic e il task specifico
3. ✅ Leggi i file correlati esistenti
4. ✅ Verifica dipendenze con altri task
5. ✅ Implementa seguendo le convenzioni
6. ✅ Testa localmente
7. ✅ Suggerisci aggiornamento board Kanban

---

## 📞 Riferimenti Rapidi

- **Database Schema**: Vedi `database/futury.db` o init script
- **API Endpoints**: Vedi `php/api/` directory
- **3D Assets**: Texture procedurali, no file esterni per MVP
- **Game Config**: Costanti in `js/config/GameConfig.js`

---

### **Hosting & Deploy (OVH)**

1. **Deploy Automatico**
   - L'hosting OVH è configurato con auto-deploy da GitHub su merge in `main`
   - Ogni merge in main triggera automaticamente un `git pull` sul server

2. **File Runtime (NON cancellare sul server)**
   - `database/futury.db` → Database SQLite con dati di gioco (gitignored, git NON lo ripristina)
   - Non cancellare mai file `.db` sul server, si perdono i dati

3. **Risolvere conflitti sul server OVH**
   - Se il deploy fallisce per "local changes would be overwritten":
   ```bash
   # Cancella solo il file in conflitto, poi il pull lo ricrea dal repo
   rm _Ykan_data.json
   git pull origin main
   ```
   - **MAI** fare `git checkout -- .` o `git reset --hard` senza verificare prima quali file sono modificati

4. **Gitignore**
   - `*.db` e `database/*.db` sono gitignored → il DB non è nel repo
   - `_Ykan_data.json` è tracciato → se modificato sul server, va cancellato prima del pull
   - File di log e cache sono gitignored

---

## 📞 Riferimenti Rapidi

- **Database Schema**: Vedi `database/futury.db` o init script
- **API Endpoints**: Vedi `php/api/` directory
- **3D Assets**: Texture procedurali, no file esterni per MVP
- **Game Config**: Costanti in `js/config/GameConfig.js`

---

**Ultima modifica**: 2026-02-17
**Versione**: 1.1.0
**Progetto**: FuturY - Strategia Galattica
