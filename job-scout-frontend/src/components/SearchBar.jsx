import React, { useState } from 'react';
import PropTypes from 'prop-types';

const SearchBar = ({ onSearch }) => {
  const [searchParams, setSearchParams] = useState({
    query: '',
    location: '',
    company: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(searchParams);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSearchParams((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="search-bar">
      <input
        type="text"
        name="query"
        placeholder="Job title or keywords"
        value={searchParams.query}
        onChange={handleChange}
      />
      <input
        type="text"
        name="location"
        placeholder="Location"
        value={searchParams.location}
        onChange={handleChange}
      />
      <input
        type="text"
        name="company"
        placeholder="Company"
        value={searchParams.company}
        onChange={handleChange}
      />
      <button type="submit">Search</button>
    </form>
  );
};

SearchBar.propTypes = {
  onSearch: PropTypes.func.isRequired,
};

export default SearchBar;