const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT = "0xbdc55a1296d065b7eb4363207d1a599e578712c5"; 
const ARC_CHAIN = "0x4cef52"; 
const INR_RATE = 83.50;

let userAddress = "", provider, signer, selectedPrice = 0, selectedDesc = "", currentService = "";

async function autoConnect() {
    if (!window.ethereum) return;
    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAddress = accounts[0];
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        const network = await provider.getNetwork();
        if(ethers.utils.hexValue(network.chainId) !== ARC_CHAIN) {
            await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: ARC_CHAIN }] });
            location.reload();
        }

        document.getElementById("dot").classList.replace("bg-red-500", "bg-green-500");
        document.getElementById("walletLabel").innerText = userAddress.slice(0, 10) + "...";
        fetchBalance();
    } catch (e) { console.log(e); }
}

function toggleMenu() { document.getElementById("profileMenu").classList.toggle("show"); }

const db = {
    flight: [ {op: "Akasa Air", inr: 7421, time: "23:00-01:55"}, {op: "IndiGo", inr: 7424, time: "02:00-04:45"} ],
    train: [ {op: "Rajdhani Exp", inr: 4500, time: "16:55-10:00"}, {op: "Gitanjali", inr: 840, time: "13:40-21:20"} ],
    bus: [ {op: "SANA TRAVELS", inr: 540, time: "21:15-06:00"} ],
    hotel: [ {op: "ITC Sonar", inr: 9000, time: "Guest Details Req."} ],
    mobile: [ {op: "Jio Unlimited", inr: 299, time: "28 Days"} ]
};

function openService(type) {
    currentService = type;
    document.getElementById("dashboardView").classList.add("hidden");
    document.getElementById("bookingUI").classList.remove("hidden");
    const inputBox = document.getElementById("inputBox");
    
    if(type === 'hotel') {
        inputBox.innerHTML = `<input type="text" id="src" placeholder="City or Hotel Name">`;
        document.getElementById("pTitle").innerText = "GUEST DETAILS:";
    } else if(['mobile', 'electric', 'dth'].includes(type)) {
        inputBox.innerHTML = `<input type="number" id="src" placeholder="Enter ID / Number">`;
        document.getElementById("pTitle").innerText = "CONSUMER DETAILS:";
    } else {
        inputBox.innerHTML = `<input type="text" id="src" placeholder="From (e.g. CCU)"><input type="text" id="dst" placeholder="To (e.g. BOM)">`;
        document.getElementById("pTitle").innerText = "PASSENGER DETAILS:";
    }
}

function runSearch() {
    const src = document.getElementById("src").value;
    if(!src) return alert("Pehle details bharo!");
    
    document.getElementById("stepSearch").classList.add("hidden");
    document.getElementById("stepResults").classList.remove("hidden");
    const inject = document.getElementById("resultsInject");
    inject.innerHTML = "";
    
    const data = db[currentService] || db['mobile'];
    setTimeout(() => {
        data.forEach(item => {
            const usdc = (item.inr / INR_RATE).toFixed(2);
            inject.innerHTML += `
                <div onclick="selectTrip('${item.op}', ${item.inr}, ${usdc})" class="flight-item font-bold italic uppercase shadow-xl">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-blue-700 text-xs font-black">${item.op}</span>
                        <span class="text-black text-sm">₹${item.inr}</span>
                    </div>
                    <div class="flex justify-between text-[10px] opacity-70">
                        <span>${item.time}</span>
                        <span class="text-blue-600 font-black">${usdc} USDC</span>
                    </div>
                </div>`;
        });
    }, 800);
}

function selectTrip(op, inr, usdc) {
    selectedPrice = usdc;
    selectedDesc = op;
    document.getElementById("stepResults").classList.add("hidden");
    document.getElementById("stepFinal").classList.remove("hidden");
    document.getElementById("bottomBar").style.display = "block";
    document.getElementById("totalLabel").innerText = `${op}: ₹${inr} (${usdc} USDC)`;
}

async function startTx() {
    if(!document.getElementById("pName").value) return alert("Details bhariye!");
    const btn = document.getElementById("payBtn");
    try {
        btn.innerText = "WAITING FOR ARC..."; btn.disabled = true;
        const contract = new ethers.Contract(USDC_ADDR, ["function transfer(address,uint256) returns (bool)"], signer);
        const tx = await contract.transfer(MERCHANT, ethers.utils.parseUnits(selectedPrice.toString(), 6), { gasLimit: 150000, type: 0 });
        
        btn.innerText = "CONFIRMING...";
        await tx.wait();
        
        document.getElementById("resItem").innerText = selectedDesc;
        document.getElementById("resPrice").innerText = selectedPrice + " USDC";
        document.getElementById("successModal").classList.remove("hidden");
    } catch (e) { alert("Tx Fail!"); btn.disabled = false; btn.innerText = "Confirm & Pay"; }
}

async function fetchBalance() {
    try {
        const contract = new ethers.Contract(USDC_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
        const bal = await contract.balanceOf(userAddress);
        const f = ethers.utils.formatUnits(bal, 6);
        document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
        document.getElementById("inrBal").innerText = (f * INR_RATE).toLocaleString('en-IN');
    } catch(e) {}
}

function closeService() { location.reload(); }
function toggleMenu() { document.getElementById("profileMenu").classList.toggle("show"); }
function copyAddr() { navigator.clipboard.writeText(userAddress); alert("Copied!"); }
