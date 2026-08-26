'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import * as logger from '../lib/logger';

const PrincipalEmailAutocomplete = ({
  id,
  value,
  onChange,
  placeholder = "Enter principal email",
  className = "",
  disabled = false,
  required = false,
  onSelect = null
}) => {
  const listboxId = id ? `${id}-listbox` : undefined;
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const wrapperRef = useRef(null);

  useEffect(() => {
    // Update search term when value prop changes
    setSearchTerm(value || '');
  }, [value]);

  useEffect(() => {
    // Close suggestions when clicking outside
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/principals');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Filter suggestions based on search query
          const filtered = data.principals.filter(principal =>
            principal.email.toLowerCase().includes(query.toLowerCase()) ||
            principal.name.toLowerCase().includes(query.toLowerCase()) ||
            principal.schoolName.toLowerCase().includes(query.toLowerCase())
          );
          setSuggestions(filtered);
        }
      }
    } catch (error) {
      logger.error('Error fetching principal suggestions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.length >= 2) {
        fetchSuggestions(searchTerm);
      }
    }, 300); // 300ms delay

    return () => clearTimeout(timeoutId);
  }, [searchTerm, fetchSuggestions]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
    
    if (newValue.length >= 2) {
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchTerm(suggestion.email);
    onChange(suggestion.email);
    setShowSuggestions(false);
    setSuggestions([]);
    
    if (onSelect) {
      onSelect(suggestion);
    }
  };

  const clearInput = () => {
    setSearchTerm('');
    onChange('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const toggleSuggestions = () => {
    if (searchTerm.length >= 2 && suggestions.length > 0) {
      setShowSuggestions(!showSuggestions);
    }
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={showSuggestions && suggestions.length > 0}
          aria-controls={listboxId}
          aria-autocomplete="list"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => {
            if (searchTerm.length >= 2 && suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          className={`w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-200 ${
            disabled ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
          disabled={disabled}
          required={required}
        />
        
        {/* Search Icon */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        
        {/* Clear Button */}
        {searchTerm && !disabled && (
          <button
            type="button"
            onClick={clearInput}
            className="absolute inset-y-0 right-8 pr-3 flex items-center hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
        
        {/* Dropdown Arrow */}
        <button
          type="button"
          onClick={toggleSuggestions}
          className={`absolute inset-y-0 right-0 pr-3 flex items-center transition-transform ${
            showSuggestions ? 'rotate-180' : ''
          } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          disabled={disabled}
        >
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500 text-center">
              Loading...
            </div>
          ) : suggestions.length > 0 ? (
            <ul id={listboxId} role="listbox">
              {suggestions.map((suggestion) => (
                <li key={suggestion.email} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-purple-50 focus:bg-purple-50 focus:outline-none transition-colors duration-150"
                  >
                    <div className="font-medium text-gray-900">{suggestion.name}</div>
                    <div className="text-gray-600 text-xs">{suggestion.email}</div>
                    <div className="text-gray-500 text-xs">{suggestion.schoolName}</div>
                  </button>
                </li>
              ))}
            </ul>
          ) : searchTerm.length >= 2 ? (
            <div className="px-3 py-2 text-sm text-gray-500 text-center">
              No principals found
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default PrincipalEmailAutocomplete;
