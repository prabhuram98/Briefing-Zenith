// Elements
const dateSelect = document.getElementById("dateSelect");
const generateBtn = document.getElementById("generateBtn");
const briefingPopup = document.getElementById("briefingPopup");
const briefingText = document.getElementById("briefingText");
const copyBtn = document.getElementById("copyBtn");
const closeBtn = document.getElementById("closeBtn");

// Load JSON data
let scheduleData = {};

fetch('data.json')
  .then(response => response.json())
  .then(data => {
      scheduleData = data;

      // Populate date dropdown
      Object.keys(scheduleData).forEach(date => {
          const opt = document.createElement("option");
          opt.value = date;
          opt.textContent = date;
          dateSelect.appendChild(opt);
      });
  });

// Generate briefing
generateBtn.addEventListener("click", () => {
    const selectedDate = dateSelect.value;
    const staffList = scheduleData[selectedDate];

    if(!staffList || staffList.length === 0){
        briefingText.innerText = "No schedule available for this day.";
    } else {
        let text = `Bom dia a todos!\n\n*BRIEFING ${selectedDate}*\n\n`;
        staffList.forEach(staff => {
            text += `${staff.entry} - ${staff.name}: ${staff.area}\n`;
        });
        text += "\n⸻⸻⸻⸻\n\n⚠ Please follow your area responsibilities\n";
        briefingText.innerText = text;
    }

    briefingPopup.style.display = "flex"; // show popup
});

// Copy & Close
copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(briefingText.innerText);
    alert("Briefing copied!");
});

closeBtn.addEventListener("click", () => {
    briefingPopup.style.display = "none";
});