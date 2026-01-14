// Stock Management JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Load user data
    const userData = JSON.parse(localStorage.getItem('nimfresh-user'));
    if (userData && userData.username) {
        document.getElementById('welcome-text').textContent = `Welcome, ${userData.username}`;
    }

    // Render stock table from storage when available
    const stored = loadStock();
    if (stored && stored.length) {
        renderStockTable(stored);
    }

    // Update stock counts
    updateStockCounts();
    
    // Update cart count on page load
    updateCartCount();

    // Filter functionality
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            
            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Sync select if present
            const select = document.getElementById('filterSelect');
            if (select) select.value = filter;

            // Filter items
            filterStockItems(filter);
        });
    });

    // Dropdown select filter (for compact/mobile)
    const filterSelect = document.getElementById('filterSelect');
    if (filterSelect) {
        // initialize select value based on active button
        const activeBtn = document.querySelector('.filter-btn.active');
        if (activeBtn) filterSelect.value = activeBtn.getAttribute('data-filter') || 'all';

        filterSelect.addEventListener('change', function() {
            const value = this.value;
            // Update desktop buttons active state
            filterButtons.forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-filter') === value);
            });
            filterStockItems(value);
        });
    }

    // New: dropdown menu toggle (desktop compact filter)
    const filterToggle = document.getElementById('filterToggle');
    const filterMenu = document.getElementById('filterMenu');
    if (filterToggle && filterMenu) {
        // Initialize aria attributes
        filterMenu.setAttribute('aria-hidden', 'true');
        filterToggle.addEventListener('click', function(e) {
            const open = filterMenu.getAttribute('aria-hidden') === 'true';
            filterMenu.setAttribute('aria-hidden', String(!open));
            filterToggle.setAttribute('aria-expanded', String(open));
        });

        // Option clicks
        const filterOptions = Array.from(filterMenu.querySelectorAll('.filter-option'));
        filterOptions.forEach(opt => {
            opt.addEventListener('click', function() {
                const f = this.getAttribute('data-filter');
                // Update desktop buttons (if any)
                filterButtons.forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-filter') === f));
                // Update select if exists
                if (filterSelect) filterSelect.value = f;

                // Update toggle label to show selected option
                const labelEl = filterToggle.querySelector('.filter-toggle-label');
                if (labelEl) labelEl.textContent = this.textContent;

                // Mark selected option visually
                filterOptions.forEach(o => o.classList.remove('active'));
                this.classList.add('active');

                // Close menu
                filterMenu.setAttribute('aria-hidden', 'true');
                filterToggle.setAttribute('aria-expanded', 'false');
                // run filter
                filterStockItems(f);
            });
        });

        // Initialize label to currently selected (default to All Items)
        (function initFilterLabel(){
            const current = filterMenu.querySelector('.filter-option.active') || filterMenu.querySelector('[data-filter="all"]');
            if (current) {
                const labelEl = filterToggle.querySelector('.filter-toggle-label');
                if (labelEl) labelEl.textContent = current.textContent;
                // ensure correct active class
                filterOptions.forEach(o => o.classList.remove('active'));
                current.classList.add('active');
            }
        })();

        // Close menu on outside click
        document.addEventListener('click', function(e) {
            if (!filterToggle.contains(e.target) && !filterMenu.contains(e.target)) {
                filterMenu.setAttribute('aria-hidden', 'true');
                filterToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // Action button event listeners
    document.getElementById('remove-item-btn').addEventListener('click', function(e) {
        e.preventDefault();
        openRemoveModal();
    });

    document.getElementById('stock-report-btn').addEventListener('click', function(e) {
        e.preventDefault();
        openReportModal();
    });

    document.getElementById('my-cart-btn').addEventListener('click', function(e) {
        e.preventDefault();
        openCartModal();
    });

    // Table action buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const itemName = this.closest('tr').querySelector('td:first-child span').textContent;
            // Open update modal and prefill with this item's data
            const id = this.closest('tr').getAttribute('data-id');
            openUpdateModal(id);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const itemName = this.closest('tr').querySelector('td:first-child span').textContent;
            if (confirm(`Are you sure you want to delete ${itemName}?`)) {
                // remove from DOM
                const row = this.closest('tr');
                const id = row.getAttribute('data-id');
                row.remove();
                // remove from storage if present
                let items = loadStock() || [];
                if (id) {
                    items = items.filter(i => String(i.id) !== String(id));
                    saveStock(items);
                }
                updateStockCounts();
            }
        });
    });
});

