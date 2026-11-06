// API: MyPlate.food (free, no key)  https://myplate.food/api/v1/
const API = 'https://myplate.food/api/v1/';
function showMessage(id, text, type) {
  const box = document.getElementById(id);
  box.textContent = text;
  box.className = 'msg ' + type;
}

// Get a saved list from local storage
function getList(key) {
  const data = localStorage.getItem(key);
  if (data === null) {
    return [];
  }
  return JSON.parse(data);      
}

// Save a list 
function saveList(key, list) {
  localStorage.setItem(key, JSON.stringify(list));  
}

// Save one suggestion
function saveSuggestion(name, diet, reason) {
  const list = getList('nutri_suggestions');
  for (let i = 0; i < list.length; i++) {
    if (list[i].name === name && list[i].diet === diet) {
      return;
    }
  }
  list.push({ name: name, diet: diet, reason: reason });
  saveList('nutri_suggestions', list);
}

// round to 1 decimal place
function round1(number) {
  return Math.round(number * 10) / 10;
}

// Throws an error with a clear message if something is wrong.
async function callAPI(path) {
  let response;
  try {
    response = await fetch(API + path);            
  } catch (error) {
    throw new Error('Cannot reach the server. Check your internet connection.');   
  }
  if (response.status === 429) {
    throw new Error('Too many requests. Please wait one minute and try again.');
  }
  const data = await response.json();             
  if (response.ok === false) {
    throw new Error(data.error || 'Request failed (' + response.status + ').');
  }
  return data;
}

// total calories already saved in the diary
function getEatenCalories() {
  const records = getList('nutri_records');
  let total = 0;
  for (let i = 0; i < records.length; i++) {
    total += records[i].kcal;
  }
  return total;
}

// daily calories (calculate/calorie-needs)
async function calculateNeeds() {
  const age = Number(document.getElementById('age').value);
  const sex = document.getElementById('sex').value;
  const activity = 'moderately-active';;
  const height = Number(document.getElementById('height').value);
  const weight = Number(document.getElementById('weight').value);

  // Input validation
  if (isNaN(age) || age < 18 || age > 120) {
    showMessage('calcMsg', 'Age must be between 18 and 120 (the API uses adult equations).', 'err');
    return;
  }
  if (isNaN(height) || height < 100 || height > 250) {
    showMessage('calcMsg', 'Height must be between 100 and 250 cm.', 'err');
    return;
  }
  if (isNaN(weight) || weight < 30 || weight > 300) {
    showMessage('calcMsg', 'Weight must be between 30 and 300 kg.', 'err');
    return;
  }

  showMessage('calcMsg', 'Calculating...', 'info');
  try {
    const path = 'calculate/calorie-needs?age=' + age + '&sex=' + sex + '&activity=' + activity +
                 '&height_cm=' + height + '&weight_kg=' + weight;
    const data = await callAPI(path);

    const goal = Math.round(data.tdee);               // daily calories from the API
    localStorage.setItem('nutri_goal', goal);         // save the goal for the diary
    const perMeal = Math.round(goal / 3);             // calculation: calories per meal

    let proteinText = 'n/a';
    if (data.protein_targets.range) {
      proteinText = data.protein_targets.range.minGrams + ' - ' + data.protein_targets.range.maxGrams + ' g';
    }
    const macros = data.macro_splits[0].grams;        // "balanced" split

    document.getElementById('calcOut').innerHTML =
      '<p><b>BMI:</b> ' + data.ideal_weight.current.bmi + '</p>' +
      '<p><b>BMR (calories at rest):</b> ' + data.bmr + ' kcal</p>' +
      '<p><b>Daily calories (TDEE):</b> ' + goal + ' kcal</p>' +
      '<p><b>About ' + perMeal + ' kcal per meal</b> (3 meals a day)</p>' +
      '<p><b>Protein target:</b> ' + proteinText + ' per day</p>' +
      '<p><b>Balanced macros:</b> protein ' + macros.protein + ' g | carbs ' + macros.carbs + ' g | fat ' + macros.fat + ' g</p>';
    showMessage('calcMsg', 'Done. Your daily goal of ' + goal + ' kcal was saved.', 'ok');
  } catch (error) {
    showMessage('calcMsg', error.message, 'err');
  }
}

// search foods (API endpoint: recipes)
let currentFood = null;      // the food whose nutrition is shown in the details box

