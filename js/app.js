document.addEventListener('DOMContentLoaded', () => {
    // ---- GLOBAL STATE ----
    let currentCurrency = localStorage.getItem('currency') || '€';
    let projects = JSON.parse(localStorage.getItem('projects')) || [];
    let currentProjectId = null;

    // ---- PROJECT SPECIFIC STATE ----
    let expenses = [];
    let receipts = [];
    let rooms = [];
    let roomBudgets = {};
    let tasks = [];

    const loadProjectData = (pid) => {
        currentProjectId = pid;
        expenses = JSON.parse(localStorage.getItem(pid + '_expenses')) || [];
        receipts = JSON.parse(localStorage.getItem(pid + '_receipts')) || [];
        rooms = JSON.parse(localStorage.getItem(pid + '_rooms')) || [];
        roomBudgets = JSON.parse(localStorage.getItem(pid + '_roomBudgets')) || {};
        tasks = JSON.parse(localStorage.getItem(pid + '_tasks')) || [];
    };

    const saveState = () => {
        localStorage.setItem('currency', currentCurrency);
        localStorage.setItem('projects', JSON.stringify(projects));
        
        if (currentProjectId) {
            localStorage.setItem(currentProjectId + '_expenses', JSON.stringify(expenses));
            localStorage.setItem(currentProjectId + '_receipts', JSON.stringify(receipts));
            localStorage.setItem(currentProjectId + '_rooms', JSON.stringify(rooms));
            localStorage.setItem(currentProjectId + '_roomBudgets', JSON.stringify(roomBudgets));
            localStorage.setItem(currentProjectId + '_tasks', JSON.stringify(tasks));
        }
        renderAll();
    };

    window.getTrans = (selectId, val) => {
        const el = document.querySelector(`#${selectId} option[value="${val}"]`);
        if(el && el.hasAttribute('data-i18n')) {
            return window.t(el.getAttribute('data-i18n'));
        }
        return val;
    };

    // ---- DOM ELEMENTS ----
    const currencySelect = document.getElementById('currency-select');
    const navButtons = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view');
    const pageTitle = document.getElementById('page-title');
    const mainNav = document.getElementById('main-nav');

    // Projects
    const btnSwitchProject = document.getElementById('btn-switch-project');
    const btnNewProject = document.getElementById('btn-new-project');
    const projectList = document.getElementById('project-list');

    // Dashboard
    const dashTotal = document.getElementById('dash-total');
    const dashSpent = document.getElementById('dash-spent');
    const dashProgress = document.getElementById('dash-progress');
    const dashPercentage = document.getElementById('dash-percentage');

    // Room Measurements Form
    const btnAddRoom = document.getElementById('btn-add-room');
    const formRoom = document.getElementById('form-room');
    const formRoomTitle = document.getElementById('form-room-title');
    const editRoomId = document.getElementById('edit-room-id');
    const btnDeleteRoom = document.getElementById('btn-delete-room');
    const roomList = document.getElementById('room-list');

    // Budget Form
    const formBudget = document.getElementById('form-room-budget');
    const budgetRoomTitle = document.getElementById('budget-room-title');
    const budgetItemsContainer = document.getElementById('budget-items-container');
    const btnAddBudgetItem = document.getElementById('btn-add-budget-item');
    const budgetRoomIdHidden = document.getElementById('b-room-id');
    const btnSaveRoomBudget = document.getElementById('btn-save-room-budget');
    const btnCancelRoomBudget = document.getElementById('btn-cancel-room-budget');
    const budgetList = document.getElementById('budget-list');

    // Receipts Form
    const btnAddReceipt = document.getElementById('btn-add-receipt');
    const formReceipt = document.getElementById('form-receipt');
    const receiptPreviewContainer = document.getElementById('receipt-preview-container');
    const receiptUpload = document.getElementById('receipt-upload');
    const receiptPreview = document.getElementById('receipt-preview');
    const receiptStore = document.getElementById('receipt-store');
    const receiptLinesContainer = document.getElementById('receipt-lines-container');
    const btnAddReceiptLine = document.getElementById('btn-add-receipt-line');
    const receiptTotalDisplay = document.getElementById('receipt-total-display');
    const btnSaveReceipt = document.getElementById('btn-save-receipt');
    const receiptList = document.getElementById('receipt-list');

    // Finance Form
    const tabBtnFinanceVariance = document.getElementById('tab-btn-finance-variance');
    const tabBtnFinanceReceipts = document.getElementById('tab-btn-finance-receipts');
    const tabFinanceVariance = document.getElementById('tab-finance-variance');
    const tabFinanceReceipts = document.getElementById('tab-finance-receipts');

    // Timeline Form
    const tabBtnTimelineData = document.getElementById('tab-btn-timeline-data');
    const tabBtnTimelineGantt = document.getElementById('tab-btn-timeline-gantt');
    const tabTimelineData = document.getElementById('tab-timeline-data');
    const tabTimelineGantt = document.getElementById('tab-timeline-gantt');
    
    const btnAddTask = document.getElementById('btn-add-task');
    const formTask = document.getElementById('form-task');
    const btnCancelTask = document.getElementById('btn-cancel-task');
    const btnSaveTask = document.getElementById('btn-save-task');
    const taskRoom = document.getElementById('task-room');
    const taskLinesContainer = document.getElementById('task-lines-container');
    const btnAddTaskLine = document.getElementById('btn-add-task-line');
    const taskFilterCat = document.getElementById('task-filter-cat');
    const taskListFull = document.getElementById('task-list-full');

    // Timeline Gantt
    const btnGanttPrev = document.getElementById('btn-gantt-prev');
    const btnGanttNext = document.getElementById('btn-gantt-next');
    const ganttMonthLabel = document.getElementById('gantt-month-label');
    const ganttContainer = document.getElementById('gantt-container');
    
    let ganttOffsetWeeks = 0;

    const categories = ['Golv', 'Väggar', 'Tak', 'Rör', 'Ventilation', 'El', 'Fastinredning', 'Byggmaterial', 'Färg/Spackel', 'Lister/Foder', 'Fönster/Dörrar', 'Arbetskostnader', 'Buffert', 'Rivning', 'Bygg'];

    const TIME_FACTORS = {
        'Bygg': 0.6,
        'Rivning': 0.8,
        'Golv': 0.5,
        'Väggar': 0.6,
        'Tak': 0.5,
        'Färg/Spackel': 0.7
    };
    const WORK_DAY_HOURS = 8;

    window.calculateSuggestedDays = (roomName, category) => {
        const factor = TIME_FACTORS[category];
        if (!factor) return null; // Only suggest for categories with defined factors

        const rm = rooms.find(r => r.name === roomName);
        if(!rm) return null;
        
        let area = 0;
        if(category === 'Golv') {
            area = parseFloat(rm.areas.floor);
        } else if(category === 'Tak') {
            area = parseFloat(rm.areas.ceiling);
        } else {
            // Default to wall area for walls, construction, painting etc.
            area = parseFloat(rm.areas.wall);
        }

        if(!area || area <= 0) return null;

        let hours = area * factor;
        
        // Bathroom bonus: added to the base work for these specific rooms
        if(rm.type === 'Badrum' || rm.type === 'Toalett') {
            hours += 40;
        }

        return Math.ceil(hours / WORK_DAY_HOURS);
    };

    // ---- INIT ----
    currencySelect.value = currentCurrency;

    const activateView = (viewId, title) => {
        views.forEach(v => v.classList.remove('active-view'));
        document.getElementById(viewId).classList.add('active-view');
        pageTitle.textContent = title;
        window.scrollTo(0,0);
        
        if (viewId === 'view-projects') {
            mainNav.style.display = 'none';
            btnSwitchProject.style.display = 'none';
            currentProjectId = null;
        } else {
            mainNav.style.display = 'flex';
            btnSwitchProject.style.display = 'block';
            
            navButtons.forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-target') === viewId);
            });
            if(viewId === 'view-timeline') renderGantt(); // Ensure gantt updates when accessed
        }
    };


    // ---- PROJECT LOGICS ----
    window.openProject = (pid) => {
        const proj = projects.find(p => p.id === pid);
        if(!proj) return;
        loadProjectData(pid);
        activateView('view-dashboard', proj.name);
        renderAll();
    };

    window.deleteProject = (pid) => {
        if(!confirm(window.t('alert_del_project'))) return;
        localStorage.removeItem(pid + '_expenses');
        localStorage.removeItem(pid + '_receipts');
        localStorage.removeItem(pid + '_rooms');
        localStorage.removeItem(pid + '_roomBudgets');
        localStorage.removeItem(pid + '_tasks');
        projects = projects.filter(p => p.id !== pid);
        saveState();
    };

    const modalNewProj = document.getElementById('modal-new-project');
    const inputNewProj = document.getElementById('input-new-project-name');
    
    document.getElementById('btn-cancel-new-project').addEventListener('click', () => {
        modalNewProj.style.display = 'none';
        inputNewProj.value = '';
    });

    document.getElementById('btn-save-new-project').addEventListener('click', () => {
        const pname = inputNewProj.value.trim();
        if(!pname) return;
        modalNewProj.style.display = 'none';
        inputNewProj.value = '';
        
        const newProj = { id: 'proj_' + Date.now(), name: pname, date: new Date().toLocaleDateString('sv-SE') };
        projects.push(newProj);
        openProject(newProj.id);
    });

    btnNewProject.addEventListener('click', () => {
        modalNewProj.style.display = 'flex';
        inputNewProj.focus();
    });

    btnSwitchProject.addEventListener('click', () => {
        activateView('view-projects', window.t('title_projects'));
        renderAll();
    });

    currencySelect.addEventListener('change', (e) => { currentCurrency = e.target.value; saveState(); });
    navButtons.forEach(btn => btn.addEventListener('click', () => activateView(btn.getAttribute('data-target'), btn.getAttribute('data-title'))));

    // RUMS-MÅTT
    btnAddRoom.addEventListener('click', () => {
        document.querySelectorAll('#form-room input:not([type="hidden"]), #form-room select').forEach(el => el.value = '');
        editRoomId.value = '';
        btnDeleteRoom.style.display = 'none';
        formRoomTitle.innerText = window.t('title_define_room');
        formRoom.style.display = formRoom.style.display === 'none' ? 'block' : 'none';
    });

    document.getElementById('btn-save-room').addEventListener('click', () => {
        const floor = document.getElementById('room-floor').value;
        const type = document.getElementById('room-type').value;
        if(!floor || !type) return alert(window.t('alert_req_room'));

        const newName = `${floor} - ${type}`;
        const exists = rooms.some(r => r.name === newName && r.id !== editRoomId.value);
        if (exists) return alert(window.t('alert_room_exists'));

        const l = parseFloat(document.getElementById('room-floor-length').value) || 0;
        const w = parseFloat(document.getElementById('room-floor-width').value) || 0;
        const fAdj = parseFloat(document.getElementById('room-floor-adj').value) || 0;
        let wS = parseFloat(document.getElementById('room-wall-short').value) || 0;
        let wL = parseFloat(document.getElementById('room-wall-long').value) || 0;
        if (wL > 0 && wS === 0) wS = wL;
        if (wS > 0 && wL === 0) wL = wS;
        const wAdj = parseFloat(document.getElementById('room-wall-adj').value) || 0;
        const cAdj = parseFloat(document.getElementById('room-ceiling-adj').value) || 0;

        const rmObj = {
            id: editRoomId.value || ('rm' + Date.now()),
            floor: floor, type: type, name: `${floor} - ${type}`,
            areas: {
                floor: ((l * w) + fAdj).toFixed(2),
                wall: (((l * 2 * wL) + (w * 2 * wS)) + wAdj).toFixed(2),
                ceiling: ((l * w) + cAdj).toFixed(2)
            },
            inputs: { l, w, fAdj, wS, wL, wAdj, cAdj }
        };

        if (editRoomId.value) {
            const idx = rooms.findIndex(r => r.id === editRoomId.value);
            if(idx !== -1) rooms[idx] = rmObj;
        } else {
            rooms.push(rmObj);
        }
        
        document.querySelectorAll('#form-room input:not([type="hidden"]), #form-room select').forEach(el => el.value = '');
        editRoomId.value = '';
        formRoom.style.display = 'none';
        saveState();
    });

    window.editRoomDetails = (roomId) => {
        const rm = rooms.find(r => r.id === roomId);
        if(!rm) return;
        formRoomTitle.innerText = window.t('title_edit') + " " + window.getTrans('room-floor', rm.floor) + " - " + window.getTrans('room-type', rm.type);
        editRoomId.value = rm.id;
        btnDeleteRoom.style.display = 'block';
        document.getElementById('room-floor').value = rm.floor;
        document.getElementById('room-type').value = rm.type;

        if (rm.inputs) {
            document.getElementById('room-floor-length').value = rm.inputs.l || '';
            document.getElementById('room-floor-width').value = rm.inputs.w || '';
            document.getElementById('room-floor-adj').value = rm.inputs.fAdj || '';
            document.getElementById('room-wall-short').value = rm.inputs.wS || '';
            document.getElementById('room-wall-long').value = rm.inputs.wL || '';
            document.getElementById('room-wall-adj').value = rm.inputs.wAdj || '';
            document.getElementById('room-ceiling-adj').value = rm.inputs.cAdj || '';
        }
        formRoom.style.display = 'block';
        window.scrollTo(0, document.getElementById('view-measurements').offsetTop);
    };

    btnDeleteRoom.addEventListener('click', () => {
        if(!confirm(window.t('alert_del_room'))) return;
        const id = editRoomId.value;
        rooms = rooms.filter(r => r.id !== id);
        delete roomBudgets[id]; 
        formRoom.style.display = 'none';
        editRoomId.value = '';
        saveState();
    });

    // BUDGET LOGIC
    btnCancelRoomBudget.addEventListener('click', () => formBudget.style.display = 'none');
    
    btnAddBudgetItem.addEventListener('click', () => addBudgetItemRow());

    window.addBudgetItemRow = (data = null) => {
        const id = 'bitem' + Date.now() + Math.random().toString().substr(2,4);
        const name = data ? data.name : '';
        const price = data ? data.price : '';
        const type = data ? data.type : 'fixed';

        const html = `
            <div id="${id}" class="budget-line-row">
                <div class="row-actions">
                    <button class="btn-row-action" title="Flytta upp" onclick="moveBudgetRow('${id}', -1)"><i class="ph ph-caret-up"></i></button>
                    <button class="btn-row-action" title="Flytta ner" onclick="moveBudgetRow('${id}', 1)"><i class="ph ph-caret-down"></i></button>
                    <button class="btn-row-action btn-row-delete" onclick="document.getElementById('${id}').remove()"><i class="ph ph-trash"></i></button>
                </div>
                
                <div style="margin-right: 40px;">
                    <label style="font-size:9px;color:var(--text-muted);display:block;">${window.t('lbl_budget_item_name')}</label>
                    <input type="text" class="input-field budget-item-name" style="margin-bottom:4px; padding:4px 8px; font-size:12px; font-weight:600;" value="${name}">
                </div>

                <div style="display:flex; gap:4px;">
                     <div style="flex:1;">
                        <label style="font-size:9px;color:var(--text-muted);display:block;">${window.t('lbl_budget_item_price')}</label>
                        <input type="number" class="input-field budget-item-price" style="margin-bottom:0; padding:4px 8px; font-size:12px;" value="${price}">
                    </div>
                </div>
                <div>
                    <label style="font-size:9px;color:var(--text-muted);display:block;">${window.t('lbl_budget_item_type')}</label>
                    <select class="input-field budget-item-type" style="margin-bottom:0; padding:4px 8px; font-size:11px;">
                        <option value="fixed" ${type === 'fixed' ? 'selected' : ''}>${window.t('opt_type_fixed')}</option>
                        <option value="floor_m2" ${type === 'floor_m2' ? 'selected' : ''}>${window.t('opt_type_floor')}</option>
                        <option value="wall_m2" ${type === 'wall_m2' ? 'selected' : ''}>${window.t('opt_type_wall')}</option>
                        <option value="ceil_m2" ${type === 'ceil_m2' ? 'selected' : ''}>${window.t('opt_type_ceil')}</option>
                    </select>
                </div>
            </div>
        `;
        budgetItemsContainer.insertAdjacentHTML('beforeend', html);
    };

    window.moveBudgetRow = (id, direction) => {
        const row = document.getElementById(id);
        if (direction === -1 && row.previousElementSibling) {
            row.parentNode.insertBefore(row, row.previousElementSibling);
        } else if (direction === 1 && row.nextElementSibling) {
            row.parentNode.insertBefore(row.nextElementSibling, row);
        }
    };

    window.openBudgetForm = (roomId) => {
        const rm = rooms.find(r => r.id === roomId);
        if(!rm) return;
        budgetRoomTitle.innerText = window.t('title_budget') + ": " + window.getTrans('room-floor', rm.floor) + " - " + window.getTrans('room-type', rm.type);
        budgetRoomIdHidden.value = roomId;
        
        // Migration logic: handle old object format vs new array format
        let b = roomBudgets[roomId];
        
        if (!b) {
            // New room - initialize with full standard template in the requested order
            const template = [
                { name: window.t('lbl_floor'), price: '', type: 'floor_m2' },
                { name: window.t('lbl_walls'), price: '', type: 'wall_m2' },
                { name: window.t('lbl_ceiling'), price: '', type: 'ceil_m2' },
                { name: window.t('lbl_mat'), price: '', type: 'fixed' },
                { name: window.t('lbl_paint'), price: '', type: 'fixed' },
                { name: window.t('lbl_door'), price: '', type: 'fixed' },
                { name: window.t('lbl_trim'), price: '', type: 'fixed' },
                { name: window.t('lbl_elec'), price: '', type: 'fixed' },
                { name: window.t('lbl_vent'), price: '', type: 'fixed' },
                { name: window.t('lbl_pipes'), price: '', type: 'fixed' },
                { name: window.t('lbl_fit'), price: '', type: 'fixed' },
                { name: window.t('lbl_ext'), price: '', type: 'fixed' },
                { name: window.t('lbl_unexp'), price: '', type: 'fixed' }
            ];
            b = { items: template };
        } else if (typeof b === 'object' && !b.items) {
            // Old format migration
            const items = [];
            if(b.floor) items.push({ name: window.t('lbl_floor'), price: b.floor, type: 'floor_m2' });
            if(b.wall) items.push({ name: window.t('lbl_wall'), price: b.wall, type: 'wall_m2' });
            if(b.ceil) items.push({ name: window.t('lbl_ceiling'), price: b.ceil, type: 'ceil_m2' });
            if(b.pipes) items.push({ name: window.t('lbl_pipes'), price: b.pipes, type: 'fixed' });
            if(b.vent) items.push({ name: window.t('lbl_vent'), price: b.vent, type: 'fixed' });
            if(b.elec) items.push({ name: window.t('lbl_elec'), price: b.elec, type: 'fixed' });
            if(b.fit) items.push({ name: window.t('lbl_fit'), price: b.fit, type: 'fixed' });
            if(b.mat) items.push({ name: window.t('lbl_mat'), price: b.mat, type: 'fixed' });
            if(b.paint) items.push({ name: window.t('lbl_paint'), price: b.paint, type: 'fixed' });
            if(b.trim) items.push({ name: window.t('lbl_trim'), price: b.trim, type: 'fixed' });
            if(b.door) items.push({ name: window.t('lbl_door'), price: b.door, type: 'fixed' });
            if(b.ext) items.push({ name: window.t('lbl_ext'), price: b.ext, type: 'fixed' });
            if(b.unexp) items.push({ name: window.t('lbl_unexp'), price: b.unexp, type: 'fixed' });
            b = { items: items };
        }

        budgetItemsContainer.innerHTML = '';
        b.items.forEach(it => addBudgetItemRow(it));
        
        formBudget.style.display = 'block';
        window.scrollTo(0, document.getElementById('view-budget').offsetTop);
    };

    btnSaveRoomBudget.addEventListener('click', () => {
        const roomId = budgetRoomIdHidden.value;
        const rm = rooms.find(r => r.id === roomId);
        if(!roomId || !rm) return;

        const itemRows = document.querySelectorAll('.budget-line-row');
        const items = [];
        let totalCalculated = 0;

        itemRows.forEach(row => {
            const name = row.querySelector('.budget-item-name').value;
            const price = parseFloat(row.querySelector('.budget-item-price').value) || 0;
            const type = row.querySelector('.budget-item-type').value;

            items.push({ name, price, type });

            if (type === 'fixed') {
                totalCalculated += price;
            } else if (type === 'floor_m2') {
                totalCalculated += (price * (parseFloat(rm.areas.floor) || 0));
            } else if (type === 'wall_m2') {
                totalCalculated += (price * (parseFloat(rm.areas.wall) || 0));
            } else if (type === 'ceil_m2') {
                totalCalculated += (price * (parseFloat(rm.areas.ceiling) || 0));
            }
        });

        roomBudgets[roomId] = { items, totalCalculated };
        formBudget.style.display = 'none';
        saveState();
    });

    // RECEIPTS & EXPENSES
    window.calcReceiptTotal = () => {
        let t = 0;
        document.querySelectorAll('.receipt-line-calc').forEach(el => t += (parseFloat(el.value) || 0));
        receiptTotalDisplay.innerHTML = `${t.toLocaleString('sv-SE')} <span class="currency-symbol">${currentCurrency}</span>`;
    };

    window.addReceiptLine = () => {
        const id = 'line' + Date.now() + Math.random().toString().substr(2,4);
        let rOpts = `<option value="" disabled selected>${window.t('opt_room_sel')}</option>`;
        const floorOrder = { 'Källare': 1, 'Våning 1': 2, 'Våning 2': 3, 'Våning 3': 4, 'Utsida/Tomt': 5 };
        const sortedRooms = [...rooms].sort((a,b) => (floorOrder[a.floor] || 99) - (floorOrder[b.floor] || 99));
        sortedRooms.forEach(r => rOpts += `<option value="${r.name}">${window.getTrans('room-floor', r.floor)} - ${window.getTrans('room-type', r.type)}</option>`);
        rOpts += `<option value="ALLA">${window.t('opt_all_rooms')}</option>`;

        // Build dynamic categories list from default + custom budget names
        let dynamicCats = new Set(categories);
        Object.values(roomBudgets).forEach(b => {
            if(b.items) b.items.forEach(it => dynamicCats.add(it.name));
        });

        let cOpts = `<option value="" disabled selected>${window.t('opt_cat_sel')}</option>`;
        Array.from(dynamicCats).sort().forEach(c => {
            const displayName = window.t('cat_' + c.toLowerCase()) !== ('cat_' + c.toLowerCase()) ? window.t('cat_' + c.toLowerCase()) : c;
            cOpts += `<option value="${c}">${displayName}</option>`;
        });

        const html = `
            <div id="${id}" style="background:#F8FAFC;padding:12px;border-radius:8px;border:1px solid var(--border-color);margin-bottom:8px;position:relative;">
                <button type="button" onclick="document.getElementById('${id}').remove(); calcReceiptTotal();" style="position:absolute;top:10px;right:10px;color:var(--danger-color);background:none;border:none;cursor:pointer;"><i class="ph ph-trash" style="font-size:18px;"></i></button>
                <input type="number" class="input-field receipt-line-calc" placeholder="${window.t('placeholder_amount')}" style="margin-bottom:8px;font-weight:bold;width:80%;" oninput="calcReceiptTotal()">
                <div style="display:flex;gap:8px;">
                    <select class="input-field receipt-line-room" style="flex:1;">${rOpts}</select>
                    <select class="input-field receipt-line-cat" style="flex:1;">${cOpts}</select>
                </div>
            </div>
        `;
        receiptLinesContainer.insertAdjacentHTML('beforeend', html);
    };

    btnAddReceipt.addEventListener('click', () => {
        if(formReceipt.style.display === 'none') {
            document.getElementById('edit-receipt-id').value = '';
            document.getElementById('form-receipt-title').innerText = window.t('btn_add_receipt');
            document.getElementById('btn-cancel-receipt').style.display = 'none';
            receiptLinesContainer.innerHTML = '';
            receiptStore.value = '';
            addReceiptLine(); 
            calcReceiptTotal();
            formReceipt.style.display = 'block';
        } else formReceipt.style.display = 'none';
    });
    
    document.getElementById('btn-cancel-receipt').addEventListener('click', () => {
        formReceipt.style.display = 'none';
        currReceiptImg = null;
    });

    btnAddReceiptLine.addEventListener('click', addReceiptLine);
    receiptPreviewContainer.addEventListener('click', () => receiptUpload.click());

    let currReceiptImg = null;
    receiptUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const cvs = document.createElement('canvas');
                let scale = 800 / img.width;
                if(scale > 1) scale = 1;
                cvs.width = img.width * scale;
                cvs.height = img.height * scale;
                cvs.getContext('2d').drawImage(img, 0, 0, cvs.width, cvs.height);
                currReceiptImg = cvs.toDataURL('image/jpeg', 0.6);
                receiptPreview.src = currReceiptImg;
                receiptPreview.style.display = 'block';
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });

    btnSaveReceipt.addEventListener('click', () => {
        if(!receiptStore.value) return alert(window.t('alert_req_store'));
        let items = [], total = 0, valid = true;

        document.querySelectorAll('.receipt-line-calc').forEach(el => {
            const p = el.parentElement;
            const amt = parseFloat(el.value) || 0;
            const r = p.querySelector('.receipt-line-room').value;
            const c = p.querySelector('.receipt-line-cat').value;
            if(amt <= 0 || !r || !c) valid = false;
            total += amt;
            items.push({ amount: amt, room: r, cat: c });
        });
        
        if(items.length === 0) return alert(window.t('alert_req_line'));
        if(!valid) return alert(window.t('alert_req_valid_line'));

        const eid = document.getElementById('edit-receipt-id').value;
        if (eid) {
            const idx = expenses.findIndex(x => x.id === eid);
            if(idx !== -1) {
                expenses[idx].store = receiptStore.value;
                expenses[idx].amount = total;
                expenses[idx].image = currReceiptImg;
                expenses[idx].items = items;
            }
        } else {
            expenses.push({ id: 'exp' + Date.now(), store: receiptStore.value, amount: total, image: currReceiptImg, date: new Date().toLocaleDateString('sv-SE'), items: items });
        }

        document.getElementById('edit-receipt-id').value = '';
        receiptStore.value = '';
        receiptLinesContainer.innerHTML = '';
        receiptPreview.style.display='none';
        currReceiptImg = null;
        formReceipt.style.display='none';
        saveState();
    });

    window.deleteExpense = (eid) => {
        if(!confirm(window.t('alert_del_receipt'))) return;
        expenses = expenses.filter(e => e.id !== eid);
        saveState();
    };

    window.editExpense = (eid) => {
        const exp = expenses.find(e => e.id === eid);
        if(!exp) return;

        document.getElementById('edit-receipt-id').value = exp.id;
        document.getElementById('form-receipt-title').innerText = window.t('title_edit_receipt');
        document.getElementById('btn-cancel-receipt').style.display = 'block';

        receiptStore.value = exp.store;
        
        currReceiptImg = exp.image || null;
        if(currReceiptImg) {
            receiptPreview.src = currReceiptImg;
            receiptPreview.style.display = 'block';
        } else {
            receiptPreview.style.display = 'none';
        }

        receiptLinesContainer.innerHTML = '';
        if(exp.items && exp.items.length > 0) {
            exp.items.forEach(it => {
                const id = 'line' + Date.now() + Math.random().toString().substr(2,4);
                let rOpts = `<option value="" disabled>${window.t('opt_room_sel')}</option>`;
                rOpts += `<option value="Övergripande (Hela bygget)" ${it.room === "Övergripande (Hela bygget)" ? 'selected' : ''}>${window.t('opt_all_rooms')}</option>`;
                const floorOrder = { 'Källare': 1, 'Våning 1': 2, 'Våning 2': 3, 'Våning 3': 4, 'Utsida/Tomt': 5 };
                const sortedRooms = [...rooms].sort((a,b) => (floorOrder[a.floor] || 99) - (floorOrder[b.floor] || 99));
                sortedRooms.forEach(r => rOpts += `<option value="${r.name}" ${it.room === r.name ? 'selected' : ''}>${window.getTrans('room-floor', r.floor)} - ${window.getTrans('room-type', r.type)}</option>`);

                // Build dynamic categories list for this edit line
                let dynamicCats = new Set(categories);
                Object.values(roomBudgets).forEach(b => {
                    if(b.items) b.items.forEach(it => dynamicCats.add(it.name));
                });

                let cOpts = `<option value="" disabled>${window.t('opt_cat_sel')}</option>`;
                Array.from(dynamicCats).sort().forEach(c => {
                    const displayName = window.t('cat_' + c.toLowerCase()) !== ('cat_' + c.toLowerCase()) ? window.t('cat_' + c.toLowerCase()) : c;
                    cOpts += `<option value="${c}" ${it.cat === c ? 'selected' : ''}>${displayName}</option>`;
                });

                const html = `
                    <div id="${id}" style="background:#F8FAFC;padding:12px;border-radius:8px;border:1px solid var(--border-color);margin-bottom:8px;position:relative;">
                        <button type="button" onclick="document.getElementById('${id}').remove(); calcReceiptTotal();" style="position:absolute;top:10px;right:10px;color:var(--danger-color);background:none;border:none;cursor:pointer;"><i class="ph ph-trash" style="font-size:18px;"></i></button>
                        <input type="number" class="input-field receipt-line-calc" placeholder="${window.t('placeholder_amount')}" style="margin-bottom:8px;font-weight:bold;width:80%;" value="${it.amount}" oninput="calcReceiptTotal()">
                        <div style="display:flex;gap:8px;">
                            <select class="input-field receipt-line-room" style="flex:1;">${rOpts}</select>
                            <select class="input-field receipt-line-cat" style="flex:1;">${cOpts}</select>
                        </div>
                    </div>
                `;
                receiptLinesContainer.insertAdjacentHTML('beforeend', html);
            });
        } else {
            addReceiptLine(); 
        }

        calcReceiptTotal();
        formReceipt.style.display = 'block';
        window.scrollTo(0, document.getElementById('view-finance').offsetTop);
    };


    // ---- FINANCE TABS LOGIC ----
    if(tabBtnFinanceVariance) {
        tabBtnFinanceVariance.addEventListener('click', () => {
            tabFinanceVariance.style.display = 'block';
            tabFinanceReceipts.style.display = 'none';
            tabBtnFinanceVariance.style.borderBottomColor = 'var(--primary-color)';
            tabBtnFinanceVariance.style.color = 'var(--primary-color)';
            tabBtnFinanceReceipts.style.borderBottomColor = 'transparent';
            tabBtnFinanceReceipts.style.color = 'var(--text-muted)';
        });

        tabBtnFinanceReceipts.addEventListener('click', () => {
            tabFinanceVariance.style.display = 'none';
            tabFinanceReceipts.style.display = 'block';
            tabBtnFinanceReceipts.style.borderBottomColor = 'var(--primary-color)';
            tabBtnFinanceReceipts.style.color = 'var(--primary-color)';
            tabBtnFinanceVariance.style.borderBottomColor = 'transparent';
            tabBtnFinanceVariance.style.color = 'var(--text-muted)';
        });
    }

    // ---- TIMELINE / TASKS LOGIC ----
    tabBtnTimelineData.addEventListener('click', () => {
        tabTimelineData.style.display = 'block';
        tabTimelineGantt.style.display = 'none';
        tabBtnTimelineData.style.borderBottomColor = 'var(--primary-color)';
        tabBtnTimelineData.style.color = 'var(--primary-color)';
        tabBtnTimelineGantt.style.borderBottomColor = 'transparent';
        tabBtnTimelineGantt.style.color = 'var(--text-muted)';
    });

    tabBtnTimelineGantt.addEventListener('click', () => {
        tabTimelineData.style.display = 'none';
        tabTimelineGantt.style.display = 'block';
        tabBtnTimelineGantt.style.borderBottomColor = 'var(--primary-color)';
        tabBtnTimelineGantt.style.color = 'var(--primary-color)';
        tabBtnTimelineData.style.borderBottomColor = 'transparent';
        tabBtnTimelineData.style.color = 'var(--text-muted)';
        renderGantt();
    });

    window.addTaskLine = (initData = null) => {
        const id = 'taskline' + Date.now() + Math.random().toString().substr(2,4);
        // Build dynamic categories list from default + custom budget names
        let dynamicCats = new Set(categories);
        Object.values(roomBudgets).forEach(b => {
            if(b.items) b.items.forEach(it => dynamicCats.add(it.name));
        });

        // Remove Arbetskostnader and Buffert from timeline selection
        dynamicCats.delete('Arbetskostnader');
        dynamicCats.delete('Buffert');

        let catOpts = `<option value="" disabled ${!initData ? 'selected' : ''} data-i18n="opt_cat_sel">${window.t('opt_cat_sel')}</option>`;
        Array.from(dynamicCats).sort().forEach(c => {
            const displayName = window.t('cat_' + c.toLowerCase()) !== ('cat_' + c.toLowerCase()) ? window.t('cat_' + c.toLowerCase()) : c;
            const selected = initData && initData.cat === c ? 'selected' : '';
            catOpts += `<option value="${c}" ${selected}>${displayName}</option>`;
        });

        const html = `
            <div id="${id}" class="task-line-segment" style="background:#F8FAFC;padding:12px;border-radius:8px;border:1px solid var(--border-color);margin-bottom:12px;position:relative;">
                <button type="button" class="remove-task-line" onclick="document.getElementById('${id}').remove()" style="position:absolute;top:10px;right:10px;color:var(--danger-color);background:none;border:none;cursor:pointer; display:${initData && initData.isEdit ? 'none' : 'block'}"><i class="ph ph-trash" style="font-size:18px;"></i></button>
                
                <div class="form-group-title" style="font-weight:600;font-size:11px;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;">${window.t('lbl_select_cat')}</div>
                <select class="input-field task-line-cat" style="margin-bottom:12px;" onchange="updateTaskSuggestion('${id}')">${catOpts}</select>

                <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:12px;">
                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                            <label style="font-size:11px;color:var(--text-muted);">${window.t('lbl_period')}</label>
                            <span id="suggestion-${id}" style="font-size:10px; color:var(--accent-color); font-weight:600;"></span>
                        </div>
                        <input type="number" class="input-field task-line-days" value="${initData ? (initData.days || '') : ''}" placeholder="${window.t('lbl_days')}" oninput="updateTaskDates('${id}')">
                    </div>

                    <div style="display:flex; gap:10px;">
                        <div style="flex:1;">
                            <label style="font-size:11px;color:var(--text-muted);">${window.t('lbl_start')}</label>
                            <input type="date" class="input-field task-line-start" value="${initData ? initData.start : ''}" onchange="updateTaskDates('${id}')">
                        </div>
                        <div style="flex:1;">
                            <label style="font-size:11px;color:var(--text-muted);">${window.t('lbl_end')}</label>
                            <input type="date" class="input-field task-line-end" value="${initData ? initData.end : ''}" readonly style="background:#f1f5f9; cursor:not-allowed;">
                        </div>
                    </div>
                </div>

                <div class="form-group-title" style="font-weight:600;font-size:11px;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;">${window.t('lbl_status')}</div>
                <select class="input-field task-line-status">
                    <option value="pending" ${initData && initData.status === 'pending' ? 'selected' : ''}>${window.t('stat_pending')}</option>
                    <option value="ongoing" ${initData && initData.status === 'ongoing' ? 'selected' : ''}>${window.t('stat_ongoing')}</option>
                    <option value="done" ${initData && initData.status === 'done' ? 'selected' : ''}>${window.t('stat_done')}</option>
                </select>
            </div>
        `;
        taskLinesContainer.insertAdjacentHTML('beforeend', html);
        if(initData) updateTaskSuggestion(id);
    };

    window.updateTaskSuggestion = (id) => {
        const seg = document.getElementById(id);
        const cat = seg.querySelector('.task-line-cat').value;
        const roomName = taskRoom.value;
        const suggestionEl = document.getElementById('suggestion-' + id);
        
        if(!cat || !roomName) {
            suggestionEl.textContent = '';
            return;
        }

        const days = window.calculateSuggestedDays(roomName, cat);
        if(days) {
            suggestionEl.textContent = window.t('lbl_suggested') + ': ' + days + ' ' + (window.currentLang === 'sv' ? 'dgr' : 'days');
        } else {
            suggestionEl.textContent = '';
        }
    };

    window.updateTaskDates = (id) => {
        const seg = document.getElementById(id);
        const startVal = seg.querySelector('.task-line-start').value;
        const daysVal = parseInt(seg.querySelector('.task-line-days').value) || 0;
        const endInput = seg.querySelector('.task-line-end');

        if (startVal && daysVal > 0) {
            const startD = new Date(startVal);
            startD.setDate(startD.getDate() + daysVal - 1);
            endInput.value = startD.toISOString().split('T')[0];
        } else {
            endInput.value = '';
        }
    };

    btnAddTask.addEventListener('click', () => {
        if(formTask.style.display === 'none') {
            document.getElementById('edit-task-id').value = '';
            document.getElementById('form-task-title').innerText = window.t('title_schedule_phase');
            btnAddTaskLine.style.display = 'block';
            
            // Populate room dropdown
            const floorOrder = { 'Källare': 1, 'Våning 1': 2, 'Våning 2': 3, 'Våning 3': 4, 'Utsida/Tomt': 5 };
            const sortedRooms = [...rooms].sort((a,b) => (floorOrder[a.floor] || 99) - (floorOrder[b.floor] || 99));
            let rOpts = `<option value="" disabled selected>${window.t('opt_room_sel')}</option>`;
            rOpts += `<option value="ALLA">${window.t('opt_all_rooms')}</option>`;
            sortedRooms.forEach(r => rOpts += `<option value="${r.name}">${window.getTrans('room-floor', r.floor)} - ${window.getTrans('room-type', r.type)}</option>`);
            taskRoom.innerHTML = rOpts;
            taskRoom.value = '';
            
            taskLinesContainer.innerHTML = '';
            addTaskLine(); // Initial line
            formTask.style.display = 'block';
        } else {
            formTask.style.display = 'none';
        }
    });

    btnAddTaskLine.addEventListener('click', () => addTaskLine());

    btnCancelTask.addEventListener('click', () => formTask.style.display = 'none');

    btnSaveTask.addEventListener('click', () => {
        const roomId = taskRoom.value;
        if(!roomId) return alert(window.t('alert_req_fields'));

        const segments = document.querySelectorAll('.task-line-segment');
        const eid = document.getElementById('edit-task-id').value;

        if (eid) {
            // SINGLE EDIT MODE
            const segment = segments[0];
            const cat = segment.querySelector('.task-line-cat').value;
            const start = segment.querySelector('.task-line-start').value;
            const end = segment.querySelector('.task-line-end').value;
            const status = segment.querySelector('.task-line-status').value;
            const days = parseInt(segment.querySelector('.task-line-days').value) || 0;

            if(!cat || !start || !end) return alert(window.t('alert_req_fields'));
            if(new Date(start) > new Date(end)) return alert(window.t('alert_date_order'));

            const idx = tasks.findIndex(x => x.id === eid);
            if(idx !== -1) {
                tasks[idx].room = roomId;
                tasks[idx].cat = cat;
                tasks[idx].start = start;
                tasks[idx].end = end;
                tasks[idx].status = status;
                tasks[idx].days = days;
            }
        } else {
            // MULTI ADD MODE
            let hasError = false;
            segments.forEach(seg => {
                const cat = seg.querySelector('.task-line-cat').value;
                const start = seg.querySelector('.task-line-start').value;
                const end = seg.querySelector('.task-line-end').value;
                const status = seg.querySelector('.task-line-status').value;
                const days = parseInt(seg.querySelector('.task-line-days').value) || 0;

                if(!cat || !start || !end) {
                    hasError = true;
                    return;
                }
                if(new Date(start) > new Date(end)) {
                    hasError = true;
                    return;
                }

                tasks.push({
                    id: 'tsk' + Date.now() + Math.random().toString().substr(2,4),
                    room: roomId,
                    cat: cat,
                    start: start,
                    end: end,
                    status: status,
                    days: days
                });
            });
            if(hasError) return alert(window.t('alert_req_fields') + " / " + window.t('alert_date_order'));
        }
        
        document.getElementById('edit-task-id').value = '';
        formTask.style.display = 'none';
        saveState();
    });

    taskFilterCat.addEventListener('change', () => renderAll());
    
    window.editTask = (tid) => {
        const t = tasks.find(x => x.id === tid);
        if(!t) return;

        // Populate room dropdown for edit
        const floorOrder = { 'Källare': 1, 'Våning 1': 2, 'Våning 2': 3, 'Våning 3': 4, 'Utsida/Tomt': 5 };
        const sortedRooms = [...rooms].sort((a,b) => (floorOrder[a.floor] || 99) - (floorOrder[b.floor] || 99));
        let rOpts = `<option value="" disabled>${window.t('opt_room_sel')}</option>`;
        rOpts += `<option value="ALLA">${window.t('opt_all_rooms')}</option>`;
        sortedRooms.forEach(r => rOpts += `<option value="${r.name}">${window.getTrans('room-floor', r.floor)} - ${window.getTrans('room-type', r.type)}</option>`);
        taskRoom.innerHTML = rOpts;

        document.getElementById('edit-task-id').value = tid;
        taskRoom.value = t.room;
        
        taskLinesContainer.innerHTML = '';
        
        let initialDays = t.days;
        if(!initialDays && t.start && t.end) {
            const s = new Date(t.start);
            const e = new Date(t.end);
            initialDays = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
        }

        addTaskLine({
            cat: t.cat,
            start: t.start,
            end: t.end,
            days: initialDays,
            status: t.status || 'pending',
            isEdit: true
        });

        btnAddTaskLine.style.display = 'none'; // Only edit ONE at a time
        document.getElementById('form-task-title').innerText = window.t('title_edit_phase');
        formTask.style.display = 'block';
        window.scrollTo(0, document.getElementById('view-timeline').offsetTop);
    };

    window.deleteTask = (tid) => {
        if(!confirm(window.t('alert_del_phase'))) return;
        tasks = tasks.filter(t => t.id !== tid);
        saveState();
    };


    btnGanttPrev.addEventListener('click', () => { ganttOffsetWeeks -= 2; renderGantt(); });
    btnGanttNext.addEventListener('click', () => { ganttOffsetWeeks += 2; renderGantt(); });

    const getWeekNumber = (d) => {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
        return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    };

    const getMonday = (d) => {
        d = new Date(d);
        var day = d.getDay(), diff = d.getDate() - day + (day == 0 ? -6:1);
        return new Date(d.setDate(diff));
    };

    const renderGantt = () => {
        if(document.getElementById('view-timeline').classList.contains('active-view') === false) return;
        if(tabTimelineGantt.style.display === 'none') return;
        
        // Determine viewport bounds (weeks)
        let minDate = new Date();
        minDate.setDate(minDate.getDate() - (3 * 7)); // Look 3 weeks back
        minDate = getMonday(minDate);
        minDate.setDate(minDate.getDate() + (ganttOffsetWeeks * 7)); // Apply manual user offset
        
        let maxDateProject = new Date(minDate);
        maxDateProject.setDate(maxDateProject.getDate() + (12 * 7)); // Default 12 weeks ahead

        tasks.forEach(t => {
            if(!t.end) return;
            const endD = new Date(t.end);
            if(endD > maxDateProject) maxDateProject = endD;
        });

        // Ensure maxDateProject aligns to end of a week
        maxDateProject.setDate(maxDateProject.getDate() + (7 - (maxDateProject.getDay()||7))); 

        const totalDays = Math.ceil((maxDateProject - minDate) / (1000 * 60 * 60 * 24));
        const totalWks = Math.ceil((totalDays + 1) / 7);

        // Build generic table structure
        let html = `<div style="display:grid; grid-template-columns: 200px repeat(${totalWks}, 38px); border-left:1px solid #E2E8F0; border-top:1px solid #E2E8F0;">`;
        
        // Row 1: Headers
        let headerRow = `<div style="background:#F8FAFC; border-right:1px solid #E2E8F0; border-bottom:1px solid #E2E8F0; padding:8px; font-size:11px; font-weight:600; color:var(--text-muted); position:sticky; left:0; z-index:2;">${window.t('table_room_cat')}</div>`;
        const todayWk = getWeekNumber(new Date());

        let ptrD = new Date(minDate);
        for(let w=0; w<totalWks; w++) {
            const wkNum = getWeekNumber(ptrD);
            const isCurrentWk = (wkNum === todayWk && new Date().getFullYear() === ptrD.getFullYear());
            const bg = isCurrentWk ? 'var(--primary-color)' : '#F8FAFC';
            const color = isCurrentWk ? '#fff' : 'var(--text-primary)';
            const localeStr = window.currentLang === 'sv' ? 'sv-SE' : window.currentLang === 'fi' ? 'fi-FI' : 'en-US';
            headerRow += `<div style="background:${bg}; color:${color}; font-size:10px; font-weight:700; text-align:center; padding:8px 0; border-right:1px solid #E2E8F0; border-bottom:1px solid #E2E8F0; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                <span style="font-size:8px;font-weight:400;margin-bottom:2px;opacity:0.8;">${ptrD.toLocaleString(localeStr, {month:'short'})}</span>
                v${wkNum}
            </div>`;
            ptrD.setDate(ptrD.getDate() + 7);
        }
        html += headerRow;

        // Group Tasks into Flat Y-Axis
        let rowsMap = {};
        tasks.forEach(t => {
            let roomNameDisplay = t.room;
            if(t.room === 'ALLA' || t.room === 'Övergripande (Hela bygget)') {
                roomNameDisplay = window.t('opt_all_rooms');
            } else {
                const rmObj = rooms.find(r => r.name === t.room);
                if (rmObj) {
                    roomNameDisplay = window.getTrans('room-floor', rmObj.floor) + ' - ' + window.getTrans('room-type', rmObj.type);
                }
            }
            const displayName = window.t('cat_' + t.cat.toLowerCase()) !== ('cat_' + t.cat.toLowerCase()) ? window.t('cat_' + t.cat.toLowerCase()) : t.cat;
            const rowKey = `<strong style="color:var(--text-primary);">${roomNameDisplay}</strong><br><span style="color:var(--primary-color);">${displayName}</span>`;
            
            // Unique ID to merge identical room+cat combos to one line visually
            const logicKey = t.room + '_' + t.cat;
            if (!rowsMap[logicKey]) rowsMap[logicKey] = { label: rowKey, records: [] };
            rowsMap[logicKey].records.push(t);
        });

        const statusColors = { pending: '#CBD5E1', ongoing: 'var(--warning-color)', done: 'var(--success-color)' };
        let activeBg = false;

        // Sort rows by the earliest start date of their records (Waterfall effect)
        const flatRows = Object.keys(rowsMap).sort((a, b) => {
            const minA = new Date(Math.min(...rowsMap[a].records.map(r => new Date(r.start))));
            const minB = new Date(Math.min(...rowsMap[b].records.map(r => new Date(r.start))));
            return minA - minB;
        });

        flatRows.forEach(lKey => {
            activeBg = !activeBg;
            const rowBg = activeBg ? '#ffffff' : '#FAFAFA';
            const rData = rowsMap[lKey];

            // Category cell (sticky length 200px)
            html += `<div style="background:${rowBg}; border-right:1px solid #E2E8F0; border-bottom:1px solid #E2E8F0; padding:6px 8px; font-size:10px; line-height:1.4; display:flex; align-items:center; position:sticky; left:0; z-index:2;"><div>${rData.label}</div></div>`;
            
            // Timeline cells
            ptrD = new Date(minDate);
            for(let w=0; w<totalWks; w++) {
                const cellStart = new Date(ptrD);
                const cellEnd = new Date(ptrD);
                cellEnd.setDate(cellEnd.getDate() + 6);
                
                // Does any task overlap this week?
                const tasksInWk = rData.records.filter(tk => {
                    return new Date(tk.start) <= cellEnd && new Date(tk.end) >= cellStart;
                });

                let cellHTML = '';
                if(tasksInWk.length > 0) {
                    const tk = tasksInWk[0]; // just pick the first overlapping for visual
                    cellHTML = `<div style="width:100%;height:14px;background:${statusColors[tk.status] || 'var(--primary-color)'}; border-radius:3px; box-shadow:0 1px 2px rgba(0,0,0,0.1);"></div>`;
                }

                const isCurrentWk = (getWeekNumber(ptrD) === todayWk && new Date().getFullYear() === ptrD.getFullYear());
                const highlightBorder = isCurrentWk ? 'border-left:1px dashed var(--primary-color); border-right:1px dashed var(--primary-color);' : 'border-right:1px solid #E2E8F0;';

                html += `<div style="background:${rowBg}; ${highlightBorder} border-bottom:1px solid #E2E8F0; padding:6px 4px; display:flex; align-items:center; justify-content:center;">${cellHTML}</div>`;
                ptrD.setDate(ptrD.getDate() + 7);
            }
        });

        if(tasks.length === 0) {
            html += `<div style="grid-column: 1 / -1; padding:20px; font-size:12px; color:var(--text-muted); text-align:center;">${window.t('empty_gantt')}</div>`;
        }

        html += `</div>`; // End Grid
        ganttContainer.innerHTML = html;
        ganttMonthLabel.innerText = window.t('tab_calendar_project');
    };


    // ---- RENDER LOGIC ----
    window.viewImageFull = (src) => {
        document.getElementById('image-modal-img').src = src;
        document.getElementById('image-modal').style.display = 'flex';
    };

    window.toggleSummaryDetails = (el) => {
        const tgt = el.nextElementSibling;
        if(tgt && tgt.style.display === 'none') tgt.style.display = 'block';
        else if(tgt) tgt.style.display = 'none';
    };

    const renderAll = () => {
        if (!currentProjectId) {
            projectList.innerHTML = projects.length === 0 ? `<p style="color:var(--text-muted);font-size:14px;">${window.t('empty_projects')}</p>` : '';
            projects.forEach(p => {
                projectList.innerHTML += `
                    <div class="card" style="margin-bottom:12px; padding:16px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <div onclick="openProject('${p.id}')" style="cursor:pointer; flex:1;">
                                <h4 style="font-size:18px;font-weight:600;color:var(--primary-color);">${p.name}</h4>
                                <span style="font-size:12px;color:var(--text-muted);">Skapad: ${p.date}</span>
                            </div>
                            <button style="background:none;border:none;color:#DC2626;cursor:pointer;padding:8px;" onclick="deleteProject('${p.id}')">
                                <i class="ph ph-trash" style="font-size:22px;"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            return;
        }

        const floorOrder = { 'Källare': 1, 'Våning 1': 2, 'Våning 2': 3, 'Våning 3': 4, 'Utsida/Tomt': 5 };
        rooms.sort((a, b) => (floorOrder[a.floor] || 99) - (floorOrder[b.floor] || 99));

        const totalBudget = Object.values(roomBudgets).reduce((acc, rb) => acc + (rb.totalCalculated || 0), 0);
        const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
        const percentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
        
        dashTotal.innerHTML = `${totalBudget.toLocaleString('sv-SE')} <span class="currency-symbol">${currentCurrency}</span>`;
        dashSpent.innerHTML = `${totalSpent.toLocaleString('sv-SE')} <span class="currency-symbol">${currentCurrency}</span>`;
        dashPercentage.textContent = percentage;
        
        dashProgress.style.width = `${Math.min(percentage, 100)}%`;
        if(percentage < 70) dashProgress.style.backgroundColor = 'var(--success-color)';
        else if(percentage < 90) dashProgress.style.backgroundColor = 'var(--warning-color)';
        else dashProgress.style.backgroundColor = 'var(--danger-color)';

        let floorTotals = {};
        let grandBudget = 0;
        let grandBreakdown = {};
        let floorBreakdowns = {};
        
        rooms.forEach(rm => {
            const b = roomBudgets[rm.id];
            if (!b) return;
            const sum = b.totalCalculated || 0;
            grandBudget += sum;
            floorTotals[rm.floor] = (floorTotals[rm.floor] || 0) + sum;
            
            if(!floorBreakdowns[rm.floor]) floorBreakdowns[rm.floor] = {};
            let fb = floorBreakdowns[rm.floor];

            // Migration/Normalizer: Handle both old and new format for background rendering
            let items = b.items;
            if (!items) {
                items = [];
                if(b.floor) items.push({ name: window.t('lbl_floor'), price: b.floor, type: 'floor_m2' });
                if(b.wall) items.push({ name: window.t('lbl_wall'), price: b.wall, type: 'wall_m2' });
                if(b.ceil) items.push({ name: window.t('lbl_ceiling'), price: b.ceil, type: 'ceil_m2' });
                if(b.pipes) items.push({ name: window.t('lbl_pipes'), price: b.pipes, type: 'fixed' });
                if(b.vent) items.push({ name: window.t('lbl_vent'), price: b.vent, type: 'fixed' });
                if(b.elec) items.push({ name: window.t('lbl_elec'), price: b.elec, type: 'fixed' });
                if(b.fit) items.push({ name: window.t('lbl_fit'), price: b.fit, type: 'fixed' });
                if(b.mat) items.push({ name: window.t('lbl_mat'), price: b.mat, type: 'fixed' });
                if(b.paint) items.push({ name: window.t('lbl_paint'), price: b.paint, type: 'fixed' });
                if(b.trim) items.push({ name: window.t('lbl_trim'), price: b.trim, type: 'fixed' });
                if(b.door) items.push({ name: window.t('lbl_door'), price: b.door, type: 'fixed' });
                if(b.ext) items.push({ name: window.t('lbl_ext'), price: b.ext, type: 'fixed' });
                if(b.unexp) items.push({ name: window.t('lbl_unexp'), price: b.unexp, type: 'fixed' });
            }

            items.forEach(it => {
                let val = 0;
                if (it.type === 'fixed') val = it.price;
                else if (it.type === 'floor_m2') val = it.price * (parseFloat(rm.areas.floor) || 0);
                else if (it.type === 'wall_m2') val = it.price * (parseFloat(rm.areas.wall) || 0);
                else if (it.type === 'ceil_m2') val = it.price * (parseFloat(rm.areas.ceiling) || 0);

                grandBreakdown[it.name] = (grandBreakdown[it.name] || 0) + val;
                fb[it.name] = (fb[it.name] || 0) + val;
            });
        });

        const genBreakdownHTML = (bdObj) => {
            let html = '<div style="background:#F8FAFC;border-radius:6px;padding:8px 12px;margin-top:6px;font-size:12px;color:var(--text-muted);display:none;">';
            for(const [k,v] of Object.entries(bdObj)){
                if(v > 0) html += `<div style="display:flex;justify-content:space-between;border-bottom:1px solid #E2E8F0;padding:2px 0;"><span>${k}</span><strong style="color:var(--text-primary);">${v.toLocaleString('sv-SE')} ${currentCurrency}</strong></div>`;
            }
            html += '</div>';
            return html;
        };

        const budgetSummaryBox = document.getElementById('budget-summary-box');
        if (budgetSummaryBox) {
            if (rooms.length > 0 && grandBudget > 0) {
                let floorHtml = '';
                let sortedFloors = Object.entries(floorTotals).sort((a, b) => (floorOrder[a[0]] || 99) - (floorOrder[b[0]] || 99));
                for (const [f, s] of sortedFloors) {
                    if(s > 0) {
                        floorHtml += `
                        <div style="border-top:1px solid var(--border-color);padding-top:8px;margin-top:8px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;cursor:pointer;" onclick="toggleSummaryDetails(this)">
                                <span style="font-weight:600;display:flex;align-items:center;gap:4px;"><i class="ph ph-caret-down"></i> ${f}</span>
                                <strong style="color:var(--text-primary);">${s.toLocaleString('sv-SE')} ${currentCurrency}</strong>
                            </div>
                            ${genBreakdownHTML(floorBreakdowns[f])}
                        </div>`;
                    }
                }
                budgetSummaryBox.innerHTML = `
                    <h3 style="font-size:13px;color:var(--text-muted);margin-bottom:4px;font-weight:600;text-transform:uppercase;">${window.t('title_calc_total')}</h3>
                    <div style="margin-bottom:8px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;" onclick="toggleSummaryDetails(this)">
                            <div style="font-size:24px;font-weight:700;color:var(--primary-color);">
                                ${grandBudget.toLocaleString('sv-SE')} <span class="currency-symbol">${currentCurrency}</span>
                            </div>
                            <i class="ph ph-caret-down" style="color:var(--text-muted);font-size:20px;"></i>
                        </div>
                        ${genBreakdownHTML(grandBreakdown)}
                    </div>
                    ${floorHtml}
                `;
                budgetSummaryBox.style.display = 'block';
            } else {
                budgetSummaryBox.style.display = 'none';
            }
        }

        budgetList.innerHTML = rooms.length === 0 ? `<p style="color:var(--text-muted);font-size:14px;">${window.t('empty_budget')}</p>` : '';
        rooms.forEach(rm => {
            const b = roomBudgets[rm.id];
            const sum = b ? b.totalCalculated.toLocaleString('sv-SE') : '0';
            const isSet = b ? 'var(--success-color)' : 'var(--text-muted)';
            budgetList.innerHTML += `
                <div class="card" style="margin-bottom:12px; padding:16px; cursor:pointer;" onclick="openBudgetForm('${rm.id}')">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <h4 style="font-size:16px;font-weight:600;">${window.getTrans('room-floor', rm.floor)} - ${window.getTrans('room-type', rm.type)}</h4>
                            <p style="font-size:12px;color:var(--text-muted);margin-top:2px;" data-i18n="desc_room">${window.t('desc_room')}</p>
                        </div>
                        <div style="text-align:right;">
                            <span style="display:block;font-size:10px;color:${isSet};text-transform:uppercase;font-weight:700;">Totalt</span>
                            <span style="font-size:16px;font-weight:700;color:var(--primary-color);">${sum} ${currentCurrency}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        roomList.innerHTML = rooms.length === 0 ? `<p style="color:var(--text-muted);font-size:14px;">${window.t('empty_rooms')}</p>` : '';
        rooms.forEach(rm => {
            roomList.innerHTML += `
                <div class="card" style="margin-bottom:12px; padding:16px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border-color);padding-bottom:8px;margin-bottom:8px;">
                        <div>
                            <h4 style="font-size:16px;font-weight:600;color:var(--primary-color);">${window.getTrans('room-type', rm.type)}</h4>
                            <span style="font-size:12px;color:var(--text-muted);font-weight:500;">${window.getTrans('room-floor', rm.floor)}</span>
                        </div>
                        <button style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:4px;" onclick="editRoomDetails('${rm.id}')">
                            <i class="ph ph-pencil-simple" style="font-size:20px;"></i>
                        </button>
                    </div>
                    <div class="room-area">
                        <div><span>${window.t('lbl_floor')}</span><strong>${rm.areas.floor} m²</strong></div>
                        <div><span>${window.t('lbl_walls')}</span><strong>${rm.areas.wall} m²</strong></div>
                        <div><span>${window.t('lbl_ceiling')}</span><strong>${rm.areas.ceiling} m²</strong></div>
                    </div>
                </div>
            `;
        });

        receiptList.innerHTML = expenses.length === 0 ? `<p style="color:var(--text-muted);font-size:14px;">${window.t('receipt_no_data')}</p>` : '';
        const revExp = [...expenses].reverse();
        revExp.forEach(rec => {
            let rowsHtml = '';
            if(rec.items) {
                rowsHtml = `<div style="margin-top:6px; display:none;">`;
                rec.items.forEach(it => {
                    rowsHtml += `<div style="font-size:11px;color:var(--text-muted);display:flex;justify-content:space-between;border-bottom:1px solid #E2E8F0;padding:4px 0;">
                        <span><strong style="color:var(--text-primary);">${window.t('cat_' + it.cat)}</strong> i ${it.room === 'ALLA' || it.room === 'Övergripande (Hela bygget)' ? window.t('cat_alla') : it.room}</span>
                        <strong style="color:var(--primary-color);">${it.amount.toLocaleString('sv-SE')} ${currentCurrency}</strong>
                    </div>`;
                });
                rowsHtml += `</div>`;
            } else if(rec.rooms && rec.cats) {
                const tags = [...rec.rooms, ...rec.cats].map(t => `<span style="background:#E2E8F0;color:#0F172A;font-size:10px;padding:2px 6px;border-radius:4px;margin-right:4px;">${t}</span>`).join('');
                rowsHtml = `<div style="margin-top:4px; display:none;">${tags}</div>`;
            }

            const imgHTML = rec.image ? `<img src="${rec.image}" style="width:48px;height:48px;border-radius:8px;object-fit:cover;margin-right:12px;cursor:pointer;" onclick="viewImageFull('${rec.image}')">` : `<div style="width:48px;height:48px;background:#F1F5F9;border-radius:8px;margin-right:12px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);"><i class="ph ph-receipt" style="font-size:24px;"></i></div>`;
            
            receiptList.innerHTML += `
                <div class="receipt-item-flex" style="align-items:flex-start;display:flex;padding:12px 16px;background:#fff;border:1px solid #E2E8F0;border-radius:12px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                    ${imgHTML}
                    <div class="expense-details" style="flex:1;">
                        <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;" onclick="toggleSummaryDetails(this)">
                            <div>
                                <h4 style="font-size:15px;font-weight:600;color:var(--text-primary);">${rec.store}</h4>
                                <p style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${rec.date}</p>
                            </div>
                            <div style="text-align:right;display:flex;align-items:center;gap:6px;">
                                <div style="font-size:16px;font-weight:700;color:var(--primary-color);">${rec.amount.toLocaleString('sv-SE')} ${currentCurrency}</div>
                                <span style="font-size:12px;color:var(--text-muted);display:flex;gap:4px;">
                                    <button class="btn-icon" style="padding:0;background:none;border:none;cursor:pointer;" onclick="editExpense('${rec.id}'); event.stopPropagation();"><i class="ph ph-pencil-simple" style="font-size:18px;"></i></button>
                                    <button class="btn-icon" style="padding:0;color:var(--danger-color);background:none;border:none;cursor:pointer;" onclick="deleteExpense('${rec.id}'); event.stopPropagation();"><i class="ph ph-trash" style="font-size:18px;"></i></button>
                                    <i class="ph ph-caret-down" style="margin-left:4px;font-size:18px;"></i>
                                </span>
                            </div>
                        </div>
                        ${rowsHtml}
                    </div>
                </div>
            `;
        });

        // ===== BUDGET VS EXPENSES VARIANCE =====
        let catSpent = {};
        expenses.forEach(exp => {
            if(exp.items) {
                exp.items.forEach(it => {
                    let cName = it.cat === 'Rör/Vent' ? 'Rör' : it.cat;
                    catSpent[cName] = (catSpent[cName] || 0) + it.amount;
                });
            } else if (exp.cats) {
                const amtPerCat = exp.amount / (exp.cats.length || 1);
                exp.cats.forEach(c => {
                    let cName = c === 'Rör/Vent' ? 'Rör' : c;
                    catSpent[cName] = (catSpent[cName] || 0) + amtPerCat;
                });
            }
        });

        const varDiv = document.getElementById('dash-category-variance');
        if(varDiv) {
            let varHtml = '';
            // Get unique categories from both budget and actual spending
            const allCats = new Set([...Object.keys(grandBreakdown), ...Object.keys(catSpent)]);
            
            Array.from(allCats).sort().forEach(c => {
                const b = grandBreakdown[c] || 0;
                const s = catSpent[c] || 0;
                if(b === 0 && s === 0) return;
                const diff = b - s;
                const color = diff >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
                const sign = diff >= 0 ? '+' : '';
                
                // Try translate if it's a default cat, else use raw name
                const displayName = window.t('cat_' + c.toLowerCase()) !== ('cat_' + c.toLowerCase()) ? window.t('cat_' + c.toLowerCase()) : c;

                varHtml += `
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #E2E8F0; padding:8px 0;">
                        <div style="flex:1;">
                            <div style="font-size:13px; font-weight:600; color:var(--text-primary);">${displayName}</div>
                            <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${window.t('lbl_budget_short')}: ${b.toLocaleString('sv-SE')} | ${window.t('lbl_outcome')}: ${s.toLocaleString('sv-SE')}</div>
                        </div>
                        <div style="font-weight:700; font-size:15px; color:${color}; text-align:right;">
                            ${sign}${diff.toLocaleString('sv-SE')} ${currentCurrency}
                        </div>
                    </div>
                `;
            });
            if(!varHtml) varHtml = `<p style="font-size:12px;color:var(--text-muted);">${window.t('empty_variance')}</p>`;
            varDiv.innerHTML = varHtml;
        }

        // ===== TIMELINE DATA LIST =====
        const currentFilterVal = taskFilterCat.value;
        let diffCats = new Set(categories);
        Object.values(roomBudgets).forEach(b => {
            if(b.items) b.items.forEach(it => diffCats.add(it.name));
        });
        
        taskFilterCat.innerHTML = `<option value="ALLA" ${currentFilterVal==='ALLA'?'selected':''}>${window.t('cat_alla')}</option>`;
        Array.from(diffCats).sort().forEach(c => {
            const displayName = window.t('cat_' + c.toLowerCase()) !== ('cat_' + c.toLowerCase()) ? window.t('cat_' + c.toLowerCase()) : c;
            taskFilterCat.innerHTML += `<option value="${c}" ${currentFilterVal===c?'selected':''}>${displayName}</option>`;
        });

        taskListFull.innerHTML = '';
        const fCat = taskFilterCat.value;
        const statusColors = { pending: '#CBD5E1', ongoing: 'var(--warning-color)', done: 'var(--success-color)' };
        const statusText = { pending: window.t('stat_pending'), ongoing: window.t('stat_ongoing'), done: window.t('stat_done') };
        
        const filteredTasks = (fCat && fCat !== 'ALLA') ? tasks.filter(t => t.cat === fCat) : tasks;
        
        if (filteredTasks.length === 0) {
            taskListFull.innerHTML = `<p style="font-size:12px;color:var(--text-muted);text-align:center;padding:20px;">${window.t('empty_tasks')}</p>`;
        } else {
            // Sort by start date
            filteredTasks.sort((a,b) => new Date(a.start) - new Date(b.start));
            
            filteredTasks.forEach(t => {
                taskListFull.innerHTML += `
                    <div style="background:#fff; border:1px solid #E2E8F0; border-radius:8px; padding:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <div style="font-size:11px; color:var(--text-muted); font-weight:600; margin-bottom:2px;">${t.room === 'ALLA' || t.room === 'Övergripande (Hela bygget)' ? window.t('cat_alla') : t.room} &bull; <span style="color:${statusColors[t.status]};">${statusText[t.status]}</span></div>
                            <div style="font-size:15px; font-weight:700; color:var(--text-primary); margin-bottom:4px;">
                                ${window.t('cat_' + t.cat.toLowerCase()) !== ('cat_' + t.cat.toLowerCase()) ? window.t('cat_' + t.cat.toLowerCase()) : t.cat}
                            </div>
                            <div style="font-size:11px; color:var(--text-muted);"><i class="ph ph-calendar"></i> ${t.start} <i class="ph ph-arrow-right"></i> ${t.end}</div>
                        </div>
                        <div>
                            <button class="btn-icon" style="color:var(--text-muted);margin-right:8px;background:none;border:none;cursor:pointer;padding:4px;" onclick="editTask('${t.id}')"><i class="ph ph-pencil-simple" style="font-size:20px;"></i></button>
                            <button class="btn-icon" style="color:#ef4444;background:none;border:none;cursor:pointer;padding:4px;" onclick="deleteTask('${t.id}')"><i class="ph ph-trash" style="font-size:20px;"></i></button>
                        </div>
                    </div>
                `;
            });
        }

        // ===== DASHBOARD AGENDA =====
        const dashAgendaList = document.getElementById('dash-agenda-list');
        if (dashAgendaList) {
            let agendaHtml = '';
            const todayStr = new Date().toISOString().split('T')[0];
            
            let ongoingTasks = tasks.filter(t => t.status === 'ongoing' || (t.start <= todayStr && t.end >= todayStr && t.status !== 'done'));
            let upcomingTasks = tasks.filter(t => t.start > todayStr && t.status !== 'done' && !ongoingTasks.includes(t));
            
            upcomingTasks.sort((a,b) => new Date(a.start) - new Date(b.start));
            upcomingTasks = upcomingTasks.slice(0, 2);

            if(ongoingTasks.length === 0 && upcomingTasks.length === 0) {
                agendaHtml = `<p style="font-size:12px;color:var(--text-muted);text-align:center;margin:0;padding:8px 0;">${window.t('agenda_empty')}</p>`;
            } else {
                ongoingTasks.forEach(t => {
                    agendaHtml += `
                        <div style="display:flex;align-items:center;padding:12px 0;border-bottom:1px solid #E2E8F0;">
                            <div style="width:8px;height:8px;border-radius:50%;background:var(--warning-color);margin-right:12px;box-shadow:0 0 0 2px rgba(251, 191, 36, 0.2);"></div>
                            <div style="flex:1;">
                                <div style="font-weight:600;font-size:13px;color:var(--text-primary);">${t.room === 'ALLA' || t.room === 'Övergripande (Hela bygget)' ? window.t('cat_alla') : t.room} &bull; ${window.t('cat_' + t.cat.toLowerCase()) !== ('cat_' + t.cat.toLowerCase()) ? window.t('cat_' + t.cat.toLowerCase()) : t.cat}</div>
                                <div style="font-size:11px;color:var(--text-muted);">${window.t('agenda_ongoing')} ${t.end}</div>
                            </div>
                        </div>
                    `;
                });
                upcomingTasks.forEach(t => {
                    agendaHtml += `
                        <div style="display:flex;align-items:center;padding:12px 0;border-bottom:1px solid #E2E8F0;">
                            <div style="width:8px;height:8px;border-radius:50%;background:#CBD5E1;margin-right:12px;"></div>
                            <div style="flex:1;">
                                <div style="font-weight:600;font-size:13px;color:var(--text-primary);">${t.room === 'ALLA' || t.room === 'Övergripande (Hela bygget)' ? window.t('cat_alla') : t.room} &bull; ${window.t('cat_' + t.cat.toLowerCase()) !== ('cat_' + t.cat.toLowerCase()) ? window.t('cat_' + t.cat.toLowerCase()) : t.cat}</div>
                                <div style="font-size:11px;color:var(--text-muted);">${window.t('agenda_starts')} ${t.start}</div>
                            </div>
                        </div>
                    `;
                });
            }
            dashAgendaList.innerHTML = agendaHtml;
        }
    };

    // INIT MIGRATION
    if (localStorage.getItem('rooms') && !localStorage.getItem('migratedToProjects')) {
        const legacyId = 'proj_legacy_' + Date.now();
        projects.push({ id: legacyId, name: 'Tidigare Projekt (Migrerat)', date: new Date().toLocaleDateString('sv-SE') });
        
        localStorage.setItem(legacyId + '_rooms', localStorage.getItem('rooms'));
        localStorage.setItem(legacyId + '_expenses', localStorage.getItem('expenses') || '[]');
        localStorage.setItem(legacyId + '_roomBudgets', localStorage.getItem('roomBudgets') || '{}');
        localStorage.setItem(legacyId + '_receipts', localStorage.getItem('receipts') || '[]');
        localStorage.setItem(legacyId + '_tasks', localStorage.getItem('tasks') || '[]');
        
        localStorage.removeItem('rooms');
        localStorage.removeItem('expenses');
        localStorage.removeItem('roomBudgets');
        localStorage.removeItem('receipts');
        localStorage.removeItem('tasks');
        localStorage.setItem('migratedToProjects', 'true');
        saveState();
    }

    renderAll();
});
