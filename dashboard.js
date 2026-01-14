// Dashboard JavaScript
// Store previous gas readings to detect increases
let previousGasReadings = {
    h2s: null,
    co2: null,
    nh3: null,
    ch4: null
};
let isFirstReading = true;
// Base gas levels that will increase over time
let baseGasLevels = {
    h2s: 2,
    co2: 450,
    nh3: 3,
    ch4: 100
};

// Gas to suspected food items mapping
const gasToFoods = {
    'H₂S': ['Eggs', 'Fish', 'Meat', 'Chicken', 'Milk', 'Cheese'],
    'CO₂': ['Apples', 'Bananas', 'Tomatoes', 'Berries', 'Leafy Greens', 'Carrots'],
    'NH₃': ['Fish', 'Meat', 'Chicken', 'Milk', 'Cheese', 'Eggs'],
    'CH₄': ['Vegetables', 'Fruits', 'Organic Waste', 'Leafy Greens']
};

// Helper function to load stock from localStorage
function loadStockData() {
    try {
        const stockData = localStorage.getItem('nimfresh-stock');
        return stockData ? JSON.parse(stockData) : [];
    } catch (e) {
        console.error('Failed to load stock data', e);
        return [];
    }
}

// Helper function to save stock to localStorage
function saveStockData(items) {
    try {
        localStorage.setItem('nimfresh-stock', JSON.stringify(items));
    } catch (e) {
        console.error('Failed to save stock data', e);
    }
}

// Default items from original dashboard
function getDefaultDashboardItems() {
    return [
        {
            id: 1001,
            name: "Carrots",
            category: "Vegetables",
            quantity: "500g",
            icon: "fas fa-carrot",
            purchaseDate: "12-10-2025",
            expiryDate: "24-10-2025",
            status: "fresh"
        },
        {
            id: 1002,
            name: "Cheese Block",
            category: "Dairy",
            quantity: "200g",
            icon: "fas fa-cheese",
            purchaseDate: "10-10-2025",
            expiryDate: "25-10-2025",
            status: "fresh"
        },
        {
            id: 1003,
            name: "Chicken Breast",
            category: "Meat",
            quantity: "500g",
            icon: "fas fa-drumstick-bite",
            purchaseDate: "11-10-2025",
            expiryDate: "13-10-2025",
            status: "warning"
        },
        {
            id: 1004,
            name: "Apples",
            category: "Fruits",
            quantity: "1kg",
            icon: "fas fa-apple-alt",
            purchaseDate: "09-10-2025",
            expiryDate: "14-10-2025",
            status: "warning"
        },
        {
            id: 1005,
            name: "Fish Fillets",
            category: "Seafood",
            quantity: "300g",
            icon: "fas fa-fish",
            purchaseDate: "05-10-2025",
            expiryDate: "10-10-2025",
            status: "danger"
        },
        {
            id: 1006,
            name: "Milk",
            category: "Dairy",
            quantity: "500ml",
            icon: "fas fa-wine-bottle",
            purchaseDate: "10-10-2025",
            expiryDate: "12-10-2025",
            status: "warning"
        }
    ];
}

// Initialize stock with default items and merge with existing
function initializeStockWithDefaultItems() {
    const existingStock = loadStockData();
    const defaultItems = getDefaultDashboardItems();
    
    // If stock is empty, use default items
    if (!existingStock || existingStock.length === 0) {
        saveStockData(defaultItems);
        return;
    }
    
    // Merge: add default items that don't exist in stock (by name)
    const existingNames = existingStock.map(item => item.name.toLowerCase());
    const itemsToAdd = defaultItems.filter(item => 
        !existingNames.includes(item.name.toLowerCase())
    );
    
    if (itemsToAdd.length > 0) {
        const mergedStock = [...existingStock, ...itemsToAdd];
        saveStockData(mergedStock);
    }
}

