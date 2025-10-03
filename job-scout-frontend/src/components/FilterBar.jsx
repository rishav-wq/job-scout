import React from 'react';

function FilterBar({ filters, setFilters }) {
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFilters(prevFilters => ({
            ...prevFilters,
            [name]: value,
        }));
    };

    return (
        <div className="filter-bar">
            <input
                type="text"
                name="title"
                placeholder="Search by job title (e.g., Engineer)"
                value={filters.title}
                onChange={handleInputChange}
                className="filter-input"
            />
            <input
                type="text"
                name="location"
                placeholder="Filter by location (e.g., Remote)"
                value={filters.location}
                onChange={handleInputChange}
                className="filter-input"
            />
        </div>
    );
}

export default FilterBar;