async function searchFoods() {
  const query = document.getElementById('query').value.trim();
  const group = document.getElementById('foodGroup').value;

  // Input validation
  if (query === '' && group === '' && maxCal === '') {
    showMessage('status', 'Type a food name or choose a food group.', 'err');
    return;
  }
  if (query !== '' && query.length < 2) {
    showMessage('status', 'Food name must be at least 2 characters.', 'err');
    return;
  }

  // Build the web address with the options the user chose
  let path = 'recipes?limit=12';
  if (query !== '') { path += '&q=' + encodeURIComponent(query); }
  if (group !== '') { path += '&food_group=' + group; }

  showMessage('status', 'Searching...', 'info');
  document.getElementById('results').innerHTML = '';
  try {
    const data = await callAPI(path);
    if (data.results.length === 0) {                                  // empty result
      showMessage('status', 'No foods found. Try another name or group.', 'err');
      return;
    }
    showMessage('status', 'Showing ' + data.results.length + ' of ' + data.total + ' foods found.', 'ok');
    for (let i = 0; i < data.results.length; i++) {
      document.getElementById('results').appendChild(makeCard(data.results[i], ''));
    }
  } catch (error) {
    showMessage('status', error.message, 'err');
  }
}

// DOM manipulation: build one food card
function makeCard(r, reason) {
  const card = document.createElement('div');
  card.className = 'card';

  let rating = 'n/a';
  if (r.rating) { rating = r.rating.value; }

  let html = '';
  if (r.image_url) { html += '<img src="' + r.image_url + '" alt="">'; }
  html += '<h3>' + r.name + '</h3>' +
          '<small>' + r.category + ' | Rating ' + rating + '</small>' +
          '<p><b>' + r.calories + ' kcal</b> per serving</p>' +
          '<p>Food groups: ' + r.food_groups.join(', ') + '</p>';
  if (reason !== '') { html += '<p><b>Why: ' + reason + '</b></p>'; }
  card.innerHTML = html;

  const button = document.createElement('button');
  button.textContent = 'View nutrition';
  button.onclick = function () { showDetails(r.slug); };              // event handler
  card.appendChild(button);
  return card;
}

// nutrition details (recipes/{slug})
// Find one nutrient (example key: 'protein') in the nutrition list from the API
function getNutrient(list, key) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].key === key) {
      return list[i].amount;
    }
  }
  return 0;
}

async function showDetails(slug) {
  showMessage('detailMsg', 'Loading nutrition...', 'info');
  try {
    const r = await callAPI('recipes/' + slug);
    const n = r.nutrition;
    currentFood = {
      name: r.name,
      kcal: getNutrient(n, 'total_calories'),
      protein: getNutrient(n, 'protein'),
      carbs: getNutrient(n, 'carbohydrates'),
      fat: getNutrient(n, 'total_fat'),
      fiber: getNutrient(n, 'dietary_fiber'),
      sugar: getNutrient(n, 'total_sugars'),
      sodium: getNutrient(n, 'sodium')
    };

    let groups = '';
    for (let i = 0; i < r.food_groups.length; i++) {
      groups += r.food_groups[i].label + ' ' + r.food_groups[i].amount_text + '; ';
    }

    document.getElementById('detail').innerHTML =
      '<div class="detail-box">' +
      '<h3>' + r.name + '</h3>' +
      '<p>Serving size: ' + r.serving_size + ' | Yield: ' + r['yield'] + '</p>' +
      '<table><tr><th>Nutrition per 1 serving</th><th>Amount</th></tr>' +
      '<tr><td>Calories</td><td>' + round1(currentFood.kcal) + ' kcal</td></tr>' +
      '<tr><td>Protein</td><td>' + round1(currentFood.protein) + ' g</td></tr>' +
      '<tr><td>Carbohydrates</td><td>' + round1(currentFood.carbs) + ' g</td></tr>' +
      '<tr><td>Fat</td><td>' + round1(currentFood.fat) + ' g</td></tr>' +
      '<tr><td>Fibre</td><td>' + round1(currentFood.fiber) + ' g</td></tr>' +
      '<tr><td>Sugars</td><td>' + round1(currentFood.sugar) + ' g</td></tr>' +
      '<tr><td>Sodium</td><td>' + round1(currentFood.sodium) + ' mg</td></tr></table>' +
      '<p><b>MyPlate food groups per serving:</b> ' + groups + '</p><hr>' +
      '<div class="row">' +
      '<div><label for="servings">Servings eaten</label><input id="servings" type="number" value="1" step="0.5" style="width:90px"></div>' +
      '<div><label for="mealSelect">Meal</label><select id="mealSelect"><option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option></select></div>' +
      '<button id="addBtn">Add to diary</button></div>' +
      '<p id="servResult"></p></div>';

    document.getElementById('servings').oninput = calculateServings;      // event handler
    document.getElementById('addBtn').onclick = addToDiary;               // event handler
    calculateServings();
    showMessage('detailMsg', '', 'ok');
    document.getElementById('detail').scrollIntoView();
  } catch (error) {
    showMessage('detailMsg', error.message, 'err');
  }
}

