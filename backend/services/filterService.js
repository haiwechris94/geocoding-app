/**
 * Filter Service
 * Service de Filtrage
 * 
 * Load and filter geographic data (regions, departments, arrondissements).
 * Charger et filtrer les données géographiques (régions, départements, arrondissements).
 */

const { getAllCountries, getCountryByCode, getCountriesByRegion, getAllRegions } = require('../config/countries');

// ===========================================
// Sample Administrative Divisions Data
// Données d'exemple des divisions administratives
// ===========================================

// This is sample data structure - in production, this would come from a database
// Ceci est une structure de données d'exemple - en production, cela viendrait d'une base de données

const administrativeDivisions = {
  // Cameroon / Cameroun
  CMR: {
    regions: [
      { id: 'CMR-AD', nameEN: 'Adamawa', nameFR: 'Adamaoua', capital: 'Ngaoundéré' },
      { id: 'CMR-CE', nameEN: 'Centre', nameFR: 'Centre', capital: 'Yaoundé' },
      { id: 'CMR-ES', nameEN: 'East', nameFR: 'Est', capital: 'Bertoua' },
      { id: 'CMR-EN', nameEN: 'Far North', nameFR: 'Extrême-Nord', capital: 'Maroua' },
      { id: 'CMR-LT', nameEN: 'Littoral', nameFR: 'Littoral', capital: 'Douala' },
      { id: 'CMR-NO', nameEN: 'North', nameFR: 'Nord', capital: 'Garoua' },
      { id: 'CMR-NW', nameEN: 'Northwest', nameFR: 'Nord-Ouest', capital: 'Bamenda' },
      { id: 'CMR-SU', nameEN: 'South', nameFR: 'Sud', capital: 'Ebolowa' },
      { id: 'CMR-SW', nameEN: 'Southwest', nameFR: 'Sud-Ouest', capital: 'Buea' },
      { id: 'CMR-OU', nameEN: 'West', nameFR: 'Ouest', capital: 'Bafoussam' }
    ],
    departments: {
      'CMR-CE': [
        { id: 'CMR-CE-HW', nameEN: 'Haute-Sanaga', nameFR: 'Haute-Sanaga', capital: 'Nanga-Eboko' },
        { id: 'CMR-CE-LK', nameEN: 'Lekié', nameFR: 'Lékié', capital: 'Monatélé' },
        { id: 'CMR-CE-MB', nameEN: 'Mbam-et-Inoubou', nameFR: 'Mbam-et-Inoubou', capital: 'Bafia' },
        { id: 'CMR-CE-MK', nameEN: 'Mbam-et-Kim', nameFR: 'Mbam-et-Kim', capital: 'Ntui' },
        { id: 'CMR-CE-MF', nameEN: 'Méfou-et-Afamba', nameFR: 'Méfou-et-Afamba', capital: 'Mfou' },
        { id: 'CMR-CE-MA', nameEN: 'Méfou-et-Akono', nameFR: 'Méfou-et-Akono', capital: 'Ngoumou' },
        { id: 'CMR-CE-MO', nameEN: 'Mfoundi', nameFR: 'Mfoundi', capital: 'Yaoundé' },
        { id: 'CMR-CE-NY', nameEN: 'Nyong-et-Kellé', nameFR: 'Nyong-et-Kellé', capital: 'Éséka' },
        { id: 'CMR-CE-NM', nameEN: 'Nyong-et-Mfoumou', nameFR: 'Nyong-et-Mfoumou', capital: 'Akonolinga' },
        { id: 'CMR-CE-NS', nameEN: 'Nyong-et-So\'o', nameFR: 'Nyong-et-So\'o', capital: 'Mbalmayo' }
      ],
      'CMR-LT': [
        { id: 'CMR-LT-MO', nameEN: 'Moungo', nameFR: 'Moungo', capital: 'Nkongsamba' },
        { id: 'CMR-LT-NK', nameEN: 'Nkam', nameFR: 'Nkam', capital: 'Yabassi' },
        { id: 'CMR-LT-SA', nameEN: 'Sanaga-Maritime', nameFR: 'Sanaga-Maritime', capital: 'Édéa' },
        { id: 'CMR-LT-WO', nameEN: 'Wouri', nameFR: 'Wouri', capital: 'Douala' }
      ],
      'CMR-OU': [
        { id: 'CMR-OU-BA', nameEN: 'Bamboutos', nameFR: 'Bamboutos', capital: 'Mbouda' },
        { id: 'CMR-OU-HA', nameEN: 'Haut-Nkam', nameFR: 'Haut-Nkam', capital: 'Bafang' },
        { id: 'CMR-OU-HP', nameEN: 'Hauts-Plateaux', nameFR: 'Hauts-Plateaux', capital: 'Baham' },
        { id: 'CMR-OU-KO', nameEN: 'Koung-Khi', nameFR: 'Koung-Khi', capital: 'Bandjoun' },
        { id: 'CMR-OU-ME', nameEN: 'Menoua', nameFR: 'Menoua', capital: 'Dschang' },
        { id: 'CMR-OU-MI', nameEN: 'Mifi', nameFR: 'Mifi', capital: 'Bafoussam' },
        { id: 'CMR-OU-ND', nameEN: 'Ndé', nameFR: 'Ndé', capital: 'Bangangté' },
        { id: 'CMR-OU-NO', nameEN: 'Noun', nameFR: 'Noun', capital: 'Foumban' }
      ]
    },
    arrondissements: {
      'CMR-CE-MO': [
        { id: 'CMR-CE-MO-Y1', nameEN: 'Yaoundé I', nameFR: 'Yaoundé I' },
        { id: 'CMR-CE-MO-Y2', nameEN: 'Yaoundé II', nameFR: 'Yaoundé II' },
        { id: 'CMR-CE-MO-Y3', nameEN: 'Yaoundé III', nameFR: 'Yaoundé III' },
        { id: 'CMR-CE-MO-Y4', nameEN: 'Yaoundé IV', nameFR: 'Yaoundé IV' },
        { id: 'CMR-CE-MO-Y5', nameEN: 'Yaoundé V', nameFR: 'Yaoundé V' },
        { id: 'CMR-CE-MO-Y6', nameEN: 'Yaoundé VI', nameFR: 'Yaoundé VI' },
        { id: 'CMR-CE-MO-Y7', nameEN: 'Yaoundé VII', nameFR: 'Yaoundé VII' }
      ],
      'CMR-LT-WO': [
        { id: 'CMR-LT-WO-D1', nameEN: 'Douala I', nameFR: 'Douala I' },
        { id: 'CMR-LT-WO-D2', nameEN: 'Douala II', nameFR: 'Douala II' },
        { id: 'CMR-LT-WO-D3', nameEN: 'Douala III', nameFR: 'Douala III' },
        { id: 'CMR-LT-WO-D4', nameEN: 'Douala IV', nameFR: 'Douala IV' },
        { id: 'CMR-LT-WO-D5', nameEN: 'Douala V', nameFR: 'Douala V' },
        { id: 'CMR-LT-WO-D6', nameEN: 'Douala VI', nameFR: 'Douala VI' }
      ]
    }
  },
  
  // Senegal / Sénégal
  SEN: {
    regions: [
      { id: 'SEN-DK', nameEN: 'Dakar', nameFR: 'Dakar', capital: 'Dakar' },
      { id: 'SEN-DB', nameEN: 'Diourbel', nameFR: 'Diourbel', capital: 'Diourbel' },
      { id: 'SEN-FK', nameEN: 'Fatick', nameFR: 'Fatick', capital: 'Fatick' },
      { id: 'SEN-KA', nameEN: 'Kaffrine', nameFR: 'Kaffrine', capital: 'Kaffrine' },
      { id: 'SEN-KL', nameEN: 'Kaolack', nameFR: 'Kaolack', capital: 'Kaolack' },
      { id: 'SEN-KE', nameEN: 'Kédougou', nameFR: 'Kédougou', capital: 'Kédougou' },
      { id: 'SEN-KD', nameEN: 'Kolda', nameFR: 'Kolda', capital: 'Kolda' },
      { id: 'SEN-LG', nameEN: 'Louga', nameFR: 'Louga', capital: 'Louga' },
      { id: 'SEN-MT', nameEN: 'Matam', nameFR: 'Matam', capital: 'Matam' },
      { id: 'SEN-SL', nameEN: 'Saint-Louis', nameFR: 'Saint-Louis', capital: 'Saint-Louis' },
      { id: 'SEN-SE', nameEN: 'Sédhiou', nameFR: 'Sédhiou', capital: 'Sédhiou' },
      { id: 'SEN-TC', nameEN: 'Tambacounda', nameFR: 'Tambacounda', capital: 'Tambacounda' },
      { id: 'SEN-TH', nameEN: 'Thiès', nameFR: 'Thiès', capital: 'Thiès' },
      { id: 'SEN-ZG', nameEN: 'Ziguinchor', nameFR: 'Ziguinchor', capital: 'Ziguinchor' }
    ],
    departments: {
      'SEN-DK': [
        { id: 'SEN-DK-DK', nameEN: 'Dakar', nameFR: 'Dakar', capital: 'Dakar' },
        { id: 'SEN-DK-GU', nameEN: 'Guédiawaye', nameFR: 'Guédiawaye', capital: 'Guédiawaye' },
        { id: 'SEN-DK-PK', nameEN: 'Pikine', nameFR: 'Pikine', capital: 'Pikine' },
        { id: 'SEN-DK-RU', nameEN: 'Rufisque', nameFR: 'Rufisque', capital: 'Rufisque' }
      ],
      'SEN-TH': [
        { id: 'SEN-TH-MB', nameEN: 'Mbour', nameFR: 'Mbour', capital: 'Mbour' },
        { id: 'SEN-TH-TH', nameEN: 'Thiès', nameFR: 'Thiès', capital: 'Thiès' },
        { id: 'SEN-TH-TV', nameEN: 'Tivaouane', nameFR: 'Tivaouane', capital: 'Tivaouane' }
      ]
    },
    arrondissements: {}
  },

  // Nigeria / Nigéria
  NGA: {
    regions: [
      { id: 'NGA-AB', nameEN: 'Abia', nameFR: 'Abia', capital: 'Umuahia' },
      { id: 'NGA-AD', nameEN: 'Adamawa', nameFR: 'Adamawa', capital: 'Yola' },
      { id: 'NGA-AK', nameEN: 'Akwa Ibom', nameFR: 'Akwa Ibom', capital: 'Uyo' },
      { id: 'NGA-AN', nameEN: 'Anambra', nameFR: 'Anambra', capital: 'Awka' },
      { id: 'NGA-BA', nameEN: 'Bauchi', nameFR: 'Bauchi', capital: 'Bauchi' },
      { id: 'NGA-BY', nameEN: 'Bayelsa', nameFR: 'Bayelsa', capital: 'Yenagoa' },
      { id: 'NGA-BE', nameEN: 'Benue', nameFR: 'Benue', capital: 'Makurdi' },
      { id: 'NGA-BO', nameEN: 'Borno', nameFR: 'Borno', capital: 'Maiduguri' },
      { id: 'NGA-CR', nameEN: 'Cross River', nameFR: 'Cross River', capital: 'Calabar' },
      { id: 'NGA-DE', nameEN: 'Delta', nameFR: 'Delta', capital: 'Asaba' },
      { id: 'NGA-EB', nameEN: 'Ebonyi', nameFR: 'Ebonyi', capital: 'Abakaliki' },
      { id: 'NGA-ED', nameEN: 'Edo', nameFR: 'Edo', capital: 'Benin City' },
      { id: 'NGA-EK', nameEN: 'Ekiti', nameFR: 'Ekiti', capital: 'Ado Ekiti' },
      { id: 'NGA-EN', nameEN: 'Enugu', nameFR: 'Enugu', capital: 'Enugu' },
      { id: 'NGA-FC', nameEN: 'Federal Capital Territory', nameFR: 'Territoire de la Capitale Fédérale', capital: 'Abuja' },
      { id: 'NGA-GO', nameEN: 'Gombe', nameFR: 'Gombe', capital: 'Gombe' },
      { id: 'NGA-IM', nameEN: 'Imo', nameFR: 'Imo', capital: 'Owerri' },
      { id: 'NGA-JI', nameEN: 'Jigawa', nameFR: 'Jigawa', capital: 'Dutse' },
      { id: 'NGA-KD', nameEN: 'Kaduna', nameFR: 'Kaduna', capital: 'Kaduna' },
      { id: 'NGA-KN', nameEN: 'Kano', nameFR: 'Kano', capital: 'Kano' },
      { id: 'NGA-KT', nameEN: 'Katsina', nameFR: 'Katsina', capital: 'Katsina' },
      { id: 'NGA-KE', nameEN: 'Kebbi', nameFR: 'Kebbi', capital: 'Birnin Kebbi' },
      { id: 'NGA-KO', nameEN: 'Kogi', nameFR: 'Kogi', capital: 'Lokoja' },
      { id: 'NGA-KW', nameEN: 'Kwara', nameFR: 'Kwara', capital: 'Ilorin' },
      { id: 'NGA-LA', nameEN: 'Lagos', nameFR: 'Lagos', capital: 'Ikeja' },
      { id: 'NGA-NA', nameEN: 'Nasarawa', nameFR: 'Nasarawa', capital: 'Lafia' },
      { id: 'NGA-NI', nameEN: 'Niger', nameFR: 'Niger', capital: 'Minna' },
      { id: 'NGA-OG', nameEN: 'Ogun', nameFR: 'Ogun', capital: 'Abeokuta' },
      { id: 'NGA-ON', nameEN: 'Ondo', nameFR: 'Ondo', capital: 'Akure' },
      { id: 'NGA-OS', nameEN: 'Osun', nameFR: 'Osun', capital: 'Osogbo' },
      { id: 'NGA-OY', nameEN: 'Oyo', nameFR: 'Oyo', capital: 'Ibadan' },
      { id: 'NGA-PL', nameEN: 'Plateau', nameFR: 'Plateau', capital: 'Jos' },
      { id: 'NGA-RI', nameEN: 'Rivers', nameFR: 'Rivers', capital: 'Port Harcourt' },
      { id: 'NGA-SO', nameEN: 'Sokoto', nameFR: 'Sokoto', capital: 'Sokoto' },
      { id: 'NGA-TA', nameEN: 'Taraba', nameFR: 'Taraba', capital: 'Jalingo' },
      { id: 'NGA-YO', nameEN: 'Yobe', nameFR: 'Yobe', capital: 'Damaturu' },
      { id: 'NGA-ZA', nameEN: 'Zamfara', nameFR: 'Zamfara', capital: 'Gusau' }
    ],
    departments: {},
    arrondissements: {}
  }
};