// Storage helper functions
function loadStock() {
    try {
        const s = localStorage.getItem('nimfresh-stock');
        return s ? JSON.parse(s) : [];
    } catch (e) {
        console.error('Failed to load stock from storage', e);
        return [];
    }
}

function saveStock(items) {
    try {
        localStorage.setItem('nimfresh-stock', JSON.stringify(items));
    } catch (e) {
        console.error('Failed to save stock to storage', e);
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

// Render a stock table from an array of items
function renderStockTable(items) {
    const tbody = document.getElementById('stock-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    items.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = `stock-item ${item.status || 'fresh'}`;
        tr.setAttribute('data-id', item.id);

        const iconHtml = item.icon ? `<i class="${item.icon}"></i>` : '<i class="fas fa-cube"></i>';

        tr.innerHTML = `
            <td>
                <div class="item-with-icon">
                    ${iconHtml}
                    <span>${item.name}</span>
                </div>
            </td>
            <td>${item.category || ''}</td>
            <td>${item.quantity || ''}</td>
            <td>${formatDateToDDMMYYYY(item.purchaseDate || '')}</td>
            <td>${formatDateToDDMMYYYY(item.expiryDate || '')}</td>
            <td><span class="status-badge ${item.status || 'fresh'}">${(item.status || 'Fresh').charAt(0).toUpperCase() + (item.status || 'Fresh').slice(1)}</span></td>
            <td>
                <button class="action-btn edit-btn"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn"><i class="fas fa-trash"></i></button>
            </td>
        `;

        tbody.appendChild(tr);
    });

    // Re-bind delete/edit buttons for new rows
    tbody.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const row = this.closest('tr');
            const id = row.getAttribute('data-id');
            const name = row.querySelector('td:first-child span').textContent;
            if (confirm(`Are you sure you want to delete ${name}?`)) {
                row.remove();
                let items = loadStock() || [];
                if (id) {
                    items = items.filter(i => String(i.id) !== String(id));
                    saveStock(items);
                }
                updateStockCounts();
            }
        });
    });

    tbody.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const name = this.closest('tr').querySelector('td:first-child span').textContent;
            alert(`Edit ${name} functionality will be implemented soon!`);
        });
    });

    updateStockCounts();
    
    // Update cart suggestions if cart modal is open
    if (typeof renderCartSuggestions === 'function') {
        const cartModal = document.getElementById('cartModal');
        if (cartModal && cartModal.getAttribute('aria-hidden') === 'false') {
            renderCartSuggestions();
        }
    }
}

// Function to update stock counts
function updateStockCounts() {
    // Count only visible rows so counts reflect active filter
    const rows = Array.from(document.querySelectorAll('.stock-item'));
    const visible = rows.filter(r => {
        // consider both inline style and computed style
        if (r.style && r.style.display && r.style.display === 'none') return false;
        const cs = window.getComputedStyle(r);
        return cs.display !== 'none' && cs.visibility !== 'hidden' && r.offsetParent !== null;
    });

    const freshCount = visible.filter(r => r.classList.contains('fresh')).length;
    const warningCount = visible.filter(r => r.classList.contains('warning')).length;
    const dangerCount = visible.filter(r => r.classList.contains('danger')).length;
    const lowCount = visible.filter(r => r.classList.contains('low')).length;
    const totalCount = visible.length;

    document.getElementById('fresh-count').textContent = freshCount;
    document.getElementById('warning-count').textContent = warningCount;
    document.getElementById('danger-count').textContent = dangerCount;

    // Update total count in the stat card (reflects filtered total)
    const totalEl = document.querySelector('.stat-card.sensor .stat-info h3');
    if (totalEl) totalEl.textContent = totalCount;
}

// Function to filter stock items
function filterStockItems(filter) {
    const items = document.querySelectorAll('.stock-item');
    
    items.forEach(item => {
        if (filter === 'all' || item.classList.contains(filter)) {
            item.style.display = 'table-row';
        } else {
            item.style.display = 'none';
        }
    });
    
    updateStockCounts();
    
    // Update cart suggestions if cart modal is open
    if (typeof renderCartSuggestions === 'function') {
        const cartModal = document.getElementById('cartModal');
        if (cartModal && cartModal.getAttribute('aria-hidden') === 'false') {
            renderCartSuggestions();
        }
    }
}

