// --- CONFIGURATION ---
const USDC_ADDR = "0x3600000000000000000000000000000000000000"; // Arc Testnet USDC
const MERCHANT = "0xbdc55a1296d065b7eb4363207d1a599e578712c5"; 
const ARC_CHAIN = "0x4cef52"; // Arc Network Testnet Hex ID
const INR_RATE = 83.50;

let userAddress = "", provider, signer, selectedPrice = 0, selectedDesc = "", currentService = "";

// --- WALLET AUTO-CONNECT & NETWORK CHECK ---
async function autoConnect() {
    if (!window.ethereum) {
        document.getElementById("walletLabel").innerText = "Install Wallet";
        return;
    }
    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAddress = accounts[0];
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        // Check if on Arc Network, if not prompt to switch
        const network = await provider.getNetwork();
        if(ethers.utils.hexValue(network.chainId) !== ARC_CHAIN) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: ARC_CHAIN }]
                });
                location.reload();
            } catch (e) {
                alert("Please add Arc Testnet to your wallet.");
            }
        }

        // Header UI Update
        document.getElementById("dot").classList.replace("bg-red-500", "bg-green-500");
        document.getElementById("walletLabel").innerText = userAddress.slice(0, 6) + "..." + userAddress.slice(-4);
        
        fetchBalance();
    } catch (e) {
        console.error("Connection Failed", e);
    }
}

// --- DATA FOR SEARCH RESULTS ---
const db = {
    flight: [
        {op: "Akasa Air", inr: 7421, time: "23:00 - 01:55", id: "QP-1126"},
        {op: "IndiGo", inr: 7424, time: "02:00 - 04:45", id: "6E-6366"}
    ],
    train: [
        {op: "Rajdhani Exp", inr: 4500, time: "16:55 - 10:00", id: "12301"},
        {op: "Gitanjali", inr: 840, time: "13:40 - 21:20", id: "12860"}
    ],
    bus: [
        {op: "SANA TRAVELS", inr: 540, time: "21:15 - 06:00", id: "WB-41"},
        {op: "Volvo Luxury", inr: 1200, time: "20:00 - 05:00", id: "PB-01"}
    ],
    hotel: [
        {op: "ITC Sonar", inr: 9000, time: "Check-in 12PM", id: "Luxury Stay"},
        {op: "Budget Inn", inr: 1500, time: "Check-in 11AM", id: "Standard"}
    ],
    mobile: [
        {op: "Jio Recharge", inr: 299, time: "28 Days", id: "1.5GB/Day"},
        {op: "Airtel Plan", inr: 749, time: "84 Days", id: "2GB/Day"}
    ]
};

// --- SERVICE FLOW LOGIC ---
function openService(type) {
    currentService = type;
    document.getElementById("dashboardView").classList.add("hidden");
    document.getElementById("bookingUI").classList.remove("hidden");
    
    const inputBox = document.getElementById("inputBox");
    if(type === 'hotel') {
        inputBox.innerHTML = `<input type="text" id="src" placeholder="City or Hotel Name">`;
    } else if(['mobile', 'electric', 'dth', 'wifi'].includes(type)) {
        inputBox.innerHTML = `<input type="number" id="src" placeholder="Enter Number / Consumer ID">`;
    } else {
        inputBox.innerHTML = `<input type="text" id="src" placeholder="From (e.g. CCU)"><input type="text" id="dst" placeholder="To (e.g. BOM)">`;
    }
}

function runSearch() {
    const src = document.getElementById("src").value;
    if(!src) return alert("Pehle Details Bhariye!");
    
    document.getElementById("stepSearch").classList.add("hidden");
    document.getElementById("stepResults").classList.remove("hidden");
    
    const inject = document.getElementById("resultsInject");
    inject.innerHTML = "";
    
    // Simulate Loading then show results
    const data = db[currentService] || db['mobile'];
    setTimeout(() => {
        data.forEach(item => {
            const usdc = (item.inr / INR_RATE).toFixed(2);
            inject.innerHTML += `
                <div onclick="selectTrip('${item.op}', ${item.inr}, ${usdc})" class="flight-item shadow-xl animate-in fade-in duration-300">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-blue-700 font-black text-xs uppercase">${item.op} • ${item.id}</span>
                        <span class="text-black font-bold">₹${item.inr}</span>
                    </div>
                    <div class="flex justify-between text-[10px] opacity-60 font-bold uppercase">
                        <span>${item.time}</span>
                        <span class="text-blue-600">${usdc} USDC</span>
                    </div>
                </div>`;
        });
    }, 500);
}

function selectTrip(op, inr, usdc) {
    selectedPrice = usdc;
    selectedDesc = op;
    document.getElementById("stepResults").classList.add("hidden");
    document.getElementById("stepFinal").classList.remove("hidden");
    document.getElementById("bottomBar").style.display = "block";
    document.getElementById("totalLabel").innerText = `${op}: ₹${inr} (${usdc} USDC)`;
}

// --- REAL BLOCKCHAIN TRANSACTION ---
async function startTx() {
    const name = document.getElementById("pName").value;
    if(!name) return alert("Passenger/Guest Name bhariye!");

    const btn = document.getElementById("payBtn");
    try {
        btn.innerText = "WAITING FOR WALLET..."; btn.disabled = true;
        
        // ERC20 Transfer ABI (Only transfer function)
        const abi = ["function transfer(address to, uint256 amount) public returns (bool)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, signer);
        
        // Process Transfer (Using 6 decimals for USDC)
        const tx = await contract.transfer(MERCHANT, ethers.utils.parseUnits(selectedPrice.toString(), 6), {
            gasLimit: 150000,
            type: 0 
        });
        
        btn.innerText = "CONFIRMING ON ARC...";
        await tx.wait();
        
        // Show Success Modal
        document.getElementById("resItem").innerText = selectedDesc;
        document.getElementById("resPrice").innerText = selectedPrice + " USDC";
        document.getElementById("successModal").classList.remove("hidden");
        
        fetchBalance();
    } catch (e) {
        console.error(e);
        alert("Transaction Fail! Balance ya Gas check karein.");
        btn.disabled = false;
        btn.innerText = "Confirm & Pay";
    }
}

// --- UTILITIES ---
async function fetchBalance() {
    try {
        const contract = new ethers.Contract(USDC_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
        const bal = await contract.balanceOf(userAddress);
        const f = ethers.utils.formatUnits(bal, 6);
        document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
        document.getElementById("inrBal").innerText = (f * INR_RATE).toLocaleString('en-IN', {maximumFractionDigits: 2});
    } catch(e) {}
}

function toggleMenu() { document.getElementById("profileMenu").classList.toggle("show"); }
function copyAddr() { navigator.clipboard.writeText(userAddress); alert("Address Copied!"); }
function closeService() { location.reload(); }

// Close dropdown on click outside
window.onclick = function(event) {
    if (!event.target.matches('#walletBtn, #walletBtn *')) {
        const menus = document.getElementsByClassName("dropdown-menu");
        for (let i = 0; i < menus.length; i++) {
            if (menus[i].classList.contains('show')) menus[i].classList.remove('show');
        }
    }
}
