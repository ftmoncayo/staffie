import { useCallback } from 'react'
import * as api from '../lib/api'
import SearchCombobox from './SearchCombobox'

// Shared Country -> State -> City -> Suburb cascading picker. Each level is
// disabled and empty until its parent is chosen; the parent owns the actual
// selection state and is responsible for clearing descendant levels when a
// higher level changes (see VenueForm/ProfileDetails' handleXChange).
// `showSuburb` lets a filter-only caller (LocationScopeFilter) cap the
// picker at City, since suburb is never a valid filter level there.
function LocationCascade({
  country,
  state,
  city,
  suburb,
  onCountryChange,
  onStateChange,
  onCityChange,
  onSuburbChange,
  suburbLabel = 'Suburb',
  showSuburb = true,
}) {
  const fetchStateOptions = useCallback(
    (search) => (country ? api.fetchStates(country.id, search) : Promise.resolve([])),
    [country],
  )

  const handleCreateState = useCallback(
    (stateName) => {
      if (!country) return Promise.reject(new Error('Select a country first'))
      return api.createState(stateName, country.id)
    },
    [country],
  )

  const fetchCityOptions = useCallback(
    (search) => (state ? api.fetchCitiesByState(state.id, search) : Promise.resolve([])),
    [state],
  )

  const handleCreateCity = useCallback(
    (cityName) => {
      if (!state) return Promise.reject(new Error('Select a state first'))
      return api.createCity(cityName, state.id)
    },
    [state],
  )

  const fetchSuburbOptions = useCallback(
    (search) => (city ? api.fetchSuburbs(city.id, search) : Promise.resolve([])),
    [city],
  )

  const handleCreateSuburb = useCallback(
    (suburbName) => {
      if (!city) return Promise.reject(new Error('Select a city first'))
      return api.createSuburb(city.id, suburbName)
    },
    [city],
  )

  return (
    <>
      <label className="flex flex-col gap-1 text-sm text-text-muted">
        Country
        <SearchCombobox
          fetchOptions={api.fetchCountries}
          onCreate={api.createCountry}
          onSelect={onCountryChange}
          initialQuery={country?.name || ''}
          placeholder="Search for a country..."
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-text-muted">
        State/Region
        <SearchCombobox
          fetchOptions={fetchStateOptions}
          onCreate={handleCreateState}
          onSelect={onStateChange}
          initialQuery={state?.name || ''}
          placeholder={country ? 'Search for a state or region...' : 'Select a country first'}
          disabled={!country}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-text-muted">
        City
        <SearchCombobox
          fetchOptions={fetchCityOptions}
          onCreate={handleCreateCity}
          onSelect={onCityChange}
          initialQuery={city?.name || ''}
          placeholder={state ? 'Search for a city...' : 'Select a state first'}
          disabled={!state}
        />
      </label>

      {showSuburb && (
        <label className="flex flex-col gap-1 text-sm text-text-muted">
          {suburbLabel}
          <SearchCombobox
            fetchOptions={fetchSuburbOptions}
            onCreate={handleCreateSuburb}
            onSelect={onSuburbChange}
            initialQuery={suburb?.name || ''}
            placeholder={city ? 'Search for a suburb...' : 'Select a city first'}
            disabled={!city}
          />
        </label>
      )}
    </>
  )
}

export default LocationCascade
