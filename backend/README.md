# Geocoding Backend API / API Backend de Géocodage

## 🇬🇧 English

### Description
Backend API for the bilingual African village geocoding application. This API provides endpoints for batch geocoding, proximity search, geographic filtering, and export functionality.

### Features
- Batch geocoding from Excel/CSV files
- Manual village entry geocoding
- Multi-API aggregation (Google Maps, GeoNames, Nominatim, HDX)
- Geographic filtering (Country → Region → Department → Arrondissement)
- Proximity search with configurable radius
- Export to Excel, CSV, and PDF formats
- Confidence scoring for geocoding results
- Fuzzy matching for village names

### Prerequisites
- Node.js >= 16.0.0
- npm or yarn

### Installation

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your API keys
# Configure your API keys in the .env file
```

### Configuration
Edit the `.env` file with your API keys:
- **GOOGLE_MAPS_API_KEY**: Get from [Google Cloud Console](https://console.cloud.google.com/)
- **GEONAMES_USERNAME**: Register at [GeoNames](https://www.geonames.org/login)
- **NOMINATIM_EMAIL**: Your contact email for Nominatim API
- **HDX_API_KEY**: Register at [HDX](https://data.humdata.org/)

### Running the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

### API Endpoints

#### Geocoding
- `POST /api/geocoding/upload` - Upload Excel/CSV file
- `POST /api/geocoding/batch` - Batch geocode villages
- `POST /api/geocoding/single` - Geocode single village
- `POST /api/geocoding/proximity` - Proximity search

#### Filters
- `GET /api/filters/countries` - Get African countries
- `GET /api/filters/regions/:countryCode` - Get regions
- `GET /api/filters/departments/:regionId` - Get departments
- `GET /api/filters/arrondissements/:departmentId` - Get arrondissements

#### Export
- `POST /api/export/excel` - Export to Excel
- `POST /api/export/csv` - Export to CSV
- `POST /api/export/pdf` - Export to PDF

---

## 🇫🇷 Français

### Description
API Backend pour l'application bilingue de géocodage des villages africains. Cette API fournit des endpoints pour le géocodage par lots, la recherche de proximité, le filtrage géographique et les fonctionnalités d'exportation.

### Fonctionnalités
- Géocodage par lots à partir de fichiers Excel/CSV
- Géocodage de saisie manuelle de villages
- Agrégation multi-API (Google Maps, GeoNames, Nominatim, HDX)
- Filtrage géographique (Pays → Région → Département → Arrondissement)
- Recherche de proximité avec rayon configurable
- Exportation aux formats Excel, CSV et PDF
- Score de confiance pour les résultats de géocodage
- Correspondance floue pour les noms de villages

### Prérequis
- Node.js >= 16.0.0
- npm ou yarn

### Installation

```bash
# Naviguer vers le répertoire backend
cd backend

# Installer les dépendances
npm install

# Copier les variables d'environnement
cp .env.example .env

# Modifier .env avec vos clés API
# Configurez vos clés API dans le fichier .env
```

### Configuration
Modifiez le fichier `.env` avec vos clés API:
- **GOOGLE_MAPS_API_KEY**: Obtenez sur [Google Cloud Console](https://console.cloud.google.com/)
- **GEONAMES_USERNAME**: Inscrivez-vous sur [GeoNames](https://www.geonames.org/login)
- **NOMINATIM_EMAIL**: Votre email de contact pour l'API Nominatim
- **HDX_API_KEY**: Inscrivez-vous sur [HDX](https://data.humdata.org/)

### Démarrage du Serveur

```bash
# Mode développement (avec rechargement automatique)
npm run dev

# Mode production
npm start
```

Le serveur démarrera sur `http://localhost:5000`

### Points de Terminaison API

#### Géocodage
- `POST /api/geocoding/upload` - Télécharger un fichier Excel/CSV
- `POST /api/geocoding/batch` - Géocoder des villages par lots
- `POST /api/geocoding/single` - Géocoder un seul village
- `POST /api/geocoding/proximity` - Recherche de proximité

#### Filtres
- `GET /api/filters/countries` - Obtenir les pays africains
- `GET /api/filters/regions/:countryCode` - Obtenir les régions
- `GET /api/filters/departments/:regionId` - Obtenir les départements
- `GET /api/filters/arrondissements/:departmentId` - Obtenir les arrondissements

#### Exportation
- `POST /api/export/excel` - Exporter vers Excel
- `POST /api/export/csv` - Exporter vers CSV
- `POST /api/export/pdf` - Exporter vers PDF

---

## License / Licence
MIT
