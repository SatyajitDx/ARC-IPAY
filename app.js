const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT = "0xbdc55a1296d065b7eb4363207d1a599e578712c5"; 
const ARC_CHAIN_ID = '0x4cef52'; // Arc Testnet
const INR_RATE = 83.50;

let userAddress = "", provider, signer, selectedPrice = 0, selectedItem = "";

async function autoConnect() {
    if (!window.ethereum) return;
    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAddress = accounts[0];
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        // Chain Check
        const { chainId } = await provider.getNetwork();
        if(ethers.utils.hexValue(chainId) !== ARC_CHAIN_ID) {
            try {
                await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: ARC_CHAIN_ID }] });
                location.reload();
            } catch(e) { alert("Add Arc Testnet to Wallet!"); return; }
        }

        // UI Update: Dropdown/Profile
        document.getElementById("dot").classList.replace("bg-red-500", "bg-green-500");
        document.getElementById("walletLabel").innerText = userAddress.slice(0, 10) + "...";
        
        fetchBalance();
        getTxLogs();
    } catch (e) { console.error(e); }
}

function toggleProfile() {
    if(!userAddress) return autoConnect();
    document.getElementById("profileMenu").classList.toggle("show");
}

const mockDb = {
    flight: [ {op: "Akasa Air", inr: 7421, time: "23:00-01:55"}, {op: "IndiGo", inr: 7424, time: "02:00-04:45"} ],
    train: [ {op: "Gitanjali", inr: 840, time: "13:40-21:20"} ],
    bus: [ {op: "SANA TRAVELS", inr: 540, time: "21:15-06:00"} ],
    mobile: [ {op: "Jio Recharge", inr: 299, time: "28 Days Plan"} ]
};

function startFlow(type) {
    document.getElementById("bookingOverlay").classList.remove("hidden");
    document.getElementById("flowTitle").innerText = type.toUpperCase() + " SEARCH";
    const content = document.getElementById("flowContent");
    content.innerHTML = `
        <input type="text" id="src" placeholder="Source / Number">
        <button onclick="runSearch('${type}')" class="w-full bg-[#000080] text-white py-4 rounded-xl">Search Options</button>
    `;
}

function runSearch(type) {
    const src = document.getElementById("src").value;
    if(!src) return;
    const inject = document.getElementById("resultsInject");
    inject.innerHTML = `<p class="text-center opacity-40 italic">Searching Real Routes...</p>`;
    
    setTimeout(() => {
        inject.innerHTML = "";
        const data = mockDb[type] || mockDb['mobile'];
        data.forEach(item => {
            const usdc = (item.inr / INR_RATE).toFixed(2);
            inject.innerHTML += `
                <div onclick="selectItem('${item.op}', ${item.inr}, ${usdc})" class="glass p-5 border-black/10 flex justify-between items-center text-black">
                    <div><p class="font-black text-xs text-[#000080]">${item.op}</p><p class="text-[8px] opacity-60">${item.time}</p></div>
                    <div class="text-right"><p class="font-black text-sm">₹${item.inr}</p><p class="text-[8px] text-[#138808]">${usdc} USDC</p></div>
                </div>`;
        });
    }, 1200);
}

function selectItem(op, inr, usdc) {
    selectedPrice = usdc;
    selectedItem = op;
    document.getElementById("resultsInject").innerHTML = `<div class="glass p-6 space-y-4">
        <p class="text-[#000080] text-xs font-black uppercase">Traveller Details:</p>
        <input type="text" id="pName" placeholder="Full Name">
        <input type="number" placeholder="Age">
    </div>`;
    document.getElementById("bottomBar").style.display = "block";
    document.getElementById("totalPrice").innerText = `BOOKING ${op}: ₹${inr} (${usdc} USDC)`;
}

async function finalPay() {
    if(!document.getElementById("pName").value) return alert("Fill Name!");
    const btn = document.getElementById("payBtn");
    try {
        btn.innerText = "WAITING FOR ARC..."; btn.disabled = true;
        const contract = new ethers.Contract(USDC_ADDR, ["function transfer(address,uint256) returns (bool)"], signer);
        const tx = await contract.transfer(MERCHANT, ethers.utils.parseUnits(selectedPrice.toString(), 6), { gasLimit: 150000, type: 0 });
        await tx.wait();
        document.getElementById("resDesc").innerText = selectedItem;
        document.getElementById("resAmt").innerText = selectedPrice + " USDC";
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
    const logs = await contract.queryFilter(contract.filters.Transfer(userAddress), -1000, "latest");
    document.getElementById("txList").innerHTML = logs.slice(-3).reverse().map(l => `
        <div class="flex justify-between border-b border-black/5 pb-1">
            <span>To: ${l.args.to.slice(0,10)}...</span>
            <span class="text-[#138808]">-${ethers.utils.formatUnits(l.args.value, 6)} USDC</span>
        </div>`).join('');
}

function closeFlow() { location.reload(); }
function copyAddr() { navigator.clipboard.writeText(userAddress); alert("Copied!"); }
