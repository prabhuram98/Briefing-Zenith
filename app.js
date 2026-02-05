// ----- USERS array (dynamic now) -----
let users = [];

// ----- STAFF array for briefing -----
let staff = [];

// ----- LOGIN (disabled username/PIN) -----
document.getElementById("loginBtn").addEventListener("click", () => {
  // Hide login screen, show main screen
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("mainScreen").style.display = "block";

  // Show user management icon/panel for testing
  document.getElementById("userManagement").style.display = "block";

  updateUserList();
});

// ----- ADD USER BUTTON -----
document.getElementById("addUserBtn").addEventListener("click", () => {
  const name = document.getElementById("newName").value.trim();
  const area = document.getElementById("newArea").value;
  const type = document.getElementById("newType").value;

  if(name === "") return alert("Please enter a name");

  // Add to arrays
  users.push({ name, area, type });
  staff.push({ name, area, role: type });

  // Clear inputs
  document.getElementById("newName").value = "";

  updateUserList();
});

// ----- UPDATE USER LIST -----
function updateUserList() {
  const list = document.getElementById("userList");
  list.innerHTML = "";
  users.forEach(u => {
    const li = document.createElement("li");
    li.textContent = `${u.name} - ${u.area} - ${u.type}`;
    list.appendChild(li);
  });
}

// ----- BRIEFING GENERATOR -----
function generateBriefing() {
  const today = new Date();
  const date = today.toLocaleDateString("pt-PT");

  let text = "";
  text += "Bom dia a todos!\n\n";
  text += `*BRIEFING ${date}*\n\n`;

  // Example static briefing
  text += "08:00 Porta: Ana\n\n";

  text += "BAR:\n";
  text += "07:30 Abertura Sala/Bar: *Leonor*\n";
  text += "07:30 Bar A: *Leonor* Barista – Bebidas\n";
  text += "09:00 Bar B: *Gonçalo* Barista – Cafés / Caixa\n\n";

  text += "SELLERS:\n";
  text += "08:00 Seller A: *David*\n";
  text += "10:30 Seller B: *Julieta*\n\n";

  text += "RUNNERS:\n";
  text += "Runner A e B: Todos\n\n";

  text += "HACCP / LIMPEZA BAR:\n";
  text += "15:00 Preparações Bar: *Leonor*\n";
  text += "15:00 Reposição Bar: *Leonor*\n";
  text += "17:30 Fecho Bar: *Gonçalo*\n\n";

  text += "HACCP / SALA:\n";
  text += "16:00 Limpeza e reposição aparador / cadeira bebés: *Julieta*\n";
  text += "16:00 Repor papel (WC): *Julieta*\n";
  text += "16:00 Limpeza WC (clientes e staff): *Julieta*\n";
  text += "17:30 Limpeza vidros e espelhos: *David*\n";
  text += "17:30 Fecho da sala: *David*\n";
  text += "17:30 Fecho de Caixa: *Ana*\n";

  document.getElementById("briefingOutput").innerText = text;
}

// ----- GENERATE BUTTON -----
document.getElementById("generateBtn").addEventListener("click", generateBriefing);

// ----- DOWNLOAD BUTTON -----
document.getElementById("downloadBtn").addEventListener("click", () => {
  const text = document.getElementById("briefingOutput").innerText;
  const blob = new Blob([text], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "briefing.txt";
  link.click();
});
