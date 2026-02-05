// ------------------- LOGIN -------------------
document.getElementById("loginBtn").addEventListener("click", () => {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("mainScreen").style.display = "block";
});

// ------------------- CARD NAVIGATION -------------------
const briefingsCard = document.getElementById("briefingsCard");
const adminCard = document.getElementById("adminCard");
const briefingsOptions = document.getElementById("briefingsOptions");
const adminOptions = document.getElementById("adminOptions");

briefingsCard.addEventListener("click", () => {
  briefingsOptions.style.display = "block";
  adminOptions.style.display = "none";
});

adminCard.addEventListener("click", () => {
  adminOptions.style.display = "block";
  briefingsOptions.style.display = "none";
});

// ------------------- BRIEFINGS -------------------
document.getElementById("generateBriefingBtn").addEventListener("click", () => {
  const today = new Date();
  const date = today.toLocaleDateString("pt-PT");
  let text = `*BRIEFING ${date}*\n\n[Briefing will appear here]`;
  document.getElementById("briefingOutput").innerText = text;
});

// Tasks
const tasks = [];
const tasksList = document.getElementById("tasksList");
const tasksContainer = document.getElementById("tasksContainer");

document.getElementById("tasksBtn").addEventListener("click", () => {
  tasksContainer.style.display = tasksContainer.style.display === "none" ? "block" : "none";
});

document.getElementById("addTaskBtn").addEventListener("click", () => {
  const taskName = document.getElementById("newTaskName").value.trim();
  if(!taskName) return;
  tasks.push(taskName);
  const li = document.createElement("li");
  li.textContent = taskName;
  tasksList.appendChild(li);
  document.getElementById("newTaskName").value = "";
});

// ------------------- ADMIN STAFF -------------------
const staffArray = [];
const staffList = document.getElementById("staffList");

document.getElementById("addStaffBtn").addEventListener("click", () => {
  const name = document.getElementById("staffName").value.trim();
  const area = document.getElementById("staffArea").value;
  const access = document.getElementById("staffAccess").value;
  if(!name) return;
  staffArray.push({name, area, access});
  updateStaffList();
  document.getElementById("staffName").value = "";
});

function updateStaffList(){
  staffList.innerHTML = "";
  staffArray.forEach(s => {
    const li = document.createElement("li");
    li.textContent = `${s.name} - ${s.area} - ${s.access}`;
    staffList.appendChild(li);
  });
  updateEmployeeDropdown();
}

// ------------------- USERS / PIN -------------------
const selectEmployee = document.getElementById("selectEmployee");
const usersList = document.getElementById("usersList");
const userPins = [];

function updateEmployeeDropdown(){
  selectEmployee.innerHTML = "";
  staffArray.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.name;
    opt.textContent = s.name;
    selectEmployee.appendChild(opt);
  });
}

document.getElementById("assignPinBtn").addEventListener("click", () => {
  const emp = selectEmployee.value;
  const pin = document.getElementById("employeePin").value.trim();
  if(pin.length !== 4 || isNaN(pin)) return alert("PIN must be 4-digit number");
  userPins.push({emp, pin});
  const li = document.createElement("li");
  li.textContent = `${emp} - PIN: ${pin}`;
  usersList.appendChild(li);
  document.getElementById("employeePin").value = "";
});