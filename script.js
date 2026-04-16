const firebaseConfig = {
apiKey: "AIzaSyC3uqEIX7Zee5_T9NAp5impPdK2nCPYIFo",
authDomain: "admin-panel-site-c6658.firebaseapp.com",
projectId: "admin-panel-site-c6658"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let currentCity = "spb";

function makeSafeDocId(value){
return value.trim().replace(/\s+/g,"_");
}

async function loadAdmins(){
const snapshot = await db.collection("admins")
.where("город","==",currentCity)
.get();

const tbody=document.getElementById("adminTableBody");
tbody.innerHTML="";

if(snapshot.empty){
tbody.innerHTML=`<tr class="empty-row"><td colspan="4">Нет администраторов</td></tr>`;
return;
}

snapshot.forEach(doc=>{
const d=doc.data();
tbody.innerHTML+=`
<tr>
<td class="nickname-cell">${doc.id}</td>
<td class="level-cell">${d["уровень"]||""}</td>
<td><span class="status-tag">${d["статус"]||""}</span></td>
<td>${d["вк"]?`<a class="vk-btn" href="${d["вк"]}" target="_blank">VK</a>`:"—"}</td>
</tr>`;
});
}

document.querySelectorAll(".server-btn").forEach(btn=>{
btn.addEventListener("click",async()=>{
document.querySelectorAll(".server-btn").forEach(b=>b.classList.remove("active"));
btn.classList.add("active");
currentCity=btn.dataset.city;
await loadAdmins();
});
});

document.getElementById("addAdminBtn").onclick=async()=>{
const nickname=document.getElementById("addNickname").value.trim();
const level=document.getElementById("addLevel").value;
const status=document.getElementById("addStatus").value.trim();
const vk=document.getElementById("addVk").value.trim();
const city=document.getElementById("addCity").value;

if(!nickname||!level||!status)return;

await db.collection("admins").doc(makeSafeDocId(nickname)).set({
"уровень":Number(level),
"статус":status,
"вк":vk||"",
"город":city
});

await loadAdmins();
};

document.getElementById("bulkImportBtn").onclick=async()=>{
const text=document.getElementById("bulkAdminText").value.trim();
const city=document.getElementById("bulkCity").value;
if(!text)return;

const lines=text.split("\n").filter(Boolean);

for(const line of lines){
const parts=line.split("\t");
if(parts.length<4)continue;

await db.collection("admins").doc(makeSafeDocId(parts[0])).set({
"уровень":Number(parts[1]),
"статус":parts[2],
"вк":parts[3],
"город":city
});
}

await loadAdmins();
};

document.getElementById("openAdminPanelBtn").onclick=()=>{
document.getElementById("adminPanel").style.display="flex";
};

document.getElementById("closeAdminPanel").onclick=()=>{
document.getElementById("adminPanel").style.display="none";
};

document.addEventListener("DOMContentLoaded",loadAdmins);
