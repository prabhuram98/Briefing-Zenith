// ----- Users (username + PIN + role) -----
let users = [
  { username: "ana", pin: "1234", role: "manager" },
  { username: "prabhu", pin: "5678", role: "staff" },
  { username: "julieta", pin: "2345", role: "staff" },
  { username: "goncalo", pin: "6789", role: "staff" },
  { username: "leonor", pin: "3456", role: "staff" }
];

// ----- Staff and tasks (editable by admin) -----
let staff = [
  { name: "Ana", area: "SALA", role: "Manager" },
  { name: "Prabhu", area: "SALA", role: "Seller" },
  { name: "Julieta", area: "SALA", role: "Seller" },
  { name: "Gonçalo", area: "BAR", role: "Barista" },
  { name: "Leonor", area: "BAR", role: "Barista" }
];

let tasks = [
  { section: "Porta", time: "08:00", description: "" },
  { section: "BAR", time: "07:30", description: "Abertura Sala/Bar" },
  { section: "BAR", time: "07:30", description: "Barista – Bebidas" },
  { section: "BAR", time: "09:00", description: "Barista – Cafés / Caixa" },
  { section: "SELLERS", time: "08:00", description: "Seller A" },
  { section: "SELLERS", time: "10:30", description: "Seller B" }
  // Add more tasks as needed
];

// ----- Login Logic -----
const loginBtn = document.getElementById("loginBtn");
loginBtn.addEventListener("click", () => {
  const username = document.getElementById("username").value.toLowerCase();
  const pin = document.getElementById("pin").value;
  const user = users.find(u => u.username === username && u.pin === pin);

  if(user){
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("mainScreen").style.display = "block";

    if(user.role === "manager"){
      document.getElementById("adminPanel").style.display = "block";
    }
  } else {
    document.getElementById("loginError").innerText = "Invalid username or PIN";
  }
});

// ----- Generate Briefing -----
function shuffle(array){
  return array.sort(() => Math.random() - 0.5);
}

function generateBriefing(){
  let output = "Bom dia a todos!\n\n";
  const today = new Date();
  const dateStr = today.toLocaleDateString("pt-PT");
  output += `*BRIEFING ${dateStr}*\n\n`;

  // Group tasks by section
  const sections = [...new Set(tasks.map(t => t.section))];
  sections.forEach(section => {
    output += section + ":\n";
    tasks.filter(t => t.section === section).forEach(t => {
      // Randomly pick a staff from the section's area
      let possibleStaff = staff.filter(s => s.area.toUpperCase() === section || section === "SELLERS" || section === "RUNNERS");
      let assigned = possibleStaff.length > 0 ? shuffle(possibleStaff)[0].name : "N/A";
      output += `${t.time} ${t.description}: *${assigned}*\n`;
    });
    output += "-----------------------\n";
  });

  document.getElementById("briefingOutput").innerText = output;
}

// ----- Buttons -----
document.getElementById("generateBtn").addEventListener("click", generateBriefing);

document.getElementById("downloadBtn").addEventListener("click", () => {
  const text = document.getElementById("briefingOutput").innerText;
  const blob = new Blob([text], {type: "text/plain"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "briefing.txt";
  a.click();
});