// ===========================================
// Filter Functions
// ===========================================

/**
 * Get all countries with optional language
 * Obtenir tous les pays avec langue optionnelle
 * 
 * @param {string} lang - Language code ('en' or 'fr')
 * @returns {Array} Array of countries
 */
const getCountries = (lang = 'en') => {
  const countries = getAllCountries();
  return countries.map(c => ({
    code: c.code,
    code2: c.code2,
    name: lang === 'fr' ? c.nameFR : c.nameEN,
    nameEN: c.nameEN,
    nameFR: c.nameFR,
    region: lang === 'fr' ? c.regionFR : c.region,
    capital: lang === 'fr' ? c.capitalFR : c.capital,
    coordinates: c.coordinates
  }));
};

/**
 * Get regions for a country
 * Obtenir les régions d'un pays
 * 
 * @param {string} countryCode - ISO country code
 * @param {string} lang - Language code
 * @returns {Array} Array of regions
 */
const getRegions = (countryCode, lang = 'en') => {
  const countryData = administrativeDivisions[countryCode];
  
  if (!countryData || !countryData.regions) {
    return [];
  }

  return countryData.regions.map(r => ({
    id: r.id,
    name: lang === 'fr' ? r.nameFR : r.nameEN,
    nameEN: r.nameEN,
    nameFR: r.nameFR,
    capital: r.capital
  }));
};

