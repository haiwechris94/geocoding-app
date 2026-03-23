# Geocoding Frontend / Interface de Géocodage

## 🇬🇧 English

### Description
React-based frontend for the bilingual African village geocoding application. Features an interactive map, batch geocoding, and export capabilities.

### Features
- 🌍 Interactive Leaflet map for village search
- 📁 File upload (Excel/CSV) for batch geocoding
- ✏️ Manual village entry
- 🎯 Geographic filters (Country → Region → Department → Arrondissement)
- 📊 Export to Excel, CSV, PDF
- 🌐 Bilingual interface (English/French)
- 📱 Responsive design

### Prerequisites
- Node.js >= 16.0.0
- npm or yarn
- Backend server running on port 5000

### Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

The app will open at `http://localhost:3000`

### Project Structure

```
frontend/
├── public/
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── Header.js
│   │   ├── LanguageSwitcher.js
│   │   ├── FileUpload.js
│   │   ├── ManualEntry.js
│   │   ├── FilterOptions.js
│   │   ├── MapSearch.js
│   │   ├── ResultsTable.js
│   │   ├── ExportOptions.js
│   │   └── LoadingSpinner.js
│   ├── pages/
│   │   ├── Home.js
│   │   ├── BatchGeocode.js
│   │   ├── AdvancedSearch.js
│   │   └── Results.js
│   ├── context/
│   │   └── LanguageContext.js
│   ├── services/
│   │   ├── api.js
│   │   └── i18n.js
│   ├── App.js
│   └── index.js
└── package.json
```

### Available Scripts

- `npm start` - Run development server
- `npm build` - Build for production
- `npm test` - Run tests

### Environment Variables

Create a `.env` file in the frontend directory:

```
REACT_APP_API_URL=http://localhost:5000/api
```

---

## 🇫🇷 Français

### Description
Interface React pour l'application bilingue de géocodage des villages africains. Comprend une carte interactive, le géocodage par lots et des fonctionnalités d'exportation.

### Fonctionnalités
- 🌍 Carte Leaflet interactive pour la recherche de villages
- 📁 Téléchargement de fichiers (Excel/CSV) pour le géocodage par lots
- ✏️ Saisie manuelle des villages
- 🎯 Filtres géographiques (Pays → Région → Département → Arrondissement)
- 📊 Exportation vers Excel, CSV, PDF
- 🌐 Interface bilingue (Anglais/Français)
- 📱 Design responsive

### Prérequis
- Node.js >= 16.0.0
- npm ou yarn
- Serveur backend en cours d'exécution sur le port 5000

### Installation

```bash
# Naviguer vers le répertoire frontend
cd frontend

# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm start
```

L'application s'ouvrira à `http://localhost:3000`

### Structure du Projet

```
frontend/
├── public/
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── components/      # Composants réutilisables
│   ├── pages/           # Pages de l'application
│   ├── context/         # Contexte React (langue)
│   ├── services/        # Services API et i18n
│   ├── App.js
│   └── index.js
└── package.json
```

### Scripts Disponibles

- `npm start` - Lancer le serveur de développement
- `npm build` - Construire pour la production
- `npm test` - Exécuter les tests

### Variables d'Environnement

Créez un fichier `.env` dans le répertoire frontend:

```
REACT_APP_API_URL=http://localhost:5000/api
```

---

## License / Licence
MIT