/* Quick Action Modal Logic */
function openRemoveModal(){
    const modal = document.getElementById('removeItemModal');
    const listWrap = document.getElementById('removeItemList');
    modal.setAttribute('aria-hidden','false');
    // populate with current stock
    const items = loadStock() || [];
    if (!items.length) { listWrap.innerHTML = '<div style="color:#777">No items in stock.</div>'; return; }
    listWrap.innerHTML = '';
    items.forEach(it=>{
        const row = document.createElement('div');
        row.className = 'remove-item-row';
        row.setAttribute('data-name', (it.name||'').toLowerCase());
        const iconClass = it.icon ? it.icon : 'fas fa-cube';
        row.innerHTML = `
            <div class="ri-checkbox"><input type="checkbox" data-id="${it.id}"></div>
            <div class="ri-icon"><i class="${iconClass}"></i></div>
            <div class="ri-details">
                <div class="ri-name">${it.name}</div>
                <div class="ri-meta">${it.category||''} • ${it.quantity||''}</div>
            </div>
        `;
        listWrap.appendChild(row);
    });

    // wire interactions: search, select all, checkbox change
    const search = document.getElementById('removeSearch');
    const selectAll = document.getElementById('removeSelectAll');
    const countEl = document.getElementById('removeSelectedCount');
    const confirmBtn = document.getElementById('removeConfirm');

    function updateSelectedState(){
        const boxes = Array.from(listWrap.querySelectorAll('input[type="checkbox"]'));
        const visibleBoxes = boxes.filter(b => b.closest('.remove-item-row') && b.closest('.remove-item-row').style.display !== 'none');
        const checked = visibleBoxes.filter(b=>b.checked);
        countEl.textContent = checked.length;
        confirmBtn.disabled = checked.length === 0;
        // update selectAll checkbox state
        if (visibleBoxes.length === 0) selectAll.checked = false;
        else selectAll.checked = checked.length === visibleBoxes.length;
    }

    listWrap.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.addEventListener('change', updateSelectedState));

    selectAll.checked = false;
    selectAll.addEventListener('change', function(){
        const boxes = Array.from(listWrap.querySelectorAll('input[type="checkbox"]'));
        const visibleBoxes = boxes.filter(b => b.closest('.remove-item-row') && b.closest('.remove-item-row').style.display !== 'none');
        visibleBoxes.forEach(b => b.checked = selectAll.checked);
        updateSelectedState();
    });

    search.value = '';
    search.addEventListener('input', function(){
        const q = (this.value||'').toLowerCase().trim();
        listWrap.querySelectorAll('.remove-item-row').forEach(row=>{
            const text = (row.textContent||'').toLowerCase();
            row.style.display = q ? (text.indexOf(q)===-1 ? 'none' : 'flex') : 'flex';
        });
        updateSelectedState();
    });
    // initial state
    updateSelectedState();
}

document.getElementById('removeCancel').addEventListener('click', function(){
    document.getElementById('removeItemModal').setAttribute('aria-hidden','true');
});

document.getElementById('removeConfirm').addEventListener('click', function(){
    try{
        const checkboxes = Array.from(document.querySelectorAll('#removeItemList input[type="checkbox"]'));
        const ids = checkboxes.filter(cb=>cb.checked).map(cb=>cb.getAttribute('data-id'));
        if (!ids.length){ showToast('Please select at least one item to remove.', 'error'); return; }
        let items = loadStock() || [];
        const removedCount = ids.length;
        items = items.filter(i => !ids.includes(String(i.id)));
        saveStock(items);
        // re-render table
        renderStockTable(items);
        document.getElementById('removeItemModal').setAttribute('aria-hidden','true');
        showToast(`Removed ${removedCount} item(s) from inventory.`, 'success');
    }catch(e){ console.error(e); showToast('Failed to remove items.', 'error'); }
});

// Toast helper (simple)
function showToast(msg, type='info'){
    // try to use global showNotification if present
    if (typeof showNotification === 'function') { try{ showNotification(msg, type); return; }catch(e){} }
    const id = 'nimfresh-toast-container';
    let container = document.getElementById(id);
    if (!container){ container = document.createElement('div'); container.id = id; container.style.position='fixed'; container.style.top='18px'; container.style.right='18px'; container.style.zIndex='9999'; document.body.appendChild(container); }
    const n = document.createElement('div');
    n.textContent = msg;
    n.style.cssText = 'margin-top:8px;padding:10px 14px;border-radius:10px;color:white;box-shadow:0 8px 26px rgba(0,0,0,0.12);min-width:180px;';
    n.style.background = type==='success'? '#4caf50' : type==='error'? '#f44336' : '#2196f3';
    container.appendChild(n);
    setTimeout(()=>{ n.style.opacity='0'; setTimeout(()=> n.remove(), 300); }, 2800);
}