/**
 * Get departments for a region
 * Obtenir les départements d'une région
 * 
 * @param {string} regionId - Region ID
 * @param {string} lang - Language code
 * @returns {Array} Array of departments
 */
const getDepartments = (regionId, lang = 'en') => {
  // Find the country from region ID
  const countryCode = regionId.split('-')[0];
  const countryData = administrativeDivisions[countryCode];
  
  if (!countryData || !countryData.departments || !countryData.departments[regionId]) {
    return [];
  }

  return countryData.departments[regionId].map(d => ({
    id: d.id,
    name: lang === 'fr' ? d.nameFR : d.nameEN,
    nameEN: d.nameEN,
    nameFR: d.nameFR,
    capital: d.capital
  }));
};

/**
 * Get arrondissements for a department
 * Obtenir les arrondissements d'un département
 * 
 * @param {string} departmentId - Department ID
 * @param {string} lang - Language code
 * @returns {Array} Array of arrondissements
 */
const getArrondissements = (departmentId, lang = 'en') => {
  // Find the country from department ID
  const countryCode = departmentId.split('-')[0];
  const countryData = administrativeDivisions[countryCode];
  
  if (!countryData || !countryData.arrondissements || !countryData.arrondissements[departmentId]) {
    return [];
  }

  return countryData.arrondissements[departmentId].map(a => ({
    id: a.id,
    name: lang === 'fr' ? a.nameFR : a.nameEN,
    nameEN: a.nameEN,
    nameFR: a.nameFR
  }));
};