// CALCULATION: nutrition
// formula: value per 1 serving  x  servings
function calculateServings() {
  const servings = Number(document.getElementById('servings').value);
  const result = document.getElementById('servResult');

  // validation
  if (isNaN(servings) || servings < 0.5 || servings > 20) {
    result.textContent = 'Servings must be between 0.5 and 20.';
    return null;
  }
  const answer = {
    servings: servings,
    kcal: Math.round(currentFood.kcal * servings),
    protein: round1(currentFood.protein * servings),
    carbs: round1(currentFood.carbs * servings),
    fat: round1(currentFood.fat * servings)
  };
  result.textContent = 'For ' + servings + ' serving(s): ' + answer.kcal + ' kcal, ' + answer.protein +
                       ' g protein, ' + answer.carbs + ' g carbs, ' + answer.fat + ' g fat';
  return answer;
}

// CREATE- save the food into diary
function addToDiary() {
  const answer = calculateServings();
  if (answer === null) {
    return;
  }
  const records = getList('nutri_records');
  records.push({
    id: Date.now(),                                  // unique number for each record
    name: currentFood.name,
    meal: document.getElementById('mealSelect').value,
    servings: answer.servings,
    kcal: answer.kcal
  });
  saveList('nutri_records', records);
  showMessage('detailMsg', currentFood.name + ' was added to your diary.', 'ok');
}

// suggestions (my own control statements)
async function suggestFoods() {
  const diet = document.getElementById('diet').value;
  const meals = Number(document.getElementById('mealsLeft').value);
  document.getElementById('suggestions').innerHTML = '';

  // Input validation
  if (isNaN(meals) || meals < 1 || meals > 4) {
    showMessage('sugMsg', 'Meals left must be between 1 and 4.', 'err');
    return;
  }

  // calculation-calories left today and calories for each meal
  const goal = Number(localStorage.getItem('nutri_goal')) || 2000;
  const left = goal - getEatenCalories();
  if (left <= 0) {
    showMessage('sugMsg', 'You already reached your goal of ' + goal + ' kcal today. Try water or a very light snack.', 'info');
    return;
  }
  const perMeal = Math.round(left / meals);

  showMessage('sugMsg', 'Calories left: ' + left + ' kcal, about ' + perMeal + ' kcal per meal. Finding foods...', 'info');
  try {
    const offset = Math.floor(Math.random() * 900);
    const data = await callAPI('recipes?limit=100&offset=' + offset);

    const picks = [];
    for (let i = 0; i < data.results.length; i++) {
      const r = data.results[i];
      let reason = '';

      if (r.calories <= perMeal) {
        if (diet === 'lowcal') {
          if (r.calories <= 300) {
            reason = 'Light food: only ' + r.calories + ' kcal per serving';
          }
        } else if (diet === 'highprotein') {
          if (r.food_groups.includes('protein-foods') && r.calories >= 150) {
            reason = 'Contains protein foods and gives ' + r.calories + ' kcal';
          }
        } else if (diet === 'lowcarb') {
          if (!r.food_groups.includes('grains') && !r.food_groups.includes('fruits')) {
            reason = 'No grains or fruit group, so usually fewer carbs';
          }
        } else if (diet === 'balanced') {
          if (r.food_groups.length >= 3) {
            reason = 'Covers ' + r.food_groups.length + ' food groups';
          }
        }
      }

      if (reason !== '' && picks.length < 6) {
        picks.push(r);
        document.getElementById('suggestions').appendChild(makeCard(r, reason));
        saveSuggestion(r.name, diet, reason);                       // save to Local Storage
      }
    }

    // when nothing is suitable
    if (picks.length === 0) {
      showMessage('sugMsg', 'No suitable food found for about ' + perMeal + ' kcal per meal. Try again or change the diet.', 'info');
    } else {
      showMessage('sugMsg', picks.length + ' suggestion(s) found and saved. About ' + perMeal + ' kcal per meal.', 'ok');
    }
  } catch (error) {
    showMessage('sugMsg', error.message, 'err');
  }
}
// connect buttons to functions
document.getElementById('calcBtn').addEventListener('click', calculateNeeds);
document.getElementById('searchBtn').addEventListener('click', searchFoods);
document.getElementById('suggestBtn').addEventListener('click', suggestFoods);
document.getElementById('query').addEventListener('keydown', function (event) {
  if (event.key === 'Enter') {
    searchFoods();
  }
});