function openUpdateModal(prefillId){
    const modal = document.getElementById('updateStockModal');
    const select = document.getElementById('updateSelect');
    const nameIn = document.getElementById('updateName');
    const catIn = document.getElementById('updateCategory');
    const qtyIn = document.getElementById('updateQuantity');
    const purchaseIn = document.getElementById('updatePurchase');
    const expiryIn = document.getElementById('updateExpiry');

    // populate select
    const items = loadStock() || [];
    select.innerHTML = '<option value="__new">+ Add new item</option>';
    items.forEach(i=>{
        const opt = document.createElement('option');
        opt.value = i.id;
        opt.textContent = i.name;
        select.appendChild(opt);
    });

    // If prefillId provided, select it
    if (prefillId) select.value = prefillId;
    else select.value = '__new';

    function fillFromSelected(){
        const v = select.value;
        if (v === '__new'){
            nameIn.value=''; catIn.value=''; qtyIn.value=''; purchaseIn.value=''; expiryIn.value='';
        } else {
            const it = items.find(x=>String(x.id)===String(v));
            if (it){ 
                nameIn.value=it.name||''; 
                catIn.value=it.category||''; 
                qtyIn.value=it.quantity||''; 
                // Convert DD-MM-YYYY to YYYY-MM-DD for date input (which requires ISO format)
                purchaseIn.value=convertDDMMYYYYToYYYYMMDD(it.purchaseDate||''); 
                expiryIn.value=convertDDMMYYYYToYYYYMMDD(it.expiryDate||''); 
            }
        }
    }
    
    // Helper to convert DD-MM-YYYY to YYYY-MM-DD for HTML date inputs
    function convertDDMMYYYYToYYYYMMDD(dateString) {
        if (!dateString) return '';
        if (typeof dateString === 'string' && dateString.includes('-')) {
            const parts = dateString.split('-');
            if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
                // DD-MM-YYYY format - convert to YYYY-MM-DD
                return `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
            // Already in YYYY-MM-DD format
            if (parts.length === 3 && parts[0].length === 4) {
                return dateString;
            }
        }
        return dateString;
    }

    select.addEventListener('change', fillFromSelected);
    fillFromSelected();

    modal.setAttribute('aria-hidden','false');
}

document.getElementById('updateCancel').addEventListener('click', function(){
    document.getElementById('updateStockModal').setAttribute('aria-hidden','true');
});

document.getElementById('updateSave').addEventListener('click', function(){
    try{
        const modal = document.getElementById('updateStockModal');
        const select = document.getElementById('updateSelect');
        const name = document.getElementById('updateName').value.trim();
        const category = document.getElementById('updateCategory').value.trim();
        const quantity = document.getElementById('updateQuantity').value.trim();
        // Convert YYYY-MM-DD (from HTML date input) to DD-MM-YYYY for storage
        const purchaseDate = formatDateToDDMMYYYY(document.getElementById('updatePurchase').value || '');
        const expiryDate = formatDateToDDMMYYYY(document.getElementById('updateExpiry').value || '');

        if (!name){ alert('Please provide an item name.'); return; }

        let items = loadStock() || [];
        const sel = select.value;
        if (sel === '__new'){
            const newItem = {
                id: Date.now(),
                name, category, quantity, purchaseDate, expiryDate,
                status: computeStatus(expiryDate)
            };
            items.unshift(newItem);
        } else {
            items = items.map(i=>{
                if (String(i.id)===String(sel)){
                    return Object.assign({}, i, { name, category, quantity, purchaseDate, expiryDate, status: computeStatus(expiryDate) });
                }
                return i;
            });
        }

        saveStock(items);
        renderStockTable(items);
        modal.setAttribute('aria-hidden','true');
        alert('Stock updated successfully.');
    }catch(e){ console.error(e); alert('Failed to save item.'); }
});

function computeStatus(expiryDate){
    if (!expiryDate) return 'fresh';
    try{
        const now = new Date();
        let exp;
        
        // Handle DD-MM-YYYY format (our storage format)
        if (typeof expiryDate === 'string' && expiryDate.includes('-')) {
            const parts = expiryDate.split('-');
            if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
                // DD-MM-YYYY format - convert to YYYY-MM-DD for Date parsing
                exp = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            } else if (parts.length === 3 && parts[0].length === 4) {
                // YYYY-MM-DD format
                exp = new Date(expiryDate);
            } else {
                exp = new Date(expiryDate);
            }
        } else {
            exp = new Date(expiryDate);
        }
        
        if (isNaN(exp.getTime())) {
            return 'fresh';
        }
        
        const diffDays = Math.ceil((exp - now)/(1000*60*60*24));
        if (diffDays < 0) return 'danger';
        if (diffDays <= 3) return 'warning';
        return 'fresh';
    }catch(e){ return 'fresh'; }
}

function openReportModal(){
    const modal = document.getElementById('reportModal');
    const content = document.getElementById('reportContent');
    const items = loadStock() || [];
    const total = items.length;
    const fresh = items.filter(i=>i.status==='fresh').length;
    const warning = items.filter(i=>i.status==='warning').length;
    const danger = items.filter(i=>i.status==='danger').length;
    content.innerHTML = `
        <div style="display:flex;gap:12px;flex-wrap:wrap">
            <div style="flex:1;min-width:130px;background:#f1faf1;padding:12px;border-radius:8px;border-left:6px solid #2e7d32">Total<br><strong>${total}</strong></div>
            <div style="flex:1;min-width:130px;background:#fff7e6;padding:12px;border-radius:8px;border-left:6px solid #ff9800">Expiring Soon<br><strong>${warning}</strong></div>
            <div style="flex:1;min-width:130px;background:#fff1f1;padding:12px;border-radius:8px;border-left:6px solid #c62828">Expired<br><strong>${danger}</strong></div>
            <div style="flex:1;min-width:130px;background:#f1fff7;padding:12px;border-radius:8px;border-left:6px solid #2e7d32">Fresh<br><strong>${fresh}</strong></div>
        </div>
        <div style="margin-top:12px;font-size:0.95rem;color:#444">You can download the full inventory as CSV.</div>
    `;
    modal.setAttribute('aria-hidden','false');
}

document.getElementById('reportClose').addEventListener('click', function(){
    document.getElementById('reportModal').setAttribute('aria-hidden','true');
});

document.getElementById('reportDownload').addEventListener('click', function(){
    const items = loadStock() || [];
    if (!items.length){ alert('No items to export.'); return; }
    const csvHeader = ['id','name','category','quantity','purchaseDate','expiryDate','status'];
    const rows = items.map(i => csvHeader.map(h => `"${String(i[h]||'').replace(/"/g,'""')}"`).join(','));
    const csv = [csvHeader.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'nimfresh-stock-report.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});

// Cart functionality
function loadCart() {
    try {
        const cart = localStorage.getItem('nimfresh-cart');
        return cart ? JSON.parse(cart) : [];
    } catch (e) {
        console.error('Failed to load cart', e);
        return [];
    }
}

function saveCart(cart) {
    try {
        localStorage.setItem('nimfresh-cart', JSON.stringify(cart));
    } catch (e) {
        console.error('Failed to save cart', e);
    }
}

function openCartModal() {
    const modal = document.getElementById('cartModal');
    if (!modal) return;
    
    modal.setAttribute('aria-hidden', 'false');
    renderCartItems();
    renderCartSuggestions();
    updateCartCount();
}

function closeCartModal() {
    const modal = document.getElementById('cartModal');
    if (modal) {
        modal.setAttribute('aria-hidden', 'true');
    }
}

function renderCartSuggestions() {
    const suggestionsDiv = document.getElementById('cartSuggestions');
    const suggestedItemsDiv = document.getElementById('cartSuggestedItems');
    if (!suggestionsDiv || !suggestedItemsDiv) return;
    
    const items = loadStock() || [];
    const cart = loadCart();
    const cartItemNames = new Set(cart.map(item => item.name.toLowerCase()));
    
    // Find items that are expiring soon or expired (warning/danger status)
    const exhaustingItems = items.filter(item => {
        const status = item.status || computeStatus(item.expiryDate);
        return (status === 'warning' || status === 'danger') && 
               !cartItemNames.has((item.name || '').toLowerCase());
    });
    
    if (exhaustingItems.length === 0) {
        suggestionsDiv.style.display = 'none';
        return;
    }
    
    suggestionsDiv.style.display = 'block';
    suggestedItemsDiv.innerHTML = '';
    
    exhaustingItems.slice(0, 6).forEach(item => {
        const tag = document.createElement('div');
        tag.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:white;border:1px solid #2e7d32;border-radius:20px;cursor:pointer;font-size:0.85rem;color:#2e7d32;font-weight:500;';
        tag.innerHTML = `<span>${item.name}</span> <i class="fas fa-plus" style="font-size:0.75rem;"></i>`;
        tag.addEventListener('click', () => addItemToCart(item.name));
        suggestedItemsDiv.appendChild(tag);
    });
}

function renderCartItems() {
    const cartList = document.getElementById('cartItemList');
    if (!cartList) return;
    
    const cart = loadCart();
    
    if (cart.length === 0) {
        cartList.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#999;"><i class="fas fa-shopping-cart" style="font-size:3rem;opacity:0.3;margin-bottom:15px;"></i><p>Your cart is empty</p><p style="font-size:0.9rem;margin-top:8px;">Add items that you need to purchase</p></div>';
        return;
    }
    
    cartList.innerHTML = '';
    cart.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px;background:#f9f9f9;border-radius:8px;margin-bottom:8px;border:1px solid #e0e0e0;';
        itemDiv.innerHTML = `
            <div style="flex:1">
                <div style="font-weight:600;color:#333;">${item.name || 'Unnamed Item'}</div>
                ${item.notes ? `<div style="font-size:0.85rem;color:#666;margin-top:4px;">${item.notes}</div>` : ''}
            </div>
            <button class="btn btn-secondary" style="padding:6px 10px;min-width:auto;" data-index="${index}">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        const deleteBtn = itemDiv.querySelector('button');
        deleteBtn.addEventListener('click', () => removeFromCart(index));
        
        cartList.appendChild(itemDiv);
    });
    
    updateCartCount();
}

function addItemToCart(itemName, notes = '') {
    if (!itemName || !itemName.trim()) return;
    
    const cart = loadCart();
    const trimmedName = itemName.trim();
    
    // Check if item already exists
    if (cart.some(item => item.name.toLowerCase() === trimmedName.toLowerCase())) {
        showToast('Item already in cart', 'info');
        return;
    }
    
    cart.push({
        id: Date.now(),
        name: trimmedName,
        notes: notes || '',
        addedDate: formatDateToDDMMYYYY(new Date().toISOString())
    });
    
    saveCart(cart);
    renderCartItems();
    renderCartSuggestions();
    updateCartCount();
    showToast(`"${trimmedName}" added to cart`, 'success');
}

function removeFromCart(index) {
    const cart = loadCart();
    if (index >= 0 && index < cart.length) {
        const itemName = cart[index].name;
        cart.splice(index, 1);
        saveCart(cart);
        renderCartItems();
        renderCartSuggestions();
        updateCartCount();
        showToast(`"${itemName}" removed from cart`, 'info');
    }
}

function clearCart() {
    if (confirm('Are you sure you want to clear your cart?')) {
        saveCart([]);
        renderCartItems();
        renderCartSuggestions();
        updateCartCount();
        showToast('Cart cleared', 'info');
    }
}

function updateCartCount() {
    const cart = loadCart();
    const countEl = document.getElementById('cartItemCount');
    if (countEl) {
        countEl.textContent = cart.length;
    }
    
    // Update cart button badge if it exists
    const cartBtn = document.getElementById('my-cart-btn');
    if (cartBtn) {
        let badge = cartBtn.querySelector('.cart-badge');
        if (cart.length > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'cart-badge';
                badge.style.cssText = 'position:absolute;top:-5px;right:-5px;background:#ff6f00;color:white;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;';
                cartBtn.style.position = 'relative';
                cartBtn.appendChild(badge);
            }
            badge.textContent = cart.length;
        } else if (badge) {
            badge.remove();
        }
    }
}

// Cart event listeners
document.getElementById('cartClose').addEventListener('click', closeCartModal);
document.getElementById('cartClear').addEventListener('click', clearCart);
document.getElementById('cartAddItem').addEventListener('click', function() {
    const input = document.getElementById('cartSearch');
    const itemName = input.value.trim();
    if (itemName) {
        addItemToCart(itemName);
        input.value = '';
    } else {
        showToast('Please enter an item name', 'error');
    }
});

document.getElementById('cartSearch').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const itemName = this.value.trim();
        if (itemName) {
            addItemToCart(itemName);
            this.value = '';
        }
    }
});

// Close modals on outside click
document.addEventListener('click', function(e){
    ['removeItemModal','updateStockModal','reportModal','cartModal'].forEach(id=>{
        const el = document.getElementById(id);
        if (el && el.getAttribute('aria-hidden')==='false' && e.target===el) el.setAttribute('aria-hidden','true');
    });
});