import React, { useState } from 'react';
import './VillageComment.css';

/**
 * VillageComment — displays AI-generated comment for a village result
 * Shows comment if already in result, or fetches on demand
 */
const VillageComment = ({ result, language = 'fr' }) => {
  const [comment, setComment] = useState(result?.comment || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const fetchComment = async () => {
    if (loading || comment) return;
    setLoading(true);
    setError(false);
    try {
      const resp = await fetch(`${API_BASE}/geocoding/village-comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept-Language': language },
        body: JSON.stringify({
          villageName: result.villageName,
          country: result.country || result.filters?.country || '',
          latitude: result.latitude,
          longitude: result.longitude,
          lang: language,
        }),
      });
      const data = await resp.json();
      if (data.success && data.comment) {
        setComment(data.comment);
      } else {
        setError(true);
      }
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // If result has no coordinates, don't show
  if (!result?.found) return null;

  return (
    <div className="village-comment">
      {comment ? (
        <p className="comment-text">
          <span className="comment-icon">💬</span>
          {comment}
        </p>
      ) : (
        <button
          className="comment-btn"
          onClick={fetchComment}
          disabled={loading}
          title={language === 'fr' ? 'Générer un commentaire IA' : 'Generate AI comment'}
        >
          {loading ? (
            <span className="comment-loading">
              <span className="spinner" />
              {language === 'fr' ? 'Analyse...' : 'Analysing...'}
            </span>
          ) : error ? (
            <span className="comment-error">
              ⚠️ {language === 'fr' ? 'Réessayer' : 'Retry'}
            </span>
          ) : (
            <>🤖 {language === 'fr' ? 'Commenter avec IA' : 'AI Comment'}</>
          )}
        </button>
      )}
    </div>
  );
};

export default VillageComment;
