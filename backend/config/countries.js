/**
 * African Countries Configuration
 * Configuration des Pays Africains
 * 
 * Complete list of 54 African countries with ISO codes, names (EN/FR),
 * regions, capitals, and coordinates.
 * 
 * Liste complète des 54 pays africains avec codes ISO, noms (EN/FR),
 * régions, capitales et coordonnées.
 */

const africanCountries = [
  // ===========================================
  // North Africa / Afrique du Nord
  // ===========================================
  {
    code: 'DZA',
    code2: 'DZ',
    nameEN: 'Algeria',
    nameFR: 'Algérie',
    region: 'North Africa',
    regionFR: 'Afrique du Nord',
    capital: 'Algiers',
    capitalFR: 'Alger',
    coordinates: { lat: 28.0339, lng: 1.6596 },
    dialCode: '+213',
    currency: 'DZD'
  },
  {
    code: 'EGY',
    code2: 'EG',
    nameEN: 'Egypt',
    nameFR: 'Égypte',
    region: 'North Africa',
    regionFR: 'Afrique du Nord',
    capital: 'Cairo',
    capitalFR: 'Le Caire',
    coordinates: { lat: 26.8206, lng: 30.8025 },
    dialCode: '+20',
    currency: 'EGP'
  },
  {
    code: 'LBY',
    code2: 'LY',
    nameEN: 'Libya',
    nameFR: 'Libye',
    region: 'North Africa',
    regionFR: 'Afrique du Nord',
    capital: 'Tripoli',
    capitalFR: 'Tripoli',
    coordinates: { lat: 26.3351, lng: 17.2283 },
    dialCode: '+218',
    currency: 'LYD'
  },
  {
    code: 'MAR',
    code2: 'MA',
    nameEN: 'Morocco',
    nameFR: 'Maroc',
    region: 'North Africa',
    regionFR: 'Afrique du Nord',
    capital: 'Rabat',
    capitalFR: 'Rabat',
    coordinates: { lat: 31.7917, lng: -7.0926 },
    dialCode: '+212',
    currency: 'MAD'
  },
  {
    code: 'TUN',
    code2: 'TN',
    nameEN: 'Tunisia',
    nameFR: 'Tunisie',
    region: 'North Africa',
    regionFR: 'Afrique du Nord',
    capital: 'Tunis',
    capitalFR: 'Tunis',
    coordinates: { lat: 33.8869, lng: 9.5375 },
    dialCode: '+216',
    currency: 'TND'
  },
  {
    code: 'SDN',
    code2: 'SD',
    nameEN: 'Sudan',
    nameFR: 'Soudan',
    region: 'North Africa',
    regionFR: 'Afrique du Nord',
    capital: 'Khartoum',
    capitalFR: 'Khartoum',
    coordinates: { lat: 12.8628, lng: 30.2176 },
    dialCode: '+249',
    currency: 'SDG'
  },

  // ===========================================
  // West Africa / Afrique de l'Ouest
  // ===========================================
  {
    code: 'BEN',
    code2: 'BJ',
    nameEN: 'Benin',
    nameFR: 'Bénin',
    region: 'West Africa',
    regionFR: 'Afrique de l\'Ouest',
    capital: 'Porto-Novo',
    capitalFR: 'Porto-Novo',
    coordinates: { lat: 9.3077, lng: 2.3158 },
    dialCode: '+229',
    currency: 'XOF'
  },
  {
    code: 'BFA',
    code2: 'BF',
    nameEN: 'Burkina Faso',
    nameFR: 'Burkina Faso',
    region: 'West Africa',
    regionFR: 'Afrique de l\'Ouest',
    capital: 'Ouagadougou',
    capitalFR: 'Ouagadougou',
    coordinates: { lat: 12.2383, lng: -1.5616 },
    dialCode: '+226',
    currency: 'XOF'
  },
  {
    code: 'CPV',
    code2: 'CV',
    nameEN: 'Cape Verde',
    nameFR: 'Cap-Vert',
    region: 'West Africa',
    regionFR: 'Afrique de l\'Ouest',
    capital: 'Praia',
    capitalFR: 'Praia',
    coordinates: { lat: 16.5388, lng: -23.0418 },
    dialCode: '+238',
    currency: 'CVE'
  },
  {
    code: 'CIV',
    code2: 'CI',
    nameEN: 'Côte d\'Ivoire',
    nameFR: 'Côte d\'Ivoire',
    region: 'West Africa',
    regionFR: 'Afrique de l\'Ouest',
    capital: 'Yamoussoukro',
    capitalFR: 'Yamoussoukro',
    coordinates: { lat: 7.5400, lng: -5.5471 },
    dialCode: '+225',
    currency: 'XOF'
  },
  {
    code: 'GMB',
    code2: 'GM',
    nameEN: 'Gambia',
    nameFR: 'Gambie',
    region: 'West Africa',
    regionFR: 'Afrique de l\'Ouest',
    capital: 'Banjul',
    capitalFR: 'Banjul',
    coordinates: { lat: 13.4432, lng: -15.3101 },
    dialCode: '+220',
    currency: 'GMD'
  },
  {
    code: 'GHA',
    code2: 'GH',
    nameEN: 'Ghana',
    nameFR: 'Ghana',
    region: 'West Africa',
    regionFR: 'Afrique de l\'Ouest',
    capital: 'Accra',
    capitalFR: 'Accra',
    coordinates: { lat: 7.9465, lng: -1.0232 },
    dialCode: '+233',
    currency: 'GHS'
  },
  {
    code: 'GIN',
    code2: 'GN',
    nameEN: 'Guinea',
    nameFR: 'Guinée',
    region: 'West Africa',
    regionFR: 'Afrique de l\'Ouest',
    capital: 'Conakry',
    capitalFR: 'Conakry',
    coordinates: { lat: 9.9456, lng: -9.6966 },
    dialCode: '+224',
    currency: 'GNF'
  },
  {
    code: 'GNB',
    code2: 'GW',
    nameEN: 'Guinea-Bissau',
    nameFR: 'Guinée-Bissau',
    region: 'West Africa',
    regionFR: 'Afrique de l\'Ouest',
    capital: 'Bissau',
    capitalFR: 'Bissau',
    coordinates: { lat: 11.8037, lng: -15.1804 },
    dialCode: '+245',
    currency: 'XOF'
  },
  {
    code: 'LBR',
    code2: 'LR',
    nameEN: 'Liberia',
    nameFR: 'Libéria',
    region: 'West Africa',
    regionFR: 'Afrique de l\'Ouest',
    capital: 'Monrovia',
    capitalFR: 'Monrovia',
    coordinates: { lat: 6.4281, lng: -9.4295 },
    dialCode: '+231',
    currency: 'LRD'
  },
  {
    code: 'MLI',
    code2: 'ML',
    nameEN: 'Mali',
    nameFR: 'Mali',
    region: 'West Africa',
    regionFR: 'Afrique de l\'Ouest',
    capital: 'Bamako',
    capitalFR: 'Bamako',
    coordinates: { lat: 17.5707, lng: -3.9962 },
    dialCode: '+223',
    currency: 'XOF'
  },
  {
    code: 'MRT',
    code2: 'MR',
    nameEN: 'Mauritania',
    nameFR: 'Mauritanie',
    region: 'West Africa',
    regionFR: 'Afrique de l\'Ouest',
    capital: 'Nouakchott',
    capitalFR: 'Nouakchott',
    coordinates: { lat: 21.0079, lng: -10.9408 },
    dialCode: '+222',
    currency: 'MRU'
  },
  {
    code: 'NER',
    code2: 'NE',
    nameEN: 'Niger',
    nameFR: 'Niger',
    region: 'West Africa',
    regionFR: 'Afrique de l\'Ouest',
    capital: 'Niamey',
    capitalFR: 'Niamey',
    coordinates: { lat: 17.6078, lng: 8.0817 },
    dialCode: '+227',
    currency: 'XOF'
  },
  {
    code: 'NGA',
    code2: 'NG',
    nameEN: 'Nigeria',
    nameFR: 'Nigéria',
    region: 'West Africa',
    regionFR: 'Afrique de l\'Ouest',
    capital: 'Abuja',
    capitalFR: 'Abuja',
    coordinates: { lat: 9.0820, lng: 8.6753 },
    dialCode: '+234',
    currency: 'NGN'
  },
  {
    code: 'SEN',
    code2: 'SN',
    nameEN: 'Senegal',
    nameFR: 'Sénégal',
    region: 'West Africa',
    regionFR: 'Afrique de l\'Ouest',
    capital: 'Dakar',
    capitalFR: 'Dakar',
    coordinates: { lat: 14.4974, lng: -14.4524 },
    dialCode: '+221',
    currency: 'XOF'
  },
  {
    code: 'SLE',
    code2: 'SL',
    nameEN: 'Sierra Leone',
    nameFR: 'Sierra Leone',
    region: 'West Africa',
    regionFR: 'Afrique de l\'Ouest',
    capital: 'Freetown',
    capitalFR: 'Freetown',
    coordinates: { lat: 8.4606, lng: -11.7799 },
    dialCode: '+232',
    currency: 'SLL'
  },
  {
    code: 'TGO',
    code2: 'TG',
    nameEN: 'Togo',
    nameFR: 'Togo',
    region: 'West Africa',
    regionFR: 'Afrique de l\'Ouest',
    capital: 'Lomé',
    capitalFR: 'Lomé',
    coordinates: { lat: 8.6195, lng: 0.8248 },
    dialCode: '+228',
    currency: 'XOF'
  },

  // ===========================================
  // Central Africa / Afrique Centrale
  // ===========================================
  {
    code: 'CMR',
    code2: 'CM',
    nameEN: 'Cameroon',
    nameFR: 'Cameroun',
    region: 'Central Africa',
    regionFR: 'Afrique Centrale',
    capital: 'Yaoundé',
    capitalFR: 'Yaoundé',
    coordinates: { lat: 7.3697, lng: 12.3547 },
    dialCode: '+237',
    currency: 'XAF'
  },
  {
    code: 'CAF',
    code2: 'CF',
    nameEN: 'Central African Republic',
    nameFR: 'République Centrafricaine',
    region: 'Central Africa',
    regionFR: 'Afrique Centrale',
    capital: 'Bangui',
    capitalFR: 'Bangui',
    coordinates: { lat: 6.6111, lng: 20.9394 },
    dialCode: '+236',
    currency: 'XAF'
  },
  {
    code: 'TCD',
    code2: 'TD',
    nameEN: 'Chad',
    nameFR: 'Tchad',
    region: 'Central Africa',
    regionFR: 'Afrique Centrale',
    capital: 'N\'Djamena',
    capitalFR: 'N\'Djamena',
    coordinates: { lat: 15.4542, lng: 18.7322 },
    dialCode: '+235',
    currency: 'XAF'
  },
  {
    code: 'COG',
    code2: 'CG',
    nameEN: 'Congo (Brazzaville)',
    nameFR: 'Congo (Brazzaville)',
    region: 'Central Africa',
    regionFR: 'Afrique Centrale',
    capital: 'Brazzaville',
    capitalFR: 'Brazzaville',
    coordinates: { lat: -0.2280, lng: 15.8277 },
    dialCode: '+242',
    currency: 'XAF'
  },
  {
    code: 'COD',
    code2: 'CD',
    nameEN: 'Democratic Republic of the Congo',
    nameFR: 'République Démocratique du Congo',
    region: 'Central Africa',
    regionFR: 'Afrique Centrale',
    capital: 'Kinshasa',
    capitalFR: 'Kinshasa',
    coordinates: { lat: -4.0383, lng: 21.7587 },
    dialCode: '+243',
    currency: 'CDF'
  },
  {
    code: 'GNQ',
    code2: 'GQ',
    nameEN: 'Equatorial Guinea',
    nameFR: 'Guinée Équatoriale',
    region: 'Central Africa',
    regionFR: 'Afrique Centrale',
    capital: 'Malabo',
    capitalFR: 'Malabo',
    coordinates: { lat: 1.6508, lng: 10.2679 },
    dialCode: '+240',
    currency: 'XAF'
  },
  {
    code: 'GAB',
    code2: 'GA',
    nameEN: 'Gabon',
    nameFR: 'Gabon',
    region: 'Central Africa',
    regionFR: 'Afrique Centrale',
    capital: 'Libreville',
    capitalFR: 'Libreville',
    coordinates: { lat: -0.8037, lng: 11.6094 },
    dialCode: '+241',
    currency: 'XAF'
  },
  {
    code: 'STP',
    code2: 'ST',
    nameEN: 'São Tomé and Príncipe',
    nameFR: 'São Tomé-et-Príncipe',
    region: 'Central Africa',
    regionFR: 'Afrique Centrale',
    capital: 'São Tomé',
    capitalFR: 'São Tomé',
    coordinates: { lat: 0.1864, lng: 6.6131 },
    dialCode: '+239',
    currency: 'STN'
  },

  // ===========================================
  // East Africa / Afrique de l'Est
  // ===========================================
  {
    code: 'BDI',
    code2: 'BI',
    nameEN: 'Burundi',
    nameFR: 'Burundi',
    region: 'East Africa',
    regionFR: 'Afrique de l\'Est',
    capital: 'Gitega',
    capitalFR: 'Gitega',
    coordinates: { lat: -3.3731, lng: 29.9189 },
    dialCode: '+257',
    currency: 'BIF'
  },
  {
    code: 'COM',
    code2: 'KM',
    nameEN: 'Comoros',
    nameFR: 'Comores',
    region: 'East Africa',
    regionFR: 'Afrique de l\'Est',
    capital: 'Moroni',
    capitalFR: 'Moroni',
    coordinates: { lat: -11.6455, lng: 43.3333 },
    dialCode: '+269',
    currency: 'KMF'
  },
  {
    code: 'DJI',
    code2: 'DJ',
    nameEN: 'Djibouti',
    nameFR: 'Djibouti',
    region: 'East Africa',
    regionFR: 'Afrique de l\'Est',
    capital: 'Djibouti',
    capitalFR: 'Djibouti',
    coordinates: { lat: 11.8251, lng: 42.5903 },
    dialCode: '+253',
    currency: 'DJF'
  },
  {
    code: 'ERI',
    code2: 'ER',
    nameEN: 'Eritrea',
    nameFR: 'Érythrée',
    region: 'East Africa',
    regionFR: 'Afrique de l\'Est',
    capital: 'Asmara',
    capitalFR: 'Asmara',
    coordinates: { lat: 15.1794, lng: 39.7823 },
    dialCode: '+291',
    currency: 'ERN'
  },
  {
    code: 'ETH',
    code2: 'ET',
    nameEN: 'Ethiopia',
    nameFR: 'Éthiopie',
    region: 'East Africa',
    regionFR: 'Afrique de l\'Est',
    capital: 'Addis Ababa',
    capitalFR: 'Addis-Abeba',
    coordinates: { lat: 9.1450, lng: 40.4897 },
    dialCode: '+251',
    currency: 'ETB'
  },
  {
    code: 'KEN',
    code2: 'KE',
    nameEN: 'Kenya',
    nameFR: 'Kenya',
    region: 'East Africa',
    regionFR: 'Afrique de l\'Est',
    capital: 'Nairobi',
    capitalFR: 'Nairobi',
    coordinates: { lat: -0.0236, lng: 37.9062 },
    dialCode: '+254',
    currency: 'KES'
  },
  {
    code: 'MDG',
    code2: 'MG',
    nameEN: 'Madagascar',
    nameFR: 'Madagascar',
    region: 'East Africa',
    regionFR: 'Afrique de l\'Est',
    capital: 'Antananarivo',
    capitalFR: 'Antananarivo',
    coordinates: { lat: -18.7669, lng: 46.8691 },
    dialCode: '+261',
    currency: 'MGA'
  },
  {
    code: 'MWI',
    code2: 'MW',
    nameEN: 'Malawi',
    nameFR: 'Malawi',
    region: 'East Africa',
    regionFR: 'Afrique de l\'Est',
    capital: 'Lilongwe',
    capitalFR: 'Lilongwe',
    coordinates: { lat: -13.2543, lng: 34.3015 },
    dialCode: '+265',
    currency: 'MWK'
  },
  {
    code: 'MUS',
    code2: 'MU',
    nameEN: 'Mauritius',
    nameFR: 'Maurice',
    region: 'East Africa',
    regionFR: 'Afrique de l\'Est',
    capital: 'Port Louis',
    capitalFR: 'Port-Louis',
    coordinates: { lat: -20.3484, lng: 57.5522 },
    dialCode: '+230',
    currency: 'MUR'
  },
  {
    code: 'MOZ',
    code2: 'MZ',
    nameEN: 'Mozambique',
    nameFR: 'Mozambique',
    region: 'East Africa',
    regionFR: 'Afrique de l\'Est',
    capital: 'Maputo',
    capitalFR: 'Maputo',
    coordinates: { lat: -18.6657, lng: 35.5296 },
    dialCode: '+258',
    currency: 'MZN'
  },
  {
    code: 'RWA',
    code2: 'RW',
    nameEN: 'Rwanda',
    nameFR: 'Rwanda',
    region: 'East Africa',
    regionFR: 'Afrique de l\'Est',
    capital: 'Kigali',
    capitalFR: 'Kigali',
    coordinates: { lat: -1.9403, lng: 29.8739 },
    dialCode: '+250',
    currency: 'RWF'
  },
  {
    code: 'SYC',
    code2: 'SC',
    nameEN: 'Seychelles',
    nameFR: 'Seychelles',
    region: 'East Africa',
    regionFR: 'Afrique de l\'Est',
    capital: 'Victoria',
    capitalFR: 'Victoria',
    coordinates: { lat: -4.6796, lng: 55.4920 },
    dialCode: '+248',
    currency: 'SCR'
  },
  {
    code: 'SOM',
    code2: 'SO',
    nameEN: 'Somalia',
    nameFR: 'Somalie',
    region: 'East Africa',
    regionFR: 'Afrique de l\'Est',
    capital: 'Mogadishu',
    capitalFR: 'Mogadiscio',
    coordinates: { lat: 5.1521, lng: 46.1996 },
    dialCode: '+252',
    currency: 'SOS'
  },
  {
    code: 'SSD',
    code2: 'SS',
    nameEN: 'South Sudan',
    nameFR: 'Soudan du Sud',
    region: 'East Africa',
    regionFR: 'Afrique de l\'Est',
    capital: 'Juba',
    capitalFR: 'Djouba',
    coordinates: { lat: 6.8770, lng: 31.3070 },
    dialCode: '+211',
    currency: 'SSP'
  },
  {
    code: 'TZA',
    code2: 'TZ',
    nameEN: 'Tanzania',
    nameFR: 'Tanzanie',
    region: 'East Africa',
    regionFR: 'Afrique de l\'Est',
    capital: 'Dodoma',
    capitalFR: 'Dodoma',
    coordinates: { lat: -6.3690, lng: 34.8888 },
    dialCode: '+255',
    currency: 'TZS'
  },
  {
    code: 'UGA',
    code2: 'UG',
    nameEN: 'Uganda',
    nameFR: 'Ouganda',
    region: 'East Africa',
    regionFR: 'Afrique de l\'Est',
    capital: 'Kampala',
    capitalFR: 'Kampala',
    coordinates: { lat: 1.3733, lng: 32.2903 },
    dialCode: '+256',
    currency: 'UGX'
  },

  // ===========================================
  // Southern Africa / Afrique Australe
  // ===========================================
  {
    code: 'AGO',
    code2: 'AO',
    nameEN: 'Angola',
    nameFR: 'Angola',
    region: 'Southern Africa',
    regionFR: 'Afrique Australe',
    capital: 'Luanda',
    capitalFR: 'Luanda',
    coordinates: { lat: -11.2027, lng: 17.8739 },
    dialCode: '+244',
    currency: 'AOA'
  },
  {
    code: 'BWA',
    code2: 'BW',
    nameEN: 'Botswana',
    nameFR: 'Botswana',
    region: 'Southern Africa',
    regionFR: 'Afrique Australe',
    capital: 'Gaborone',
    capitalFR: 'Gaborone',
    coordinates: { lat: -22.3285, lng: 24.6849 },
    dialCode: '+267',
    currency: 'BWP'
  },
  {
    code: 'SWZ',
    code2: 'SZ',
    nameEN: 'Eswatini',
    nameFR: 'Eswatini',
    region: 'Southern Africa',
    regionFR: 'Afrique Australe',
    capital: 'Mbabane',
    capitalFR: 'Mbabane',
    coordinates: { lat: -26.5225, lng: 31.4659 },
    dialCode: '+268',
    currency: 'SZL'
  },
  {
    code: 'LSO',
    code2: 'LS',
    nameEN: 'Lesotho',
    nameFR: 'Lesotho',
    region: 'Southern Africa',
    regionFR: 'Afrique Australe',
    capital: 'Maseru',
    capitalFR: 'Maseru',
    coordinates: { lat: -29.6100, lng: 28.2336 },
    dialCode: '+266',
    currency: 'LSL'
  },
  {
    code: 'NAM',
    code2: 'NA',
    nameEN: 'Namibia',
    nameFR: 'Namibie',
    region: 'Southern Africa',
    regionFR: 'Afrique Australe',
    capital: 'Windhoek',
    capitalFR: 'Windhoek',
    coordinates: { lat: -22.9576, lng: 18.4904 },
    dialCode: '+264',
    currency: 'NAD'
  },
  {
    code: 'ZAF',
    code2: 'ZA',
    nameEN: 'South Africa',
    nameFR: 'Afrique du Sud',
    region: 'Southern Africa',
    regionFR: 'Afrique Australe',
    capital: 'Pretoria',
    capitalFR: 'Pretoria',
    coordinates: { lat: -30.5595, lng: 22.9375 },
    dialCode: '+27',
    currency: 'ZAR'
  },
  {
    code: 'ZMB',
    code2: 'ZM',
    nameEN: 'Zambia',
    nameFR: 'Zambie',
    region: 'Southern Africa',
    regionFR: 'Afrique Australe',
    capital: 'Lusaka',
    capitalFR: 'Lusaka',
    coordinates: { lat: -13.1339, lng: 27.8493 },
    dialCode: '+260',
    currency: 'ZMW'
  },
  {
    code: 'ZWE',
    code2: 'ZW',
    nameEN: 'Zimbabwe',
    nameFR: 'Zimbabwe',
    region: 'Southern Africa',
    regionFR: 'Afrique Australe',
    capital: 'Harare',
    capitalFR: 'Harare',
    coordinates: { lat: -19.0154, lng: 29.1549 },
    dialCode: '+263',
    currency: 'ZWL'
  }
];

