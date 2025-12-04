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

    document.getElementById('update-stock-btn').addEventListener('click', function(e) {
        e.preventDefault();
        openUpdateModal();
    });

    document.getElementById('stock-report-btn').addEventListener('click', function(e) {
        e.preventDefault();
        openReportModal();
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
            <td>${item.purchaseDate || ''}</td>
            <td>${item.expiryDate || ''}</td>
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
            if (it){ nameIn.value=it.name||''; catIn.value=it.category||''; qtyIn.value=it.quantity||''; purchaseIn.value=it.purchaseDate||''; expiryIn.value=it.expiryDate||''; }
        }
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
        const purchaseDate = document.getElementById('updatePurchase').value || '';
        const expiryDate = document.getElementById('updateExpiry').value || '';

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
        const exp = new Date(expiryDate);
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

// Close modals on outside click
document.addEventListener('click', function(e){
    ['removeItemModal','updateStockModal','reportModal'].forEach(id=>{
        const el = document.getElementById(id);
        if (el && el.getAttribute('aria-hidden')==='false' && e.target===el) el.setAttribute('aria-hidden','true');
    });
});