// Utility function to format date to DD-MM-YYYY format
function formatDateToDDMMYYYY(dateString) {
    if (!dateString) return '';
    
    try {
        // If already in DD-MM-YYYY format, return as-is
        if (typeof dateString === 'string' && dateString.includes('-')) {
            const parts = dateString.split('-');
            if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
                // Already in DD-MM-YYYY format
                return dateString;
            }
            
            // If in YYYY-MM-DD format, convert to DD-MM-YYYY
            if (parts.length === 3 && parts[0].length === 4) {
                return `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
        }
        
        // Try to parse as Date object and format
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
        }
    } catch (e) {
        console.error('Error formatting date:', e);
    }
    
    return dateString; // Return original if conversion fails
}

// Helper function to calculate days remaining from expiry date
// Use the EXACT same status calculation as stock.js
// But with better date parsing to handle both DD-MM-YYYY and YYYY-MM-DD formats
function computeStatus(expiryDate) {
    if (!expiryDate) return 'fresh';
    try {
        const now = new Date();
        let exp;
        
        // Try to parse the date
        if (typeof expiryDate === 'string' && expiryDate.includes('-')) {
            const parts = expiryDate.split('-');
            if (parts.length === 3) {
                // Check format: DD-MM-YYYY (2-2-4 digits) or YYYY-MM-DD (4-2-2 digits)
                if (parts[0].length === 2 && parts[2].length === 4) {
                    // DD-MM-YYYY format - convert to YYYY-MM-DD
                    exp = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                } else if (parts[0].length === 4) {
                    // YYYY-MM-DD format (ISO format from HTML date inputs)
                    exp = new Date(expiryDate);
                } else {
                    // Try default parsing
                    exp = new Date(expiryDate);
                }
            } else {
                exp = new Date(expiryDate);
            }
        } else {
            exp = new Date(expiryDate);
        }
        
        // If still invalid, return fresh
        if (isNaN(exp.getTime())) {
            console.warn('Invalid expiry date in computeStatus:', expiryDate);
            return 'fresh';
        }
        
        const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return 'danger';
        if (diffDays <= 3) return 'warning';
        return 'fresh';
    } catch (e) {
        console.error('Error in computeStatus:', e);
        return 'fresh';
    }
}

function calculateDaysRemaining(expiryDate) {
    if (!expiryDate) return 999; // No expiry date means it's fresh
    
    try {
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Reset time to start of day
        
        let expDate = new Date(expiryDate);
        
        // Handle DD-MM-YYYY format (common in the app)
        if (isNaN(expDate.getTime()) && typeof expiryDate === 'string' && expiryDate.includes('-')) {
            const parts = expiryDate.split('-');
            if (parts.length === 3) {
                if (parts[0].length === 2 && parts[2].length === 4) {
                    // DD-MM-YYYY format - convert to YYYY-MM-DD
                    expDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                } else if (parts[0].length === 4) {
                    // YYYY-MM-DD format
                    expDate = new Date(expiryDate);
                }
            }
        }
        
        expDate.setHours(0, 0, 0, 0); // Reset time to start of day
        
        // Validate the date
        if (isNaN(expDate.getTime())) {
            console.warn('Invalid expiry date:', expiryDate);
            return 999; // Invalid date, treat as fresh
        }
        
        // Use Math.ceil to match stock.js calculation
        const diffTime = expDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays;
    } catch (e) {
        console.error('Error calculating days remaining for:', expiryDate, e);
        return 999; // Error in calculation, treat as fresh
    }
}

// Convert stock data format to dashboard format
function convertStockToDashboard(stockItems) {
    if (!stockItems || stockItems.length === 0) {
        return [];
    }
    
    return stockItems.map(item => {
        const expiryDate = item.expiryDate || item.expireDate || item.expDate;
        
        // ALWAYS recalculate status based on current date
        // This ensures accurate status regardless of when item was added
        // Stock.html also recalculates status when rendering
        let status = 'fresh';
        if (expiryDate) {
            status = computeStatus(expiryDate);
        }
        
        // Calculate days remaining for display
        const daysRemaining = calculateDaysRemaining(expiryDate);
        
        // Format dates to DD-MM-YYYY format for display
        let purchaseDateDisplay = formatDateToDDMMYYYY(item.purchaseDate || item.purchasedDate || '');
        
        return {
            id: item.id,
            name: item.name,
            icon: item.icon || 'fas fa-cube',
            status: status, // Use stored status from stock
            purchasedDate: purchaseDateDisplay,
            daysRemaining: daysRemaining,
            expiryDate: expiryDate // Keep for reference
        };
    }).sort((a, b) => {
        // Sort by status: danger first, then warning, then fresh
        // Within same status, sort by days remaining (ascending)
        const statusOrder = { 'danger': 0, 'warning': 1, 'fresh': 2 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
            return statusOrder[a.status] - statusOrder[b.status];
        }
        return a.daysRemaining - b.daysRemaining;
    });
}

// Function to load and render food items from stock
function loadAndRenderFoodItems() {
    const stockItems = loadStockData();
    
    // Always recalculate status based on current date and expiry date
    // This ensures dashboard shows accurate status matching stock.html calculations
    const foodItems = convertStockToDashboard(stockItems);
    renderFoodItems(foodItems);
    updateItemCounts();
}

document.addEventListener('DOMContentLoaded', function() {
    // Load user data
    const userData = JSON.parse(localStorage.getItem('nimfresh-user'));
    if (userData && userData.username) {
        document.getElementById('welcome-text').textContent = `Welcome, ${userData.username}`;
    }
    
    // Initialize stock with default items if empty
    initializeStockWithDefaultItems();
    
    // Load food items from stock storage
    loadAndRenderFoodItems();
    
    // Listen for storage changes to sync data (works across tabs)
    window.addEventListener('storage', function(e) {
        if (e.key === 'nimfresh-stock') {
            loadAndRenderFoodItems();
        }
    });
    
    // Poll for changes in the same window (for when stock is updated in modals)
    // Check every 2 seconds for stock updates
    setInterval(function() {
        const currentStock = JSON.stringify(loadStockData());
        if (window.lastStockData !== currentStock) {
            window.lastStockData = currentStock;
            loadAndRenderFoodItems();
        }
    }, 2000);
    
    // Store initial stock data for comparison
    window.lastStockData = JSON.stringify(loadStockData());

    // Filter functionality
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            
            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Filter items
            filterFoodItems(filter);
            updateItemCounts();
        });
    });

    // Initialize sensor readings
    updateSensorReadings();
    
    // Update sensor readings every 5 seconds
    setInterval(updateSensorReadings, 5000);

    // Simulate real-time food updates
    setInterval(simulateFoodUpdates, 30000);
    
    // Prevent background scroll when scrolling suspected items list
    const suspectedList = document.getElementById('suspected-list');
    if (suspectedList) {
        suspectedList.addEventListener('wheel', function(e) {
            // Check if we're at scroll limits
            const isAtTop = this.scrollTop === 0;
            const isAtBottom = this.scrollTop + this.clientHeight >= this.scrollHeight - 1;
            
            // If at limits and trying to scroll further, prevent default
            if ((e.deltaY < 0 && isAtTop) || (e.deltaY > 0 && isAtBottom)) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, { passive: false });
    }
});

// Function to update gas readings
function updateGasReadings(readings) {
  // readings is expected to be an object: { h2s: Number, co2: Number, nh3: Number, ch4: Number }
  // All values in ppm. If your sensor returns different units, convert them here.

  const h2s = Number(readings.h2s ?? 0);
  const co2 = Number(readings.co2 ?? 0);
  const nh3 = Number(readings.nh3 ?? 0);
  const ch4 = Number(readings.ch4 ?? 0);

  // Update DOM values with rounded numbers
  const h2sEl = document.getElementById('gas-h2s');
  const co2El = document.getElementById('gas-co2');
  const nh3El = document.getElementById('gas-nh3');
  const ch4El = document.getElementById('gas-ch4');
  
  if (h2sEl) h2sEl.textContent = `${h2s.toFixed(1)} ppm`;
  if (co2El) co2El.textContent = `${co2.toFixed(0)} ppm`;
  if (nh3El) nh3El.textContent = `${nh3.toFixed(1)} ppm`;
  if (ch4El) ch4El.textContent = `${ch4.toFixed(0)} ppm`;

  // Check for increases (comparing with previous readings)
  const gasMap = [
    { key: 'H₂S', value: h2s, previous: previousGasReadings.h2s, id: 'gas-h2s' },
    { key: 'CO₂', value: co2, previous: previousGasReadings.co2, id: 'gas-co2' },
    { key: 'NH₃', value: nh3, previous: previousGasReadings.nh3, id: 'gas-nh3' },
    { key: 'CH₄', value: ch4, previous: previousGasReadings.ch4, id: 'gas-ch4' },
  ];

  // Detect which gases are increasing (threshold: 5% increase or minimum 0.5 ppm increase)
  // Skip detection on first reading to avoid false alerts
  const increasingGases = isFirstReading ? [] : gasMap.filter(gas => {
    if (gas.previous === null || gas.previous === 0) return false;
    const increase = gas.value - gas.previous;
    const percentIncrease = (increase / gas.previous) * 100;
    return increase > 0.5 || percentIncrease > 5;
  });
  
  // Mark that we've had at least one reading
  if (isFirstReading) {
    isFirstReading = false;
  }

  // Update previous readings
  previousGasReadings = { h2s, co2, nh3, ch4 };

  // Get status elements
  const statusEl = document.getElementById('gas-status');
  const statusTextEl = document.getElementById('gas-status-text');
  const suspectedItemsEl = document.getElementById('suspected-items');
  const suspectedListEl = document.getElementById('suspected-list');

  // If all zeros, show unknown
  const total = h2s + co2 + nh3 + ch4;
  if (total === 0) {
    if (statusEl) {
      statusEl.className = 'sensor-status';
      if (statusTextEl) statusTextEl.textContent = 'Sensor not reporting';
    }
    if (suspectedItemsEl) suspectedItemsEl.style.display = 'none';
    return;
  }

    // Always show alert if any gas is increasing
    const viewMoreLink = document.getElementById('view-more-link');
    const viewLessLink = document.getElementById('view-less-link');
    
    if (increasingGases.length > 0) {
      // Find the gas with highest increase
      const highestIncrease = increasingGases.reduce((max, gas) => {
        const increase = gas.value - gas.previous;
        return increase > (max.value - max.previous) ? gas : max;
      }, increasingGases[0]);

      // Update status with alert
      if (statusEl) {
        statusEl.className = 'sensor-status alert';
        if (statusTextEl) {
          statusTextEl.textContent = `${highestIncrease.key} level increasing`;
        }
      }

      // Show "View more" link and prepare suspected items (but keep hidden)
      if (viewMoreLink) viewMoreLink.style.display = 'inline';
      if (suspectedItemsEl) suspectedItemsEl.style.display = 'none';
      
      if (suspectedListEl) {
        // Get all suspected items from increasing gases
        const allSuspectedItems = new Set();
        increasingGases.forEach(gas => {
          const foods = gasToFoods[gas.key] || [];
          foods.forEach(food => allSuspectedItems.add(food));
        });

        // Display suspected items with "maybe expiring" message
        suspectedListEl.innerHTML = Array.from(allSuspectedItems)
          .map(food => `<div class="suspected-item">${food} maybe expiring</div>`)
          .join('');
      }
    } else {
      // No increases detected
      if (statusEl) {
        statusEl.className = 'sensor-status alert';
        if (statusTextEl) {
          statusTextEl.textContent = 'Gas levels stable';
        }
      }
      if (viewMoreLink) viewMoreLink.style.display = 'none';
      if (suspectedItemsEl) suspectedItemsEl.style.display = 'none';
    }
    
    // Add click handlers for view more/less
    if (viewMoreLink && !viewMoreLink.hasAttribute('data-listener')) {
      viewMoreLink.setAttribute('data-listener', 'true');
      viewMoreLink.addEventListener('click', function(e) {
        e.preventDefault();
        if (suspectedItemsEl) {
          suspectedItemsEl.style.display = 'block';
          if (viewMoreLink) viewMoreLink.style.display = 'none';
        }
      });
    }
    
    if (viewLessLink && !viewLessLink.hasAttribute('data-listener')) {
      viewLessLink.setAttribute('data-listener', 'true');
      viewLessLink.addEventListener('click', function(e) {
        e.preventDefault();
        if (suspectedItemsEl) {
          suspectedItemsEl.style.display = 'none';
          if (viewMoreLink) viewMoreLink.style.display = 'inline';
        }
      });
    }

  // Highlight the most abundant gas item visually
  document.querySelectorAll('.gas-item .gas-value').forEach(el => el.classList.remove('most-abundant'));
  const highest = gasMap.reduce((max, gas) => gas.value > max.value ? gas : max, gasMap[0]);
  if (highest.value > 0) {
    const el = document.getElementById(highest.id);
    if (el) el.classList.add('most-abundant');
  }
}

// Function to render food items WITH logo, highlighted status, purchased date, and days remaining
function renderFoodItems(items) {
    const container = document.getElementById('food-items-container');
    if (!container) return;
    
    container.innerHTML = '';

    // Show message if no items
    if (!items || items.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #666;">
                <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.3;"></i>
                <p style="font-size: 1.1rem; margin: 0;">No food items in stock yet.</p>
                <p style="font-size: 0.9rem; margin-top: 8px;">Add items from the Stock page or scan a bill to get started.</p>
            </div>
        `;
        return;
    }

    items.forEach(item => {
        const foodItem = document.createElement('div');
        foodItem.className = `food-item ${item.status}`;
        foodItem.setAttribute('data-category', item.status);

        // Determine status text to match stock.html labels
        // Stock.html shows: Fresh, Warning (Expiring Soon), or Danger (Expired)
        let statusText = '';
        const statusLower = (item.status || 'fresh').toLowerCase();
        
        if (statusLower === 'fresh') {
            statusText = `Fresh • ${item.daysRemaining} days remaining`;
        } else if (statusLower === 'warning') {
            if (item.daysRemaining === 0) {
                statusText = `Expiring Soon • Expiring Today`;
            } else {
                statusText = `Expiring Soon • ${item.daysRemaining} day${item.daysRemaining !== 1 ? 's' : ''} remaining`;
            }
        } else if (statusLower === 'danger') {
            // Expired
            const daysOverdue = Math.abs(item.daysRemaining);
            statusText = `Expired • ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} ago`;
        } else {
            // Default fallback
            statusText = `Fresh • ${item.daysRemaining} days remaining`;
        }

        foodItem.innerHTML = `
            <div class="item-image">
                <i class="${item.icon}"></i>
            </div>
            <div class="item-details">
                <h3>${item.name}</h3>
                <p class="item-status ${
                    item.status === 'fresh' ? 'status-fresh' :
                    item.status === 'warning' ? 'status-warning' :
                    'status-danger'
                }">${statusText}</p>
                <p>Purchased: ${item.purchasedDate}</p>
            </div>
        `;

        container.appendChild(foodItem);
    });
}

// Function to filter food items
function filterFoodItems(filter) {
    const items = document.querySelectorAll('.food-item');
    
    items.forEach(item => {
        if (filter === 'all' || item.getAttribute('data-category') === filter) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Function to update item counts
function updateItemCounts() {
    const freshCount = document.querySelectorAll('.food-item[data-category="fresh"]:not([style*="display: none"])').length;
    const warningCount = document.querySelectorAll('.food-item[data-category="warning"]:not([style*="display: none"])').length;
    const dangerCount = document.querySelectorAll('.food-item[data-category="danger"]:not([style*="display: none"])').length;
    
    if(document.getElementById('fresh-count')) document.getElementById('fresh-count').textContent = freshCount;
    if(document.getElementById('warning-count')) document.getElementById('warning-count').textContent = warningCount;
    if(document.getElementById('danger-count')) document.getElementById('danger-count').textContent = dangerCount;
}

// Function to update sensor readings
function updateSensorReadings() {
    const temperature = 4 + (Math.random() * 2 - 1);
    const humidity = 65 + (Math.random() * 10 - 5);
    const weight = 8.2 + (Math.random() * 0.4 - 0.2);
    
    const tempElement = document.getElementById('temperature');
    const humidityElement = document.getElementById('humidity');
    const weightElement = document.getElementById('total-weight');
    
    if (tempElement) tempElement.textContent = `${temperature.toFixed(1)}°C`;
    if (humidityElement) humidityElement.textContent = `${humidity.toFixed(0)}%`;
    if (weightElement) weightElement.textContent = `${weight.toFixed(1)}kg`;
    
    const liveTemp = document.getElementById('live-temperature');
    const liveHumidity = document.getElementById('live-humidity');
    const liveWeight = document.getElementById('live-weight');
    
    if (liveTemp) liveTemp.textContent = `${temperature.toFixed(1)}°C`;
    if (liveHumidity) liveHumidity.textContent = `${humidity.toFixed(0)}%`;
    if (liveWeight) liveWeight.textContent = `${weight.toFixed(1)}kg`;
    
    const tempFill = ((temperature + 10) / 35) * 100;
    const tempRangeFill = document.querySelector('.sensor-card:nth-child(1) .range-fill');
    if (tempRangeFill) tempRangeFill.style.width = `${tempFill}%`;
    
    const humidityFill = humidity;
    const humidityRangeFill = document.querySelector('.sensor-card:nth-child(2) .range-fill');
    if (humidityRangeFill) humidityRangeFill.style.width = `${humidityFill}%`;
    
    const capacity = 45 + (Math.random() * 10 - 5);
    const capacityFill = document.querySelector('.capacity-fill');
    const capacityText = document.querySelector('.capacity-info span');
    if (capacityFill) capacityFill.style.width = `${capacity}%`;
    if (capacityText) capacityText.textContent = `${capacity.toFixed(0)}% storage used`;
    
    const trendElement = document.querySelector('.sensor-trend');
    if (trendElement) {
        const randomTrend = Math.random();
        if (randomTrend > 0.6) {
            trendElement.innerHTML = '<i class="fas fa-arrow-up trend-up"></i><span>Weight increasing</span>';
        } else if (randomTrend < 0.4) {
            trendElement.innerHTML = '<i class="fas fa-arrow-down trend-down"></i><span>Weight decreasing</span>';
        } else {
            trendElement.innerHTML = '<i class="fas fa-minus trend-stable"></i><span>Weight stable</span>';
        }
    }
    
    // Generate gas readings that increase over time with some variation
    // Each gas increases gradually to simulate food spoilage
    baseGasLevels.h2s += Math.random() * 0.3; // H₂S increases (fish, meat, eggs)
    baseGasLevels.co2 += Math.random() * 2;    // CO₂ increases (fruits, vegetables)
    baseGasLevels.nh3 += Math.random() * 0.4;  // NH₃ increases (meat, fish, dairy)
    baseGasLevels.ch4 += Math.random() * 1;    // CH₄ increases (organic matter)
    
    // Add some random variation
    const gasReadings = {
        h2s: baseGasLevels.h2s + (Math.random() * 0.5 - 0.25),
        co2: baseGasLevels.co2 + (Math.random() * 10 - 5),
        nh3: baseGasLevels.nh3 + (Math.random() * 0.5 - 0.25),
        ch4: baseGasLevels.ch4 + (Math.random() * 5 - 2.5)
    };
    
    // Update gas readings
    updateGasReadings(gasReadings);
}

// Function to simulate food updates - recalculate from stock data
function simulateFoodUpdates() {
    // Reload and re-render food items to sync with stock data
    // This ensures days remaining and status are always up-to-date
    loadAndRenderFoodItems();
}
