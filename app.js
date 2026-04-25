const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT = "0xbdc55a1296d065b7eb4363207d1a599e578712c5"; 
const INR_RATE = 83.50; 

let userAddress = "", provider, signer, currentType = "", selectedUsdc = 0, selectedDesc = "";

// Search Fields based on photos (From CCU-Kolkata)
const searchForms = {
    flight: `<input type="text" id="src" placeholder="From (CCU - Kolkata)" class="w-full p-4 rounded-xl text-xs mb-2"><input type="text" id="dst" placeholder="To (BOM - Mumbai)" class="w-full p-4 rounded-xl text-xs">`,
    train: `<input type="text" id="src" placeholder="Source Stn (HWH)" class="w-full p-4 rounded-xl text-xs mb-2"><input type="text" id="dst" placeholder="Dest Stn (CSTM)" class="w-full p-4 rounded-xl text-xs">`,
    bus: `<input type="text" id="src" placeholder="Leaving From" class="w-full p-4 rounded-xl text-xs mb-2"><input type="text" id="dst" placeholder="Going To" class="w-full p-4 rounded-xl text-xs">`,
    hotel: `<input type="text" id="src" placeholder="City or Property (Kolkata)" class="w-full p-4 rounded-xl text-xs">`
};

// Real Results Data (screenshot style)
const travelData = {
    flight: [
        {op: "IndiGo", from: "CCU", to: "BOM", time: "10:30 AM", dur: "2h 15m", inr: 4500, usdc: 0},
        {op: "Air India", from: "CCU", to: "BOM", time: "02:15 PM", dur: "2h 10m", inr: 5800, usdc: 0}
    ],
    train: [
        {op: "Rajdhani Exp", from: "HWH", to: "CSTM", time: "08:00 PM", dur: "26h 00m", inr: 2100, usdc: 0},
        {op: "Duronto", from: "HWH", to: "CSTM", time: "11:30 AM", dur: "25h 15m", inr: 1850, usdc: 0}
    ],
    bus: [
        {op: "RedBus AC", from: "Kolkata", to: "Ranchi", time: "09:00 PM", dur: "8h 00m", inr: 950, usdc: 0}
    ],
    hotel: [
        {op: "Taj Stay", city: "Kolkata", time: "hourly", inr: 8500, usdc: 0},
        {op: "Budget Inn", city: "Kolkata", time: "daily", inr: 1500, usdc: 0}
    ]
};

async function connectWallet() {
    if (!window.ethereum) return alert("Install Wallet");
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    userAddress = accounts[0];
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
    document.getElementById("walletAddrDisplay").innerText = userAddress.slice(0, 8) + "..." + userAddress.slice(-4);
    
    fetchBalance();
    getHistory();
}

function openPopup(type) {
    currentType = type;
    document.getElementById("bookingModal").classList.remove("hidden");
    document.getElementById("modalTitle").innerText = type.toUpperCase() + " BOOKING";
    document.getElementById("searchFields").innerHTML = searchForms[type];
    
    document.getElementById("searchBtn").classList.remove("hidden");
    document.getElementById("resultsList").classList.add("hidden");
    document.getElementById("passengerSection").classList.add("hidden");
    document.getElementById("paySection").classList.add("hidden");
}