/**
 * Get all African regions (continental)
 * Obtenir toutes les régions africaines (continentales)
 * 
 * @param {string} lang - Language code
 * @returns {Array} Array of continental regions
 */
const getContinentalRegions = (lang = 'en') => {
  return getAllRegions().map(r => ({
    name: lang === 'fr' ? r.nameFR : r.nameEN,
    nameEN: r.nameEN,
    nameFR: r.nameFR
  }));
};

/**
 * Get countries by continental region
 * Obtenir les pays par région continentale
 * 
 * @param {string} region - Region name in English
 * @param {string} lang - Language code
 * @returns {Array} Array of countries in the region
 */
const getCountriesByContinentalRegion = (region, lang = 'en') => {
  const countries = getCountriesByRegion(region);
  return countries.map(c => ({
    code: c.code,
    code2: c.code2,
    name: lang === 'fr' ? c.nameFR : c.nameEN,
    capital: lang === 'fr' ? c.capitalFR : c.capital,
    coordinates: c.coordinates
  }));
};

/**
 * Search administrative divisions
 * Rechercher des divisions administratives
 * 
 * @param {string} query - Search query
 * @param {string} countryCode - Optional country code to limit search
 * @param {string} lang - Language code
 * @returns {Object} Search results grouped by type
 */
