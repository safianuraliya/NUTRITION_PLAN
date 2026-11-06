function showMessage(id, text, type) {
  const box = document.getElementById(id);
  box.textContent = text;
  box.className = 'msg ' + type;
}

// Get a saved list from Local Storage 
function getList(key) {
  const data = localStorage.getItem(key);
  if (data === null) {
    return [];
  }
  return JSON.parse(data);        
}

// Save a list into Local Storage
function saveList(key, list) {
  localStorage.setItem(key, JSON.stringify(list)); 
}
//DIARY
let editId = null;     // null = adding a new record, a number = editing that record

// READ- show all records 
function showDiary() {
  const records = getList('nutri_records');         // read from Local Storage
  const tableBody = document.getElementById('rows');
  tableBody.innerHTML = '';
  let totalKcal = 0;

  if (records.length === 0) {
    showMessage('listMsg', 'No records yet. Add one above or from the Food Search page.', 'info');
  } else {
    showMessage('listMsg', '', 'ok');
  }

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    totalKcal += r.kcal;

    // one table row: Food | Meal | Servings | Calories
    const row = document.createElement('tr');
    row.innerHTML = '<td>' + r.name + '</td><td>' + r.meal + '</td><td>' + r.servings + '</td><td>' + r.kcal + '</td>';

    // Actions colum-edit and delete buttons
    const cell = document.createElement('td');

    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.onclick = function () { startEdit(r.id); };

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.className = 'danger';
    deleteButton.onclick = function () { deleteRecord(r.id); };

    cell.appendChild(editButton);
    cell.appendChild(deleteButton);
    row.appendChild(cell);
    tableBody.appendChild(row);
  }

  // Calculation-percent of daily goal and calories 
  const goal = Number(localStorage.getItem('nutri_goal')) || 2000;
  document.getElementById('goal').value = goal;
  let percent = Math.round(totalKcal / goal * 100);
  const remaining = goal - totalKcal;
  let status = '';
  if (remaining < 0) {
    status = 'Over your goal by ' + Math.abs(remaining) + ' kcal.';
  } else {
    status = remaining + ' kcal remaining.';
  }
  if (percent > 100) { percent = 100; }

  document.getElementById('summary').innerHTML =
    '<p><b>Total:</b> ' + Math.round(totalKcal) + ' kcal of ' + goal + ' kcal goal</p>' +
    '<div class="bar"><div style="width:' + percent + '%"></div></div><p>' + status + '</p>';
}

// CREATE & UPDATE
function saveRecord() {
  const name = document.getElementById('name').value.trim();
  const meal = document.getElementById('meal').value;
  const servings = Number(document.getElementById('servings').value);
  const kcalText = document.getElementById('kcal').value;
  const kcal = Number(kcalText);

  // Input validation
  if (name.length < 2) {
    showMessage('formMsg', 'Food name must be at least 2 characters.', 'err');
    return;
  }
  if (isNaN(servings) || servings < 0.5 || servings > 20) {
    showMessage('formMsg', 'Servings must be between 0.5 and 20.', 'err');
    return;
  }
  if (kcalText === '' || isNaN(kcal) || kcal < 0 || kcal > 5000) {
    showMessage('formMsg', 'Calories must be between 0 and 5000.', 'err');
    return;
  }

  const records = getList('nutri_records');

  if (editId === null) {
    // CREATE a new record
    records.push({ id: Date.now(), name: name, meal: meal, servings: servings, kcal: kcal });
    showMessage('formMsg', 'Record added.', 'ok');
  } else {
    // UPDATE an record
    for (let i = 0; i < records.length; i++) {
      if (records[i].id === editId) {
        records[i].name = name;
        records[i].meal = meal;
        records[i].servings = servings;
        records[i].kcal = kcal;
      }
    }
    showMessage('formMsg', 'Record updated.', 'ok');
  }

  saveList('nutri_records', records);     // save 
  clearForm();
  showDiary();
}

// Put an existing record into the form, user can edit it
function startEdit(id) {
  const records = getList('nutri_records');
  for (let i = 0; i < records.length; i++) {
    if (records[i].id === id) {
      document.getElementById('name').value = records[i].name;
      document.getElementById('meal').value = records[i].meal;
      document.getElementById('servings').value = records[i].servings;
      document.getElementById('kcal').value = records[i].kcal;
      editId = id;
      document.getElementById('formTitle').textContent = 'Edit record';
      window.scrollTo(0, 0);
    }
  }
}

// DELETE 
function deleteRecord(id) {
  if (confirm('Delete this record?') === false) {
    return;
  }
  const records = getList('nutri_records');
  const kept = [];
  for (let i = 0; i < records.length; i++) {
    if (records[i].id !== id) {      // keep everything except the deleted one
      kept.push(records[i]);
    }
  }
  saveList('nutri_records', kept);
  showMessage('formMsg', 'Record deleted.', 'ok');
  showDiary();
}

// Empty the form and go back to add 
function clearForm() {
  editId = null;
  document.getElementById('formTitle').textContent = 'Add food intake record';
  document.getElementById('name').value = '';
  document.getElementById('servings').value = '';
  document.getElementById('kcal').value = '';
}

// Connect buttons to functions 
document.getElementById('saveBtn').addEventListener('click', saveRecord);
document.getElementById('clearBtn').addEventListener('click', clearForm);
document.getElementById('goalBtn').addEventListener('click', function () {
  const goal = Number(document.getElementById('goal').value);
  if (isNaN(goal) || goal < 500 || goal > 10000) {
    showMessage('formMsg', 'Goal must be between 500 and 10000 kcal.', 'err');
    return;
  }
  localStorage.setItem('nutri_goal', goal);
  showMessage('formMsg', 'Goal updated.', 'ok');
  showDiary();
});

showDiary();       // show the records when the page opens