const USDC_ADDR = "0x3600000000000000000000000000000000000000"; 
const ARC_CHAIN_ID = '0x4cef52'; 
const INR_RATE = 94.25; 

let userAddress = "", provider, signer, codeReader;

// --- INITIALIZE ---
window.addEventListener('load', async () => {
    if (window.ethereum && localStorage.getItem("isWalletConnected") === "true") {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) setupWallet(accounts[0]);
    }
});

function updateInrCalc() {
    const val = document.getElementById("sendAmt").value;
    const disp = document.getElementById("inrCalcDisplay");
    disp.innerText = val > 0 ? `≈ (₹${(val * INR_RATE).toLocaleString('en-IN', {minimumFractionDigits:2})})` : `≈ (₹0.00)`;
}

// --- WALLET CORE ---
async function connectWallet() {
    if (!window.ethereum) return alert("Install MetaMask!");
    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        try {
            await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: ARC_CHAIN_ID }] });
        } catch (e) {
            if (e.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: ARC_CHAIN_ID, chainName: 'Arc Network Testnet',
                        rpcUrls: ['https://rpc-testnet.arcnetwork.io'],
                        nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 }
                    }]
                });
            }
        }
        setupWallet(accounts[0]);
    } catch (e) { console.error(e); }
}

async function setupWallet(addr) {
    userAddress = addr;
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    document.getElementById("dot").classList.replace("bg-red-500", "bg-green-500");
    document.getElementById("dot").classList.remove("animate-pulse");
    document.getElementById("walletLabel").innerText = addr.substring(0, 6).toUpperCase() + "..." + addr.substring(addr.length - 4).toUpperCase();
    localStorage.setItem("isWalletConnected", "true");
    fetchBalance();
}

// --- SEND LOGIC ---
async function processSend() {
    const to = document.getElementById("sendTo").value;
    const amt = document.getElementById("sendAmt").value;
    const btn = document.getElementById("finalSendBtn");
    if(!ethers.utils.isAddress(to) || !amt) return alert("Sahi details dalo!");

    try {
        btn.innerText = "CONFIRMING..."; btn.disabled = true;
        const abi = ["function transfer(address to, uint256 amount) public returns (bool)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, signer);
        
        const tx = await contract.transfer(to, ethers.utils.parseUnits(amt.toString(), 18), { 
            gasLimit: 80000,
            maxPriorityFeePerGas: ethers.utils.parseUnits("25", "gwei"),
            maxFeePerGas: ethers.utils.parseUnits("40", "gwei")
        });
        
        await tx.wait(1); 
        document.getElementById("sendModal").classList.add("hidden");
        document.getElementById("successModal").classList.remove("hidden");
    } catch (e) {
        document.getElementById("sendModal").classList.add("hidden");
        document.getElementById("failedModal").classList.remove("hidden");
        btn.innerText = "Confirm Payment"; btn.disabled = false;
    }
}

// --- FETCH BALANCE (FIXED) ---
async function fetchBalance() {
    if(!userAddress) return;
    try {
        const abi = ["function balanceOf(address) view returns (uint256)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, provider);
        const bal = await contract.balanceOf(userAddress);
        const f = ethers.utils.formatUnits(bal, 18);
        document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
        document.getElementById("inrBal").innerText = (f * INR_RATE).toLocaleString('en-IN');
    } catch (e) { console.error(e); }
}

// --- MODALS FUNCTIONS (NOW WORKING) ---
function openReceive() {
    if(!userAddress) return connectWallet();
    document.getElementById("receiveModal").classList.remove("hidden");
    document.getElementById("myAddr").innerText = userAddress;
    const qrDiv = document.getElementById("qrcode");
    qrDiv.innerHTML = "";
    new QRCode(qrDiv, { text: userAddress, width: 180, height: 180, colorDark: "#121271" });
}

async function openScan() {
    if(!userAddress) return connectWallet();
    document.getElementById("scanModal").classList.remove("hidden");
    codeReader = new ZXing.BrowserQRCodeReader();
    const videoElem = document.getElementById("scanVideo");
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        videoElem.srcObject = stream;
        videoElem.play();
        const result = await codeReader.decodeFromVideoElement(videoElem);
        if(ethers.utils.isAddress(result.text)) {
            closeModal('scanModal');
            document.getElementById("sendModal").classList.remove("hidden");
            document.getElementById("sendTo").value = result.text;
        }
    } catch (e) { closeModal('scanModal'); }
}

async function openHistory() {
    if(!userAddress) return connectWallet();
    document.getElementById("historyModal").classList.remove("hidden");
    const list = document.getElementById("txList");
    list.innerHTML = `<p class="text-[10px] text-center opacity-20 italic">Syncing with Arc Blockchain...</p>`;
    try {
        const contract = new ethers.Contract(USDC_ADDR, ["event Transfer(address indexed from, address indexed to, uint256 value)"], provider);
        const filter = contract.filters.Transfer(userAddress, null);
        const logs = await contract.queryFilter(filter, -2000, "latest");
        if(logs.length === 0) return list.innerHTML = `<p class="text-center text-xs opacity-20 mt-10">No History Found</p>`;
        list.innerHTML = logs.slice(-10).reverse().map(l => `
            <div class="bg-gray-50 p-4 rounded-2xl border mb-2 flex justify-between items-center">
                <div class="text-[9px] font-black ${l.args.from.toLowerCase() === userAddress.toLowerCase() ? 'text-red-500' : 'text-green-500'}">
                    ${l.args.from.toLowerCase() === userAddress.toLowerCase() ? 'SENT' : 'RECEIVED'}
                </div>
                <div class="text-xs font-black italic">₹${(ethers.utils.formatUnits(l.args.value, 18) * INR_RATE).toFixed(2)}</div>
            </div>`).join('');
    } catch (e) { list.innerHTML = "History Sync Error"; }
}

// --- UTILS ---
function toggleProfile() { if(!userAddress) connectWallet(); else document.getElementById("profileMenu").classList.toggle("show"); }
function openSend() { if(!userAddress) return connectWallet(); document.getElementById("sendModal").classList.remove("hidden"); }
function closeModal(id) { 
    document.getElementById(id).classList.add("hidden"); 
    if(id === 'scanModal' && codeReader) {
        const stream = document.getElementById("scanVideo").srcObject;
        if(stream) stream.getTracks().forEach(t => t.stop());
    }
}
function copyAddr() { navigator.clipboard.writeText(userAddress); alert("Copied! ✅"); }
function disconnectWallet() { localStorage.removeItem("isWalletConnected"); location.reload(); }

window.onclick = (e) => { if (!e.target.matches('#walletBtn, #walletBtn *')) document.getElementById("profileMenu").classList.remove("show"); }