/**
 * Get all countries / Obtenir tous les pays
 */
const getAllCountries = () => africanCountries;

/**
 * Get country by code / Obtenir un pays par code
 * @param {string} code - ISO 3166-1 alpha-3 code
 */
const getCountryByCode = (code) => {
  return africanCountries.find(c => c.code === code || c.code2 === code);
};

/**
 * Get countries by region / Obtenir les pays par région
 * @param {string} region - Region name in English
 */
const getCountriesByRegion = (region) => {
  return africanCountries.filter(c => c.region === region);
};

/**
 * Get all regions / Obtenir toutes les régions
 */
const getAllRegions = () => {
  const regions = [...new Set(africanCountries.map(c => c.region))];
  return regions.map(region => ({
    nameEN: region,
    nameFR: africanCountries.find(c => c.region === region).regionFR
  }));
};

/**
 * Search countries by name / Rechercher des pays par nom
 * @param {string} query - Search query
 * @param {string} lang - Language ('en' or 'fr')
 */
const searchCountries = (query, lang = 'en') => {
  const searchTerm = query.toLowerCase();
  return africanCountries.filter(c => {
    const name = lang === 'fr' ? c.nameFR : c.nameEN;
    return name.toLowerCase().includes(searchTerm) ||
           c.code.toLowerCase().includes(searchTerm) ||
           c.code2.toLowerCase().includes(searchTerm);
  });
};

module.exports = {
  africanCountries,
  getAllCountries,
  getCountryByCode,
  getCountriesByRegion,
  getAllRegions,
  searchCountries
};