function searchTravel() {
    const src = document.getElementById("src").value;
    if(!src) return alert("Pehle details bharo!");
    const btn = document.getElementById("searchBtn");
    btn.innerText = "Searching Real Routes...";
    
    setTimeout(() => {
        btn.classList.add("hidden");
        document.getElementById("resultsList").classList.remove("hidden");
        const inject = document.getElementById("injectResults");
        inject.innerHTML = "";
        
        travelData[currentType].forEach(item => {
            const usdc = (item.price / INR_RATE).toFixed(2);
            item.usdc = usdc; // Save calculated USDC
            
            if (currentType === 'flight' || currentType === 'train') {
                // screenshot style card for flight/train
                inject.innerHTML += `
                    <div onclick="selectTrip(${item.price}, ${usdc}, '${item.op}', '${item.from}-${item.to}')" class="flight-card mb-2 font-bold italic uppercase">
                        <div class="flight-info-row mb-1">
                            <span class="text-blue-400 font-black text-xs">${item.op}</span>
                            <span class="text-white text-xs">₹${item.price} (${usdc} USDC)</span>
                        </div>
                        <div class="flight-info-row text-[9px] opacity-40 font-mono">
                            <span>${item.time} (${item.from})</span>
                            <span class="italic">${item.dur} | Non-stop</span>
                            <span>(${item.to})</span>
                        </div>
                    </div>`;
            } else if (currentType === 'hotel') {
                inject.innerHTML += `
                    <div onclick="selectTrip(${item.price}, ${usdc}, '${item.op}', '${item.city}')" class="result-card mb-2 flex justify-between items-center">
                        <div><p class="text-blue-400 font-black text-xs">${item.op}</p><p class="text-[8px] opacity-40">${item.city}</p></div>
                        <div class="text-right"><p class="text-white font-black text-xs">₹${item.price}</p><p class="text-[8px] opacity-50">${usdc} USDC</p></div>
                    </div>`;
            } else {
                 inject.innerHTML += `
                    <div onclick="selectTrip(${item.price}, ${usdc}, '${item.op}', '${item.from}-${item.to}')" class="result-card mb-2 flex justify-between items-center">
                        <div><p class="text-blue-400 font-black text-xs">${item.op}</p><p class="text-[8px] opacity-40">${item.dur}</p></div>
                        <div class="text-right"><p class="text-white font-black text-xs">₹${item.price}</p><p class="text-[8px] opacity-50">${usdc} USDC</p></div>
                    </div>`;
            }
        });
    }, 1200);
}

function selectTrip(inr, usdc, op, route) {
    selectedUsdc = usdc;
    selectedDesc = `${op} - ${route}`;
    document.getElementById("resultsList").classList.add("hidden");
    document.getElementById("passengerSection").classList.remove("hidden");
    document.getElementById("paySection").classList.remove("hidden");
    document.getElementById("selectedRouteInfo").innerText = `Total: ₹${inr} (${usdc} USDC)`;
    
    // Change Title if Hotel
    if(currentType === 'hotel') {
        document.getElementById("pSectionTitle").innerText = "GUEST DETAILS (Taj Stay):";
        document.getElementById("pName").placeholder = "Guest Name";
    } else {
        document.getElementById("pSectionTitle").innerText = "PASSENGER DETAILS:";
        document.getElementById("pName").placeholder = "Full Name";
    }
}

async function executeFinalPayment() {
    const btn = document.getElementById("finalPayBtn");
    const name = document.getElementById("pName").value;
    if(!name) return alert("Pehle passenger details daalo!");

    try {
        btn.innerText = "WAITING FOR WALLET..."; btn.disabled = true;
        const abi = ["function transfer(address to, uint256 amount) public returns (bool)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, signer);
        const tx = await contract.transfer(MERCHANT, ethers.utils.parseUnits(selectedUsdc.toString(), 6), { gasLimit: 120000, type: 0 });
        await tx.wait();
        
        document.getElementById("resId").innerText = selectedDesc;
        document.getElementById("resAmt").innerText = selectedUsdc + " USDC";
        closeModal('bookingModal');
        document.getElementById("successModal").classList.remove("hidden");
    } catch (e) { alert("Payment Fail!"); btn.innerText = "Pay & Confirm"; btn.disabled = false; }
}

async function fetchBalance() {
    try {
        const abi = ["function balanceOf(address) view returns (uint256)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, provider);
        const bal = await contract.balanceOf(userAddress);
        const f = ethers.utils.formatUnits(bal, 6);
        document.getElementById("usdcBalDisplay").innerText = parseFloat(f).toFixed(2);
        document.getElementById("inrBalDisplay").innerText = (f * INR_RATE).toLocaleString('en-IN');
    } catch (e) {}
}

async function getHistory() {
    const list = document.getElementById("latestTxList");
    try {
        const abi = ["event Transfer(address indexed from, address indexed to, uint256 value)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, provider);
        const logs = await contract.queryFilter(contract.filters.Transfer(userAddress), -1000, "latest");
        list.innerHTML = logs.slice(-5).reverse().map(l => `<div class="flex justify-between border-b border-white/5 pb-2 text-[9px] uppercase italic"><p>To: ${l.args.to.slice(0,12)}...</p><p>-${ethers.utils.formatUnits(l.args.value, 6)} USDC</p></div>`).join('');
    } catch (e) {}
}

function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
