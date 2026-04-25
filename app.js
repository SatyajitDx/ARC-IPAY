const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT = "0xbdc55a1296d065b7eb4363207d1a599e578712c5"; 
const ARC_CHAIN = "0x4cef52"; 
const INR_RATE = 83.50;

let userAddress = "", provider, signer, selectedPrice = 0;

async function autoConnect() {
    if (!window.ethereum) return;
    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAddress = accounts[0];
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        const { chainId } = await provider.getNetwork();
        if(ethers.utils.hexValue(chainId) !== ARC_CHAIN) {
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
    flight: [ {op: "Akasa Air", id: "QP-1126", inr: 7421, time: "23:00-01:55"}, {op: "IndiGo", id: "6E-6366", inr: 7424, time: "02:00-04:45"} ],
    train: [ {op: "Gitanjali", id: "12860", inr: 840, time: "13:40-21:20"} ],
    bus: [ {op: "SANA TRAVELS", id: "WB-41", inr: 540, time: "21:15-06:00"} ],
    hotel: [ {op: "ITC Sonar", id: "Tangra", inr: 9000, time: "1 Night"} ],
    mobile: [ {op: "Jio Prepaid", id: "1.5GB/Day", inr: 299, time: "28 Days"} ]
};

function openBooking(type) {
    document.getElementById("bookingUI").classList.remove("hidden");
    document.getElementById("uiTitle").innerText = type.toUpperCase() + " OPTIONS";
    const data = db[type] || db['mobile'];
    const inject = document.getElementById("resultsBox");
    inject.innerHTML = "";
    
    data.forEach(item => {
        const usdc = (item.inr / INR_RATE).toFixed(2);
        inject.innerHTML += `
            <div onclick="selectTrip('${item.op}', ${item.inr}, ${usdc})" class="glass p-5 border-white/10 flex justify-between items-center active:scale-95 transition-all">
                <div><p class="font-black text-xs text-blue-400">${item.op}</p><p class="text-[8px] opacity-40">${item.time}</p></div>
                <div class="text-right"><p class="font-black text-sm text-white">₹${item.inr}</p><p class="text-[8px] text-green-400">${usdc} USDC</p></div>
            </div>`;
    });
    window.scrollTo(0, document.body.scrollHeight);
}

function selectTrip(op, inr, usdc) {
    selectedPrice = usdc;
    document.getElementById("resultsBox").classList.add("hidden");
    document.getElementById("passengerForm").classList.remove("hidden");
    document.getElementById("bottomPay").style.display = "block";
    document.getElementById("totalLabel").innerText = `BOOKING ${op}: ₹${inr} (${usdc} USDC)`;
}

async function finalPay() {
    if(!document.getElementById("pName").value) return alert("Enter Name!");
    const btn = document.getElementById("payBtn");
    try {
        btn.innerText = "WAITING FOR ARC NETWORK..."; btn.disabled = true;
        const contract = new ethers.Contract(USDC_ADDR, ["function transfer(address,uint256) returns (bool)"], signer);
        const tx = await contract.transfer(MERCHANT, ethers.utils.parseUnits(selectedPrice.toString(), 6), { gasLimit: 150000, type: 0 });
        await tx.wait();
        document.getElementById("resAmt").innerText = selectedPrice + " USDC";
        document.getElementById("successModal").classList.remove("hidden");
    } catch (e) { alert("Payment Fail!"); btn.disabled = false; btn.innerText = "Confirm & Pay"; }
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

function copyAddr() { navigator.clipboard.writeText(userAddress); alert("Copied!"); }
function openReceive() { alert("Addr: " + userAddress); }
