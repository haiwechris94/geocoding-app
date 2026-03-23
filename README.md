#  VillagePoint Application
# Application VillagePoint

A complete bilingual (French/English) geocoding application for African villages with frontend and backend.

Une application complète bilingue (Français/Anglais) de géocodage pour les villages africains avec frontend et backend.

---

## 🇬🇧 English

### Overview
This application helps users find geographic coordinates (latitude/longitude) for villages across 54 African countries. It supports batch geocoding from Excel/CSV files, manual entry, and interactive map-based search.

### Features
- **Multi-API Integration**: Queries Google Maps, GeoNames, OpenStreetMap Nominatim for best results
- **Geographic Filters**: Filter by Country → Region → Department → Arrondissement
- **Batch Geocoding**: Upload Excel/CSV files with village names
- **Manual Entry**: Enter village names one by one or as a list
- **Interactive Map**: Leaflet-based map with radius search
- **Confidence Scoring**: Each result includes a confidence score
- **Multiple Export Formats**: Excel, CSV, PDF
- **Bilingual Interface**: Full English and French support
- **54 African Countries**: Complete coverage of the African continent

### Quick Start

```bash
# Clone or navigate to the project
cd geocoding-app

# Install and start backend
cd backend
npm install
cp .env.example .env
# Edit .env with your API keys
npm run dev

# In a new terminal, install and start frontend
cd frontend
npm install
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Project Structure

```
geocoding-app/
├── backend/
│   ├── server.js              # Express server
│   ├── package.json
│   ├── .env.example           # Environment variables template
│   ├── config/
│   │   ├── apiConfig.js       # API configuration
│   │   └── countries.js       # 54 African countries data
│   ├── controllers/
│   │   ├── geocodingController.js
│   │   ├── villageController.js
│   │   ├── proximityController.js
│   │   ├── exportController.js
│   │   └── filterController.js
│   ├── routes/
│   │   ├── geocoding.js
│   │   ├── villages.js
│   │   ├── filters.js
│   │   └── export.js
│   ├── services/
│   │   ├── geocodingService.js
│   │   ├── proximityService.js
│   │   ├── filterService.js
│   │   └── apiClients.js
│   └── utils/
│       ├── excelParser.js
│       ├── exportUtils.js
│       └── validators.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── services/
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
└── README.md
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/geocoding/upload | Upload Excel/CSV file |
| POST | /api/geocoding/batch | Batch geocode villages |
| POST | /api/geocoding/single | Geocode single village |
| GET | /api/filters/countries | Get 54 African countries |
| GET | /api/filters/regions/:code | Get regions for country |
| GET | /api/filters/departments/:id | Get departments |
| GET | /api/filters/arrondissements/:id | Get arrondissements |
| POST | /api/export/excel | Export to Excel |
| POST | /api/export/csv | Export to CSV |
| POST | /api/export/pdf | Export to PDF |

### Configuration

Edit `backend/.env` with your API keys:

```env
# Required for best results
GOOGLE_MAPS_API_KEY=your_key_here
GEONAMES_USERNAME=your_username_here

# Optional
NOMINATIM_EMAIL=your_email@example.com
HDX_API_KEY=your_key_here
```

---

## 🇫🇷 Français

### Aperçu
Cette application aide les utilisateurs à trouver les coordonnées géographiques (latitude/longitude) des villages dans 54 pays africains. Elle prend en charge le géocodage par lots à partir de fichiers Excel/CSV, la saisie manuelle et la recherche interactive sur carte.

### Fonctionnalités
- **Intégration Multi-API**: Interroge Google Maps, GeoNames, OpenStreetMap Nominatim
- **Filtres Géographiques**: Filtrer par Pays → Région → Département → Arrondissement
- **Géocodage par Lots**: Télécharger des fichiers Excel/CSV avec les noms de villages
- **Saisie Manuelle**: Entrer les noms de villages un par un ou en liste
- **Carte Interactive**: Carte Leaflet avec recherche par rayon
- **Score de Confiance**: Chaque résultat inclut un score de confiance
- **Formats d'Export Multiples**: Excel, CSV, PDF
- **Interface Bilingue**: Support complet Anglais et Français
- **54 Pays Africains**: Couverture complète du continent africain

### Démarrage Rapide

```bash
# Cloner ou naviguer vers le projet
cd geocoding-app

# Installer et démarrer le backend
cd backend
npm install
cp .env.example .env
# Modifier .env avec vos clés API
npm run dev

# Dans un nouveau terminal, installer et démarrer le frontend
cd frontend
npm install
npm start
```

L'application sera disponible à:
- Frontend: http://localhost:3000
- API Backend: http://localhost:5000

### Configuration

Modifiez `backend/.env` avec vos clés API:

```env
# Requis pour les meilleurs résultats
GOOGLE_MAPS_API_KEY=votre_cle_ici
GEONAMES_USERNAME=votre_nom_utilisateur_ici

# Optionnel
NOMINATIM_EMAIL=votre_email@example.com
HDX_API_KEY=votre_cle_ici
```

---

## 📋 Supported Countries / Pays Supportés

### North Africa / Afrique du Nord
Algeria, Egypt, Libya, Morocco, Tunisia, Sudan

### West Africa / Afrique de l'Ouest
Benin, Burkina Faso, Cape Verde, Côte d'Ivoire, Gambia, Ghana, Guinea, Guinea-Bissau, Liberia, Mali, Mauritania, Niger, Nigeria, Senegal, Sierra Leone, Togo

### Central Africa / Afrique Centrale
Cameroon, Central African Republic, Chad, Congo (Brazzaville), DR Congo, Equatorial Guinea, Gabon, São Tomé and Príncipe

### East Africa / Afrique de l'Est
Burundi, Comoros, Djibouti, Eritrea, Ethiopia, Kenya, Madagascar, Malawi, Mauritius, Mozambique, Rwanda, Seychelles, Somalia, South Sudan, Tanzania, Uganda

### Southern Africa / Afrique Australe
Angola, Botswana, Eswatini, Lesotho, Namibia, South Africa, Zambia, Zimbabwe

---

## 📄 License / Licence
MIT

## 👥 Contributing / Contribuer
Contributions are welcome! / Les contributions sont les bienvenues!
"# geocoding-app" 
"# geocoding-app" 
