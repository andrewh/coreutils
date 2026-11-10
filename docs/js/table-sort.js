// Simple table sorting and filtering for MkDocs
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    // Initialize Mermaid
    if (typeof mermaid !== 'undefined') {
      mermaid.initialize({
        startOnLoad: true,
        theme: 'default',
        securityLevel: 'loose',
      });
    }

    // Find all tables in the document
    const tables = document.querySelectorAll('table:not([class*="no-sort"])');

    tables.forEach(function(table) {
      // Add search/filter input
      const wrapper = document.createElement('div');
      wrapper.className = 'table-wrapper';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);

      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = 'Filter table...';
      searchInput.className = 'table-filter';
      searchInput.style.cssText = 'margin-bottom: 10px; padding: 8px; width: 100%; max-width: 300px; border: 1px solid #ccc; border-radius: 4px;';
      wrapper.insertBefore(searchInput, table);

      // Add sortable class to headers
      const headers = table.querySelectorAll('th');
      headers.forEach(function(header, index) {
        header.style.cursor = 'pointer';
        header.style.userSelect = 'none';
        header.style.position = 'relative';

        // Add sort indicator
        const indicator = document.createElement('span');
        indicator.className = 'sort-indicator';
        indicator.textContent = ' ⇕';
        indicator.style.opacity = '0.3';
        header.appendChild(indicator);

        header.addEventListener('click', function() {
          sortTable(table, index, header, indicator);
        });
      });

      // Filter functionality
      searchInput.addEventListener('input', function() {
        const filter = this.value.toLowerCase();
        const rows = table.querySelectorAll('tbody tr');

        rows.forEach(function(row) {
          const text = row.textContent.toLowerCase();
          row.style.display = text.includes(filter) ? '' : 'none';
        });
      });
    });

    function sortTable(table, columnIndex, header, indicator) {
      const tbody = table.querySelector('tbody') || table;
      const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => row.querySelector('td'));

      const isAscending = header.classList.contains('asc');
      
      // Reset all headers
      table.querySelectorAll('th').forEach(th => {
        th.classList.remove('asc', 'desc');
        const ind = th.querySelector('.sort-indicator');
        if (ind) {
          ind.textContent = ' ⇕';
          ind.style.opacity = '0.3';
        }
      });

      // Set current header state
      header.classList.add(isAscending ? 'desc' : 'asc');
      indicator.textContent = isAscending ? ' ▼' : ' ▲';
      indicator.style.opacity = '1';

      // Sort rows
      rows.sort(function(a, b) {
        const aVal = a.cells[columnIndex].textContent.trim();
        const bVal = b.cells[columnIndex].textContent.trim();

        // Try numeric comparison first
        const aNum = parseFloat(aVal.replace(/,/g, ''));
        const bNum = parseFloat(bVal.replace(/,/g, ''));

        if (!isNaN(aNum) && !isNaN(bNum)) {
          return isAscending ? bNum - aNum : aNum - bNum;
        }

        // String comparison
        return isAscending ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
      });

      // Reorder rows
      rows.forEach(row => tbody.appendChild(row));
    }
  });
})();
