const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT = "0xbdc55a1296d065b7eb4363207d1a599e578712c5"; 
const INR_RATE = 83.50;

let userAddress = "", provider, signer, currentType = "", selectedUsdc = 0, selectedDesc = "";

const searchForms = {
    flight: `<input type="text" id="src" placeholder="From City" class="w-full p-4 rounded-xl text-xs mb-2"><input type="text" id="dst" placeholder="To City" class="w-full p-4 rounded-xl text-xs">`,
    train: `<input type="text" id="src" placeholder="Source Station" class="w-full p-4 rounded-xl text-xs mb-2"><input type="text" id="dst" placeholder="Dest Station" class="w-full p-4 rounded-xl text-xs">`,
    bus: `<input type="text" id="src" placeholder="From" class="w-full p-4 rounded-xl text-xs mb-2"><input type="text" id="dst" placeholder="To" class="w-full p-4 rounded-xl text-xs">`,
    hotel: `<input type="text" id="src" placeholder="City / Hotel Name" class="w-full p-4 rounded-xl text-xs">`,
    mobile: `<input type="text" id="src" placeholder="Mobile Number" class="w-full p-4 rounded-xl text-xs mb-2"><select id="operatorSelect" class="w-full p-4 rounded-xl text-xs font-bold"><option>Jio Prepaid</option><option>Airtel</option></select>`,
    electricity: `<input type="text" id="src" placeholder="Consumer ID" class="w-full p-4 rounded-xl text-xs mb-2"><input type="number" id="manualAmt" placeholder="Enter Amount (₹)" class="w-full p-4 rounded-xl text-xs">`,
    dth: `<input type="text" id="src" placeholder="Smart Card ID" class="w-full p-4 rounded-xl text-xs mb-2"><input type="number" id="manualAmt" placeholder="Enter Amount (₹)" class="w-full p-4 rounded-xl text-xs">`,
    broadband: `<input type="text" id="src" placeholder="Subscriber ID" class="w-full p-4 rounded-xl text-xs mb-2"><input type="number" id="manualAmt" placeholder="Enter Amount (₹)" class="w-full p-4 rounded-xl text-xs">`,
    movie: `<input type="text" id="src" placeholder="Cinema Name" class="w-full p-4 rounded-xl text-xs">`
};

const travelData = {
    flight: [{op: "IndiGo", price: 4500}, {op: "Air India", price: 5800}],
    train: [{op: "Rajdhani Exp", price: 2100}, {op: "Duronto", price: 1850}],
    bus: [{op: "RedBus AC", price: 950}, {op: "Volvo", price: 1200}],
    hotel: [{op: "Taj Stay", price: 8500}, {op: "Budget Inn", price: 1500}],
    mobile: [{op: "Monthly Plan", price: 299}, {op: "Yearly Plan", price: 2999}],
    movie: [{op: "PVR Cinemas", price: 350}, {op: "Inox", price: 400}],
    electricity: [], dth: [], broadband: []
};

async function connectWallet() {
    if (!window.ethereum) return alert("Install Wallet");
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    userAddress = accounts[0];
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
    document.getElementById("walletAddr").innerText = userAddress.slice(0, 6) + "..." + userAddress.slice(-4).toUpperCase();
    fetchBalance();
    getHistory(5, "latestTxList");
}

function openPopup(type) {
    currentType = type;
    document.getElementById("bookingModal").classList.remove("hidden");
    document.getElementById("modalTitle").innerText = type.toUpperCase();
    document.getElementById("searchFields").innerHTML = searchForms[type];
    document.getElementById("searchBtn").classList.remove("hidden");
    document.getElementById("resultsList").classList.add("hidden");
    document.getElementById("paySection").classList.add("hidden");
    if(type === 'electricity' || type === 'dth' || type === 'broadband') {
        document.getElementById("searchBtn").innerText = "Fetch Bill";
    } else {
        document.getElementById("searchBtn").innerText = "Search";
    }
}

function searchTravel() {
    const src = document.getElementById("src").value;
    if(!src) return alert("Fill details!");
    
    // Check for manual utility amount
    const manualInr = document.getElementById("manualAmt") ? document.getElementById("manualAmt").value : null;
    if(manualInr) {
        selectTrip("Bill Payment", src, (manualInr/INR_RATE).toFixed(2));
        return;
    }

    const btn = document.getElementById("searchBtn");
    btn.innerText = "Searching...";
    
    setTimeout(() => {
        btn.classList.add("hidden");
        document.getElementById("resultsList").classList.remove("hidden");
        const inject = document.getElementById("injectResults");
        inject.innerHTML = "";
        
        travelData[currentType].forEach(item => {
            const usdc = (item.price / INR_RATE).toFixed(2);
            inject.innerHTML += `
                <div onclick="selectTrip('${item.op}', '${src}', ${usdc})" class="result-card mb-2 border border-white/5 p-3 flex justify-between items-center">
                    <div><p class="text-blue-400 font-bold text-xs">${item.op}</p><p class="text-[8px] opacity-40">Ready to book</p></div>
                    <div class="text-right"><p class="text-white font-bold text-xs">₹${item.price}</p><p class="text-[8px] opacity-50">${usdc} USDC</p></div>
                </div>`;
        });
    }, 1200);
}

function selectTrip(op, detail, usdc) {
    selectedUsdc = usdc;
    selectedDesc = `${op}: ${detail}`;
    document.getElementById("paySection").classList.remove("hidden");
    document.getElementById("selectedRouteInfo").innerText = selectedDesc;
}

async function executeFinalPayment() {
    const btn = document.getElementById("finalPayBtn");
    try {
        btn.innerText = "WAITING..."; btn.disabled = true;
        const abi = ["function transfer(address to, uint256 amount) public returns (bool)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, signer);
        const tx = await contract.transfer(MERCHANT, ethers.utils.parseUnits(selectedUsdc.toString(), 6), { gasLimit: 120000, type: 0 });
        await tx.wait();
        
        document.getElementById("resId").innerText = selectedDesc;
        document.getElementById("resAmt").innerText = selectedUsdc + " USDC";
        closeModal('bookingModal');
        document.getElementById("successModal").classList.remove("hidden");
        fetchBalance();
        getHistory(5, "latestTxList");
    } catch (e) { alert("Payment Fail!"); btn.disabled = false; btn.innerText = "Pay & Confirm"; }
}

async function fetchBalance() {
    try {
        const abi = ["function balanceOf(address) view returns (uint256)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, provider);
        const bal = await contract.balanceOf(userAddress);
        const f = ethers.utils.formatUnits(bal, 6);
        document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
        document.getElementById("inrBal").innerText = (f * INR_RATE).toLocaleString('en-IN');
    } catch (e) {}
}

async function getHistory(limit, targetId) {
    const list = document.getElementById(targetId);
    try {
        const abi = ["event Transfer(address indexed from, address indexed to, uint256 value)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, provider);
        const logs = await contract.queryFilter(contract.filters.Transfer(userAddress), -1000, "latest");
        list.innerHTML = logs.slice(-limit).reverse().map(l => `<div class="flex justify-between border-b border-white/5 pb-2 text-[9px] italic font-bold">
            <p>To: ${l.args.to.slice(0,12)}...</p><p>-${ethers.utils.formatUnits(l.args.value, 6)} USDC</p></div>`).join('');
    } catch (e) {}
}

function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
function openHistoryModal() { alert("Full History Logic Syncing..."); }
function openReceive() { alert("My Addr: " + userAddress); }
