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
    const budgetInputs = {
        roomId: document.getElementById('b-room-id'),
        floor: document.getElementById('b-floor-price'),
        wall: document.getElementById('b-wall-price'),
        ceil: document.getElementById('b-ceil-price'),
        pipes: document.getElementById('b-pipes'),
        vent: document.getElementById('b-vent'),
        elec: document.getElementById('b-elec'),
        fit: document.getElementById('b-fit'),
        mat: document.getElementById('b-mat'),
        paint: document.getElementById('b-paint'),
        trim: document.getElementById('b-trim'),
        door: document.getElementById('b-door'),
        ext: document.getElementById('b-ext'),
        unexp: document.getElementById('b-unexp')
    };
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
    const taskCat = document.getElementById('task-cat');
    const taskStart = document.getElementById('task-start');
    const taskEnd = document.getElementById('task-end');
    const taskStatus = document.getElementById('task-status');
    const taskFilterCat = document.getElementById('task-filter-cat');
    const taskListFull = document.getElementById('task-list-full');

    // Timeline Gantt
    const btnGanttPrev = document.getElementById('btn-gantt-prev');
    const btnGanttNext = document.getElementById('btn-gantt-next');
    const ganttMonthLabel = document.getElementById('gantt-month-label');
    const ganttContainer = document.getElementById('gantt-container');
    
    let ganttOffsetWeeks = 0;

    const categories = ['Golv', 'Väggar', 'Tak', 'Rör/Vent', 'El', 'Fastinredning', 'Byggmaterial', 'Färg/Spackel', 'Lister/Foder', 'Fönster/Dörrar', 'Arbetskostnader', 'Buffert', 'Rivning', 'Bygg'];

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
        if(!confirm('Är du säker på att du vill radera projektet och all dess lagrade data?')) return;
        localStorage.removeItem(pid + '_expenses');
        localStorage.removeItem(pid + '_receipts');
        localStorage.removeItem(pid + '_rooms');
        localStorage.removeItem(pid + '_roomBudgets');
        localStorage.removeItem(pid + '_tasks');
        projects = projects.filter(p => p.id !== pid);
        saveState();
    };

    btnNewProject.addEventListener('click', () => {
        const pname = prompt('Ange namn på projektet:');
        if(!pname) return;
        const newProj = { id: 'proj_' + Date.now(), name: pname, date: new Date().toLocaleDateString('sv-SE') };
        projects.push(newProj);
        openProject(newProj.id);
    });

    btnSwitchProject.addEventListener('click', () => {
        activateView('view-projects', 'Mina Projekt');
        renderAll();
    });

    currencySelect.addEventListener('change', (e) => { currentCurrency = e.target.value; saveState(); });
    navButtons.forEach(btn => btn.addEventListener('click', () => activateView(btn.getAttribute('data-target'), btn.getAttribute('data-title'))));

    // RUMS-MÅTT
    btnAddRoom.addEventListener('click', () => {
        document.querySelectorAll('#form-room input:not([type="hidden"]), #form-room select').forEach(el => el.value = '');
        editRoomId.value = '';
        btnDeleteRoom.style.display = 'none';
        formRoomTitle.innerText = "Definiera Rum";
        formRoom.style.display = formRoom.style.display === 'none' ? 'block' : 'none';
    });

    document.getElementById('btn-save-room').addEventListener('click', () => {
        const floor = document.getElementById('room-floor').value;
        const type = document.getElementById('room-type').value;
        if(!floor || !type) return alert('Vänligen välj Våning och Rum.');

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
        formRoomTitle.innerText = "Redigera " + rm.name;
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
        if(!confirm('Radera detta rum och dess budgetkalkyler?')) return;
        const id = editRoomId.value;
        rooms = rooms.filter(r => r.id !== id);
        delete roomBudgets[id]; 
        formRoom.style.display = 'none';
        editRoomId.value = '';
        saveState();
    });

    // BUDGET LOGIC
    btnCancelRoomBudget.addEventListener('click', () => formBudget.style.display = 'none');
    
    window.openBudgetForm = (roomId) => {
        const rm = rooms.find(r => r.id === roomId);
        if(!rm) return;
        budgetRoomTitle.innerText = "Budget: " + rm.name;
        budgetInputs.roomId.value = roomId;
        const b = roomBudgets[roomId] || {};
        Object.keys(budgetInputs).forEach(k => { if(k!=='roomId') budgetInputs[k].value = b[k] || ''; });
        formBudget.style.display = 'block';
        window.scrollTo(0, document.getElementById('view-budget').offsetTop);
    };

    btnSaveRoomBudget.addEventListener('click', () => {
        const roomId = budgetInputs.roomId.value;
        const rm = rooms.find(r => r.id === roomId);
        if(!roomId || !rm) return;

        let obj = {};
        let sumFixed = 0;
        Object.keys(budgetInputs).forEach(k => { 
            if(k!=='roomId') {
                const v = parseFloat(budgetInputs[k].value) || 0;
                obj[k] = v;
                if(!['floor','wall','ceil'].includes(k)) sumFixed += v;
            }
        });

        obj.totalCalculated = (obj.floor * parseFloat(rm.areas.floor)) + (obj.wall * parseFloat(rm.areas.wall)) + (obj.ceil * parseFloat(rm.areas.ceiling)) + sumFixed;
        roomBudgets[roomId] = obj;
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
        let rOpts = '<option value="" disabled selected>Välj Rum...</option>';
        rOpts += `<option value="Övergripande (Hela bygget)">Övergripande (Hela bygget)</option>`;
        const floorOrder = { 'Källare': 1, 'Våning 1': 2, 'Våning 2': 3, 'Våning 3': 4, 'Utsida/Tomt': 5 };
        const sortedRooms = [...rooms].sort((a,b) => (floorOrder[a.floor] || 99) - (floorOrder[b.floor] || 99));
        sortedRooms.forEach(r => rOpts += `<option value="${r.name}">${r.name}</option>`);

        let cOpts = '<option value="" disabled selected>Välj Kategori...</option>';
        categories.forEach(c => cOpts += `<option value="${c}">${c}</option>`);

        const html = `
            <div id="${id}" style="background:#F8FAFC;padding:12px;border-radius:8px;border:1px solid var(--border-color);margin-bottom:8px;position:relative;">
                <button type="button" onclick="document.getElementById('${id}').remove(); calcReceiptTotal();" style="position:absolute;top:10px;right:10px;color:var(--danger-color);background:none;border:none;cursor:pointer;"><i class="ph ph-trash" style="font-size:18px;"></i></button>
                <input type="number" class="input-field receipt-line-calc" placeholder="Belopp" style="margin-bottom:8px;font-weight:bold;width:80%;" oninput="calcReceiptTotal()">
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
            document.getElementById('form-receipt-title').innerText = "Ny Utgift";
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
        if(!receiptStore.value) return alert('Du måste ange affär och totalsumma!');
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
        
        if(items.length === 0) return alert('Du måste ha minst en ifylld rad.');
        if(!valid) return alert('Alla rader måste ha ett giltigt belopp, ett valt rum och en kategori.');

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
        if(!confirm('Är du säker på att du vill ta bort denna utgift? Summan dras bort från kalkylen.')) return;
        expenses = expenses.filter(e => e.id !== eid);
        saveState();
    };

    window.editExpense = (eid) => {
        const exp = expenses.find(e => e.id === eid);
        if(!exp) return;

        document.getElementById('edit-receipt-id').value = exp.id;
        document.getElementById('form-receipt-title').innerText = "Redigera Utgift";
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
                let rOpts = '<option value="" disabled>Välj Rum...</option>';
                rOpts += `<option value="Övergripande (Hela bygget)" ${it.room === "Övergripande (Hela bygget)" ? 'selected' : ''}>Övergripande (Hela bygget)</option>`;
                const floorOrder = { 'Källare': 1, 'Våning 1': 2, 'Våning 2': 3, 'Våning 3': 4, 'Utsida/Tomt': 5 };
                const sortedRooms = [...rooms].sort((a,b) => (floorOrder[a.floor] || 99) - (floorOrder[b.floor] || 99));
                sortedRooms.forEach(r => rOpts += `<option value="${r.name}" ${it.room === r.name ? 'selected' : ''}>${r.name}</option>`);

                let cOpts = '<option value="" disabled>Välj Kategori...</option>';
                categories.forEach(c => cOpts += `<option value="${c}" ${it.cat === c ? 'selected' : ''}>${c}</option>`);

                const html = `
                    <div id="${id}" style="background:#F8FAFC;padding:12px;border-radius:8px;border:1px solid var(--border-color);margin-bottom:8px;position:relative;">
                        <button type="button" onclick="document.getElementById('${id}').remove(); calcReceiptTotal();" style="position:absolute;top:10px;right:10px;color:var(--danger-color);background:none;border:none;cursor:pointer;"><i class="ph ph-trash" style="font-size:18px;"></i></button>
                        <input type="number" class="input-field receipt-line-calc" placeholder="Belopp" style="margin-bottom:8px;font-weight:bold;width:80%;" value="${it.amount}" oninput="calcReceiptTotal()">
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

    btnAddTask.addEventListener('click', () => {
        formTask.style.display = formTask.style.display === 'none' ? 'block' : 'none';
        document.getElementById('form-task-title').innerText = "Schemalägg Skede";
        
        // Populate room dropdown seamlessly
        const floorOrder = { 'Källare': 1, 'Våning 1': 2, 'Våning 2': 3, 'Våning 3': 4, 'Utsida/Tomt': 5 };
        const sortedRooms = [...rooms].sort((a,b) => (floorOrder[a.floor] || 99) - (floorOrder[b.floor] || 99));
        let rOpts = '<option value="" disabled selected>Välj Rum...</option>';
        rOpts += `<option value="ALLA">Övergripande / Alla Rum</option>`;
        sortedRooms.forEach(r => rOpts += `<option value="${r.name}">${r.name}</option>`);
        taskRoom.innerHTML = rOpts;

        taskRoom.value = '';
        taskCat.value = '';
        taskStart.value = '';
        taskEnd.value = '';
        taskStatus.value = 'pending';
    });

    btnCancelTask.addEventListener('click', () => formTask.style.display = 'none');

    btnSaveTask.addEventListener('click', () => {
        if(!taskRoom.value || !taskCat.value || !taskStart.value || !taskEnd.value) return alert('Du måste fylla i alla obligatoriska fält!');
        if(new Date(taskStart.value) > new Date(taskEnd.value)) return alert('Måldatum kan inte vara före startdatum.');

        const eid = document.getElementById('edit-task-id').value;
        if (eid) {
            const idx = tasks.findIndex(x => x.id === eid);
            if(idx !== -1) {
                tasks[idx].room = taskRoom.value;
                tasks[idx].cat = taskCat.value;
                tasks[idx].start = taskStart.value;
                tasks[idx].end = taskEnd.value;
                tasks[idx].status = taskStatus.value;
            }
        } else {
            tasks.push({
                id: 'tsk' + Date.now(),
                room: taskRoom.value,
                cat: taskCat.value,
                start: taskStart.value,
                end: taskEnd.value,
                status: taskStatus.value
            });
        }
        
        document.getElementById('edit-task-id').value = '';
        formTask.style.display = 'none';
        saveState();
    });

    taskFilterCat.addEventListener('change', () => renderAll());
    
    window.editTask = (tid) => {
        const t = tasks.find(x => x.id === tid);
        if(!t) return;
        document.getElementById('edit-task-id').value = tid;
        taskRoom.value = t.room;
        taskCat.value = t.cat;
        taskStart.value = t.start;
        taskEnd.value = t.end;
        taskStatus.value = t.status || 'pending';
        document.getElementById('form-task-title').innerText = "Redigera Skede";
        formTask.style.display = 'block';
        window.scrollTo(0, document.getElementById('view-timeline').offsetTop);
    };

    window.deleteTask = (tid) => {
        if(!confirm('Vill du ta bort detta skede från tidplanen?')) return;
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
        let headerRow = `<div style="background:#F8FAFC; border-right:1px solid #E2E8F0; border-bottom:1px solid #E2E8F0; padding:8px; font-size:11px; font-weight:600; color:var(--text-muted); position:sticky; left:0; z-index:2;">Rum / Skede</div>`;
        const todayWk = getWeekNumber(new Date());

        let ptrD = new Date(minDate);
        for(let w=0; w<totalWks; w++) {
            const wkNum = getWeekNumber(ptrD);
            const isCurrentWk = (wkNum === todayWk && new Date().getFullYear() === ptrD.getFullYear());
            const bg = isCurrentWk ? 'var(--primary-color)' : '#F8FAFC';
            const color = isCurrentWk ? '#fff' : 'var(--text-primary)';
            
            headerRow += `<div style="background:${bg}; color:${color}; font-size:10px; font-weight:700; text-align:center; padding:8px 0; border-right:1px solid #E2E8F0; border-bottom:1px solid #E2E8F0; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                <span style="font-size:8px;font-weight:400;margin-bottom:2px;opacity:0.8;">${ptrD.toLocaleString('sv-SE', {month:'short'})}</span>
                v${wkNum}
            </div>`;
            ptrD.setDate(ptrD.getDate() + 7);
        }
        html += headerRow;

        // Group Tasks into Flat Y-Axis
        let rowsMap = {};
        tasks.forEach(t => {
            const roomName = t.room === 'ALLA' ? 'Alla Rum' : t.room;
            const rowKey = `<strong style="color:var(--text-primary);">${roomName}</strong><br><span style="color:var(--primary-color);">${t.cat}</span>`;
            
            // Unique ID to merge identical room+cat combos to one line visually
            const logicKey = t.room + '_' + t.cat;
            if (!rowsMap[logicKey]) rowsMap[logicKey] = { label: rowKey, records: [] };
            rowsMap[logicKey].records.push(t);
        });

        const statusColors = { pending: '#CBD5E1', ongoing: 'var(--warning-color)', done: 'var(--success-color)' };
        let activeBg = false;

        const flatRows = Object.keys(rowsMap).sort(); // Sort by alphabet/floor organically

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

        if(flatRows.length === 0) {
            html += `<div style="grid-column: 1 / -1; padding:20px; font-size:12px; color:var(--text-muted); text-align:center;">Inga skeden inlagda än. Gå till Kalender-data för att lägga till.</div>`;
        }

        html += `</div>`; // End Grid
        ganttContainer.innerHTML = html;
        ganttMonthLabel.innerText = "Projektkalender";
    };


    // ---- RENDER LOGIC ----
    window.toggleSummaryDetails = (el) => {
        const tgt = el.nextElementSibling;
        if(tgt && tgt.style.display === 'none') tgt.style.display = 'block';
        else if(tgt) tgt.style.display = 'none';
    };

    const renderAll = () => {
        if (!currentProjectId) {
            projectList.innerHTML = projects.length === 0 ? '<p style="color:var(--text-muted);font-size:14px;">Inga projekt skapade. Skapa ditt första projekt ovan!</p>' : '';
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
        let grandBreakdown = { Golv:0, Väggar:0, Tak:0, Rör:0, Ventilation:0, El:0, Fastinredning:0, Byggmaterial:0, 'Färg/Spackel':0, 'Lister/Foder':0, 'Fönster/Dörrar':0, Arbetskostnader:0, Buffert:0 };
        let floorBreakdowns = {};
        
        rooms.forEach(rm => {
            const b = roomBudgets[rm.id];
            if (!b) return;
            const sum = b.totalCalculated || 0;
            grandBudget += sum;
            floorTotals[rm.floor] = (floorTotals[rm.floor] || 0) + sum;
            
            if(!floorBreakdowns[rm.floor]) floorBreakdowns[rm.floor] = { Golv:0, Väggar:0, Tak:0, Rör:0, Ventilation:0, El:0, Fastinredning:0, Byggmaterial:0, 'Färg/Spackel':0, 'Lister/Foder':0, 'Fönster/Dörrar':0, Arbetskostnader:0, Buffert:0 };
            let fb = floorBreakdowns[rm.floor];

            const sumFloor = b.floorPrice * rm.areas.floor;
            const sumWall = b.wallPrice * rm.areas.wall;
            const sumCeil = b.ceilPrice * rm.areas.ceiling;
            
            grandBreakdown.Golv += sumFloor; fb.Golv += sumFloor;
            grandBreakdown.Väggar += sumWall; fb.Väggar += sumWall;
            grandBreakdown.Tak += sumCeil; fb.Tak += sumCeil;
            grandBreakdown.Rör += b.pipes; fb.Rör += b.pipes;
            grandBreakdown.Ventilation += b.vent; fb.Ventilation += b.vent;
            grandBreakdown.El += b.elec; fb.El += b.elec;
            grandBreakdown.Fastinredning += b.fit; fb.Fastinredning += b.fit;
            grandBreakdown.Byggmaterial += b.mat; fb.Byggmaterial += b.mat;
            grandBreakdown['Färg/Spackel'] += b.paint; fb['Färg/Spackel'] += b.paint;
            grandBreakdown['Lister/Foder'] += b.trim; fb['Lister/Foder'] += b.trim;
            grandBreakdown['Fönster/Dörrar'] += b.door; fb['Fönster/Dörrar'] += b.door;
            grandBreakdown.Arbetskostnader += b.ext; fb.Arbetskostnader += b.ext;
            grandBreakdown.Buffert += b.unexp; fb.Buffert += b.unexp;
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
                    <h3 style="font-size:13px;color:var(--text-muted);margin-bottom:4px;font-weight:600;text-transform:uppercase;">Kalkyl: Totalkostnad</h3>
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

        budgetList.innerHTML = rooms.length === 0 ? '<p style="color:var(--text-muted);font-size:14px;">För att skapa en budget måste du först definiera dina rum under fliken "Mått".</p>' : '';
        rooms.forEach(rm => {
            const b = roomBudgets[rm.id];
            const sum = b ? b.totalCalculated.toLocaleString('sv-SE') : '0';
            const isSet = b ? 'var(--success-color)' : 'var(--text-muted)';
            budgetList.innerHTML += `
                <div class="card" style="margin-bottom:12px; padding:16px; cursor:pointer;" onclick="openBudgetForm('${rm.id}')">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <h4 style="font-size:16px;font-weight:600;">${rm.name}</h4>
                            <p style="font-size:12px;color:var(--text-muted);margin-top:2px;">Klicka för att sätta m²-pris m.m.</p>
                        </div>
                        <div style="text-align:right;">
                            <span style="display:block;font-size:10px;color:${isSet};text-transform:uppercase;font-weight:700;">Totalt</span>
                            <span style="font-size:16px;font-weight:700;color:var(--primary-color);">${sum} ${currentCurrency}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        roomList.innerHTML = rooms.length === 0 ? '<p style="color:var(--text-muted);font-size:14px;">Inga rumsdimensioner inlagda än.</p>' : '';
        rooms.forEach(rm => {
            roomList.innerHTML += `
                <div class="card" style="margin-bottom:12px; padding:16px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border-color);padding-bottom:8px;margin-bottom:8px;">
                        <div>
                            <h4 style="font-size:16px;font-weight:600;color:var(--primary-color);">${rm.type}</h4>
                            <span style="font-size:12px;color:var(--text-muted);font-weight:500;">${rm.floor}</span>
                        </div>
                        <button style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:4px;" onclick="editRoomDetails('${rm.id}')">
                            <i class="ph ph-pencil-simple" style="font-size:20px;"></i>
                        </button>
                    </div>
                    <div class="room-area">
                        <div><span>Golv</span><strong>${rm.areas.floor} m²</strong></div>
                        <div><span>Väggar</span><strong>${rm.areas.wall} m²</strong></div>
                        <div><span>Tak</span><strong>${rm.areas.ceiling} m²</strong></div>
                    </div>
                </div>
            `;
        });

        receiptList.innerHTML = expenses.length === 0 ? '<p style="color:var(--text-muted);font-size:14px;">Inga utgifter sparade än.</p>' : '';
        const revExp = [...expenses].reverse();
        revExp.forEach(rec => {
            let rowsHtml = '';
            if(rec.items) {
                rowsHtml = `<div style="margin-top:6px; display:none;">`;
                rec.items.forEach(it => {
                    rowsHtml += `<div style="font-size:11px;color:var(--text-muted);display:flex;justify-content:space-between;border-bottom:1px solid #E2E8F0;padding:4px 0;">
                        <span><strong style="color:var(--text-primary);">${it.cat}</strong> i ${it.room}</span>
                        <strong style="color:var(--primary-color);">${it.amount.toLocaleString('sv-SE')} ${currentCurrency}</strong>
                    </div>`;
                });
                rowsHtml += `</div>`;
            } else if(rec.rooms && rec.cats) {
                const tags = [...rec.rooms, ...rec.cats].map(t => `<span style="background:#E2E8F0;color:#0F172A;font-size:10px;padding:2px 6px;border-radius:4px;margin-right:4px;">${t}</span>`).join('');
                rowsHtml = `<div style="margin-top:4px; display:none;">${tags}</div>`;
            }

            const imgHTML = rec.image ? `<img src="${rec.image}" style="width:48px;height:48px;border-radius:8px;object-fit:cover;margin-right:12px;">` : `<div style="width:48px;height:48px;background:#F1F5F9;border-radius:8px;margin-right:12px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);"><i class="ph ph-receipt" style="font-size:24px;"></i></div>`;
            
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
        let catSpent = { Golv:0, Väggar:0, Tak:0, Rör:0, Ventilation:0, El:0, Fastinredning:0, Byggmaterial:0, 'Färg/Spackel':0, 'Lister/Foder':0, 'Fönster/Dörrar':0, Arbetskostnader:0, Buffert:0 };
        expenses.forEach(exp => {
            if(exp.items) {
                exp.items.forEach(it => {
                    if(catSpent[it.cat] !== undefined) catSpent[it.cat] += it.amount;
                });
            } else if (exp.cats) {
                const amtPerCat = exp.amount / (exp.cats.length || 1);
                exp.cats.forEach(c => {
                    if(catSpent[c] !== undefined) catSpent[c] += amtPerCat;
                });
            }
        });

        const varDiv = document.getElementById('dash-category-variance');
        if(varDiv) {
            let varHtml = '';
            categories.forEach(c => {
                const b = grandBreakdown[c] || 0;
                const s = catSpent[c] || 0;
                if(b === 0 && s === 0) return;
                const diff = b - s;
                const color = diff >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
                const sign = diff >= 0 ? '+' : '';
                varHtml += `
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #E2E8F0; padding:8px 0;">
                        <div style="flex:1;">
                            <div style="font-size:13px; font-weight:600; color:var(--text-primary);">${c}</div>
                            <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Budget: ${b.toLocaleString('sv-SE')} | Utfall: ${s.toLocaleString('sv-SE')}</div>
                        </div>
                        <div style="font-weight:700; font-size:15px; color:${color}; text-align:right;">
                            ${sign}${diff.toLocaleString('sv-SE')} ${currentCurrency}
                        </div>
                    </div>
                `;
            });
            if(!varHtml) varHtml = '<p style="font-size:12px;color:var(--text-muted);">Skapa rumsbudget eller lägg in utgifter för att se kalkyljämförelsen.</p>';
            varDiv.innerHTML = varHtml;
        }

        // ===== TIMELINE DATA LIST =====
        taskListFull.innerHTML = '';
        const fCat = taskFilterCat.value;
        const statusColors = { pending: '#CBD5E1', ongoing: 'var(--warning-color)', done: 'var(--success-color)' };
        const statusText = { pending: 'Ej påbörjad', ongoing: 'Pågår', done: 'Klar' };
        
        let filteredTasks = [...tasks];
        if(fCat !== 'ALLA') filteredTasks = filteredTasks.filter(t => t.cat === fCat);
        
        if (filteredTasks.length === 0) {
            taskListFull.innerHTML = `<p style="font-size:12px;color:var(--text-muted);text-align:center;padding:20px;">Inga skeden i listan.</p>`;
        } else {
            // Sort by start date
            filteredTasks.sort((a,b) => new Date(a.start) - new Date(b.start));
            
            filteredTasks.forEach(t => {
                taskListFull.innerHTML += `
                    <div style="background:#fff; border:1px solid #E2E8F0; border-radius:8px; padding:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <div style="font-size:11px; color:var(--text-muted); font-weight:600; margin-bottom:2px;">${t.room} &bull; <span style="color:${statusColors[t.status]};">${statusText[t.status]}</span></div>
                            <div style="font-size:15px; font-weight:700; color:var(--text-primary); margin-bottom:4px;">${t.cat}</div>
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
                agendaHtml = '<p style="font-size:12px;color:var(--text-muted);text-align:center;margin:0;padding:8px 0;">Inget planerat i närtid.</p>';
            } else {
                ongoingTasks.forEach(t => {
                    agendaHtml += `
                        <div style="display:flex;align-items:center;padding:12px 0;border-bottom:1px solid #E2E8F0;">
                            <div style="width:8px;height:8px;border-radius:50%;background:var(--warning-color);margin-right:12px;box-shadow:0 0 0 2px rgba(251, 191, 36, 0.2);"></div>
                            <div style="flex:1;">
                                <div style="font-weight:600;font-size:13px;color:var(--text-primary);">${t.room} &bull; ${t.cat}</div>
                                <div style="font-size:11px;color:var(--text-muted);">Pågår t.o.m ${t.end}</div>
                            </div>
                        </div>
                    `;
                });
                upcomingTasks.forEach(t => {
                    agendaHtml += `
                        <div style="display:flex;align-items:center;padding:12px 0;border-bottom:1px solid #E2E8F0;">
                            <div style="width:8px;height:8px;border-radius:50%;background:#CBD5E1;margin-right:12px;"></div>
                            <div style="flex:1;">
                                <div style="font-weight:600;font-size:13px;color:var(--text-primary);">${t.room} &bull; ${t.cat}</div>
                                <div style="font-size:11px;color:var(--text-muted);">Startar ${t.start}</div>
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
