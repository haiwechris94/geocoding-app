/**
 * Internationalization Service / Service d'Internationalisation
 * Complete translations for French and English
 */

export const translations = {
  en: {
    // Navigation
    nav: {
      home: 'Home',
      geoAgent: 'GeoAgent',
      batchGeocode: 'Batch Geocode',
      advancedSearch: 'Advanced Search',
      batchProcessing: 'Batch Processing',
      searchHistory: 'History',
      results: 'Results'
    },
    
    // Common
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      cancel: 'Cancel',
      save: 'Save',
      edit: 'Edit',
      delete: 'Delete',
      search: 'Search',
      upload: 'Upload',
      download: 'Download',
      export: 'Export',
      import: 'Import',
      submit: 'Submit',
      reset: 'Reset',
      clear: 'Clear',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      yes: 'Yes',
      no: 'No',
      or: 'or',
      and: 'and',
      all: 'All',
      none: 'None',
      select: 'Select',
      selectAll: 'Select All',
      noResults: 'No results found',
      processing: 'Processing...',
      pleaseWait: 'Please wait...'
    },
    
    // Home Page
    home: {
      title: 'VillagePoint',
      subtitle: 'Find coordinates for villages across 54 African countries',
      uploadCard: {
        title: 'Upload File',
        description: 'Upload an Excel or CSV file containing village names for batch geocoding',
        button: 'Upload File'
      },
      manualCard: {
        title: 'Manual Entry',
        description: 'Enter village names manually one by one or as a list',
        button: 'Enter Manually'
      },
      mapCard: {
        title: 'Map Search',
        description: 'Search for villages using an interactive map with radius selection',
        button: 'Open Map'
      },
      features: {
        title: 'Features',
        multiApi: 'Multi-API Integration',
        multiApiDesc: 'Queries Google Maps, GeoNames, OpenStreetMap for best results',
        filters: 'Geographic Filters',
        filtersDesc: 'Filter by country, region, department, arrondissement',
        export: 'Multiple Export Formats',
        exportDesc: 'Export results to Excel, CSV, or PDF',
        bilingual: 'Bilingual Interface',
        bilingualDesc: 'Full support for English and French'
      }
    },
    
    // Batch Geocode Page
    batch: {
      title: 'Batch Geocoding',
      subtitle: 'Geocode multiple villages at once from a file or manual entry',
      tabs: {
        upload: 'File Upload',
        manual: 'Manual Entry'
      },
      upload: {
        dropzone: 'Drag and drop your file here, or click to browse',
        formats: 'Supported formats: Excel (.xlsx, .xls), CSV (.csv)',
        maxSize: 'Maximum file size: 10MB',
        selectColumn: 'Select the column containing village names',
        preview: 'File Preview'
      },
      manual: {
        placeholder: 'Enter village names (one per line)',
        hint: 'Enter each village name on a new line',
        addMore: 'Add More',
        clearAll: 'Clear All'
      },
      filters: {
        title: 'Geographic Filters',
        country: 'Country',
        region: 'Region',
        department: 'Department',
        arrondissement: 'Arrondissement',
        selectCountry: 'Select a country',
        selectRegion: 'Select a region',
        selectDepartment: 'Select a department',
        selectArrondissement: 'Select an arrondissement',
        optional: '(Optional)'
      },
      actions: {
        startGeocoding: 'Start Geocoding',
        stopGeocoding: 'Stop',
        viewResults: 'View Results'
      },
      progress: {
        title: 'Geocoding Progress',
        processed: 'Processed',
        of: 'of',
        villages: 'villages',
        found: 'Found',
        notFound: 'Not Found',
        lowConfidence: 'Low Confidence'
      }
    },
    
    // Advanced Search Page
    search: {
      title: 'Advanced Map Search',
      subtitle: 'Search for villages using an interactive map',
      instructions: 'Click on the map to set a search center, then enter a village name',
      villageName: 'Village Name',
      villageNamePlaceholder: 'Enter village name...',
      radius: 'Search Radius',
      description: 'Description',
      descriptionPlaceholder: 'Add notes or description...',
      searchButton: 'Search Village',
      searchAreaButton: 'Search Area',
      clearMap: 'Clear Map',
      centerSet: 'Search center set',
      clickToSetCenter: 'Click on map to set search center',
      areaResults: 'Area Results',
      locationsFound: 'locations found'
    },
    
    // Batch Processing
    batchProcessing: {
      title: 'Batch Processing',
      subtitle: 'Geocode multiple locations from a file with AI analysis',
      uploadFile: 'Upload File',
      selectColumn: 'Select the column containing location names',
      startProcessing: 'Start Processing',
      processing: 'Processing...',
      completed: 'Completed',
      failed: 'Failed',
      getAIAnalysis: 'Get AI Analysis',
      qualityScore: 'Quality Score',
      patterns: 'Detected Patterns',
      recommendations: 'Recommendations',
      viewResults: 'View Detailed Results'
    },
    
    // Search History
    searchHistory: {
      title: 'Search History',
      subtitle: 'View and analyze your past searches',
      history: 'History',
      statistics: 'Statistics',
      aiInsights: 'AI Insights',
      totalSearches: 'Total Searches',
      successRate: 'Success Rate',
      avgConfidence: 'Avg Confidence',
      mostSearched: 'Most Searched',
      byType: 'By Type',
      recentTrends: 'Recent Trends',
      generateInsights: 'Generate AI Insights',
      exportCSV: 'Export CSV',
      exportJSON: 'Export JSON',
      clearAll: 'Clear All',
      noHistory: 'No search history',
      insights: 'Insights',
      trends: 'Trends'
    },
    
    // Results Page
    results: {
      title: 'Geocoding Results',
      subtitle: 'View, edit, and export your geocoding results',
      table: {
        villageName: 'Village Name',
        latitude: 'Latitude',
        longitude: 'Longitude',
        source: 'Source',
        confidence: 'Confidence',
        status: 'Status',
        actions: 'Actions'
      },
      status: {
        found: 'Found',
        notFound: 'Not Found',
        lowConfidence: 'Low Confidence',
        edited: 'Edited'
      },
      stats: {
        total: 'Total',
        found: 'Found',
        notFound: 'Not Found',
        lowConfidence: 'Low Confidence',
        successRate: 'Success Rate'
      },
      export: {
        title: 'Export Results',
        excel: 'Export to Excel',
        csv: 'Export to CSV',
        pdf: 'Export to PDF'
      },
      empty: {
        title: 'No Results Yet',
        description: 'Start by uploading a file or entering village names manually'
      },
      editModal: {
        title: 'Edit Coordinates',
        latitude: 'Latitude',
        longitude: 'Longitude',
        save: 'Save Changes',
        cancel: 'Cancel'
      },
      viewOnMap: 'View on Map',
      invalidCoordinates: 'Invalid coordinates - cannot display on map'
    },
    
    // Filter Options
    filters: {
      allCountries: 'All Countries',
      allRegions: 'All Regions',
      allDepartments: 'All Departments',
      allArrondissements: 'All Arrondissements'
    },
    
    // Messages
    messages: {
      fileUploaded: 'File uploaded successfully',
      fileError: 'Error uploading file',
      geocodingStarted: 'Geocoding started',
      geocodingComplete: 'Geocoding complete',
      geocodingError: 'Error during geocoding',
      exportSuccess: 'Export successful',
      exportError: 'Error exporting results',
      noVillages: 'Please enter at least one village name',
      invalidFile: 'Invalid file format',
      fileTooLarge: 'File is too large',
      networkError: 'Network error. Please check your connection.',
      coordinatesSaved: 'Coordinates saved successfully',
      selectColumn: 'Please select a column containing village names'
    },
    
    // Confidence Levels
    confidence: {
      high: 'High',
      medium: 'Medium',
      low: 'Low'
    },
    
    // Language
    language: {
      switch: 'Français',
      current: 'English'
    },
    
    // AI Features
    ai: {
      title: 'AI Assistant',
      askAI: 'Ask AI',
      getRecommendations: 'Get AI Recommendations',
      loading: 'AI is thinking...',
      error: 'AI service unavailable',
      recommendations: 'AI Recommendations',
      nameSuggestions: 'Name Suggestions',
      confidenceExplanation: 'Confidence Explanation',
      tips: 'Tips',
      alternativeSearches: 'Try searching for',
      useThisName: 'Use this name',
      viewDetails: 'View Details',
      hideDetails: 'Hide Details'
    },
    
    // Confidence Details
    confidenceDetails: {
      title: 'Confidence Breakdown',
      sourceReliability: 'Source Reliability',
      nameSimilarity: 'Name Similarity',
      geographicProximity: 'Geographic Proximity',
      resultConsistency: 'Result Consistency',
      originalName: 'Original Name',
      foundName: 'Found Name',
      weight: 'Weight',
      score: 'Score',
      explanation: 'Explanation'
    },
    
    // Name Suggestions
    nameSuggestions: {
      title: 'Similar Names Found',
      similarity: 'Similarity',
      source: 'Source',
      useThis: 'Use This',
      noSuggestions: 'No similar names found'
    },
    
    // Formatted Address & Border Proximity
    formattedAddress: {
      title: 'Formatted Address',
      column: 'Formatted Address'
    },
    borderProximity: {
      title: 'Border Proximity',
      column: 'Border Proximity',
      distance: 'Distance to Border',
      veryClose: 'Very Close',
      close: 'Close',
      moderate: 'Moderate',
      far: 'Far',
      unit: 'km'
    }
  },
  
  fr: {
    // Navigation
    nav: {
      home: 'Accueil',
      geoAgent: 'GeoAgent',
      batchGeocode: 'Géocodage par Lots',
      advancedSearch: 'Recherche Avancée',
      batchProcessing: 'Traitement par Lots',
      searchHistory: 'Historique',
      results: 'Résultats'
    },
    
    // Common
    common: {
      loading: 'Chargement...',
      error: 'Erreur',
      success: 'Succès',
      cancel: 'Annuler',
      save: 'Enregistrer',
      edit: 'Modifier',
      delete: 'Supprimer',
      search: 'Rechercher',
      upload: 'Télécharger',
      download: 'Télécharger',
      export: 'Exporter',
      import: 'Importer',
      submit: 'Soumettre',
      reset: 'Réinitialiser',
      clear: 'Effacer',
      close: 'Fermer',
      back: 'Retour',
      next: 'Suivant',
      previous: 'Précédent',
      yes: 'Oui',
      no: 'Non',
      or: 'ou',
      and: 'et',
      all: 'Tous',
      none: 'Aucun',
      select: 'Sélectionner',
      selectAll: 'Tout sélectionner',
      noResults: 'Aucun résultat trouvé',
      processing: 'Traitement en cours...',
      pleaseWait: 'Veuillez patienter...'
    },
    
    // Home Page
    home: {
      title: 'Géocodage des Villages Africains',
      subtitle: 'Trouvez les coordonnées des villages dans 54 pays africains',
      uploadCard: {
        title: 'Télécharger un Fichier',
        description: 'Téléchargez un fichier Excel ou CSV contenant les noms de villages pour le géocodage par lots',
        button: 'Télécharger'
      },
      manualCard: {
        title: 'Saisie Manuelle',
        description: 'Entrez les noms de villages manuellement un par un ou en liste',
        button: 'Saisir Manuellement'
      },
      mapCard: {
        title: 'Recherche sur Carte',
        description: 'Recherchez des villages en utilisant une carte interactive avec sélection de rayon',
        button: 'Ouvrir la Carte'
      },
      features: {
        title: 'Fonctionnalités',
        multiApi: 'Intégration Multi-API',
        multiApiDesc: 'Interroge Google Maps, GeoNames, OpenStreetMap pour les meilleurs résultats',
        filters: 'Filtres Géographiques',
        filtersDesc: 'Filtrer par pays, région, département, arrondissement',
        export: 'Formats d\'Export Multiples',
        exportDesc: 'Exportez les résultats vers Excel, CSV ou PDF',
        bilingual: 'Interface Bilingue',
        bilingualDesc: 'Support complet pour l\'anglais et le français'
      }
    },
    
    // Batch Geocode Page
    batch: {
      title: 'Géocodage par Lots',
      subtitle: 'Géocodez plusieurs villages à la fois à partir d\'un fichier ou d\'une saisie manuelle',
      tabs: {
        upload: 'Téléchargement de Fichier',
        manual: 'Saisie Manuelle'
      },
      upload: {
        dropzone: 'Glissez-déposez votre fichier ici, ou cliquez pour parcourir',
        formats: 'Formats supportés: Excel (.xlsx, .xls), CSV (.csv)',
        maxSize: 'Taille maximale: 10Mo',
        selectColumn: 'Sélectionnez la colonne contenant les noms de villages',
        preview: 'Aperçu du Fichier'
      },
      manual: {
        placeholder: 'Entrez les noms de villages (un par ligne)',
        hint: 'Entrez chaque nom de village sur une nouvelle ligne',
        addMore: 'Ajouter Plus',
        clearAll: 'Tout Effacer'
      },
      filters: {
        title: 'Filtres Géographiques',
        country: 'Pays',
        region: 'Région',
        department: 'Département',
        arrondissement: 'Arrondissement',
        selectCountry: 'Sélectionnez un pays',
        selectRegion: 'Sélectionnez une région',
        selectDepartment: 'Sélectionnez un département',
        selectArrondissement: 'Sélectionnez un arrondissement',
        optional: '(Optionnel)'
      },
      actions: {
        startGeocoding: 'Démarrer le Géocodage',
        stopGeocoding: 'Arrêter',
        viewResults: 'Voir les Résultats'
      },
      progress: {
        title: 'Progression du Géocodage',
        processed: 'Traités',
        of: 'sur',
        villages: 'villages',
        found: 'Trouvés',
        notFound: 'Non Trouvés',
        lowConfidence: 'Confiance Faible'
      }
    },
    
    // Advanced Search Page
    search: {
      title: 'Recherche Avancée sur Carte',
      subtitle: 'Recherchez des villages en utilisant une carte interactive',
      instructions: 'Cliquez sur la carte pour définir un centre de recherche, puis entrez un nom de village',
      villageName: 'Nom du Village',
      villageNamePlaceholder: 'Entrez le nom du village...',
      radius: 'Rayon de Recherche',
      description: 'Description',
      descriptionPlaceholder: 'Ajoutez des notes ou une description...',
      searchButton: 'Rechercher le Village',
      searchAreaButton: 'Rechercher dans la Zone',
      clearMap: 'Effacer la Carte',
      centerSet: 'Centre de recherche défini',
      clickToSetCenter: 'Cliquez sur la carte pour définir le centre',
      areaResults: 'Résultats de la Zone',
      locationsFound: 'emplacements trouvés'
    },
    
    // Batch Processing
    batchProcessing: {
      title: 'Traitement par Lots',
      subtitle: 'Géocodez plusieurs emplacements à partir d\'un fichier avec analyse IA',
      uploadFile: 'Télécharger un Fichier',
      selectColumn: 'Sélectionnez la colonne contenant les noms de lieux',
      startProcessing: 'Démarrer le Traitement',
      processing: 'Traitement en cours...',
      completed: 'Terminé',
      failed: 'Échoué',
      getAIAnalysis: 'Obtenir l\'Analyse IA',
      qualityScore: 'Score de Qualité',
      patterns: 'Patterns Détectés',
      recommendations: 'Recommandations',
      viewResults: 'Voir les Résultats Détaillés'
    },
    
    // Search History
    searchHistory: {
      title: 'Historique de Recherche',
      subtitle: 'Consultez et analysez vos recherches passées',
      history: 'Historique',
      statistics: 'Statistiques',
      aiInsights: 'Insights IA',
      totalSearches: 'Total Recherches',
      successRate: 'Taux de Réussite',
      avgConfidence: 'Confiance Moyenne',
      mostSearched: 'Plus Recherchés',
      byType: 'Par Type',
      recentTrends: 'Tendances Récentes',
      generateInsights: 'Générer les Insights IA',
      exportCSV: 'Exporter CSV',
      exportJSON: 'Exporter JSON',
      clearAll: 'Effacer Tout',
      noHistory: 'Aucun historique de recherche',
      insights: 'Insights',
      trends: 'Tendances'
    },
    
    // Results Page
    results: {
      title: 'Résultats du Géocodage',
      subtitle: 'Visualisez, modifiez et exportez vos résultats de géocodage',
      table: {
        villageName: 'Nom du Village',
        latitude: 'Latitude',
        longitude: 'Longitude',
        source: 'Source',
        confidence: 'Confiance',
        status: 'Statut',
        actions: 'Actions'
      },
      status: {
        found: 'Trouvé',
        notFound: 'Non Trouvé',
        lowConfidence: 'Confiance Faible',
        edited: 'Modifié'
      },
      stats: {
        total: 'Total',
        found: 'Trouvés',
        notFound: 'Non Trouvés',
        lowConfidence: 'Confiance Faible',
        successRate: 'Taux de Réussite'
      },
      export: {
        title: 'Exporter les Résultats',
        excel: 'Exporter vers Excel',
        csv: 'Exporter vers CSV',
        pdf: 'Exporter vers PDF'
      },
      empty: {
        title: 'Aucun Résultat',
        description: 'Commencez par télécharger un fichier ou entrer des noms de villages manuellement'
      },
      editModal: {
        title: 'Modifier les Coordonnées',
        latitude: 'Latitude',
        longitude: 'Longitude',
        save: 'Enregistrer',
        cancel: 'Annuler'
      },
      viewOnMap: 'Voir sur la carte',
      invalidCoordinates: 'Coordonnées invalides - impossible d\'afficher sur la carte'
    },
    
    // Filter Options
    filters: {
      allCountries: 'Tous les Pays',
      allRegions: 'Toutes les Régions',
      allDepartments: 'Tous les Départements',
      allArrondissements: 'Tous les Arrondissements'
    },
    
    // Messages
    messages: {
      fileUploaded: 'Fichier téléchargé avec succès',
      fileError: 'Erreur lors du téléchargement du fichier',
      geocodingStarted: 'Géocodage démarré',
      geocodingComplete: 'Géocodage terminé',
      geocodingError: 'Erreur lors du géocodage',
      exportSuccess: 'Exportation réussie',
      exportError: 'Erreur lors de l\'exportation',
      noVillages: 'Veuillez entrer au moins un nom de village',
      invalidFile: 'Format de fichier invalide',
      fileTooLarge: 'Le fichier est trop volumineux',
      networkError: 'Erreur réseau. Veuillez vérifier votre connexion.',
      coordinatesSaved: 'Coordonnées enregistrées avec succès',
      selectColumn: 'Veuillez sélectionner une colonne contenant les noms de villages'
    },
    
    // Confidence Levels
    confidence: {
      high: 'Élevée',
      medium: 'Moyenne',
      low: 'Faible'
    },
    
    // Language
    language: {
      switch: 'English',
      current: 'Français'
    },
    
    // AI Features
    ai: {
      title: 'Assistant IA',
      askAI: 'Demander à l\'IA',
      getRecommendations: 'Obtenir des recommandations IA',
      loading: 'L\'IA réfléchit...',
      error: 'Service IA indisponible',
      recommendations: 'Recommandations IA',
      nameSuggestions: 'Suggestions de noms',
      confidenceExplanation: 'Explication de la confiance',
      tips: 'Conseils',
      alternativeSearches: 'Essayez de rechercher',
      useThisName: 'Utiliser ce nom',
      viewDetails: 'Voir les détails',
      hideDetails: 'Masquer les détails'
    },
    
    // Confidence Details
    confidenceDetails: {
      title: 'Détails de la confiance',
      sourceReliability: 'Fiabilité de la source',
      nameSimilarity: 'Similarité du nom',
      geographicProximity: 'Proximité géographique',
      resultConsistency: 'Cohérence des résultats',
      originalName: 'Nom original',
      foundName: 'Nom trouvé',
      weight: 'Poids',
      score: 'Score',
      explanation: 'Explication'
    },
    
    // Name Suggestions
    nameSuggestions: {
      title: 'Noms similaires trouvés',
      similarity: 'Similarité',
      source: 'Source',
      useThis: 'Utiliser',
      noSuggestions: 'Aucun nom similaire trouvé'
    },
    
    // Formatted Address & Border Proximity
    formattedAddress: {
      title: 'Adresse formatée',
      column: 'Adresse formatée'
    },
    borderProximity: {
      title: 'Proximité de la frontière',
      column: 'Proximité frontière',
      distance: 'Distance à la frontière',
      veryClose: 'Très proche',
      close: 'Proche',
      moderate: 'Modérée',
      far: 'Loin',
      unit: 'km'
    }
  }
};

export default translations;