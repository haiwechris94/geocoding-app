import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { filtersAPI } from '../services/api';
import './FilterOptions.css';

const FilterOptions = ({ filters, onFiltersChange }) => {
  const { t, language } = useLanguage();
  const [countries, setCountries] = useState([]);
  const [regions, setRegions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [arrondissements, setArrondissements] = useState([]);
  const [loading, setLoading] = useState({ countries: true });
  const [refCityInput, setRefCityInput] = useState(filters.refCityName || '');
  const [refCityLoading, setRefCityLoading] = useState(false);

  // Geocode the reference city using Nominatim
  const geocodeRefCity = async () => {
    if (!refCityInput.trim()) return;
    setRefCityLoading(true);
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(refCityInput)}&format=json&limit=1`,
        { headers: { 'User-Agent': 'VillagePointApp/1.0' } }
      );
      const data = await resp.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        onFiltersChange({
          ...filters,
          refCityName: refCityInput,
          refCityLat: parseFloat(lat),
          refCityLng: parseFloat(lon),
          refCityDisplay: display_name,
        });
      } else {
        alert(language === 'fr'
          ? `Ville "${refCityInput}" introuvable. Essayez un nom plus précis.`
          : `City "${refCityInput}" not found. Try a more specific name.`);
      }
    } catch (e) {
      console.error('Ref city geocoding error:', e);
    } finally {
      setRefCityLoading(false);
    }
  };

  const clearRefCity = () => {
    setRefCityInput('');
    const updated = { ...filters };
    delete updated.refCityName;
    delete updated.refCityLat;
    delete updated.refCityLng;
    delete updated.refCityDisplay;
    onFiltersChange(updated);
  };

  // Load countries on mount
  useEffect(() => {
    const loadCountries = async () => {
      const maxRetries = 3;
      const delays = [500, 1000, 2000];
      let lastError;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const response = await filtersAPI.getCountries();
          if (response.success) {
            setCountries(response.data.countries);
            setLoading(prev => ({ ...prev, countries: false }));
            return;
          }
        } catch (error) {
          lastError = error;
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, delays[attempt]));
          }
        }
      }
      console.error('Error loading countries:', lastError);
      setLoading(prev => ({ ...prev, countries: false }));
    };
    loadCountries();
  }, []);

  // Load regions when country changes
  useEffect(() => {
    if (filters.countryCode) {
      const loadRegions = async () => {
        setLoading(prev => ({ ...prev, regions: true }));
        try {
          const response = await filtersAPI.getRegions(filters.countryCode);
          if (response.success) {
            setRegions(response.data.regions);
          }
        } catch (error) {
          console.error('Error loading regions:', error);
          setRegions([]);
        } finally {
          setLoading(prev => ({ ...prev, regions: false }));
        }
      };
      loadRegions();
    } else {
      setRegions([]);
    }
  }, [filters.countryCode]);

  // Load departments when region changes
  useEffect(() => {
    if (filters.regionId) {
      const loadDepartments = async () => {
        setLoading(prev => ({ ...prev, departments: true }));
        try {
          const response = await filtersAPI.getDepartments(filters.regionId);
          if (response.success) {
            setDepartments(response.data.departments);
          }
        } catch (error) {
          console.error('Error loading departments:', error);
          setDepartments([]);
        } finally {
          setLoading(prev => ({ ...prev, departments: false }));
        }
      };
      loadDepartments();
    } else {
      setDepartments([]);
    }
  }, [filters.regionId]);

  // Load arrondissements when department changes
  useEffect(() => {
    if (filters.departmentId) {
      const loadArrondissements = async () => {
        setLoading(prev => ({ ...prev, arrondissements: true }));
        try {
          const response = await filtersAPI.getArrondissements(filters.departmentId);
          if (response.success) {
            setArrondissements(response.data.arrondissements);
          }
        } catch (error) {
          console.error('Error loading arrondissements:', error);
          setArrondissements([]);
        } finally {
          setLoading(prev => ({ ...prev, arrondissements: false }));
        }
      };
      loadArrondissements();
    } else {
      setArrondissements([]);
    }
  }, [filters.departmentId]);

  const handleCountryChange = (e) => {
    const countryCode = e.target.value;
    const country = countries.find(c => c.code === countryCode);
    onFiltersChange({
      countryCode,
      country: country?.name || '',
      regionId: '',
      region: '',
      departmentId: '',
      department: '',
      arrondissementId: '',
      arrondissement: ''
    });
  };

  const handleRegionChange = (e) => {
    const regionId = e.target.value;
    const region = regions.find(r => r.id === regionId);
    onFiltersChange({
      ...filters,
      regionId,
      region: region?.name || '',
      departmentId: '',
      department: '',
      arrondissementId: '',
      arrondissement: ''
    });
  };

  const handleDepartmentChange = (e) => {
    const departmentId = e.target.value;
    const department = departments.find(d => d.id === departmentId);
    onFiltersChange({
      ...filters,
      departmentId,
      department: department?.name || '',
      arrondissementId: '',
      arrondissement: ''
    });
  };

  const handleArrondissementChange = (e) => {
    const arrondissementId = e.target.value;
    const arrondissement = arrondissements.find(a => a.id === arrondissementId);
    onFiltersChange({
      ...filters,
      arrondissementId,
      arrondissement: arrondissement?.name || ''
    });
  };

  return (
    <div className="filter-options">
      <h3 className="filter-title">{t('batch.filters.title')}</h3>
      
      <div className="filter-grid">
        {/* Country */}
        <div className="filter-group">
          <label className="filter-label">
            {t('batch.filters.country')}
          </label>
          <select
            className="filter-select"
            value={filters.countryCode || ''}
            onChange={handleCountryChange}
            disabled={loading.countries}
          >
            <option value="">{t('batch.filters.selectCountry')}</option>
            {countries.map(country => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </div>

        {/* Region */}
        <div className="filter-group">
          <label className="filter-label">
            {t('batch.filters.region')} <span className="optional">{t('batch.filters.optional')}</span>
          </label>
          <select
            className="filter-select"
            value={filters.regionId || ''}
            onChange={handleRegionChange}
            disabled={!filters.countryCode || loading.regions || regions.length === 0}
          >
            <option value="">{t('batch.filters.selectRegion')}</option>
            {regions.map(region => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </select>
        </div>

        {/* Department */}
        <div className="filter-group">
          <label className="filter-label">
            {t('batch.filters.department')} <span className="optional">{t('batch.filters.optional')}</span>
          </label>
          <select
            className="filter-select"
            value={filters.departmentId || ''}
            onChange={handleDepartmentChange}
            disabled={!filters.regionId || loading.departments || departments.length === 0}
          >
            <option value="">{t('batch.filters.selectDepartment')}</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        {/* Arrondissement */}
        <div className="filter-group">
          <label className="filter-label">
            {t('batch.filters.arrondissement')} <span className="optional">{t('batch.filters.optional')}</span>
          </label>
          <select
            className="filter-select"
            value={filters.arrondissementId || ''}
            onChange={handleArrondissementChange}
            disabled={!filters.departmentId || loading.arrondissements || arrondissements.length === 0}
          >
            <option value="">{t('batch.filters.selectArrondissement')}</option>
            {arrondissements.map(arr => (
              <option key={arr.id} value={arr.id}>
                {arr.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reference City for proximity */}
      <div className="ref-city-section">
        <label className="filter-label">
          📍 {language === 'fr' ? 'Ville de référence pour la proximité' : 'Reference city for proximity'}
          <span className="optional"> {language === 'fr' ? '(remplace le centre du pays)' : '(replaces country center)'}</span>
        </label>
        <div className="ref-city-input-row">
          <input
            type="text"
            className="filter-input ref-city-input"
            value={refCityInput}
            onChange={e => setRefCityInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && geocodeRefCity()}
            placeholder={language === 'fr' ? 'Ex: Yaoundé, Cameroun' : 'e.g. Yaoundé, Cameroon'}
          />
          <button
            className="btn-ref-city"
            onClick={geocodeRefCity}
            disabled={refCityLoading || !refCityInput.trim()}
          >
            {refCityLoading ? '⏳' : '🔍'} {language === 'fr' ? 'Définir' : 'Set'}
          </button>
          {filters.refCityLat && (
            <button className="btn-clear-ref" onClick={clearRefCity} title={language === 'fr' ? 'Effacer' : 'Clear'}>
              ✕
            </button>
          )}
        </div>
        {filters.refCityLat && (
          <p className="ref-city-confirmed">
            ✅ {filters.refCityDisplay || filters.refCityName} ({Number(filters.refCityLat).toFixed(4)}, {Number(filters.refCityLng).toFixed(4)})
          </p>
        )}
      </div>
    </div>
  );
};

export default FilterOptions;

// Note: add these CSS classes to FilterOptions.css:
// .ref-city-section, .ref-city-input-row, .ref-city-input, .btn-ref-city, .btn-clear-ref, .ref-city-confirmed