const searchAdministrativeDivisions = (query, countryCode = null, lang = 'en') => {
  const results = {
    countries: [],
    regions: [],
    departments: [],
    arrondissements: []
  };

  const searchTerm = query.toLowerCase();

  // Search countries
  const countries = countryCode ? [getCountryByCode(countryCode)] : getAllCountries();
  results.countries = countries.filter(c => 
    c && (c.nameEN.toLowerCase().includes(searchTerm) || 
    c.nameFR.toLowerCase().includes(searchTerm) ||
    c.code.toLowerCase().includes(searchTerm))
  ).map(c => ({
    code: c.code,
    name: lang === 'fr' ? c.nameFR : c.nameEN
  }));

  // Search regions, departments, arrondissements
  const countriesToSearch = countryCode ? [countryCode] : Object.keys(administrativeDivisions);
  
  for (const cc of countriesToSearch) {
    const countryData = administrativeDivisions[cc];
    if (!countryData) continue;

    // Search regions
    if (countryData.regions) {
      const matchingRegions = countryData.regions.filter(r =>
        r.nameEN.toLowerCase().includes(searchTerm) ||
        r.nameFR.toLowerCase().includes(searchTerm)
      );
      results.regions.push(...matchingRegions.map(r => ({
        id: r.id,
        name: lang === 'fr' ? r.nameFR : r.nameEN,
        country: cc
      })));
    }

    // Search departments
    if (countryData.departments) {
      for (const regionId in countryData.departments) {
        const matchingDepts = countryData.departments[regionId].filter(d =>
          d.nameEN.toLowerCase().includes(searchTerm) ||
          d.nameFR.toLowerCase().includes(searchTerm)
        );
        results.departments.push(...matchingDepts.map(d => ({
          id: d.id,
          name: lang === 'fr' ? d.nameFR : d.nameEN,
          region: regionId,
          country: cc
        })));
      }
    }

    // Search arrondissements
    if (countryData.arrondissements) {
      for (const deptId in countryData.arrondissements) {
        const matchingArr = countryData.arrondissements[deptId].filter(a =>
          a.nameEN.toLowerCase().includes(searchTerm) ||
          a.nameFR.toLowerCase().includes(searchTerm)
        );
        results.arrondissements.push(...matchingArr.map(a => ({
          id: a.id,
          name: lang === 'fr' ? a.nameFR : a.nameEN,
          department: deptId,
          country: cc
        })));
      }
    }
  }

  return results;
};

module.exports = {
  getCountries,
  getRegions,
  getDepartments,
  getArrondissements,
  getContinentalRegions,
  getCountriesByContinentalRegion,
  searchAdministrativeDivisions,
  administrativeDivisions
};
