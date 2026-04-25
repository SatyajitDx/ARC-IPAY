const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT = "0xbdc55a1296d065b7eb4363207d1a599e578712c5"; 
const ARC_CHAIN = '0x4cef52'; 
const INR_RATE = 83.50;

let userAddress = "", provider, signer, selectedPrice = 0, selectedItem = "";

async function autoConnect() {
    if (!window.ethereum) return;
    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAddress = accounts[0];
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        document.getElementById("dot").classList.replace("bg-red-500", "bg-green-500");
        document.getElementById("walletLabel").innerText = userAddress.slice(0, 10) + "...";
        
        fetchBalance();
    } catch (e) { console.error(e); }
}

function toggleProfile() { userAddress ? document.getElementById("profileMenu").classList.toggle("show") : autoConnect(); }

// --- TOOLS LOGIC ---
function openSend() { if(!userAddress) return autoConnect(); document.getElementById("sendModal").classList.remove("hidden"); }
function openReceive() { 
    if(!userAddress) return autoConnect(); 
    document.getElementById("receiveModal").classList.remove("hidden");
    document.getElementById("myFullAddr").innerText = userAddress;
    document.getElementById("qrcode").innerHTML = "";
    new QRCode(document.getElementById("qrcode"), { text: userAddress, width: 150, height: 150 });
}

async function processSend() {
    const to = document.getElementById("sendAddr").value;
    const val = document.getElementById("sendAmt").value;
    const btn = document.getElementById("sendS");
    try {
        btn.innerText = "WAIT..."; btn.disabled = true;
        const contract = new ethers.Contract(USDC_ADDR, ["function transfer(address,uint256) returns (bool)"], signer);
        const tx = await contract.transfer(to, ethers.utils.parseUnits(val, 6));
        await tx.wait();
        alert("Sent!"); location.reload();
    } catch (e) { alert("Fail!"); btn.disabled = false; btn.innerText = "Send"; }
}

// --- BOOKING LOGIC ---
const mockDb = { flight: [{op: "IndiGo", inr: 7421, time: "23:00-01:55"}], train: [{op: "Rajdhani", inr: 4500, time: "16:55-10:00"}], mobile: [{op: "Jio", inr: 299, time: "28 Days"}] };

function startFlow(type) {
    document.getElementById("bookingOverlay").classList.remove("hidden");
    document.getElementById("flowTitle").innerText = type.toUpperCase() + " SEARCH";
    document.getElementById("flowContent").innerHTML = `<input type="text" id="src" placeholder="Source / Number"><button onclick="runSearch('${type}')" class="w-full bg-[#000080] text-white py-4 rounded-xl">Search Options</button>`;
}

function runSearch(type) {
    const inject = document.getElementById("resultsInject");
    inject.innerHTML = `<p class="text-center opacity-40 italic">Searching...</p>`;
    setTimeout(() => {
        const data = mockDb[type] || mockDb['mobile'];
        inject.innerHTML = data.map(item => {
            const usdc = (item.inr / INR_RATE).toFixed(2);
            return `<div onclick="selectItem('${item.op}', ${item.inr}, ${usdc})" class="glass p-5 flex justify-between items-center text-black border">
                <div><p class="font-black text-[#000080] text-xs">${item.op}</p><p class="text-[8px] opacity-60">${item.time}</p></div>
                <div class="text-right"><p class="font-black text-sm">₹${item.inr}</p><p class="text-[8px] text-green-600">${usdc} USDC</p></div>
            </div>`;
        }).join('');
    }, 1000);
}

function selectItem(op, inr, usdc) {
    selectedPrice = usdc; selectedItem = op;
    document.getElementById("resultsInject").innerHTML = `<div class="glass p-6 space-y-4"><input type="text" id="pName" placeholder="Traveller Name"><input type="number" placeholder="Age"></div>`;
    document.getElementById("bottomBar").style.display = "block";
    document.getElementById("totalPrice").innerText = `Total: ₹${inr} (${usdc} USDC)`;
}

async function finalPay() {
    if(!document.getElementById("pName").value) return alert("Fill Name!");
    const btn = document.getElementById("payBtn");
    try {
        btn.innerText = "WAITING..."; btn.disabled = true;
        const contract = new ethers.Contract(USDC_ADDR, ["function transfer(address,uint256) returns (bool)"], signer);
        const tx = await contract.transfer(MERCHANT, ethers.utils.parseUnits(selectedPrice.toString(), 6));
        await tx.wait();
        document.getElementById("resAmtShow").innerText = selectedPrice + " USDC";
        document.getElementById("successModal").classList.remove("hidden");
    } catch (e) { alert("Fail!"); btn.disabled = false; btn.innerText = "Confirm & Pay"; }
}

async function fetchBalance() {
    const contract = new ethers.Contract(USDC_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
    const bal = await contract.balanceOf(userAddress);
    const f = ethers.utils.formatUnits(bal, 6);
    document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
    document.getElementById("inrBal").innerText = (f * INR_RATE).toLocaleString('en-IN');
}

async function getTxLogs() {
    const contract = new ethers.Contract(USDC_ADDR, ["event Transfer(address indexed from, address indexed to, uint256 value)"], provider);
    const logs = await contract.queryFilter(contract.filters.Transfer(userAddress), -500, "latest");
    alert("Check Console for History Log"); console.log(logs);
}

function disconnectWallet() { userAddress = ""; location.reload(); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
function copyAddr() { navigator.clipboard.writeText(userAddress); alert("Copied!"); }
